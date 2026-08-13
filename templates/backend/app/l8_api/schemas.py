"""L8 - API Data Models

Defines the data formats for all API requests and responses.
"""

from typing import Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Chat request"""
    message: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="User message",
    )
    thread_id: Optional[str] = Field(
        None,
        description="Session ID; creates a new session if not provided",
    )
    stream: bool = Field(
        True,
        description="Whether to use streaming response",
    )
    mode: dict = Field(
        default_factory=dict,
        description="Chat mode toggles (like GPT/Doubao): "
                    "{web_search: bool, deep_think: bool, kb_id: str|None, sandbox: bool}. "
                    "web_search injects live web results; kb_id runs RAG retrieval; "
                    "deep_think instructs plan-then-answer.",
    )


class ChatResponse(BaseModel):
    """Chat response"""
    type: str = Field(
        ...,
        description="Event type: token, tool_start, tool_end, thinking, done, error",
    )
    content: Optional[str] = None
    thread_id: Optional[str] = None
    tool_calls: Optional[int] = None
    tool: Optional[str] = None
    input: Optional[str] = None
    output: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    version: str
    llm_connected: bool
    tools_count: int


class SessionInfo(BaseModel):
    """Session information"""
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int


class ToolInfo(BaseModel):
    """Tool information"""
    name: str
    description: str
    category: str


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    detail: Optional[str] = None
    code: str = "UNKNOWN_ERROR"
