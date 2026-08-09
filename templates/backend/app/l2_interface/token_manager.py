"""L2 - Token 管理

管理 Token 计数、上下文窗口检测和消息截断。
"""

from typing import Optional
import tiktoken


class TokenManager:
    """Token 管理器
    
    负责：
    - 消息 Token 计数
    - 上下文窗口检测
    - 超长消息自动截断
    """
    
    # 各模型的上下文窗口大小
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
    
    # 最大输出 Token 的安全预留
    OUTPUT_RESERVE = 4096
    
    def __init__(self, model: str = "gpt-4o"):
        self.model = model
        self.context_window = self.CONTEXT_WINDOWS.get(model, 128000)
        self.max_input_tokens = self.context_window - self.OUTPUT_RESERVE
    
    def count_tokens(self, text: str) -> int:
        """计算文本的 Token 数"""
        try:
            encoding = tiktoken.encoding_for_model(self.model)
        except KeyError:
            encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))
    
    def count_messages_tokens(self, messages: list[dict]) -> int:
        """计算消息列表的总 Token 数"""
        total = 0
        for msg in messages:
            total += self.count_tokens(msg.get("content", ""))
            # 每条消息的格式开销
            total += 4  # 角色标记等
        total += 2  # 对话首尾标记
        return total
    
    def is_within_limit(self, messages: list[dict]) -> bool:
        """检查是否在上下文窗口限制内"""
        return self.count_messages_tokens(messages) <= self.max_input_tokens
    
    def truncate_messages(
        self,
        messages: list[dict],
        max_tokens: Optional[int] = None,
    ) -> list[dict]:
        """截断消息列表以适应上下文窗口
        
        策略：保留系统消息，从最早的对话消息开始删除。
        """
        if max_tokens is None:
            max_tokens = self.max_input_tokens
        
        # 分离系统消息和对话消息
        system_msgs = [m for m in messages if m.get("role") == "system"]
        dialog_msgs = [m for m in messages if m.get("role") != "system"]
        
        # 计算系统消息的 Token 数
        system_tokens = self.count_messages_tokens(system_msgs)
        available = max_tokens - system_tokens
        
        # 从最早的对话消息开始截断
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
        """获取 Token 使用信息"""
        total = self.count_messages_tokens(messages)
        return {
            "total_tokens": total,
            "max_input_tokens": self.max_input_tokens,
            "context_window": self.context_window,
            "usage_ratio": round(total / self.max_input_tokens * 100, 1),
            "is_within_limit": total <= self.max_input_tokens,
        }