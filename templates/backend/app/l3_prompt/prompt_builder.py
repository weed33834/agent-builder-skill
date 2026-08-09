"""L3 - 提示词构建器

链式构建提示词，支持动态注入系统提示、工具描述、对话历史、上下文等。
"""

from typing import Optional
from .system_prompts import get_default_prompt
from .role_templates import get_role_prompt


class PromptBuilder:
    """链式提示词构建器
    
    使用方式：
        builder = PromptBuilder()
        messages = (builder
            .with_system("research_assistant")
            .with_tools([tool1, tool2])
            .with_history(history_messages)
            .with_context(query="人工智能发展")
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
        """设置系统提示
        
        Args:
            prompt_or_role: 系统提示文本或角色名称
            style: 提示风格（当 prompt_or_role 不是角色名时使用）
        """
        # 先尝试按角色名查找
        role_prompt = get_role_prompt(prompt_or_role)
        if role_prompt:
            self._system = role_prompt
        else:
            self._system = prompt_or_role
        return self
    
    def with_tools(self, tools: list) -> "PromptBuilder":
        """注入工具描述"""
        self._tools = tools
        return self
    
    def with_history(self, messages: list) -> "PromptBuilder":
        """注入对话历史"""
        self._history = messages
        return self
    
    def with_context(self, **kwargs) -> "PromptBuilder":
        """注入上下文信息"""
        self._context.update(kwargs)
        return self
    
    def with_examples(self, examples: list) -> "PromptBuilder":
        """注入 Few-shot 示例"""
        self._examples = examples
        return self
    
    def with_user_input(self, user_input: str) -> "PromptBuilder":
        """设置用户输入"""
        self._user_input = user_input
        return self
    
    def build(self) -> list[dict]:
        """构建完整的消息列表"""
        messages = []
        
        # 1. 系统提示
        system_prompt = self._system or get_default_prompt()
        messages.append({"role": "system", "content": system_prompt})
        
        # 2. 工具描述（自动追加到系统提示中）
        if self._tools:
            tool_descriptions = self._format_tools()
            messages[0]["content"] += f"\n\n## 当前可用工具\n{tool_descriptions}"
        
        # 3. 上下文信息
        if self._context:
            context_str = "\n\n## 上下文信息\n"
            for key, value in self._context.items():
                context_str += f"- {key}: {value}\n"
            messages[0]["content"] += context_str
        
        # 4. Few-shot 示例
        if self._examples:
            examples_str = "\n\n## 示例\n"
            for i, example in enumerate(self._examples, 1):
                examples_str += f"\n示例 {i}:\n"
                if "input" in example:
                    examples_str += f"用户: {example['input']}\n"
                if "output" in example:
                    examples_str += f"助手: {example['output']}\n"
            messages[0]["content"] += examples_str
        
        # 5. 对话历史
        for msg in self._history:
            messages.append(msg)
        
        # 6. 用户输入
        if self._user_input:
            messages.append({"role": "user", "content": self._user_input})
        
        return messages
    
    def _format_tools(self) -> str:
        """格式化工具描述"""
        lines = []
        for tool in self._tools:
            name = getattr(tool, "name", "unknown")
            description = getattr(tool, "description", "")
            args = getattr(tool, "args", {})
            
            lines.append(f"- {name}: {description}")
            if args:
                lines.append(f"  参数: {args}")
        return "\n".join(lines)