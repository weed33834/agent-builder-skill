"""L1 - LLM Factory Method

Creates the corresponding LLM adapter instance based on configuration.
"""

from typing import Optional
from .base import LLMAdapter
from .openai_adapter import OpenAIAdapter
from .anthropic_adapter import AnthropicAdapter
from .deepseek_adapter import DeepSeekAdapter
from .ollama_adapter import OllamaAdapter
from .gemini_adapter import GeminiAdapter
from .qwen_adapter import QwenAdapter
from .glm_adapter import GLMAdapter
from .kimi_adapter import KimiAdapter


def create_llm(
    provider: str,
    model: str,
    api_key: Optional[str] = None,
    api_base: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    **kwargs,
) -> LLMAdapter:
    """Create an LLM instance based on configuration

    Args:
        provider: Provider name (openai, anthropic, deepseek, ollama)
        model: Model name
        api_key: API Key
        api_base: Custom API base URL
        temperature: Temperature parameter
        max_tokens: Maximum output token count
        **kwargs: Other parameters
    Returns:
        LLMAdapter: LLM adapter instance
    Raises:
        ValueError: Unsupported provider
    """
    common_kwargs = {
        "model": model,
        "temperature": temperature,
        "max_tokens": max_tokens,
        **kwargs,
    }

    if api_key:
        common_kwargs["api_key"] = api_key
    if api_base:
        common_kwargs["api_base"] = api_base

    if provider == "openai":
        return OpenAIAdapter(**common_kwargs)
    elif provider == "anthropic":
        return AnthropicAdapter(**common_kwargs)
    elif provider == "deepseek":
        return DeepSeekAdapter(**common_kwargs)
    elif provider == "ollama":
        return OllamaAdapter(**common_kwargs)
    elif provider == "gemini":
        return GeminiAdapter(**common_kwargs)
    elif provider == "qwen":
        return QwenAdapter(**common_kwargs)
    elif provider == "glm":
        return GLMAdapter(**common_kwargs)
    elif provider == "kimi":
        return KimiAdapter(**common_kwargs)
    else:
        raise ValueError(
            f"Unsupported LLM provider: {provider}. "
            f"Options: openai, anthropic, deepseek, ollama"
        )


def list_available_models() -> dict:
    """List all available model configurations

    Returns:
        dict: List of models grouped by provider
    """
    return {
        "openai": {
            "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o3-mini"],
            "default": "gpt-4o",
        },
        "anthropic": {
            "models": [
                "claude-3-5-sonnet-20241022",
                "claude-3-haiku-20240307",
            ],
            "default": "claude-3-5-sonnet-20241022",
        },
        "deepseek": {
            "models": ["deepseek-chat", "deepseek-reasoner"],
            "default": "deepseek-chat",
        },
        "ollama": {
            "models": ["qwen2.5:7b", "llama3.1:8b", "mistral:7b"],
            "default": "qwen2.5:7b",
        },
        "gemini": {
            "models": ["gemini-2.5-pro", "gemini-2.5-flash"],
            "default": "gemini-2.5-flash",
        },
        "qwen": {
            "models": ["qwen-max", "qwen-plus", "qwen-turbo"],
            "default": "qwen-plus",
        },
        "glm": {
            "models": ["glm-4.6", "glm-4.5", "glm-4-air"],
            "default": "glm-4.6",
        },
        "kimi": {
            "models": ["kimi-k2", "moonshot-v1-8k"],
            "default": "kimi-k2",
        },
    }
