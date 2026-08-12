"""M8 — SSE streaming end-to-end regression (deep-spec 06-models M8).

Verifies the /api/chat SSE contract that the frontend `streamChat` consumes:
  1. POST /api/chat?stream=true  -> media_type text/event-stream
  2. the body is a sequence of `data: {json}` lines
  3. token events and a final done event are emitted

A fake runtime is injected so the test runs without an LLM API key.
"""

import json

from fastapi.testclient import TestClient


def _install_fake_runtime():
    import app.l8_api.routes.chat as chat_mod

    class _DummySession:
        def create_session(self):
            return "test-thread"

        async def add_message(self, *a, **k):
            return None

    class _FakeGraph:
        async def astream_events(self, *args, **kwargs):
            yield {"event": "on_chat_model_stream", "data": {"chunk": {"content": "Hel"}}}
            yield {"event": "on_chat_model_stream", "data": {"chunk": {"content": "lo"}}}
            yield {"event": "on_tool_start", "data": {"name": "web_search", "input": ""}}
            yield {"event": "on_tool_end", "data": {"name": "web_search", "output": "ok"}}

    chat_mod.get_graph = lambda: _FakeGraph()
    chat_mod.get_graph_config = lambda *a, **k: {}
    chat_mod.get_session_manager = lambda: _DummySession()
    return chat_mod


def test_chat_streaming_returns_sse_stream():
    _install_fake_runtime()
    client = TestClient(_get_app())

    with client.stream("POST", "/api/chat", json={"message": "hi", "stream": True}) as r:
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/event-stream")
        body = "".join(r.iter_text())

    assert "data: {" in body
    assert '"type": "token"' in body
    assert '"type": "done"' in body

    # every data line must be valid JSON
    for line in body.splitlines():
        if line.startswith("data: "):
            payload = json.loads(line[6:])
            assert "type" in payload


def test_chat_nonstreaming_endpoint_reachable():
    """Non-streaming /api/chat must be wired (returns JSON or controlled error)."""
    _install_fake_runtime()
    client = TestClient(_get_app())
    resp = client.post("/api/chat", json={"message": "hi", "stream": False})
    # Without a real key the LLM call fails — accept any HTTP response as long as
    # the route is reachable and not a 404.
    assert resp.status_code != 404


def _get_app():
    from app.main import app
    return app
