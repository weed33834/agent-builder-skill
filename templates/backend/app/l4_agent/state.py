"""L4 - Agent State Management

Defines the state structure of the Agent during execution.
Uses MessagesState as the base class to ensure compatibility with LangGraph v1.0.
"""

from typing import TypedDict, Annotated, Sequence, Optional, Any, Dict, List
from langgraph.graph.message import add_messages, MessagesState
from langchain_core.messages import BaseMessage, AnyMessage


class AgentState(MessagesState):
    """Agent state (LangGraph v1.0 pattern)

    Inherits MessagesState to get standard message management capabilities,
    and uses the add_messages reducer to automatically merge message history.

    Field descriptions:
        messages: Conversation message history (inherited from MessagesState)
        thread_id: Session thread ID, used for memory persistence
        is_final: Whether it is completed, used for completion state tracking
        interrupts: List of human-in-the-loop interrupt points
        next_step: Name of the next node to execute
        tool_results: Intermediate result cache for tool calls
        current_tool: Name of the tool currently being executed
        error: Error message (if any)
        metadata: Extra metadata, such as session info, user context, etc.
        agent_type: Identifies the current Agent type during multi-Agent orchestration
        task_stack: Task decomposition stack, used for multi-Agent collaboration
        iteration_count: Current iteration count, prevents infinite loops
    """
    messages: Annotated[Sequence[BaseMessage], add_messages]
    thread_id: Optional[str]
    is_final: bool
    interrupts: Annotated[List[Dict[str, Any]], add_messages]
    next_step: Optional[str]
    tool_results: Optional[Dict[str, Any]]
    current_tool: Optional[str]
    error: Optional[str]
    metadata: Optional[Dict[str, Any]]
    agent_type: Optional[str]
    task_stack: Optional[List[Dict[str, Any]]]
    iteration_count: Optional[int]
