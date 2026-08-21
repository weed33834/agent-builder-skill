"""L6 - Conversation Buffer Memory

Manages short-term session memory, supporting message add/remove/query and automatic summarization.
"""

from typing import Optional
from datetime import datetime


class ConversationBuffer:
    """Conversation buffer memory

    Maintains the most recent messages for each session, supporting:
    - Automatic cleanup of messages exceeding the limit
    - Isolation by session
    - Getting formatted context
    """

    def __init__(self, max_messages: int = 50):
        self.max_messages = max_messages
        # {thread_id: [{"role": str, "content": str, "timestamp": str}]}
        self._buffers: dict[str, list[dict]] = {}

    async def add(self, role: str, content: str, thread_id: str = "default"):
        """Add a message to the buffer

        Args:
            role: Message role (user, assistant, system)
            content: Message content
            thread_id: Session ID
        """
        if thread_id not in self._buffers:
            self._buffers[thread_id] = []

        self._buffers[thread_id].append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
        })

        # Automatically clean up early messages exceeding the limit
        if len(self._buffers[thread_id]) > self.max_messages:
            self._buffers[thread_id] = self._buffers[thread_id][-self.max_messages:]

    def get_history(self, thread_id: str = "default", limit: Optional[int] = None) -> list[dict]:
        """Get session history

        Args:
            thread_id: Session ID
            limit: Return the most recent N messages, None returns all
        Returns:
            list[dict]: Message list
        """
        history = self._buffers.get(thread_id, [])
        if limit:
            return history[-limit:]
        return history

    def get_context(self, thread_id: str = "default", limit: int = 10) -> str:
        """Get formatted context text

        Used to inject into LLM prompts.
        """
        history = self.get_history(thread_id, limit)
        if not history:
            return ""

        lines = ["## 对话历史"]
        for msg in history:
            role = "用户" if msg["role"] == "user" else "助手"
            lines.append(f"{role}: {msg['content']}")

        return "\n".join(lines)

    def clear(self, thread_id: Optional[str] = None):
        """Clear memory

        Args:
            thread_id: Specify session ID, None clears all
        """
        if thread_id:
            self._buffers.pop(thread_id, None)
        else:
            self._buffers.clear()

    def get_stats(self) -> dict:
        """Get statistics"""
        total = sum(len(m) for m in self._buffers.values())
        return {
            "total_messages": total,
            "total_sessions": len(self._buffers),
            "max_messages_per_session": self.max_messages,
        }
