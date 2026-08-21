"""Tests for L6 memory: KB / RAG / summary (pure logic, stdlib-only)"""

import asyncio

import pytest

from app.l6_memory.knowledge_base import KnowledgeBase, KnowledgeBaseManager
from app.l6_memory.summary import ConversationSummarizer, should_summarize


def run(coro):
    return asyncio.run(coro)


def test_summary_fallback():
    s = ConversationSummarizer(llm=None)
    text = s._extractive_fallback("User: goal is to build an agent. Decide: use langgraph. Conclusion: done.")
    assert len(text) > 20


def test_should_summarize_threshold():
    assert should_summarize([1] * 5) is False
    assert should_summarize([1] * 100) is True


def test_kb_add_query_clear():
    kb = KnowledgeBase(name="demo")

    async def _t():
        await kb.add_text("The orchestrator uses the A2A protocol.", source="manual")
        await kb.add_text("Memory includes rolling summaries and RAG.", source="notes")
        res = await kb.query("What is the A2A protocol?")
        assert len(res.chunks) >= 1
        assert (await kb.stats())["chunk_count"] == 2
        await kb.clear()
        assert (await kb.stats())["chunk_count"] == 0

    run(_t())


def test_kb_manager():
    mgr = KnowledgeBaseManager()
    mgr.create("kb1")

    async def _t():
        await mgr.remove("kb1")

    run(_t())
    assert mgr.list() == []
