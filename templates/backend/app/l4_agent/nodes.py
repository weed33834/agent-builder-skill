"""L4 - Agent Node Logic

Defines the node functions in the LangGraph graph.
Each node is an independent processing step that receives state and returns updates.

Routing is performed by the graph's (conditional) edges, so these nodes return
plain state-update dicts and are reusable by BOTH the single-agent graph and
the multi-agent supervisor graph.
"""

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


def _assemble_messages(state: AgentState):
    """Build the L3 prompt-builder message list from the graph state.

    Keeps the ReAct round-trip intact: assistant messages preserve their
    structured `tool_calls` and tool results keep `tool_call_id`, so the
    model can correlate outputs with its own calls (dropping either causes
    the model to re-issue the same call until recursion_limit).
    """
    builder = PromptBuilder()
    messages = builder.build()
    for msg in state.get("messages", []):
        msg_type = getattr(msg, "type", "")
        if msg_type == "human":
            messages.append({"role": "user", "content": msg.content})
        elif msg_type == "tool":
            messages.append({
                "role": "tool",
                "content": str(msg.content),
                "tool_call_id": getattr(msg, "tool_call_id", ""),
            })
        elif msg_type == "ai":
            entry = {"role": "assistant", "content": msg.content}
            if getattr(msg, "tool_calls", None):
                entry["tool_calls"] = [
                    {
                        "name": tc.get("name", ""),
                        "args": tc.get("args", {}),
                        "id": tc.get("id", ""),
                        "type": "tool_call",
                    }
                    for tc in msg.tool_calls
                ]
            messages.append(entry)
        else:
            messages.append({"role": "assistant", "content": str(msg.content)})
    return messages


async def agent_node(state: AgentState) -> dict:
    """Agent core node

    Invokes the LLM via the L2 interface and returns an update dict. The
    graph's conditional edge routes to `tools` when tool calls are present,
    and to the terminal/aggregate node otherwise.
    """
    llm = _get_llm()
    tools = ToolRegistry.get_all()
    messages = _assemble_messages(state)

    try:
        response = await llm.chat(messages, tools=tools if tools else None)
        has_tools = hasattr(response, "tool_calls") and bool(response.tool_calls)
        return {
            "messages": [response],
            "current_tool": (response.tool_calls[0]["name"] if has_tools else None),
            "is_final": not has_tools,
            "iteration_count": state.get("iteration_count", 0) + 1,
        }
    except Exception as e:
        error_msg = f"Agent invocation failed: {str(e)}"
        return {
            "messages": [AIMessage(content=error_msg)],
            "error": error_msg,
            "is_final": True,
        }


async def agent_node_with_human(state: AgentState) -> dict:
    """Agent core node (with human-in-the-loop support)

    Inserts an interrupt() before executing a tool call to wait for human
    confirmation. Suitable for approval/review scenarios.
    """
    from langgraph.types import interrupt

    llm = _get_llm()
    tools = ToolRegistry.get_all()
    messages = _assemble_messages(state)

    try:
        response = await llm.chat(messages, tools=tools if tools else None)

        if hasattr(response, "tool_calls") and response.tool_calls:
            tool_name = response.tool_calls[0]["name"]
            tool_args = response.tool_calls[0].get("args", {})

            confirmation = interrupt({
                "type": "tool_approval",
                "tool": tool_name,
                "args": tool_args,
                "message": f"是否允许调用工具 {tool_name}？",
            })

            if confirmation is False:
                return {
                    "messages": [AIMessage(content=f"用户取消了工具 {tool_name} 的调用")],
                    "is_final": True,
                }
            return {
                "messages": [response],
                "current_tool": tool_name,
                "iteration_count": state.get("iteration_count", 0) + 1,
            }
        else:
            return {
                "messages": [response],
                "is_final": True,
                "iteration_count": state.get("iteration_count", 0) + 1,
            }
    except Exception as e:
        return {
            "messages": [AIMessage(content=f"Agent invocation failed: {str(e)}")],
            "error": str(e),
            "is_final": True,
        }


