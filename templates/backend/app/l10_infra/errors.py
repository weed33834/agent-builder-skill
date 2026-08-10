"""L10 - Unified Exception Hierarchy

Defines the application-wide exception hierarchy.
All exceptions inherit from AgentError to enable unified error handling
in the API layer (M7.10) and structured logging (M13.1).
"""

from typing import Optional, Any


class AgentError(Exception):
    """Base exception for all Agent Builder errors

    Attributes:
        code: Machine-readable error code
        message: Human-readable error message
        details: Extra error context (optional)
        status_code: HTTP status code mapping (optional)
    """

    code: str = "agent_error"
    status_code: int = 500

    def __init__(
        self,
        message: str,
        details: Optional[dict] = None,
        *,
        code: Optional[str] = None,
        status_code: Optional[int] = None,
    ):
        super().__init__(message)
        self.message = message
        self.details = details or {}
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code

    def to_dict(self) -> dict:
        """Serialize to a JSON-compatible dict"""
        payload = {"code": self.code, "message": self.message}
        if self.details:
            payload["details"] = self.details
        return payload

    def __str__(self) -> str:  # pragma: no cover
        return f"[{self.code}] {self.message}"


# ── LLM layer (L1/L2) ──────────────────────────────────────────

class LLMError(AgentError):
    """LLM invocation failure"""
    code = "llm_error"
    status_code = 502


class LLMTimeoutError(LLMError):
    """LLM call timed out"""
    code = "llm_timeout"


class LLMRateLimitError(LLMError):
    """LLM rate limit exceeded"""
    code = "llm_rate_limit"
    status_code = 429


class LLMConfigurationError(LLMError):
    """LLM not configured properly (missing key, bad model, etc.)"""
    code = "llm_configuration_error"
    status_code = 503


class ModelFallbackError(LLMError):
    """All models in the fallback chain failed"""
    code = "model_fallback_error"


# ── Agent layer (L3/L4) ─────────────────────────────────────────

class AgentRuntimeError(AgentError):
    """Agent execution failure"""
    code = "agent_runtime_error"


class AgentLoopLimitError(AgentRuntimeError):
    """Agent exceeded max steps (M3.5)"""
    code = "agent_loop_limit"


class AgentTimeoutError(AgentRuntimeError):
    """Agent task timed out (M3.6)"""
    code = "agent_timeout"


class PromptError(AgentError):
    """Prompt construction failure (L3)"""
    code = "prompt_error"


class OutputParseError(AgentError):
    """Failed to parse LLM structured output (M2.7)"""
    code = "output_parse_error"


# ── Tool layer (L5) ─────────────────────────────────────────────

class ToolError(AgentError):
    """Tool invocation failure"""
    code = "tool_error"


class ToolNotFoundError(ToolError):
    """Tool not registered in the registry"""
    code = "tool_not_found"
    status_code = 404


class ToolExecutionError(ToolError):
    """Tool raised an exception during execution"""
    code = "tool_execution_error"


class ToolPermissionError(ToolError):
    """Tool invocation rejected by permission policy (M3.17)"""
    code = "tool_permission_error"
    status_code = 403


class ToolTimeoutError(ToolError):
    """Tool execution timed out"""
    code = "tool_timeout"


class MCPServerError(ToolError):
    """MCP server communication failure"""
    code = "mcp_server_error"


# ── Memory layer (L6) ───────────────────────────────────────────

class MemoryError(AgentError):
    """Memory subsystem failure"""
    code = "memory_error"


class VectorStoreError(MemoryError):
    """Vector database failure"""
    code = "vector_store_error"


class RetrievalError(MemoryError):
    """Retrieval/RAG failure"""
    code = "retrieval_error"


# ── Orchestration layer (L7) ────────────────────────────────────

class OrchestrationError(AgentError):
    """Multi-agent orchestration failure"""
    code = "orchestration_error"


class A2AError(AgentError):
    """A2A protocol communication failure"""
    code = "a2a_error"


class A2AClientError(A2AError):
    """A2A client-side failure (calling a remote agent)"""
    code = "a2a_client_error"


class A2AServerError(A2AError):
    """A2A server-side failure (handling a remote task)"""
    code = "a2a_server_error"


# ── API layer (L8) ──────────────────────────────────────────────

class AuthError(AgentError):
    """Authentication/authorization failure"""
    code = "auth_error"
    status_code = 401


class RateLimitExceededError(AgentError):
    """Request rate limit exceeded (M7.9)"""
    code = "rate_limit_exceeded"
    status_code = 429


class SessionNotFoundError(AgentError):
    """Session does not exist"""
    code = "session_not_found"
    status_code = 404


class ValidationError(AgentError):
    """Request validation failure"""
    code = "validation_error"
    status_code = 422


def safe_error_message(exc: Exception) -> str:
    """Extract a safe, non-leaking error message for end users.

    Never exposes internal stack traces or secrets (M7.10 / M11.9).
    """
    if isinstance(exc, AgentError):
        return exc.message
    # Generic fallback for unexpected exceptions
    return "Internal server error. Please try again or contact the administrator."


def error_code_of(exc: Exception) -> str:
    """Get the machine-readable error code for any exception"""
    if isinstance(exc, AgentError):
        return exc.code
    return "internal_error"
