"""L6 - Conversation Summary (Rolling Summary)

Rolling-summary memory (M5.2 + M3.14 context compression).
Summarizes old messages to keep the context window bounded.
Uses the LLM to compress, with a naive extractive fallback.

Usage:
    summarizer = ConversationSummarizer(llm)
    summary = await summarizer.summarize(messages)
"""

from typing import Optional, Sequence

try:
    from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
except ImportError:  # pragma: no cover - allow stdlib-only operation
    BaseMessage = object
    SystemMessage = object
    HumanMessage = object


class ConversationSummarizer:
    """Rolling conversation summarizer (M5.2)"""

    def __init__(
        self,
        llm=None,
        max_messages_before_summary: int = 40,
        summary_prompt: Optional[str] = None,
    ):
        self.llm = llm
        self.max_messages = max_messages_before_summary
        self.summary_prompt = summary_prompt or (
            "You are a conversation summarizer. Compress the conversation below "
            "into a concise summary that preserves: user goals, key facts, decisions, "
            "open questions, and any tool results that matter. Keep it under 400 words.\n\n"
            "Conversation:\n{conversation}\n\nSummary:"
        )

    async def summarize(self, messages: Sequence[BaseMessage]) -> str:
        """Compress a message list into a summary string"""
        if not messages:
            return ""

        text = self._messages_to_text(messages)

        if self.llm is None:
            return self._extractive_fallback(text)

        try:
            response = await self.llm.ainvoke(
                [HumanMessage(content=self.summary_prompt.format(conversation=text))]
            )
            content = getattr(response, "content", response)
            return str(content).strip()
        except Exception:
            return self._extractive_fallback(text)

    async def summarize_into_messages(
        self,
        messages: Sequence[BaseMessage],
        summary: Optional[str] = None,
    ) -> list[BaseMessage]:
        """Return a compact message list: [summary_system, recent messages]"""
        recent = list(messages)[-self.max_messages:]
        new_summary = summary or await self.summarize(list(messages)[:-len(recent)] if len(messages) > len(recent) else [])

        result: list[BaseMessage] = []
        if new_summary:
            result.append(SystemMessage(content=f"[Conversation summary so far]\n{new_summary}"))
        result.extend(recent)
        return result

    def _messages_to_text(self, messages: Sequence[BaseMessage]) -> str:
        lines = []
        for msg in messages:
            role = getattr(msg, "type", "message")
            content = getattr(msg, "content", str(msg))
            lines.append(f"{role}: {content}")
        return "\n".join(lines)

    def _extractive_fallback(self, text: str) -> str:
        """Naive extractive fallback when no LLM is available"""
        # Keep first + last 200 chars, plus lines with key markers
        sentences = [s.strip() for s in text.split("\n") if s.strip()]
        important = [
            s for s in sentences
            if any(k in s.lower() for k in ("goal", "decide", "conclusion", "need", "todo", "error"))
        ]
        head = text[:300].strip()
        tail = text[-300:].strip() if len(text) > 600 else ""
        parts = [head]
        if important:
            parts.append("Key points: " + " | ".join(important[:5]))
        if tail:
            parts.append("...end: " + tail)
        return "\n".join(parts)


def should_summarize(messages: Sequence[BaseMessage], threshold: int = 40) -> bool:
    """Decide whether the conversation should be summarized (M3.14)"""
    return len(messages) > threshold
