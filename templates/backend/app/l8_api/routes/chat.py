"""L8 - 聊天 API 端点

提供 SSE 流式聊天接口，支持实时流式响应和工具调用可视化。
"""

import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..schemas import ChatRequest
from ...l4_agent.graph import get_graph, get_graph_config
from ...l6_memory.session_manager import get_session_manager

router = APIRouter()


@router.post("/chat")
async def chat(request: ChatRequest):
    """流式聊天
    
    使用 SSE 实时返回 Agent 的响应。
    支持流式 Token、工具调用状态、完成事件等。
    """
    try:
        graph = get_graph()
        session_mgr = get_session_manager()
        
        # 获取或创建会话
        thread_id = request.thread_id
        if not thread_id:
            thread_id = session_mgr.create_session()
        
        config = get_graph_config(thread_id)
        
        # 保存用户消息
        await session_mgr.add_message(thread_id, "user", request.message)
        
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    
    async def event_stream():
        """SSE 事件流"""
        tool_call_count = 0
        full_response = ""
        
        async for event in graph.astream_events(
            {"messages": [("human", request.message)]},
            config,
            version="v1",
        ):
            kind = event["event"]
            
            try:
                # L1/L2: LLM 流式输出 Token
                if kind == "on_chat_model_stream":
                    chunk = event["data"].get("chunk", "")
                    content = chunk.content if hasattr(chunk, "content") else str(chunk)
                    if content:
                        full_response += content
                        yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
                
                # L5: 工具调用开始
                elif kind == "on_tool_start":
                    tool_call_count += 1
                    tool_name = event["name"]
                    tool_input = event["data"].get("input", "")
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool_name, 'input': str(tool_input)[:200]})}\n\n"
                
                # L5: 工具调用结束
                elif kind == "on_tool_end":
                    tool_name = event["name"]
                    tool_output = event["data"].get("output", "")
                    yield f"data: {json.dumps({'type': 'tool_end', 'tool': tool_name, 'output': str(tool_output)[:500]})}\n\n"
                
                # L3: 提示构建完成，LLM 开始推理
                elif kind == "on_chat_model_start":
                    yield f"data: {json.dumps({'type': 'thinking'})}\n\n"
                
                # L4: 节点状态
                elif kind == "on_chain_start":
                    name = event.get("name", "")
                    if name in ["agent_node", "tool_node"]:
                        yield f"data: {json.dumps({'type': 'node_start', 'node': name})}\n\n"
                
                elif kind == "on_chain_end":
                    name = event.get("name", "")
                    if name in ["agent_node", "tool_node"]:
                        yield f"data: {json.dumps({'type': 'node_end', 'node': name})}\n\n"
            
            except Exception:
                # 忽略单个事件的错误，继续流
                pass
        
        # 保存助手响应
        if full_response:
            await session_mgr.add_message(thread_id, "assistant", full_response)
        
        # 流结束
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
    """重置会话"""
    import uuid
    if thread_id:
        from ...l6_memory.session_manager import get_session_manager
        session_mgr = get_session_manager()
        session_mgr.delete_session(thread_id)
    new_thread_id = str(uuid.uuid4())
    return {"thread_id": new_thread_id, "message": "会话已重置"}