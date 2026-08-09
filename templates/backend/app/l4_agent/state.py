"""L4 - Agent 状态管理

定义 Agent 在执行过程中的状态结构。
使用 TypedDict 确保类型安全，使用 add_messages 归约器自动合并消息历史。
"""

from typing import TypedDict, Annotated, Sequence, Optional, Any, Dict, List
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    """Agent 状态的完整类型定义
    
    字段说明:
        messages: 对话消息历史，使用 add_messages 归约器自动追加
        next_step: 下一步要执行的节点名称
        tool_results: 工具调用的中间结果缓存
        current_tool: 当前正在执行的工具名称
        error: 错误信息（如果有）
        metadata: 额外的元数据，如会话信息、用户上下文等
        agent_type: 多 Agent 编排时标识当前 Agent 类型
        task_stack: 任务分解栈，用于多 Agent 协作
        iteration_count: 当前迭代次数，防止无限循环
    """
    messages: Annotated[Sequence[BaseMessage], add_messages]
    next_step: Optional[str]
    tool_results: Optional[Dict[str, Any]]
    current_tool: Optional[str]
    error: Optional[str]
    metadata: Optional[Dict[str, Any]]
    agent_type: Optional[str]
    task_stack: Optional[List[Dict[str, Any]]]
    iteration_count: Optional[int]