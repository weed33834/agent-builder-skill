"""L10 - Logging Configuration

Provides unified logging capabilities with structured log output support.
"""

import logging
import sys
import json
from datetime import datetime
from typing import Optional

from .config import settings


class JSONFormatter(logging.Formatter):
    """JSON log formatter

    Outputs logs in JSON format for easier log aggregation and analysis.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
            }

        if hasattr(record, "extra"):
            log_entry["extra"] = record.extra

        return json.dumps(log_entry)


def setup_logging(
    level: Optional[str] = None,
    fmt: Optional[str] = None,
):
    """Configure the logging system

    Args:
        level: Log level, defaults to value from configuration
        fmt: Log format, "json" or "text"
    """
    log_level = level or settings.LOG_LEVEL
    log_format = fmt or settings.LOG_FORMAT

    handler = logging.StreamHandler(sys.stdout)

    if log_format == "json":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Suppress third-party library logs
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a Logger instance"""
    return logging.getLogger(name)
