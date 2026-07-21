"""心镜 MindMirror —— FastAPI 入口。

启动:fastapi dev app/main.py
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api import ROUTERS
from app.core.config import get_settings
from app.core.db import init_db
from app.core.logging import setup_logging

settings = get_settings()
# #30 修复:启动时配置结构化日志
setup_logging(debug=settings.debug)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动:建表 + 建 DB 目录
    Path("data/db").mkdir(parents=True, exist_ok=True)
    await init_db()
    yield


# #29 修复:生产环境关闭 API 文档
docs_url = None if settings.is_production else "/api/docs"
app = FastAPI(title=settings.app_name, lifespan=lifespan, docs_url=docs_url, redoc_url=docs_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    # #23 修复:收窄 CORS 方法和请求头到实际需要的
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-User-Token"],
)

for router in ROUTERS:
    app.include_router(router)


# #22 修复:在静态文件挂载之前注册所有动态路由,避免被 catch-all 遮蔽
@app.get("/api/health")
async def health() -> dict:
    """健康检查端点。"""
    return {"status": "ok"}


# /api/{path:path} fallback —— 拦截所有未匹配的 /api/ 请求,返回 JSON 404
# 必须放在 StaticFiles mount 之前,否则 /api/nonexistent 会被 StaticFiles
# 当作静态文件处理并返回 404.html(因为 html=True 模式有内置 404 fallback)
@app.api_route(
    "/api/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
)
async def api_fallback(path: str) -> None:
    raise HTTPException(status_code=404, detail=f"Not Found: /api/{path}")


# 前端静态文件 —— 挂在根,API 走 /api 前缀
# 注意:此 mount 是 catch-all,必须放在所有动态路由之后
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
    # 注意:StaticFiles(html=True) 内置 404.html fallback,会自动返回 404.html
    # 给所有未匹配的非 /api 路径,这就是前端 404 页面的实现方式
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

    # 兜底异常处理 —— 处理 404.html 不存在等极端情况
    @app.exception_handler(StarletteHTTPException)
    async def custom_http_exception(request: Request, exc: StarletteHTTPException):
        # API 请求一定返回 JSON
        if request.url.path.startswith("/api"):
            return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
        # 前端 404:若有 404.html 则返回,否则 JSON
        if exc.status_code == 404:
            nf = static_dir / "404.html"
            if nf.exists():
                return HTMLResponse(nf.read_text(encoding="utf-8"), status_code=404)
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
