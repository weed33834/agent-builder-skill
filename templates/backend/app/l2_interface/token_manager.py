"""L2 - Token Management

Manages token counting, context window detection, and message truncation.
"""

from typing import Optional
import tiktoken


class TokenManager:
    """Token manager

    Responsible for:
    - Message token counting
    - Context window detection
    - Automatic truncation of overlong messages
    """

    # Context window size for each model
    CONTEXT_WINDOWS = {
        "gpt-4o": 128000,
        "gpt-4o-mini": 128000,
        "gpt-4-turbo": 128000,
        "claude-3-5-sonnet-20241022": 200000,
        "claude-3-haiku-20240307": 200000,
        "deepseek-chat": 64000,
        "qwen2.5:7b": 32768,
        "llama3.1:8b": 32768,
    }

    # Safe reserve for maximum output tokens
    OUTPUT_RESERVE = 4096

    def __init__(self, model: str = "gpt-4o"):
        self.model = model
        self.context_window = self.CONTEXT_WINDOWS.get(model, 128000)
        self.max_input_tokens = self.context_window - self.OUTPUT_RESERVE

    def count_tokens(self, text: str) -> int:
        """Count the number of tokens in the text"""
        try:
            encoding = tiktoken.encoding_for_model(self.model)
        except KeyError:
            encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))

    def count_messages_tokens(self, messages: list[dict]) -> int:
        """Count the total number of tokens in the message list"""
        total = 0
        for msg in messages:
            total += self.count_tokens(msg.get("content", ""))
            # Format overhead per message
            total += 4  # Role markers, etc.
        total += 2  # Conversation start/end markers
        return total

    def is_within_limit(self, messages: list[dict]) -> bool:
        """Check whether it is within the context window limit"""
        return self.count_messages_tokens(messages) <= self.max_input_tokens

    def truncate_messages(
        self,
        messages: list[dict],
        max_tokens: Optional[int] = None,
    ) -> list[dict]:
        """Truncate the message list to fit the context window

        Strategy: Keep system messages, start removing from the earliest conversation messages.
        """
        if max_tokens is None:
            max_tokens = self.max_input_tokens

        # Separate system messages from dialog messages
        system_msgs = [m for m in messages if m.get("role") == "system"]
        dialog_msgs = [m for m in messages if m.get("role") != "system"]

        # Count tokens of system messages
        system_tokens = self.count_messages_tokens(system_msgs)
        available = max_tokens - system_tokens

        # Truncate starting from the earliest dialog message
        truncated_dialog = []
        for msg in reversed(dialog_msgs):
            msg_tokens = self.count_messages_tokens([msg])
            if available - msg_tokens >= 0:
                truncated_dialog.insert(0, msg)
                available -= msg_tokens
            else:
                break

        return system_msgs + truncated_dialog

    def get_usage_info(self, messages: list[dict]) -> dict:
        """Get token usage information"""
        total = self.count_messages_tokens(messages)
        return {
            "total_tokens": total,
            "max_input_tokens": self.max_input_tokens,
            "context_window": self.context_window,
            "usage_ratio": round(total / self.max_input_tokens * 100, 1),
            "is_within_limit": total <= self.max_input_tokens,
        }
