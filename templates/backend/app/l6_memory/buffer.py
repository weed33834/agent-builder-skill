"""L6 - 对话缓冲记忆

管理短期会话记忆，支持消息的增删查和自动摘要。
"""

from typing import Optional
from datetime import datetime
from collections import OrderedDict


class ConversationBuffer:
    """对话缓冲记忆
    
    维持每个会话最近的消息，支持：
    - 自动清理超过限制的消息
    - 按会话隔离
    - 获取格式化上下文
    """
    
    def __init__(self, max_messages: int = 50):
        self.max_messages = max_messages
        # {thread_id: [{"role": str, "content": str, "timestamp": str}]}
        self._buffers: dict[str, list[dict]] = {}
    
    async def add(self, role: str, content: str, thread_id: str = "default"):
        """添加消息到缓冲区
        
        Args:
            role: 消息角色 (user, assistant, system)
            content: 消息内容
            thread_id: 会话 ID
        """
        if thread_id not in self._buffers:
            self._buffers[thread_id] = []
        
        self._buffers[thread_id].append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
        })
        
        # 自动清理超过限制的早期消息
        if len(self._buffers[thread_id]) > self.max_messages:
            self._buffers[thread_id] = self._buffers[thread_id][-self.max_messages:]
    
    def get_history(self, thread_id: str = "default", limit: Optional[int] = None) -> list[dict]:
        """获取会话历史
        
        Args:
            thread_id: 会话 ID
            limit: 返回最近 N 条消息，None 返回全部
        Returns:
            list[dict]: 消息列表
        """
        history = self._buffers.get(thread_id, [])
        if limit:
            return history[-limit:]
        return history
    
    def get_context(self, thread_id: str = "default", limit: int = 10) -> str:
        """获取格式化的上下文文本
        
        用于注入到 LLM 提示中。
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
        """清除记忆
        
        Args:
            thread_id: 指定会话 ID，None 则清除所有
        """
        if thread_id:
            self._buffers.pop(thread_id, None)
        else:
            self._buffers.clear()
    
    def get_stats(self) -> dict:
        """获取统计信息"""
        total = sum(len(m) for m in self._buffers.values())
        return {
            "total_messages": total,
            "total_sessions": len(self._buffers),
            "max_messages_per_session": self.max_messages,
        }