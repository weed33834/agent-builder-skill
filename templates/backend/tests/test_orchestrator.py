"""Tests for L7 orchestrator: workflow / router / supervisor (pure async logic)"""

import asyncio

import pytest

from app.l7_orchestrator.router import IntentRouter
from app.l7_orchestrator.supervisor import Supervisor
from app.l7_orchestrator.workflow import WorkflowExecutor, OrchestrationError


def run(coro):
    return asyncio.run(coro)


async def _double(text, ctx):
    return text + "!"


def test_workflow_serial():
    wf = {
        "name": "demo",
        "steps": [
            {"id": "a", "agent": "double", "input": "$user_input"},
            {"id": "b", "agent": "double", "input": "$a.output", "depends_on": ["a"]},
        ],
    }
    ex = WorkflowExecutor(agents={"double": _double})
    out = run(ex.run(wf, "hi"))
    assert out["outputs"]["a"] == "hi!"
    assert out["outputs"]["b"] == "hi!!"


def test_workflow_fanout():
    wf = {
        "name": "fan",
        "steps": [
            {"id": "x", "agent": "double", "input": "$user_input"},
            {"id": "y", "agent": "double", "input": "$user_input"},
        ],
    }
    ex = WorkflowExecutor(agents={"double": _double})
    out = run(ex.run(wf, "go"))
    assert out["outputs"]["x"] == "go!"
    assert out["outputs"]["y"] == "go!"


def test_workflow_inline_ref():
    wf = {
        "name": "inline",
        "steps": [
            {"id": "a", "agent": "double", "input": "$user_input"},
            {"id": "b", "agent": "double", "input": "result was $a.output", "depends_on": ["a"]},
        ],
    }
    ex = WorkflowExecutor(agents={"double": _double})
    out = run(ex.run(wf, "ok"))
    assert out["outputs"]["b"] == "result was ok!!"


def test_workflow_missing_step_ref():
    wf = {"name": "bad", "steps": [{"id": "a", "agent": "double", "input": "$nope"}]}
    ex = WorkflowExecutor(agents={"double": _double})
    with pytest.raises(OrchestrationError):
        run(ex.run(wf, "x"))


def test_workflow_dependency_blocking():
    """step b depends on a; a must run before b"""
    calls = []

    async def recorder(text, ctx):
        calls.append(text)
        return text + "!"

    wf = {
        "name": "dep",
        "steps": [
            {"id": "a", "agent": "r", "input": "$user_input"},
            {"id": "b", "agent": "r", "input": "$a.output", "depends_on": ["a"]},
        ],
    }
    ex = WorkflowExecutor(agents={"r": recorder})
    run(ex.run(wf, "z"))
    assert calls == ["z", "z!"]


@pytest.mark.asyncio
async def test_router_keyword():
    router = IntentRouter(
        agents={"coding": 1, "research": 2},
        keyword_rules={"coding": ["代码", "写"], "research": ["研究"]},
    )
    assert (await router.route("帮我写代码"))[1] == "coding"
    assert (await router.route("研究一下"))[1] == "research"


def test_supervisor_rounds():
    calls = []

    async def worker(text, ctx):
        calls.append(text)
        return "done: " + text

    sup = Supervisor(max_rounds=4)
    sup.register_agent("w", worker)
    result = run(sup.run("task"))
    assert len(calls) == 1
    assert result.startswith("done:")
