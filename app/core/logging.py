"""日志配置 —— 统一格式,按环境调整级别。

#30 修复:为全项目提供结构化日志,便于生产诊断与异常追踪。
"""

import logging
import sys


def setup_logging(debug: bool = False) -> None:
    """配置全局日志格式与级别。

    Args:
        debug: True 时级别 DEBUG,否则 INFO。
    """
    level = logging.DEBUG if debug else logging.INFO
    fmt = "%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | %(message)s"
    logging.basicConfig(
        level=level,
        format=fmt,
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout,
        force=True,
    )
    # 降低第三方库噪音
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("aiosqlite").setLevel(logging.WARNING)
