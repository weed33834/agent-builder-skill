"""L3 - Prompt Builder

Builds prompts in a chain, supporting dynamic injection of system prompts, tool descriptions, conversation history, context, etc.
"""

from typing import Optional
from .system_prompts import get_default_prompt
from .role_templates import get_role_prompt


class PromptBuilder:
    """Chained prompt builder

    Usage:
        builder = PromptBuilder()
        messages = (builder
            .with_system("research_assistant")
            .with_tools([tool1, tool2])
            .with_history(history_messages)
            .with_context(query="AI development")
            .build())
    """

    def __init__(self):
        self._system: Optional[str] = None
        self._tools: list = []
        self._history: list = []
        self._context: dict = {}
        self._examples: list = []
        self._user_input: Optional[str] = None

    def with_system(self, prompt_or_role: str, style: str = "default") -> "PromptBuilder":
        """Set the system prompt

        Args:
            prompt_or_role: System prompt text or role name
            style: Prompt style (used when prompt_or_role is not a role name)
        """
        # First try to look up by role name
        role_prompt = get_role_prompt(prompt_or_role)
        if role_prompt:
            self._system = role_prompt
        else:
            self._system = prompt_or_role
        return self

    def with_tools(self, tools: list) -> "PromptBuilder":
        """Inject tool descriptions"""
        self._tools = tools
        return self

    def with_history(self, messages: list) -> "PromptBuilder":
        """Inject conversation history"""
        self._history = messages
        return self

    def with_context(self, **kwargs) -> "PromptBuilder":
        """Inject context information"""
        self._context.update(kwargs)
        return self

    def with_examples(self, examples: list) -> "PromptBuilder":
        """Inject Few-shot examples"""
        self._examples = examples
        return self

    def with_user_input(self, user_input: str) -> "PromptBuilder":
        """Set the user input"""
        self._user_input = user_input
        return self

    def build(self) -> list[dict]:
        """Build the complete message list"""
        messages = []

        # 1. System prompt
        system_prompt = self._system or get_default_prompt()
        messages.append({"role": "system", "content": system_prompt})

        # 2. Tool descriptions (automatically appended to the system prompt)
        if self._tools:
            tool_descriptions = self._format_tools()
            messages[0]["content"] += f"\n\n## 当前可用工具\n{tool_descriptions}"

        # 3. Context information
        if self._context:
            context_str = "\n\n## 上下文信息\n"
            for key, value in self._context.items():
                context_str += f"- {key}: {value}\n"
            messages[0]["content"] += context_str

        # 4. Few-shot examples
        if self._examples:
            examples_str = "\n\n## 示例\n"
            for i, example in enumerate(self._examples, 1):
                examples_str += f"\n示例 {i}:\n"
                if "input" in example:
                    examples_str += f"用户: {example['input']}\n"
                if "output" in example:
                    examples_str += f"助手: {example['output']}\n"
            messages[0]["content"] += examples_str

        # 5. Conversation history
        for msg in self._history:
            messages.append(msg)

        # 6. User input
        if self._user_input:
            messages.append({"role": "user", "content": self._user_input})

        return messages

    def _format_tools(self) -> str:
        """Format tool descriptions"""
        lines = []
        for tool in self._tools:
            name = getattr(tool, "name", "unknown")
            description = getattr(tool, "description", "")
            args = getattr(tool, "args", {})

            lines.append(f"- {name}: {description}")
            if args:
                lines.append(f"  参数: {args}")
        return "\n".join(lines)
