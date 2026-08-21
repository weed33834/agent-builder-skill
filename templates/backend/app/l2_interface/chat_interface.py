"""L2 - Unified Chat Interface

Encapsulates the differences between L1 adapters and provides a unified chat invocation method.
"""

from typing import AsyncIterator, Optional
from langchain_core.messages import AIMessage, BaseMessage, SystemMessage, HumanMessage

from ..l1_llm.factory import create_llm
from ..l1_llm.base import LLMAdapter
from .streaming import StreamManager
from .retry import RetryHandler
from ..l10_infra.config import settings


class ChatInterface:
    """Unified chat interface

    Shields the differences between LLM providers and provides a consistent invocation method.

    Security (deep-spec 27): when settings.SECURITY_ENABLED, every chat call
    runs prompt-injection defense + PII redaction on the input, and redacts PII
    from the output. High-severity injections are blocked before reaching the LLM.
    """

    def __init__(
        self,
        provider: str = "openai",
        model: str = "gpt-4o",
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ):
        self._llm: LLMAdapter = create_llm(
            provider=provider,
            model=model,
            api_key=api_key,
            api_base=api_base,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        self._stream_manager = StreamManager()
        self._retry_handler = RetryHandler()
        self._security_enabled = bool(getattr(settings, "SECURITY_ENABLED", True))

    # ── Security helpers (deep-spec 27) ──────────────────────────
    def _sanitize(self, messages: list[dict]) -> tuple[list[dict], Optional[str]]:
        """Redact PII + detect injection. Returns (messages, block_reason|None)."""
        if not self._security_enabled:
            return messages, None
        from ..l10_infra.ai_security import scan, redact_pii
        out: list[dict] = []
        for msg in messages:
            content = msg.get("content") or ""
            if msg.get("role") == "user":
                inj = scan(content)
                if inj.get("blocked") or inj.get("injection", {}).get("action") == "block":
                    return out, inj.get("injection", {}).get("severity", "high")
                redacted = redact_pii(content)["redacted"]
                out.append({**msg, "content": redacted})
            else:
                out.append(msg)
        return out, None

    def _redact_output(self, text: str) -> str:
        if not self._security_enabled or not text:
            return text
        from ..l10_infra.ai_security import redact_pii
        return redact_pii(text)["redacted"]

    async def chat(
        self,
        messages: list[dict],
        tools: Optional[list] = None,
    ) -> AIMessage:
        """Synchronous chat

        Args:
            messages: List of messages, format: [{"role": "user", "content": "..."}]
            tools: Optional list of tools
        Returns:
            AIMessage: LLM response
        """
        sanitized, block = self._sanitize(messages)
        if block:
            return AIMessage(content=f"[已拦截] 输入命中高风险提示词注入（severity={block}）。请调整表述后重试。")
        langchain_messages = self._convert_messages(sanitized)
        resp = await self._retry_handler.execute_with_retry(
            self._llm.invoke,
            langchain_messages,
            tools,
        )
        if isinstance(resp, AIMessage) and resp.content:
            resp = resp.model_copy(update={"content": self._redact_output(resp.content)})
        return resp

    async def chat_stream(
        self,
        messages: list[dict],
        tools: Optional[list] = None,
    ) -> AsyncIterator[str]:
        """Streaming chat

        Args:
            messages: List of messages
            tools: Optional list of tools
        Yields:
            str: Text content chunk by chunk
        """
        sanitized, block = self._sanitize(messages)
        if block:
            yield f"[已拦截] 输入命中高风险提示词注入（severity={block}）。请调整表述后重试。"
            return
        langchain_messages = self._convert_messages(sanitized)
        async for chunk in self._stream_manager.stream(
            self._llm.stream,
            langchain_messages,
            tools,
        ):
            yield self._redact_output(chunk)

    def bind_tools(self, tools: list):
        """Bind tools to the current LLM"""
        return self._llm.bind_tools(tools)

    def get_model_info(self) -> dict:
        """Get current model information"""
        return self._llm.get_model_info()

    def _convert_messages(self, messages: list[dict]) -> list[BaseMessage]:
        """Convert API message format to LangChain message format"""
        converted = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                converted.append(SystemMessage(content=content))
            elif role == "user":
                converted.append(HumanMessage(content=content))
            elif role == "assistant":
                converted.append(AIMessage(content=content))
        return converted
