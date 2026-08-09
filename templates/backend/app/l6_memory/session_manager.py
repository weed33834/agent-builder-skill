"""L6 - Session Manager

Manages the creation, switching, and lifecycle of conversation sessions.
Integrates conversation buffer and vector store, providing a unified memory interface.
"""

from typing import Optional
from datetime import datetime
import uuid

from .buffer import ConversationBuffer


class SessionManager:
    """Session manager

    Manages multiple conversation sessions, each session independently maintains memory.
    """

    def __init__(self):
        self._sessions: dict[str, dict] = {}
        self._buffer = ConversationBuffer()

    def create_session(self, title: str = "新会话") -> str:
        """Create a new session

        Returns:
            str: Session ID
        """
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = {
            "id": session_id,
            "title": title,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "message_count": 0,
        }
        return session_id

    def get_session(self, session_id: str) -> Optional[dict]:
        """Get session information"""
        return self._sessions.get(session_id)

    def list_sessions(self) -> list[dict]:
        """List all sessions"""
        return sorted(
            self._sessions.values(),
            key=lambda s: s["updated_at"],
            reverse=True,
        )

    async def add_message(self, session_id: str, role: str, content: str):
        """Add a message to the session"""
        # Ensure session exists
        if session_id not in self._sessions:
            session_id = self.create_session()

        # Add to conversation buffer
        await self._buffer.add(role, content, session_id)

        # Update session metadata
        self._sessions[session_id]["updated_at"] = datetime.now().isoformat()
        self._sessions[session_id]["message_count"] += 1

    def get_history(self, session_id: str, limit: int = 50) -> list[dict]:
        """Get session history"""
        return self._buffer.get_history(session_id, limit)

    def get_context(self, session_id: str, limit: int = 10) -> str:
        """Get formatted context"""
        return self._buffer.get_context(session_id, limit)

    def delete_session(self, session_id: str):
        """Delete a session"""
        self._sessions.pop(session_id, None)
        self._buffer.clear(session_id)

    def get_stats(self) -> dict:
        """Get statistics"""
        return {
            "total_sessions": len(self._sessions),
            "buffer_stats": self._buffer.get_stats(),
        }


# Global session manager instance
_session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """Get the global session manager"""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager
