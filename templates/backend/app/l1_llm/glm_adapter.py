"""L1 - GLM (Zhipu BigModel) Adapter

Uses the OpenAI-compatible interface for invocation.
"""

from .openai_compat import OpenAICompatAdapter


class GLMAdapter(OpenAICompatAdapter):
    """GLM model adapter

    Supports: GLM-4 series. https://open.bigmodel.cn/api/paas/v4
    """

    provider_name = "glm"
    default_model = "glm-4"
    default_api_base = "https://open.bigmodel.cn/api/paas/v4"
    context_window = 128000