async def tool_node(state: AgentState) -> dict:
    """Tool execution node

    Executes the tool calls requested by the Agent via the L5 tool registry
    and returns the ToolMessages. The graph's edge decides where to continue.
    """
    last_message = state["messages"][-1]

    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        return {}

    tool_results = []

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call.get("args", {})
        tool_id = tool_call.get("id", "")

        try:
            result = await ToolRegistry.execute(tool_name, tool_args)
            tool_results.append(
                ToolMessage(content=str(result), tool_call_id=tool_id)
            )
        except Exception as e:
            tool_results.append(
                ToolMessage(content=f"Tool execution failed: {str(e)}", tool_call_id=tool_id)
            )

    return {
        "messages": tool_results,
        "tool_results": {
            tc.get("id", str(i)): tr.content
            for i, (tc, tr) in enumerate(zip(last_message.tool_calls, tool_results))
        },
    }


async def supervisor_node(state: AgentState) -> dict:
    """Supervisor dispatch node

    Produces a lightweight intent annotation consumed by the graph's
    conditional edge `_route_to_specialist`. Routing itself is keyword-based,
    so this node intentionally does NOT spend an LLM call — the analysis is
    derived from the conversation locally (zero token cost).
    """
    keywords = {
        "search": ("搜索", "查", "research", "search", "find"),
        "analysis": ("分析", "统计", "对比", "analyz", "compare", "report"),
        "write": ("写", "生成", "起草", "write", "draft", "compose"),
    }
    user_text = " ".join(
        str(m.content)
        for m in state.get("messages", [])
        if getattr(m, "type", "") == "human"
    ).lower()
    intent = next(
        (name for name, kws in keywords.items() if any(k in user_text for k in kws)),
        "general",
    )
    return {"supervisor_analysis": f"intent={intent}"}


# ── Planning & reflection (deep-spec 01 / universal-agent thinking layer) ──
# Both nodes are OPTIONAL: enabled via agent_framework.plan / agent_framework.reflect
# in the generated graph. They add the "think before act / critique after act"
# loop that most production universal agents ship with.

async def planner_node(state: AgentState) -> dict:
    """Planning node (optional): produce a concise step-by-step plan.

    Runs before the agent loop and stores the plan on the state so the agent
    has an explicit roadmap. Returns an update dict (routing via graph edge).
    """
    llm = _get_llm()
    last = next((m.content for m in reversed(state.get("messages", [])) if getattr(m, "type", "") == "human"), "")
    prompt = {
        "role": "system",
        "content": (
            "你是任务规划器。为以下用户请求制定一份简洁的分步执行计划（3-6 步），"
            "每步用一句话，说明做什么与为什么。不要执行任何操作，只输出计划文本。"
        ),
    }
    try:
        resp = await llm.chat([prompt, {"role": "user", "content": last}])
        return {"plan": resp.content}
    except Exception as e:
        return {"plan": "", "error": str(e)}


async def reflect_node(state: AgentState) -> dict:
    """Reflection node (optional): self-critique the final answer.

    Reviews the last assistant message and returns a verdict plus an optional
    refined answer. The graph routes this node to END; the reflection is stored
    on state (and surfaced by the streamer as a 'thinking'/'done' signal).
    """
    llm = _get_llm()
    last = next((m.content for m in reversed(state.get("messages", [])) if getattr(m, "type", "") == "ai"), "")
    prompt = {
        "role": "system",
        "content": (
            "你是评审员。对以下回答做一次冷静的自我反思：指出是否有遗漏、错误或不严谨之处，"
            "并给出修正后的最终回答。格式：\n[评价]\n...\n[修正]\n修正后的最终回答（若无需修正则原样保留）。"
        ),
    }
    try:
        resp = await llm.chat([prompt, {"role": "user", "content": last}])
        return {"reflection": resp.content}
    except Exception as e:
        return {"reflection": "", "error": str(e)}
