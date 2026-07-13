# 心镜 MindMirror

> 通过问卷与情境测评,看见真实的自己。三面镜子,九种答题方法,行为轨迹全程采集。

## 三面镜子

- **名人镜** —— 你与历史上哪个名人最相近(54 题 · 40 位历史人物库)
- **价值镜** —— 你的价值观与道德水平(54 题 · 利他/公正/诚实多维)
- **意识镜** —— 你的意识形态定位(55 题 · 32 种意识形态库)

## 九种答题方法

| 类型 | 中文名 | 说明 |
|------|--------|------|
| `scale` | 量表题 | 五点量表,凭第一直觉 |
| `dilemma` | 困境题 | 历史情境抉择 |
| `slider` | 强度滑块 | 0-100 连续光谱,标记倾向强度 |
| `forced_choice` | 强迫抉择 | 二选其一,无中间地带 |
| `matrix` | 同意度矩阵 | 多条陈述 × 7 点 Likert |
| `auction` | 价值拍卖 | 预算竞拍,反映真实价值评估 |
| `allocation` | 资源分配 | 总额固定,分配反映优先级 |
| `sort` | 排序题 | 拖拽排序,1 = 最重要 |
| `iat` | 内隐联想 | 快速分类,测内隐偏向 |

## 核心算法

- **行为加权计分 v2** —— 耗时适中(3-15s)权重 1.0;过快/超时降权;改主意 ≥2 次降权
- **动态归一化** —— 每维度按累计权重归一化到 0-100
- **百分位估算** —— 正态分布 CDF,输出"高于 X% 的人"
- **画像标签** —— 综合维度生成 3-5 个关键词
- **冲突检测** —— 跨题型维度矛盾、IAT 内隐-外显分裂、犹豫/反复/本能
- **行为洞察** —— 决策风格、一致性、纠结度、勇气指数、时间压力效应、内隐偏向

## 技术栈

- **后端**:Python 3.12+ / FastAPI / SQLAlchemy 2.0 async / aiosqlite / Pydantic v2
- **前端**:纯 HTML + JS + CSS(无构建步骤),ECharts 雷达图
- **设计**:Fraunces 可变衬线 + Noto Serif SC + Glassmorphism 2.0,WCAG AA 对比度
- **数据**:题库 YAML 数据驱动,行为轨迹全程采集(耗时/改主意次数/轨迹)

## 本地开发

```bash
cp .env.example .env
pip install -e ".[dev]"
fastapi dev app/main.py
# 访问 http://localhost:8000
```

## API 一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/assessments` | 三面镜子元信息 |
| GET | `/api/assessments/{type}/questions` | 题库 |
| POST | `/api/sessions?assessment_type={type}` | 开始/恢复测评 |
| POST | `/api/sessions/{id}/responses` | 提交答案(complete=true 触发计分) |
| GET | `/api/results/{id}` | 取报告 |
| GET | `/api/me/results` | 我的历史报告 |
| GET | `/api/sessions/{id}/result` | 按会话取结果 |

API 文档:启动后访问 `/api/docs`(FastAPI 自动生成)。

## 目录结构

```
app/
  api/routes/   路由层 — 参数校验 + 调 service
  services/     业务层 — 计分/匹配/冲突/洞察/百分位/画像(平台无关)
  models/       数据模型(Session/Result/User)
  schemas/      Pydantic 请求/响应(9 题型判别联合)
  core/         配置/DB/认证扩展点
data/
  questions/    题库 YAML(数据驱动,9 题型)
  figures/      名人库(40 位)
  ideologies/   意识形态库(32 种)
static/         前端(纯 HTML+JS+CSS,无构建)
```

## 答案格式

每种题型的答案 JSON 格式:

```javascript
scale:        { option_id: "3" }
dilemma:      { option_id: "a" }
slider:       { position: 75 }              // 0-100
forced_choice:{ choice: "side_a" }
matrix:       { ratings: { s1: 6, s2: 4 } } // 1-7
auction:      { bids: { item1: 30, item2: 20 } }
allocation:   { allocation: { t1: 40, t2: 60 } }  // 总和须 = total
sort:         { order: ["a", "b", "c"] }    // 1 = 最重要
iat:          { iat: [{ word, category, response, rt, correct }, ...] }
```

每个答案附带行为轨迹:`duration_ms`(耗时)、`change_count`(改主意次数)、`trajectory`(轨迹数组)。

## 上线扩展点

- **数据库**:改 `DATABASE_URL` 换 Postgres
- **认证**:`AUTH_PROVIDER` 切 `jwt` / `wx`(微信 wx.login)
- **CORS**:`CORS_ORIGINS` 加域名/小程序 servicemock
- **前端**:`static/` 替换为 Vue/React 或小程序原生,API 不变

## 无障碍

- 遵循 WCAG AA 对比度(4.5:1)
- 支持 `prefers-reduced-motion`(减弱动画)
- 所有交互元素有 `aria-label`
