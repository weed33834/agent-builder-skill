"""L7 - Workflow Orchestration

Declarative workflow orchestration (M6.8 prompt-chain + M6.6 fan-out/fan-in).
Define agent workflows as YAML/dict DAGs; the executor runs them.

Workflow schema:
    {
      "name": "research-report",
      "steps": [
        {"id": "plan",   "agent": "planner",      "input": "$user_input"},
        {"id": "search", "agent": "researcher",   "input": "$plan.output", "depends_on": ["plan"]},
        {"id": "write",  "agent": "writer",       "input": "$search.output", "depends_on": ["search"]},
        {"id": "review", "agent": "reviewer",     "input": "$write.output", "depends_on": ["write"],
         "retry": {"max_attempts": 2, "on_fail": "escalate"}}
      ]
    }

Supported patterns:
- Sequential chain (M6.8)
- Fan-out / fan-in parallel (M6.6)
- Conditional skip
- Retry with policy
"""

import asyncio
import re
import uuid
from typing import Any, Awaitable, Callable, Optional

from .base import TaskResult
from ..l10_infra.errors import OrchestrationError

AgentRunner = Callable[[str, dict], Awaitable[Any]]


class WorkflowExecutor:
    """Executes declarative agent workflows"""

    def __init__(self, agents: Optional[dict[str, AgentRunner]] = None):
        self.agents = agents or {}

    def register_agent(self, name: str, runner: AgentRunner):
        self.agents[name] = runner

    # ── main entry ─────────────────────────────────────────────

    async def run(self, workflow: dict, user_input: str = "") -> dict:
        """Execute a workflow definition.

        Returns:
            {"workflow": name, "outputs": {step_id: output}, "status": "completed|failed"}
        """
        name = workflow.get("name", "unnamed")
        steps = workflow.get("steps", [])
        if not steps:
            raise OrchestrationError(f"Workflow '{name}' has no steps")

        run_id = str(uuid.uuid4())[:8]
        outputs: dict[str, Any] = {}
        statuses: dict[str, str] = {}

        # Build dependency graph
        step_map = {s["id"]: s for s in steps}
        remaining = {s["id"]: s for s in steps}

        while remaining:
            progressed = False
            ready = [
                s for s in remaining.values()
                if all(d in outputs for d in s.get("depends_on", []))
            ]
            if not ready:
                # Circular dependency or missing input
                raise OrchestrationError(
                    f"Workflow '{name}' has unsatisfiable dependencies: {list(remaining)}"
                )

            # Run ready steps in parallel (fan-out, M6.6)
            results = await asyncio.gather(
                *(self._run_step(s, outputs, user_input, run_id) for s in ready),
                return_exceptions=True,
            )

            for step, result in zip(ready, results):
                remaining.pop(step["id"], None)
                if isinstance(result, Exception):
                    statuses[step["id"]] = "failed"
                    outputs[step["id"]] = f"Step '{step['id']}' failed: {result}"
                    # Fail-fast unless step allows continuing
                    if not step.get("continue_on_error"):
                        raise OrchestrationError(
                            f"Workflow '{name}' failed at step '{step['id']}': {result}"
                        ) from result
                else:
                    statuses[step["id"]] = "completed"
                    outputs[step["id"]] = result
                progressed = True

            if not progressed:  # pragma: no cover
                break

        return {
            "workflow": name,
            "run_id": run_id,
            "status": "completed",
            "outputs": outputs,
            "step_statuses": statuses,
        }

    # ── step execution ─────────────────────────────────────────

    async def _run_step(self, step: dict, outputs: dict, user_input: str, run_id: str) -> Any:
        agent_name = step.get("agent")
        if agent_name not in self.agents:
            raise OrchestrationError(f"Agent '{agent_name}' not registered")

        # Resolve input template: "$user_input" or "$step_id.output" or literal
        input_text = self._resolve_input(step.get("input", "$user_input"), outputs, user_input)

        # Retry policy (default: 1 attempt)
        retry_cfg = step.get("retry", {})
        max_attempts = int(retry_cfg.get("max_attempts", 1))
        delay = float(retry_cfg.get("delay", 0.5))

        context = {"run_id": run_id, "step_id": step.get("id"), "workflow": step.get("_workflow", "")}
        last_exc: Optional[Exception] = None

        for attempt in range(1, max_attempts + 1):
            try:
                return await self.agents[agent_name](input_text, context)
            except Exception as e:
                last_exc = e
                if attempt < max_attempts:
                    await asyncio.sleep(delay * attempt)

        raise OrchestrationError(
            f"Step '{step.get('id')}' agent '{agent_name}' failed after {max_attempts} attempts"
        ) from last_exc

    def _resolve_input(self, template: Any, outputs: dict, user_input: str) -> str:
        """Resolve input templates:
        - "$user_input" → original user input
        - "$step_id.output" → previous step output
        - "$step_id.attr" → previous step output attribute
        - literal string → as-is
        """
        if not isinstance(template, str):
            return str(template)

        if template == "$user_input":
            return user_input

        m = re.match(r"^\$([A-Za-z0-9_]+)(?:\.([A-Za-z0-9_]+))?$", template)
        if m:
            step_id, attr = m.group(1), m.group(2)
            if step_id not in outputs:
                raise OrchestrationError(f"Step '{step_id}' has no output yet")
            val = outputs[step_id]
            if attr is not None and attr != "output":
                if isinstance(val, dict):
                    if attr not in val:
                        raise OrchestrationError(f"Step '{step_id}' output has no key '{attr}'")
                    val = val[attr]
                else:
                    raise OrchestrationError(
                        f"Step '{step_id}' output is not a dict, cannot access '.{attr}'"
                    )
            return str(val)

        # Replace inline references like "Use $plan.output to write"
        def _replace(match: re.Match) -> str:
            ref = match.group(1)
            parts = ref.split(".")
            step_id = parts[0]
            if step_id == "user_input":
                return user_input
            if step_id in outputs:
                val = outputs[step_id]
                # ".output" or no suffix = the step's whole output
                rest = [p for p in parts[1:] if p != "output"]
                for attr in rest:
                    if isinstance(val, dict):
                        val = val.get(attr, "")
                    else:
                        val = ""
                return str(val)
            return match.group(0)

        return re.sub(r"\$([A-Za-z0-9_.]+)", _replace, template)


def parse_workflow_yaml(path: str) -> dict:
    """Load a workflow definition from a YAML file (M6.24)"""
    try:
        import yaml
    except ImportError as e:
        raise OrchestrationError("Workflow YAML parsing requires pyyaml: pip install pyyaml") from e
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)
