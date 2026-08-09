"""L2 - 重试和回退策略

实现自动重试（指数退避）和模型回退机制。
"""

from typing import TypeVar, Callable, Awaitable, Optional
import asyncio
import logging

logger = logging.getLogger(__name__)

T = TypeVar("T")


class RetryHandler:
    """重试处理器
    
    支持：
    - 指数退避重试
    - 最大重试次数限制
    - 特定异常类型重试
    - 模型回退（主模型失败时降级）
    """
    
    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 30.0,
        backoff_factor: float = 2.0,
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.backoff_factor = backoff_factor
    
    async def execute_with_retry(
        self,
        func: Callable[..., Awaitable[T]],
        *args,
        **kwargs,
    ) -> T:
        """带重试的执行
        
        Args:
            func: 要执行的异步函数
            *args, **kwargs: 函数参数
        Returns:
            T: 函数执行结果
        Raises:
            最后一次重试的异常
        """
        last_exception = None
        
        for attempt in range(1, self.max_retries + 1):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                
                if attempt < self.max_retries:
                    delay = min(
                        self.base_delay * (self.backoff_factor ** (attempt - 1)),
                        self.max_delay,
                    )
                    logger.warning(
                        f"调用失败 (尝试 {attempt}/{self.max_retries}): {e}。"
                        f"将在 {delay:.1f} 秒后重试..."
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"调用失败，已耗尽所有重试次数: {e}"
                    )
        
        raise last_exception


class FallbackChain:
    """模型回退链
    
    主模型失败时自动降级到备用模型。
    """
    
    def __init__(self, models: list[dict]):
        """初始化回退链
        
        Args:
            models: 模型配置列表，按优先级排列
                    [{"provider": "openai", "model": "gpt-4o"},
                     {"provider": "openai", "model": "gpt-4o-mini"}]
        """
        self.models = models
    
    async def execute_with_fallback(
        self,
        func: Callable[..., Awaitable[T]],
        *args,
        **kwargs,
    ) -> T:
        """带回退的执行
        
        按配置顺序尝试模型，直到成功。
        """
        last_exception = None
        
        for i, model_config in enumerate(self.models):
            try:
                # 更新 kwargs 中的模型配置
                kwargs.update({
                    "provider": model_config["provider"],
                    "model": model_config["model"],
                })
                return await func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                logger.warning(
                    f"模型 {model_config['model']} 失败"
                    f"({i+1}/{len(self.models)}): {e}"
                )
        
        raise last_exception