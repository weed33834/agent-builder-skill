"""L2 - Retry and Fallback Strategy

Implements automatic retry (exponential backoff) and model fallback mechanisms.
"""

from typing import TypeVar, Callable, Awaitable
import asyncio
import logging

logger = logging.getLogger(__name__)

T = TypeVar("T")


class RetryHandler:
    """Retry handler

    Supports:
    - Exponential backoff retry
    - Maximum retry count limit
    - Retry on specific exception types
    - Model fallback (degrade when primary model fails)
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
        """Execute with retry

        Args:
            func: The async function to execute
            *args, **kwargs: Function arguments
        Returns:
            T: Function execution result
        Raises:
            The exception from the last retry
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
                        f"Invocation failed (attempt {attempt}/{self.max_retries}): {e}. "
                        f"Retrying in {delay:.1f}s..."
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"Invocation failed, all retry attempts exhausted: {e}"
                    )

        if last_exception:
            raise last_exception
        raise RuntimeError("Retrier: no exception but not successful")


class FallbackChain:
    """Model fallback chain

    Automatically degrades to a backup model when the primary model fails.
    """

    def __init__(self, models: list[dict]):
        """Initialize the fallback chain

        Args:
            models: List of model configurations, ordered by priority
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
        """Execute with fallback

        Tries models in configuration order until one succeeds.
        """
        last_exception = None

        for i, model_config in enumerate(self.models):
            try:
                # Update the model configuration in kwargs
                kwargs.update({
                    "provider": model_config["provider"],
                    "model": model_config["model"],
                })
                return await func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                logger.warning(
                    f"Model {model_config['model']} failed "
                    f"({i+1}/{len(self.models)}): {e}"
                )

        if last_exception:
            raise last_exception
        raise RuntimeError("FallbackChain: no backup model available")
