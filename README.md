# 心镜 MindMirror

> 通过问卷与情境测评,看见真实的自己。

## 三面镜子

- **名人镜** —— 你与历史上哪个名人最相近
- **价值镜** —— 你的价值观与道德水平
- **意识镜** —— 你的意识形态定位

## 技术栈

- Python 3.12+ / FastAPI / SQLAlchemy 2.0 async / Pydantic v2
- 前后端分离,API 优先(小程序/网站复用同一套接口)
- 题库数据驱动(YAML),行为轨迹全程采集

## 本地开发

```bash
cp .env.example .env
pip install -e ".[dev]"
fastapi dev app/main.py
# 访问 http://localhost:8000
```

## 目录结构

```
app/
  api/        路由层 — 只做参数校验+调 service
  services/   业务层 — 计分/匹配/冲突分析(平台无关)
  models/     数据模型
  schemas/    Pydantic 请求/响应
  core/       配置/DB/认证扩展点
data/
  questions/  题库 YAML(数据驱动)
static/       前端(本地纯 HTML+JS)
```

## 上线扩展点

- 数据库:改 `DATABASE_URL` 换 Postgres
- 认证:`AUTH_PROVIDER` 切 JWT / wx.login
- 前端:`static/` 替换为 Vue/React 或小程序原生
