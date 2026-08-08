# 心镜 MindMirror

**一面镜子，照见你与历史、价值、角色的真实投影。**

心镜是一个有趣的网页游戏开源项目，通过情境化答题与行为轨迹，帮你探索自我——你的灵魂与哪位历史名人最相近？你的价值坐标在何处？你的底色与哪个 Galgame 角色最契合？每一面镜子都是一次有趣的灵魂探险。

---

## 玩法

心镜目前包含 **三大板块、九种答题方法**：

### 自我探索

| 镜 | 玩法 | 题数 |
|---|------|------|
| **名人镜** | 通过两难情境判断你的选择与哪位历史人物最相近 | 20/40/80 题 |
| **价值镜** | 从利他、公正、诚实等维度刻画你的价值坐标 | 20/40/80 题 |
| **意识镜** | 经济与社会双轴定位你的意识形态光谱 | 20/40/80 题 |

### 娱乐趣味

| 镜 | 玩法 | 题数 |
|---|------|------|
| **Galgame 能力测评** | 五维量化你的 Galgame 玩家底色 | 30 题 |
| **Galgame 角色画像** | 测出你的灵魂底色与哪个名角色最契合 | 12 题 |

### 答题方法

九种题型：量表题、困境题、强度滑块、强迫抉择、同意度矩阵、价值拍卖、资源分配、排序题、内隐联想（IAT）。

答题过程中记录 **作答耗时、修改次数、决策轨迹**，生成行为洞察与矛盾检测。

---

## 开源特性

- **纯前端**：所有数据存储在浏览器 localStorage，无需服务器
- **多主题**：霓虹赛博、水墨、温暖、杂志等多种视觉风格
- **多语言**：中文 / English / 日本語 三语界面
- **响应式**：移动端到桌面端全适配
- **动画系统**：页面过渡、微交互、prefers-reduced-motion 无障碍支持

---

## 技术栈

| 技术 | 用途 |
|------|------|
| React 19 + TypeScript 6 | 框架 |
| Vite 8 | 构建 |
| React Router 6 | 路由 |
| Motion (Framer Motion) | 动画 |
| Zustand | 状态管理 |
| TanStack Query | 数据请求 |
| Tailwind CSS | 样式 |
| ECharts | 可视化 |
| Sonner | 通知 |
| Supabase Auth | 认证（可选） |

---

## 快速开始

```bash
git clone https://github.com/weed33834/mindmirror.git
cd mindmirror
npm install
npm run dev
```

浏览器打开 `http://localhost:5173` 即可游玩。

### 构建部署

```bash
npm run build
npm run preview
```

---

## 许可证

[Apache License 2.0](LICENSE) © 2026 weed / badhope

---

## 镜像

| 平台 | 地址 |
|------|------|
| GitHub（主） | https://github.com/weed33834/mindmirror |
| GitCode | https://gitcode.com/badhope/mindmirror |
| Gitee | https://gitee.com/badhope/mindmirror |