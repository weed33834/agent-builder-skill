"""L1 - Qwen (DashScope) Adapter

Uses the OpenAI-compatible interface for invocation.
"""

from .openai_compat import OpenAICompatAdapter


class QwenAdapter(OpenAICompatAdapter):
    """Qwen model adapter

    Supports: qwen-max / qwen-plus / qwen-turbo.
    https://dashscope.aliyuncs.com/compatible-mode/v1
    """

    provider_name = "qwen"
    default_model = "qwen-max"
    default_api_base = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    context_window = 32000
