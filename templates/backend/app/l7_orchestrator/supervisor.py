"""L7 - Supervisor Pattern

Supervisor-based multi-agent orchestration (M6.2).
A supervisor node decides which worker agent handles each step,
mirroring langgraph-supervisor / Magentic-One Orchestrator patterns.

Works with l4_agent/graph.py build_supervisor_graph().
"""

import uuid
from typing import Any, Callable, Optional, Awaitable

from .base import SubTask, TaskResult
from ..l10_infra.errors import OrchestrationError

AgentRunner = Callable[[str, dict], Awaitable[Any]]


class Supervisor:
    """Supervisor orchestrator (M6.2 + M6.9 hierarchical)

    Attributes:
        agents: mapping {agent_name: runner}
        max_rounds: max dispatch rounds before giving up
        task_ledger: Magentic-One style task ledger (M6.11)
        progress_ledger: Magentic-One style progress ledger (M6.12)
    """

    def __init__(self, max_rounds: int = 10):
        self.agents: dict[str, AgentRunner] = {}
        self.max_rounds = max_rounds
        # Magentic-One style ledgers (M6.11/M6.12)
        self.task_ledger: list[dict] = []
        self.progress_ledger: list[dict] = []

    def register_agent(self, name: str, runner: AgentRunner):
        """Register a worker agent (async callable: (task, input_data) -> result)"""
        self.agents[name] = runner

    def register_agents(self, agents: dict[str, AgentRunner]):
        self.agents.update(agents)

    def available_agents(self) -> list[str]:
        return list(self.agents.keys())

    # ── orchestration loop (M6.2 supervisor loop) ─────────────

    async def run(self, user_input: str, context: Optional[dict] = None) -> str:
        """Run the supervisor loop until the task completes.

        Flow:
        1. Record the task in the task ledger (M6.11)
        2. Supervisor picks the next agent (LLM routing or round-robin)
        3. Agent runs; result recorded in progress ledger (M6.12)
        4. Loop until done or max_rounds
        """
        if not self.agents:
            raise OrchestrationError("No worker agents registered with Supervisor")

        context = context or {}
        task_id = str(uuid.uuid4())[:8]
        self.task_ledger.append({
            "task_id": task_id,
            "input": user_input,
            "status": "in_progress",
        })

        current_input = user_input
        current_agent: Optional[str] = None

        for round_idx in range(self.max_rounds):
            # Supervisor decision: which agent next
            current_agent = await self._decide_next_agent(
                user_input, current_input, current_agent, context
            )

            self.progress_ledger.append({
                "round": round_idx,
                "task_id": task_id,
                "agent": current_agent,
                "input": current_input[:200],
                "status": "running",
            })

            try:
                result = await self.agents[current_agent](current_input, context)
                completed = self._is_done(result)
            except Exception as e:
                result = f"Agent '{current_agent}' failed: {e}"
                completed = False

            self.progress_ledger[-1]["status"] = "completed" if completed else "partial"
            self.progress_ledger[-1]["output"] = str(result)[:200]

            if completed:
                self.task_ledger[-1]["status"] = "completed"
                return str(result)

            # Feed result back as next input (chained workflow)
            current_input = str(result)

        self.task_ledger[-1]["status"] = "max_rounds_reached"
        return (
            f"Supervisor reached max rounds ({self.max_rounds}) without completion. "
            f"Last agent: {current_agent}. Last output: {current_input[:300]}"
        )

    # ── decision logic ─────────────────────────────────────────

    async def _decide_next_agent(
        self,
        original_input: str,
        current_input: str,
        previous_agent: Optional[str],
        context: dict,
    ) -> str:
        """Choose the next agent.

        Strategy:
        1. If a router callable is configured, use it
        2. If only one agent, use it
        3. Otherwise round-robin fallback
        """
        router = context.get("router")
        if router is not None:
            chosen = await router(current_input, list(self.agents.keys()))
            if chosen in self.agents:
                return chosen

        names = list(self.agents.keys())
        if len(names) == 1:
            return names[0]

        # Round-robin (avoid repeating the same agent)
        if previous_agent and previous_agent in names:
            idx = (names.index(previous_agent) + 1) % len(names)
            return names[idx]
        return names[0]

    def _is_done(self, result: Any) -> bool:
        """Heuristic: is the result a final answer?

        - bool True / "done" / "complete" markers → done
        - dict with {"status": "completed"} → done
        """
        if isinstance(result, bool):
            return result
        if isinstance(result, dict):
            return result.get("status") in ("completed", "done", "final")
        if isinstance(result, str):
            lowered = result.lower().strip()
            return lowered.startswith(("done", "completed", "final:", "任务完成", "完成"))
        return False

    def summary(self) -> dict:
        """Orchestration summary for observability (M13)"""
        return {
            "agents": self.available_agents(),
            "max_rounds": self.max_rounds,
            "task_ledger": self.task_ledger[-5:],
            "progress_ledger": self.progress_ledger[-10:],
        }
