"""L1 - DeepSeek Adapter

Implements the LLMAdapter interface to adapt DeepSeek series models.
Uses the OpenAI-compatible interface for invocation.
"""

from .openai_compat import OpenAICompatAdapter


class DeepSeekAdapter(OpenAICompatAdapter):
    """DeepSeek model adapter

    Supports: DeepSeek-V3, DeepSeek-R1, etc.
    Uses the OpenAI-compatible API: https://api.deepseek.com
    """

    provider_name = "deepseek"
    default_model = "deepseek-chat"
    default_api_base = "https://api.deepseek.com"
    context_window = 64000
