"""L7 - Router Orchestration

Intent-routing orchestration (M6.5 Anthropic routing pattern).
A router classifies the user input and dispatches to the most
suitable specialized agent.

Three routing strategies:
1. LLM-based: use an LLM to classify intent (recommended)
2. Keyword-based: fast local keyword matching
3. Regex-based: pattern matching

Usage:
    router = IntentRouter({
        "coding": CodingAgent(),
        "research": ResearchAgent(),
        "customer_service": SupportAgent(),
    })
    agent, input_ = await router.route("帮我写个排序算法")
"""

import re
from typing import Any, Awaitable, Callable, Optional


class IntentRouter:
    """Intent-based router (M6.5)"""

    def __init__(
        self,
        agents: Optional[dict[str, Any]] = None,
        classifier: Optional[Callable[[str, list[str]], Awaitable[str]]] = None,
        default_agent: Optional[str] = None,
        keyword_rules: Optional[dict[str, list[str]]] = None,
    ):
        self.agents = agents or {}
        self.classifier = classifier  # async (input, candidates) -> agent_name
        self.default_agent = default_agent or (list(self.agents.keys())[0] if self.agents else None)
        self.keyword_rules = keyword_rules or {}

    # ── routing (M6.5) ─────────────────────────────────────────

    async def route(self, user_input: str) -> tuple[Any, str]:
        """Route input to the best agent.

        Returns:
            (agent, agent_name)
        Raises:
            ValueError: no agents registered and no default
        """
        if not self.agents and self.default_agent is None:
            raise ValueError("IntentRouter has no agents registered")

        # 1. LLM/classifier routing (highest quality)
        if self.classifier is not None:
            try:
                name = await self.classifier(user_input, list(self.agents.keys()))
                if name in self.agents:
                    return self.agents[name], name
            except Exception:
                pass  # fall through to keyword routing

        # 2. Keyword routing (fast, offline)
        name = self._keyword_route(user_input)
        if name and name in self.agents:
            return self.agents[name], name

        # 3. Default
        if self.default_agent in self.agents:
            return self.agents[self.default_agent], self.default_agent
        # Last resort: first registered agent
        first = list(self.agents.keys())[0]
        return self.agents[first], first

    def _keyword_route(self, user_input: str) -> Optional[str]:
        """Keyword matching: each rule is (agent_name -> [keywords])"""
        lowered = user_input.lower()
        best_name: Optional[str] = None
        best_hits = 0
        for name, keywords in self.keyword_rules.items():
            hits = sum(1 for kw in keywords if kw.lower() in lowered)
            if hits > best_hits:
                best_hits = hits
                best_name = name
        return best_name if best_hits > 0 else None

    def add_rule(self, agent_name: str, keywords: list[str]):
        self.keyword_rules.setdefault(agent_name, []).extend(keywords)

    def add_agent(self, name: str, agent: Any):
        self.agents[name] = agent

    def remove_agent(self, name: str):
        self.agents.pop(name, None)
        if self.default_agent == name:
            self.default_agent = next(iter(self.agents), None)

    # ── helpers ────────────────────────────────────────────────

    @staticmethod
    def build_keyword_classifier(rules: dict[str, list[str]]) -> Callable[[str, list[str]], Awaitable[str]]:
        """Build an async classifier from keyword rules (for consistency)"""
        import asyncio

        async def classify(user_input: str, candidates: list[str]) -> str:
            lowered = user_input.lower()
            best, best_hits = None, 0
            for name, kws in rules.items():
                hits = sum(1 for k in kws if k.lower() in lowered)
                if hits > best_hits:
                    best, best_hits = name, hits
            return best or (candidates[0] if candidates else "default")

        return classify


class RegexRouter(IntentRouter):
    """Regex-based router: route by pattern groups"""

    def __init__(self, agents: dict[str, Any], patterns: dict[str, str], default_agent: Optional[str] = None):
        super().__init__(agents=agents, default_agent=default_agent)
        self.patterns = {name: re.compile(p) for name, p in patterns.items()}

    async def route(self, user_input: str) -> tuple[Any, str]:
        for name, pattern in self.patterns.items():
            if pattern.search(user_input):
                if name in self.agents:
                    return self.agents[name], name
        return await super().route(user_input)
