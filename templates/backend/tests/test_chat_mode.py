"""Chat mode toggles (GPT/Doubao-like): web_search / deep_think / kb_id / sandbox.

Verifies the /api/chat route genuinely injects context from the `mode` payload
so the toggle really changes the answer (not decorative).
"""

import pytest
from app.l8_api.schemas import ChatRequest


def _req(**mode):
    return ChatRequest(message="测试问题", mode=mode)


@pytest.mark.asyncio
async def test_deep_think_injects_instruction():
    from app.l8_api.routes.chat import _build_context
    ctx = await _build_context(_req(deep_think=True))
    assert "[深度思考]" in ctx


@pytest.mark.asyncio
async def test_sandbox_off_notes_no_code():
    from app.l8_api.routes.chat import _build_context
    ctx = await _build_context(_req(sandbox=False))
    assert "[沙箱已关闭]" in ctx


@pytest.mark.asyncio
async def test_web_search_injects_results(monkeypatch):
    import app.l5_tools.base_tools as bt

    async def fake_web_search(query: str) -> str:
        return "FAKE_WEB_RESULT for " + query

    monkeypatch.setattr(bt, "web_search", fake_web_search)

    from app.l8_api.routes.chat import _build_context
    ctx = await _build_context(_req(web_search=True))
    assert "[联网搜索结果]" in ctx
    assert "FAKE_WEB_RESULT" in ctx
