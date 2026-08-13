"""L8 - Chat API Endpoint

Provides an SSE streaming chat interface, supporting real-time streaming responses and tool call visualization.
"""

import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..schemas import ChatRequest
from ...l4_agent.graph import get_graph, get_graph_config
from ...l6_memory.session_manager import get_session_manager
from ...l10_infra.config import settings

router = APIRouter()


async def _build_context(request: ChatRequest) -> str:
    """Gather live context for chat mode toggles (GPT/Doubao-like).

    mode = {web_search, deep_think, kb_id, sandbox}. Each enabled flag
    prepends genuinely-fetched context to the user message, so it really
    changes the answer (not a decorative toggle).
    """
    mode = request.mode or {}
    parts: list[str] = []

    if mode.get("web_search"):
        try:
            from ...l5_tools.base_tools import web_search
            res = await web_search(request.message)
            parts.append(f"[联网搜索结果]\n{res}")
        except Exception as e:  # noqa: BLE001
            parts.append(f"[联网搜索失败: {e}]")

    kb_id = mode.get("kb_id")
    if kb_id:
        try:
            from ...l6_memory.rag_engine import RAGEngine
            engine = RAGEngine()
            chunks = await engine.retrieve(request.message, k=5)
            if chunks:
                cites = "\n".join(
                    f"- {c.text[:300]} (来源: {c.source}, 相似度 {round(c.score, 3)})"
                    for c in chunks
                )
                parts.append(f"[知识库引用 ({kb_id})]\n{cites}")
            else:
                parts.append("[知识库] 未检索到相关内容")
        except Exception as e:  # noqa: BLE001
            parts.append(f"[知识库检索失败: {e}]")

    if mode.get("deep_think"):
        parts.append("[深度思考] 请先给出简要思路与计划，再逐步推理，最后给出明确结论。")

    if mode.get("sandbox") is False:
        parts.append("[沙箱已关闭] 请勿执行代码，仅给出代码建议。")

    return "\n\n".join(parts)


@router.post("/chat")
async def chat(request: ChatRequest):
    """Streaming chat
    
    Returns the Agent's response in real time using SSE.
    Supports streaming tokens, tool call status, completion events, etc.
    """
    # Chat-mode context injection (web / RAG / deep-think / sandbox)
    message = request.message
    ctx = await _build_context(request)
    if ctx:
        message = f"{ctx}\n\n{message}"

    try:
        graph = get_graph()
        session_mgr = get_session_manager()
        
        # Get or create a session
        thread_id = request.thread_id
        if not thread_id:
            thread_id = session_mgr.create_session()
        
        config = get_graph_config(thread_id)
        
        # Save the user message
        await session_mgr.add_message(thread_id, "user", message)
        
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    
    async def event_stream():
        """SSE event stream"""
        tool_call_count = 0
        full_response = ""
        
        async for event in graph.astream_events(
            {"messages": [("human", message)]},
            config,
            version="v1",
        ):
            kind = event["event"]
            
            try:
                # L1/L2: LLM streaming token output
                if kind == "on_chat_model_stream":
                    chunk = event["data"].get("chunk", "")
                    content = chunk.content if hasattr(chunk, "content") else str(chunk)
                    if content:
                        full_response += content
                        yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
                
                # L5: Tool call start
                elif kind == "on_tool_start":
                    tool_call_count += 1
                    tool_name = event["name"]
                    tool_input = event["data"].get("input", "")
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool_name, 'input': str(tool_input)[:200]})}\n\n"
                
                # L5: Tool call end
                elif kind == "on_tool_end":
                    tool_name = event["name"]
                    tool_output = event["data"].get("output", "")
                    yield f"data: {json.dumps({'type': 'tool_end', 'tool': tool_name, 'output': str(tool_output)[:500]})}\n\n"
                
                # L3: Prompt building complete, LLM starts reasoning
                elif kind == "on_chat_model_start":
                    yield f"data: {json.dumps({'type': 'thinking'})}\n\n"
                
                # L4: Node status
                elif kind == "on_chain_start":
                    name = event.get("name", "")
                    if name in ["agent_node", "tool_node"]:
                        yield f"data: {json.dumps({'type': 'node_start', 'node': name})}\n\n"
                
                elif kind == "on_chain_end":
                    name = event.get("name", "")
                    if name in ["agent_node", "tool_node"]:
                        yield f"data: {json.dumps({'type': 'node_end', 'node': name})}\n\n"
            
            except Exception:
                # Ignore single event errors, continue streaming
                pass
        
        # Save the assistant response
        if full_response:
            await session_mgr.add_message(thread_id, "assistant", full_response)

        # 23-cost-billing: record usage (tokens estimated from I/O text length)
        try:
            from ...l10_infra.usage import record_usage
            est_in = max(10, len((request.message or "")) // 2)
            est_out = max(10, len(full_response) // 2)
            record_usage(thread_id, settings.LLM_PROVIDER, settings.LLM_MODEL, est_in, est_out)
        except Exception:  # noqa: BLE001
            pass
        
        # Stream end
        yield f"data: {json.dumps({'type': 'done', 'thread_id': thread_id, 'tool_calls': tool_call_count})}\n\n"
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat/reset")
async def reset_chat(thread_id: str | None = None):
    """Reset a session"""
    import uuid
    if thread_id:
        from ...l6_memory.session_manager import get_session_manager
        session_mgr = get_session_manager()
        session_mgr.delete_session(thread_id)
    new_thread_id = str(uuid.uuid4())
    return {"thread_id": new_thread_id, "message": "Session reset"}
