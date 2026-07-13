"""心镜 MindMirror —— FastAPI 入口。

启动:fastapi dev app/main.py
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api import ROUTERS
from app.core.config import get_settings
from app.core.db import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动:建表 + 建 DB 目录
    Path("data/db").mkdir(parents=True, exist_ok=True)
    await init_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan, docs_url="/api/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in ROUTERS:
    app.include_router(router)


# 前端静态文件 —— 挂在根,API 走 /api 前缀
static_dir = Path(__file__).resolve().parent.parent / "static"
if static_dir.exists():

    # 路由:/?id=...  →  /report.html?id=...  (兼容分享链接)
    @app.get("/")
    async def root(request: Request):
        qs = request.url.query
        if qs:
            # 把 id 视为结果报告,其他参数走各自页面
            if "id=" in qs and "type=" not in qs:
                return RedirectResponse(url=f"/report.html?{qs}")
            if "type=" in qs:
                return RedirectResponse(url=f"/take.html?{qs}")
        index = static_dir / "index.html"
        if index.exists():
            return FileResponse(index)
        return {"detail": "no index"}

    # 直接挂静态文件(覆盖默认 /)
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
