"""L6 - 会话管理器

管理对话会话的创建、切换和生命周期。
整合对话缓冲和向量存储，提供统一的记忆接口。
"""

from typing import Optional
from datetime import datetime
import uuid

from .buffer import ConversationBuffer


class SessionManager:
    """会话管理器
    
    管理多个对话会话，每个会话独立维护记忆。
    """
    
    def __init__(self):
        self._sessions: dict[str, dict] = {}
        self._buffer = ConversationBuffer()
    
    def create_session(self, title: str = "新会话") -> str:
        """创建新会话
        
        Returns:
            str: 会话 ID
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
        """获取会话信息"""
        return self._sessions.get(session_id)
    
    def list_sessions(self) -> list[dict]:
        """列出所有会话"""
        return sorted(
            self._sessions.values(),
            key=lambda s: s["updated_at"],
            reverse=True,
        )
    
    async def add_message(self, session_id: str, role: str, content: str):
        """添加消息到会话"""
        # 确保会话存在
        if session_id not in self._sessions:
            session_id = self.create_session()
        
        # 添加到对话缓冲
        await self._buffer.add(role, content, session_id)
        
        # 更新会话元数据
        self._sessions[session_id]["updated_at"] = datetime.now().isoformat()
        self._sessions[session_id]["message_count"] += 1
    
    def get_history(self, session_id: str, limit: int = 50) -> list[dict]:
        """获取会话历史"""
        return self._buffer.get_history(session_id, limit)
    
    def get_context(self, session_id: str, limit: int = 10) -> str:
        """获取格式化上下文"""
        return self._buffer.get_context(session_id, limit)
    
    def delete_session(self, session_id: str):
        """删除会话"""
        self._sessions.pop(session_id, None)
        self._buffer.clear(session_id)
    
    def get_stats(self) -> dict:
        """获取统计信息"""
        return {
            "total_sessions": len(self._sessions),
            "buffer_stats": self._buffer.get_stats(),
        }


# 全局会话管理器实例
_session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """获取全局会话管理器"""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager