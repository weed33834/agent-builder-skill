"""名人库路由 —— 公开数据,列表与详情。

无需鉴权:名人库为静态 YAML,不涉及用户隐私。
"""

import random
from functools import lru_cache
from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException

# figures.py 位于 app/api/routes/,需回溯 4 级到项目根(/workspace/mindmirror)
DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"


@lru_cache
def _load_celebrities() -> list[dict]:
    """名人库 —— data/figures/celebrity.yaml"""
    path = DATA_DIR / "figures" / "celebrity.yaml"
    if not path.exists():
        return []
    return yaml.safe_load(path.read_text(encoding="utf-8")) or []


router = APIRouter(prefix="/api/figures", tags=["figures"])


@router.get("")
async def list_figures() -> list[dict]:
    """所有名人列表 —— 轻量字段(不含 intro/anecdote/dims)。"""
    return [
        {
            "id": c.get("id"),
            "name": c.get("name"),
            "image": c.get("image", ""),
            "blurb": c.get("blurb", ""),
            "era": c.get("era", ""),
            "role": c.get("role", ""),
            "tags": c.get("tags", []),
        }
        for c in _load_celebrities()
    ]


@router.get("/onthisday")
async def onthisday() -> list[dict]:
    """今日推荐认识的历史人物 —— 随机返回 3 位名人。

    原计划做"历史上的今天",但 era 字段只有年份范围(如"1809-1865")无月日,
    无法精确匹配;改为每次刷新随机推荐 3 位,作为"今日认识"。
    必须声明在 /{figure_id} 之前,否则会被路径参数拦截。
    """
    celebs = _load_celebrities()
    if not celebs:
        return []
    picks = random.sample(celebs, min(3, len(celebs)))
    return [
        {
            "id": c.get("id"),
            "name": c.get("name"),
            "image": c.get("image", ""),
            "blurb": c.get("blurb", ""),
            "era": c.get("era", ""),
            "role": c.get("role", ""),
            "tags": c.get("tags", []),
        }
        for c in picks
    ]


@router.get("/{figure_id}")
async def get_figure(figure_id: str) -> dict:
    """单个名人完整详情(含 intro/anecdote/quote/dims)。"""
    for c in _load_celebrities():
        if c.get("id") == figure_id:
            return {
                "id": c.get("id"),
                "name": c.get("name"),
                "image": c.get("image", ""),
                "blurb": c.get("blurb", ""),
                "era": c.get("era", ""),
                "role": c.get("role", ""),
                "tags": c.get("tags", []),
                "quote": c.get("quote", ""),
                "dims": c.get("dims", {}),
                "intro": c.get("intro", ""),
                "anecdote": c.get("anecdote", ""),
            }
    raise HTTPException(404, "人物不存在")
