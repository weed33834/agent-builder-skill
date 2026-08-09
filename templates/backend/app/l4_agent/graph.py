"""L4 - Agent 图定义

构建 LangGraph 执行图，定义节点、边和编译选项。
支持单 Agent 和多 Agent 编排。
"""

from typing import Optional
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from .state import AgentState
from .nodes import agent_node, tool_node, router_node
from ..l10_infra.config import settings


def build_single_agent_graph() -> StateGraph:
    """构建单 Agent 图
    
    标准结构: agent → router → (tools → agent) | end
    
    节点:
        agent: 核心 Agent 节点（L3 提示 + L2 接口 + L1 模型）
        tools: 工具执行节点（L5 工具注册表）
    
    路由:
        agent → tools: 需要工具调用时
        agent → end: 直接回答时
        tools → agent: 工具执行完后回到 Agent
    """
    workflow = StateGraph(AgentState)
    
    # 添加节点
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tool_node)
    
    # 设置入口
    workflow.set_entry_point("agent")
    
    # 条件边：Agent 决定是否需要工具调用
    workflow.add_conditional_edges(
        "agent",
        router_node,
        {
            "tools": "tools",
            END: END,
        },
    )
    
    # 工具执行完后回到 Agent
    workflow.add_edge("tools", "agent")
    
    return workflow


def build_multi_agent_graph() -> StateGraph:
    """构建多 Agent 编排图
    
    通过 L7 编排层实现多 Agent 协作。
    结构: supervisor → specialist_1|specialist_2 → aggregator → end
    """
    workflow = StateGraph(AgentState)
    
    # 监督 Agent
    workflow.add_node("supervisor", agent_node)
    # 专门 Agent
    workflow.add_node("specialist_1", agent_node)
    workflow.add_node("specialist_2", agent_node)
    # 汇总 Agent
    workflow.add_node("aggregator", agent_node)
    
    workflow.set_entry_point("supervisor")
    
    # 监督 Agent 路由到专门 Agent
    workflow.add_conditional_edges(
        "supervisor",
        lambda state: _route_to_specialist(state),
        {
            "specialist_1": "specialist_1",
            "specialist_2": "specialist_2",
            END: END,
        },
    )
    
    # 专门 Agent 到汇总
    workflow.add_edge("specialist_1", "aggregator")
    workflow.add_edge("specialist_2", "aggregator")
    workflow.add_edge("aggregator", END)
    
    return workflow


def _route_to_specialist(state: AgentState) -> str:
    """路由逻辑：根据用户输入决定使用哪个专门 Agent"""
    last_message = state["messages"][-1].content.lower() if state["messages"] else ""
    
    keywords_1 = ["搜索", "查找", "查询", "search", "find", "lookup"]
    keywords_2 = ["分析", "总结", "对比", "analyze", "summarize", "compare"]
    
    for kw in keywords_1:
        if kw in last_message:
            return "specialist_1"
    for kw in keywords_2:
        if kw in last_message:
            return "specialist_2"
    
    return "specialist_1"


def compile_graph(graph: StateGraph) -> StateGraph:
    """编译图，添加检查点（记忆）支持"""
    checkpointer = MemorySaver()
    return graph.compile(checkpointer=checkpointer)


# 全局图实例
_graph = None


def get_graph() -> StateGraph:
    """获取全局图实例"""
    global _graph
    if _graph is None:
        if settings.LLM_PROVIDER:
            graph = build_single_agent_graph()
        else:
            graph = build_single_agent_graph()
        _graph = compile_graph(graph)
    return _graph


def get_graph_config(thread_id: Optional[str] = None) -> dict:
    """获取图配置"""
    config = {
        "configurable": {
            "thread_id": thread_id or "default",
            "max_tool_calls": settings.MAX_TOOL_CALLS,
        },
    }
    return config