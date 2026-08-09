"""L4 - Agent 节点逻辑

定义 LangGraph 图中的各个节点函数。
每个节点是一个独立处理步骤，接收状态并返回更新。
"""

from typing import Literal
from langchain_core.messages import AIMessage, ToolMessage

from .state import AgentState
from ..l2_interface.chat_interface import ChatInterface
from ..l3_prompt.prompt_builder import PromptBuilder
from ..l5_tools.registry import ToolRegistry
from ..l10_infra.config import settings


def _get_llm():
    """根据配置获取 LLM 实例"""
    return ChatInterface(
        provider=settings.LLM_PROVIDER,
        model=settings.LLM_MODEL,
        api_key=settings.LLM_API_KEY,
        api_base=settings.LLM_API_BASE,
        temperature=settings.LLM_TEMPERATURE,
        max_tokens=settings.LLM_MAX_TOKENS,
    )


async def agent_node(state: AgentState) -> dict:
    """Agent 核心节点
    
    接收当前状态，通过 L3 提示构建器组装 Prompt，
    调用 L2 接口与 LLM 交互，决定下一步操作。
    """
    # 获取当前配置
    llm = _get_llm()
    tools = ToolRegistry.get_all()
    
    # 使用 L3 提示构建器组装消息
    builder = PromptBuilder()
    messages = builder.build()
    
    # 添加历史消息
    for msg in state.get("messages", []):
        messages.append({
            "role": "user" if msg.type == "human" else "assistant",
            "content": msg.content,
        })
    
    try:
        # 通过 L2 接口调用 LLM
        response = await llm.chat(messages, tools=tools if tools else None)
        
        # 检查是否有工具调用
        if hasattr(response, "tool_calls") and response.tool_calls:
            return {
                "messages": [response],
                "next_step": "tools",
                "current_tool": response.tool_calls[0]["name"],
                "iteration_count": (state.get("iteration_count", 0) + 1),
            }
        else:
            return {
                "messages": [response],
                "next_step": "__end__",
                "current_tool": None,
            }
    
    except Exception as e:
        error_msg = f"Agent 调用失败: {str(e)}"
        return {
            "messages": [AIMessage(content=error_msg)],
            "next_step": "__end__",
            "error": error_msg,
        }


async def tool_node(state: AgentState) -> dict:
    """工具执行节点
    
    通过 L5 工具注册表执行 Agent 请求的工具调用。
    """
    last_message = state["messages"][-1]
    
    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        return {"next_step": "agent"}
    
    tool_results = []
    
    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call.get("args", {})
        tool_id = tool_call.get("id", "")
        
        try:
            # 通过 L5 工具注册表执行
            result = await ToolRegistry.execute(tool_name, tool_args)
            tool_results.append(
                ToolMessage(content=str(result), tool_call_id=tool_id)
            )
        except Exception as e:
            tool_results.append(
                ToolMessage(content=f"工具执行失败: {str(e)}", tool_call_id=tool_id)
            )
    
    return {
        "messages": tool_results,
        "next_step": "agent",
        "tool_results": {
            tc["name"]: tr.content
            for tc, tr in zip(last_message.tool_calls, tool_results)
        },
    }


async def router_node(state: AgentState) -> Literal["tools", "__end__"]:
    """路由节点
    
    根据 Agent 的输出决定下一步：
    - 需要工具调用 → 进入 L5 工具节点
    - 达到最大迭代次数 → 强制结束
    - 否则 → 结束
    """
    max_iterations = 10
    current_iter = state.get("iteration_count", 0)
    
    if current_iter >= max_iterations:
        return "__end__"
    
    if state.get("next_step") == "tools":
        return "tools"
    
    return "__end__"