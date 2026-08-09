"""L10 - 日志配置

提供统一的日志记录能力，支持结构化日志输出。
"""

import logging
import sys
import json
from datetime import datetime
from typing import Optional

from .config import settings


class JSONFormatter(logging.Formatter):
    """JSON 日志格式化器
    
    将日志输出为 JSON 格式，便于日志聚合和分析。
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
    """配置日志系统
    
    Args:
        level: 日志级别，默认从配置读取
        fmt: 日志格式，"json" 或 "text"
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
    
    # 抑制第三方库的日志
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """获取 Logger 实例"""
    return logging.getLogger(name)