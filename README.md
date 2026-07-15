# 心镜 MindMirror

> 三面镜子,映照真实的你。

心镜是一套基于情境与行为轨迹的人格测评工具。它不满足于简单的量表打分——通过九种答题方法、全程行为采集与多维冲突分析,试图在那些你犹豫、改主意、凭直觉反应的瞬间,捕捉到比"你选了什么"更真实的信号。

## 三面镜子

- **名镜** — 与历史名人对望。54 道题,40 位历史人物库,测你与谁的灵魂底色最相近。
- **义镜** — 价值坐标定位。54 道题,从利他、公正、诚实到自律,刻画你的道德光谱。
- **意识镜** — 政治光谱定位。55 道题,32 种意识形态库,经济轴与社会轴交叉定位。

## 九种答题方法

心镜不止于"选一个"。每种题型都在测量不同层面的你:

**量表与困境**是基础——前者测稳定倾向,后者把人放进真实的历史两难,看你怎么选。**滑块与强迫抉择**逼出极端:连续光谱上没有安全的中间点,二选一时没有逃避余地。**矩阵与拍卖**测量结构化信念——前者是多陈述的同意度矩阵,后者用有限预算竞拍价值观,出价即真实排序。**分配与排序**直接暴露优先级。**内隐联想(IAT)**测的是你自己都没意识到的偏向——凭直觉快速分类,反应时的差异比任何深思熟虑都诚实。

## 行为轨迹

每个答案都附带行为数据:作答耗时、改主意次数、操作轨迹。这些不是辅助信息——它们直接参与计分。

耗时 3-15 秒的答案权重最高;秒选的降权(太随意),超时的降权(可能本能而非思考)。改主意两次以上的降权——价值未定型的信号弱于笃定的选择。排序题的位置权重非线性递减,第一名和第二名的差距远大于第四和第五。

## 核心能力

计分引擎按维度累计加权得分,动态归一化到 0-100。百分位通过正态分布 CDF 估算,告诉你"在这个维度上高于多少人"。冲突检测会揪出跨题型的维度矛盾(量表说左、排序说右)、IAT 内隐与外显的分裂、犹豫与反复的模式。最终生成 3-5 个画像关键词,以及六维行为洞察:决策风格、一致性、纠结度、勇气指数、时间压力效应、内隐偏向。

## 技术栈

后端是 Python 3.12 + FastAPI + SQLAlchemy 2.0 async,数据层用 aiosqlite(可平滑切换 Postgres)。题库 YAML 驱动,新增题型只需扩展 schema 与计分分支,不动路由层。前端是纯 HTML + JS + CSS,无构建步骤,可直接部署。视觉上用 Fraunces 可变衬线 + Noto Serif SC,Glassmorphism 2.0 风格,遵循 WCAG AA 对比度。

## 本地运行

```bash
cp .env.example .env
pip install -e ".[dev]"
fastapi dev app/main.py
```

启动后访问 `http://localhost:8000`,API 文档在 `/api/docs`。

## API

```
GET  /api/assessments                      三面镜子元信息
GET  /api/assessments/{type}/questions     题库
POST /api/sessions?assessment_type={type}  开始或恢复测评
POST /api/sessions/{id}/responses          提交答案(complete=true 触发计分)
GET  /api/results/{id}                     取报告
GET  /api/me/results                       历史报告
GET  /api/sessions/{id}/result             按会话取结果
```

## 答案格式

```javascript
scale:         { option_id: "3" }
dilemma:       { option_id: "a" }
slider:        { position: 75 }                  // 0-100 连续光谱
forced_choice: { choice: "side_a" }              // 二选一
matrix:        { ratings: { s1: 6, s2: 4 } }     // 1-7 同意度
auction:       { bids: { item1: 30, item2: 20 } }
allocation:    { allocation: { t1: 40, t2: 60 } } // 总和须等于 total
sort:          { order: ["a", "b", "c"] }         // 1 = 最重要
iat:           { iat: [{ word, category, response, rt, correct }, ...] }
```

每个答案携带 `duration_ms`、`change_count`、`trajectory` 三项行为数据。

## 目录结构

```
app/
  api/routes/   路由层 — 参数校验,调 service
  services/     业务层 — 计分/匹配/冲突/洞察/百分位/画像
  models/       数据模型
  schemas/      Pydantic schema(9 题型判别联合)
  core/         配置/DB/认证
data/
  questions/    题库(9 题型,YAML 驱动)
  figures/      名人库(40 位)
  ideologies/   意识形态库(32 种)
static/         前端(纯 HTML+JS+CSS)
```

## 扩展点

换 Postgres 改 `DATABASE_URL`;接微信登录把 `AUTH_PROVIDER` 设为 `wx`;前端替换为 Vue 或小程序,API 层不动。题库增删改 YAML 即可,无需改代码。

## 声明

心镜是自我探索工具,不构成医疗诊断,结果仅供自我探索与参考。
