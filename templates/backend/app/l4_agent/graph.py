"""L4 - Agent Graph Definition

Builds the LangGraph execution graph, defining nodes, edges, and compile options.
Supports single Agent and multi-Agent orchestration.

LangGraph v1.0 pattern:
  - Uses add_edge(START, node) instead of set_entry_point()
  - Uses Command(goto=, update=) instead of directly returning next_step
  - Supports cache= parameter for node caching
  - Integrates the langgraph-supervisor pattern
"""

from typing import Optional, Any
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from .state import AgentState
from .nodes import agent_node, tool_node, supervisor_node
from ..l10_infra.config import settings


def build_single_agent_graph() -> StateGraph:
    """Build a single Agent graph

    Standard structure: START → agent → (tools → agent) | END

    Nodes:
        agent: Core Agent node (L3 prompt + L2 interface + L1 model)
        tools: Tool execution node (L5 tool registry)

    Routing:
        agent → tools: When a tool call is needed
        agent → END: When answering directly
        tools → agent: Return to Agent after tool execution
    """
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tool_node)

    # Set entry point (v1.0 pattern)
    workflow.add_edge(START, "agent")

    # Conditional edge: Agent decides whether a tool call is needed
    workflow.add_conditional_edges(
        "agent",
        _route_from_agent,
        {
            "tools": "tools",
            END: END,
        },
    )

    # Return to Agent after tool execution
    workflow.add_edge("tools", "agent")

    return workflow


def _route_from_agent(state: AgentState) -> str:
    """Route from the Agent node, determine whether a tool call is needed"""
    last_message = state["messages"][-1] if state.get("messages") else None
    if last_message and hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END


def build_supervisor_graph() -> StateGraph:
    """Build a Supervisor orchestration graph (langgraph-supervisor pattern)

    Structure: START → supervisor → specialist_1|specialist_2 → aggregator → END

    Uses supervisor_node for task dispatch, supports dynamic Agent assignment.
    """
    workflow = StateGraph(AgentState)

    # Supervisor node
    workflow.add_node("supervisor", supervisor_node)
    # Specialist Agents
    workflow.add_node("specialist_1", agent_node)
    workflow.add_node("specialist_2", agent_node)
    # Aggregator Agent
    workflow.add_node("aggregator", agent_node)

    workflow.add_edge(START, "supervisor")

    # Supervisor routes to specialist Agents
    workflow.add_conditional_edges(
        "supervisor",
        _route_to_specialist,
        {
            "specialist_1": "specialist_1",
            "specialist_2": "specialist_2",
            END: END,
        },
    )

    # Specialist Agents to aggregator
    workflow.add_edge("specialist_1", "aggregator")
    workflow.add_edge("specialist_2", "aggregator")
    workflow.add_edge("aggregator", END)

    return workflow


def _route_to_specialist(state: AgentState) -> str:
    """Routing logic: decide which specialist Agent to use based on user input"""
    last_message = state["messages"][-1].content.lower() if state.get("messages") else ""

    keywords_1 = ["搜索", "查找", "查询", "search", "find", "lookup"]
    keywords_2 = ["分析", "总结", "对比", "analyze", "summarize", "compare"]

    for kw in keywords_1:
        if kw in last_message:
            return "specialist_1"
    for kw in keywords_2:
        if kw in last_message:
            return "specialist_2"

    return "specialist_1"


def build_react_agent_graph() -> StateGraph:
    """Build a graph using LangGraph prebuilt create_react_agent

    create_react_agent wraps the standard agent + tools loop pattern,
    automatically handling tool call routing and result passback.
    """
    from ..l5_tools.registry import ToolRegistry
    from ..l2_interface.chat_interface import ChatInterface

    llm = ChatInterface(
        provider=settings.LLM_PROVIDER,
        model=settings.LLM_MODEL,
        api_key=settings.LLM_API_KEY,
        api_base=settings.LLM_API_BASE,
        temperature=settings.LLM_TEMPERATURE,
        max_tokens=settings.LLM_MAX_TOKENS,
    )

    tools = ToolRegistry.get_all()
    agent = create_react_agent(llm, tools)

    return agent


def compile_graph(
    graph: StateGraph,
    cache: Optional[str] = None,
) -> StateGraph:
    """Compile the graph, adding checkpoint (memory) support

    Args:
        graph: The StateGraph to compile
        cache: Node cache strategy, such as "inmemory" or None
    Returns:
        The compiled graph
    """
    checkpointer = MemorySaver()
    compile_kwargs: dict[str, Any] = {"checkpointer": checkpointer}

    if cache:
        compile_kwargs["cache"] = cache

    return graph.compile(**compile_kwargs)


# Global graph instance
_graph = None


def get_graph() -> StateGraph:
    """Get the global graph instance

    Uses the singleton pattern, supports automatically selecting the graph type based on configuration.
    Supports multiple graph building strategies, switchable via settings.
    """
    global _graph
    if _graph is None:
        agent_type = getattr(settings, "AGENT_GRAPH_TYPE", "single")

        if agent_type == "supervisor":
            graph = build_supervisor_graph()
        elif agent_type == "react":
            return build_react_agent_graph()
        else:
            graph = build_single_agent_graph()

        _graph = compile_graph(graph)
    return _graph


def get_graph_config(thread_id: Optional[str] = None) -> dict:
    """Get the graph configuration"""
    config = {
        "configurable": {
            "thread_id": thread_id or "default",
            "max_tool_calls": settings.MAX_TOOL_CALLS,
        },
    }
    return config
