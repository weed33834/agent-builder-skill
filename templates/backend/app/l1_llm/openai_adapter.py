"""L1 - OpenAI Adapter

Implements the LLMAdapter interface to adapt OpenAI series models.
"""

from .openai_compat import OpenAICompatAdapter


class OpenAIAdapter(OpenAICompatAdapter):
    """OpenAI model adapter

    Supports: GPT-4o, GPT-4o-mini, GPT-4-turbo, o1, o3-mini, etc.
    """

    provider_name = "openai"
    default_model = "gpt-4o"
    default_api_base = ""
    context_window = 128000
