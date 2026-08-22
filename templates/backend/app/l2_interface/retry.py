"""L2 - Retry and Fallback Strategy

Automatic retry (exponential backoff) via `tenacity` - the industry-standard
retry library that ships with langchain anyway - plus a model fallback chain.

The public interface (RetryHandler.execute_with_retry /
FallbackChain.execute_with_fallback) is unchanged; only the hand-rolled
backoff loop was replaced.
"""

import logging
from typing import Awaitable, Callable, TypeVar

from tenacity import (
    AsyncRetrying,
    RetryCallState,
    retry_any,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logger = logging.getLogger(__name__)

T = TypeVar("T")


class RetryHandler:
    """Retry handler (tenacity-backed)

    Supports:
    - Exponential backoff retry
    - Maximum retry count limit
    - Retry only on specific exception types (when provided)
    """

    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 30.0,
        backoff_factor: float = 2.0,
        retry_on: tuple[type[BaseException], ...] | None = None,
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.backoff_factor = backoff_factor
        self.retry_on = retry_on

    def _policy(self):
        wait = wait_exponential(
            multiplier=self.base_delay,
            max=self.max_delay,
            exp_base=self.backoff_factor,
        )
        if self.retry_on:
            return dict(
                wait=wait,
                stop=stop_after_attempt(self.max_retries),
                retry=retry_any(retry_if_exception_type(self.retry_on),),
                reraise=True,
            )
        return dict(wait=wait, stop=stop_after_attempt(self.max_retries), reraise=True)

    async def execute_with_retry(
        self,
        func: Callable[..., Awaitable[T]],
        *args,
        **kwargs,
    ) -> T:
        """Execute with retry.

        Args:
            func: The async function to execute
            *args, **kwargs: Function arguments passed through to ``func``
        Returns:
            T: Function execution result
        Raises:
            The exception from the last retry attempt
        """

        async def _log_before_sleep(state: RetryCallState):
            exc = state.outcome.exception() if state.outcome else None
            logger.warning(
                "Invocation failed (attempt %s/%s): %s. Retrying...",
                state.attempt_number,
                self.max_retries,
                exc,
            )

        async for attempt in AsyncRetrying(before_sleep=_log_before_sleep, **self._policy()):
            with attempt:
                return await func(*args, **kwargs)
        raise RuntimeError("Retrier: no exception but not successful")  # pragma: no cover


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
        last_exception: BaseException | None = None

        for i, model_config in enumerate(self.models):
            try:
                # Copy before injecting model config: mutating the caller's
                # dict would leak provider/model overrides into subsequent
                # attempts and back into the caller's scope.
                attempt_kwargs = {**kwargs,
                                  "provider": model_config["provider"],
                                  "model": model_config["model"]}
                return await func(*args, **attempt_kwargs)
            except Exception as e:
                last_exception = e
                logger.warning(
                    f"Model {model_config['model']} failed "
                    f"({i+1}/{len(self.models)}): {e}"
                )

        if last_exception:
            raise last_exception
        raise RuntimeError("FallbackChain: no backup model available")
