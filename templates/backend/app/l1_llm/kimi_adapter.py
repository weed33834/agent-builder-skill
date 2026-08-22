"""L1 - Kimi (Moonshot) Adapter

Uses the OpenAI-compatible interface for invocation.
"""

from .openai_compat import OpenAICompatAdapter


class KimiAdapter(OpenAICompatAdapter):
    """Kimi model adapter

    Supports: moonshot-v1 series. https://api.moonshot.cn/v1
    """

    provider_name = "kimi"
    default_model = "moonshot-v1-8k"
    default_api_base = "https://api.moonshot.cn/v1"
    context_window = 8000
