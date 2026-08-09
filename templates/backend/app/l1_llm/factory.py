"""L1 - LLM 工厂方法

根据配置创建对应的 LLM 适配器实例。
"""

from typing import Optional
from .base import LLMAdapter
from .openai_adapter import OpenAIAdapter
from .anthropic_adapter import AnthropicAdapter
from .deepseek_adapter import DeepSeekAdapter
from .ollama_adapter import OllamaAdapter


def create_llm(
    provider: str,
    model: str,
    api_key: Optional[str] = None,
    api_base: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    **kwargs,
) -> LLMAdapter:
    """根据配置创建 LLM 实例
    
    Args:
        provider: 提供商名称 (openai, anthropic, deepseek, ollama)
        model: 模型名称
        api_key: API Key
        api_base: 自定义 API 地址
        temperature: 温度参数
        max_tokens: 最大输出 Token 数
        **kwargs: 其他参数
    Returns:
        LLMAdapter: LLM 适配器实例
    Raises:
        ValueError: 不支持的提供商
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
    else:
        raise ValueError(
            f"不支持的 LLM 提供商: {provider}。"
            f"可选: openai, anthropic, deepseek, ollama"
        )


def list_available_models() -> dict:
    """列出所有可用的模型配置
    
    Returns:
        dict: 按提供商分组的模型列表
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
    }