"""L8 - API 数据模型

定义所有 API 请求和响应的数据格式。
"""

from typing import Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """聊天请求"""
    message: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="用户消息",
    )
    thread_id: Optional[str] = Field(
        None,
        description="会话 ID，不传则创建新会话",
    )
    stream: bool = Field(
        True,
        description="是否使用流式响应",
    )


class ChatResponse(BaseModel):
    """聊天响应"""
    type: str = Field(
        ...,
        description="事件类型: token, tool_start, tool_end, thinking, done, error",
    )
    content: Optional[str] = None
    thread_id: Optional[str] = None
    tool_calls: Optional[int] = None
    tool: Optional[str] = None
    input: Optional[str] = None
    output: Optional[str] = None


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str
    timestamp: str
    version: str
    llm_connected: bool
    tools_count: int


class SessionInfo(BaseModel):
    """会话信息"""
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int


class ToolInfo(BaseModel):
    """工具信息"""
    name: str
    description: str
    category: str


class ErrorResponse(BaseModel):
    """错误响应"""
    error: str
    detail: Optional[str] = None
    code: str = "UNKNOWN_ERROR"