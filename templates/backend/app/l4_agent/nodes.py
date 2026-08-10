"""L4 - Agent Node Logic

Defines the node functions in the LangGraph graph.
Each node is an independent processing step that receives state and returns updates.

LangGraph v1.0 pattern:
  - Uses Command(goto=, update=) instead of directly returning dict
  - Supports interrupt() for human-in-the-loop
  - Comprehensive error handling and type annotations
"""

from typing import Literal
from langgraph.types import Command
from langgraph.types import interrupt
from langchain_core.messages import AIMessage, ToolMessage

from .state import AgentState
from ..l2_interface.chat_interface import ChatInterface
from ..l3_prompt.prompt_builder import PromptBuilder
from ..l5_tools.registry import ToolRegistry
from ..l10_infra.config import settings


def _get_llm():
    """Get an LLM instance based on configuration"""
    return ChatInterface(
        provider=settings.LLM_PROVIDER,
        model=settings.LLM_MODEL,
        api_key=settings.LLM_API_KEY,
        api_base=settings.LLM_API_BASE,
        temperature=settings.LLM_TEMPERATURE,
        max_tokens=settings.LLM_MAX_TOKENS,
    )


async def agent_node(state: AgentState) -> Command[Literal["tools", "__end__"]]:
    """Agent core node

    Receives the current state, assembles the Prompt via the L3 prompt builder,
    invokes the L2 interface to interact with the LLM, and decides the next step.

    v1.0 pattern: Returns a Command object, specifying both goto and update.
    """
    # Get current configuration
    llm = _get_llm()
    tools = ToolRegistry.get_all()

    # Assemble messages using the L3 prompt builder
    builder = PromptBuilder()
    messages = builder.build()

    # Add history messages
    for msg in state.get("messages", []):
        if msg.type == "human":
            role = "user"
        elif msg.type == "tool":
            role = "tool"
        else:
            role = "assistant"
        messages.append({
            "role": role,
            "content": msg.content,
        })

    try:
        # Invoke the LLM via the L2 interface
        response = await llm.chat(messages, tools=tools if tools else None)

        # Check whether there are tool calls
        if hasattr(response, "tool_calls") and response.tool_calls:
            return Command(
                goto="tools",
                update={
                    "messages": [response],
                    "current_tool": response.tool_calls[0]["name"],
                    "iteration_count": (state.get("iteration_count", 0) + 1),
                },
            )
        else:
            return Command(
                goto="__end__",
                update={
                    "messages": [response],
                    "current_tool": None,
                    "is_final": True,
                    "iteration_count": (state.get("iteration_count", 0) + 1),
                },
            )

    except Exception as e:
        error_msg = f"Agent invocation failed: {str(e)}"
        return Command(
            goto="__end__",
            update={
                "messages": [AIMessage(content=error_msg)],
                "error": error_msg,
                "is_final": True,
            },
        )


async def agent_node_with_human(state: AgentState) -> Command[Literal["tools", "human", "__end__"]]:
    """Agent core node (with human-in-the-loop support)

    Inserts an interrupt() before decision making to wait for human input confirmation.
    Suitable for scenarios requiring approval or review.
    """
    llm = _get_llm()
    tools = ToolRegistry.get_all()
    builder = PromptBuilder()
    messages = builder.build()

    for msg in state.get("messages", []):
        role = "user" if msg.type == "human" else "tool" if msg.type == "tool" else "assistant"
        messages.append({"role": role, "content": msg.content})

    try:
        response = await llm.chat(messages, tools=tools if tools else None)

        if hasattr(response, "tool_calls") and response.tool_calls:
            # Pause and wait for human confirmation of the tool call
            tool_name = response.tool_calls[0]["name"]
            tool_args = response.tool_calls[0].get("args", {})

            confirmation = interrupt({
                "type": "tool_approval",
                "tool": tool_name,
                "args": tool_args,
                "message": f"是否允许调用工具 {tool_name}？",
            })

            if confirmation is False:
                return Command(
                    goto="__end__",
                    update={
                        "messages": [AIMessage(content=f"用户取消了工具 {tool_name} 的调用")],
                        "is_final": True,
                    },
                )

            return Command(
                goto="tools",
                update={
                    "messages": [response],
                    "current_tool": tool_name,
                    "iteration_count": (state.get("iteration_count", 0) + 1),
                },
            )
        else:
            return Command(
                goto="__end__",
                update={
                    "messages": [response],
                    "is_final": True,
                    "iteration_count": (state.get("iteration_count", 0) + 1),
                },
            )

    except Exception as e:
        error_msg = f"Agent invocation failed: {str(e)}"
        return Command(
            goto="__end__",
            update={
                "messages": [AIMessage(content=error_msg)],
                "error": error_msg,
                "is_final": True,
            },
        )


async def tool_node(state: AgentState) -> Command[Literal["agent", "__end__"]]:
    """Tool execution node

    Executes the tool calls requested by the Agent via the L5 tool registry.
    Returns a Command object, automatically returning to the Agent node to continue execution.
    """
    last_message = state["messages"][-1]

    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        return Command(goto="agent", update={})

    tool_results = []

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call.get("args", {})
        tool_id = tool_call.get("id", "")

        try:
            # Execute via the L5 tool registry
            result = await ToolRegistry.execute(tool_name, tool_args)
            tool_results.append(
                ToolMessage(content=str(result), tool_call_id=tool_id)
            )
        except Exception as e:
            tool_results.append(
                ToolMessage(content=f"Tool execution failed: {str(e)}", tool_call_id=tool_id)
            )

    return Command(
        goto="agent",
        update={
            "messages": tool_results,
            "tool_results": {
                tc.get("id", str(i)): tr.content
                for i, (tc, tr) in enumerate(zip(last_message.tool_calls, tool_results))
            },
        },
    )


async def supervisor_node(state: AgentState) -> Command[Literal["specialist_1", "specialist_2", "__end__"]]:
    """Supervisor dispatch node

    Responsible for analyzing tasks and dispatching them to the appropriate Specialist Agent during multi-Agent orchestration.
    """
    llm = _get_llm()
    messages = state.get("messages", [])

    # Supervisor analyzes the task type
    analysis_prompt = {
        "role": "system",
        "content": "你是一个任务分发 Supervisor。分析用户请求，决定应该由哪个 Specialist 处理。"
                   "回复 'specialist_1' 表示搜索/查找类任务，'specialist_2' 表示分析/总结类任务。"
                   "如果任务已完成，回复 'END'。",
    }

    try:
        supervisor_messages = [analysis_prompt]
        for msg in messages:
            if msg.type == "human":
                supervisor_messages.append({"role": "user", "content": msg.content})

        response = await llm.chat(supervisor_messages)
        decision = response.content.strip().upper()

        if decision == "END":
            return Command(goto="__end__", update={"is_final": True})
        elif decision == "SPECIALIST_2":
            return Command(
                goto="specialist_2",
                update={"agent_type": "specialist_2"},
            )
        else:
            return Command(
                goto="specialist_1",
                update={"agent_type": "specialist_1"},
            )

    except Exception as e:
        error_msg = f"Supervisor dispatch failed: {str(e)}"
        return Command(
            goto="__end__",
            update={
                "messages": [AIMessage(content=error_msg)],
                "error": error_msg,
                "is_final": True,
            },
        )
