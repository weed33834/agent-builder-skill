# 28 多模态能力（Multimodal Capabilities）

> 定位：让 Agent 不仅能读文字，还能看图、听音、看视频、生成图——多模态输入理解 + 多模态输出生成 + 多模态 RAG 检索。与 08-voice（语音对话）、20-foundation（底层能力）、16-D（知识库）互补：本篇聚焦"多模态资产、处理管道、跨模态检索、生成能力"。
> 来源：CLIP/BLIP 联合嵌入 / 多模态 RAG 三方法（共享向量空间/单一基础模态/独立检索）/ Whisper+CLIP+VLM 视频理解流水线 / SkyReels-V3 影音图文统一生成 / GPT-4V、通义千问多模态、文心 ERNIE-ViLG 实践。

---

## 一、定位与架构

- 能力矩阵：理解（图/音/视频 → 文本）| 生成（文本 → 图/音/视频）| 检索（跨模态双向）
- 处理流水线：多模态输入 → 预处理（OCR/ASR/抽帧）→ 模态编码（CLIP 等联合嵌入）→ 统一向量空间 → 下游理解/RAG/生成
- 三种多模态 RAG 架构：共享向量空间（CLIP 统一嵌入）/ 单一基础模态（全部转文本，简单但丢信息）/ 独立检索（各模态独立索引+重排序融合）
- 视频理解四段式：抽关键帧（降 VLM 输入量）→ Whisper 转语音文本 → CLIP 生成帧向量 → VLM 融合理解
- 生成能力接入：文生图/文生视频/图生视频/数字人（参考图+音频驱动）

## 二、资产模型（全字段）

| 实体 | 字段 |
|---|---|
| MultimodalAsset | asset_id / type(image|audio|video|document_scanned) / uri / mime / size / dims / duration / thumb / owner / tags[] |
| ModalityIndex | index_id / asset_id / modality / embed_model / vector_id / chunk_ref / created_at |
| TranscribeJob | job_id / asset_id / task(asr|ocr|caption|frame_extract) / model / status / result_uri / confidence |
| GenTask | task_id / type(t2i|t2v|i2v|t2a|avatar) / prompt / params / model / status / output_uri / cost |
| MultiModalDoc | doc_id / name / modality_mix / pages[] / index_status / retrieval_weight |
| CrossModalQuery | query_id / query_text / query_image / target_modalities[] / top_k / result[] |

## 三、配置项全清单

- multimodal.enabled（多模态总开关）、multimodal.max_input_size（单文件大小上限）
- multimodal.ocr.engine（PaddleOCR/Tesseract/LLM 视觉）、ocr.languages
- multimodal.asr.engine（Whisper 等）、asr.language_auto（自动语种识别）
- multimodal.video.frame_rate（抽帧频率）、video.max_frames（单视频最大帧数）
- multimodal.embed.model（CLIP/BLIP/多模态 embedding 模型）、embed.dim
- multimodal.retrieval.mode（shared_space|single_modality|independent）
- multimodal.gen.models.（各生成任务默认模型映射）、gen.queue（生成队列并发）
- multimodal.cost.budget（多模态处理预算，联动 23-成本）

## 四、管理界面（增删改调 + 辅助功能）

- 多模态资产库：全类型资产 CRUD、预览（图片灯箱/音视频播放）、标签分类、批量导入
- 处理任务中心：OCR/ASR/抽帧/字幕任务列表、进度、重试、结果预览与人工校对
- 索引管理：各模态索引状态、重建索引、embedding 模型切换、覆盖率统计
- 跨模态检索台：文本查图/图查文本/图文查视频、结果排序、相关性人工标注反馈
- 生成工作台：文生图/文生视频/数字人等任务的 Prompt 输入、参数面板、生成预览、历史管理
- 多模态 RAG 配置：检索模式选择、权重调优、效果对比（A/B）
- 模型路由管理：理解/生成模型池、按任务路由、降级策略（模型不可用自动降级）

## 五、运行时嵌入链路

- 对话链路：用户上传图片/语音/视频（15-ux-detail C 域附件）→ 预处理管道（OCR/ASR/抽帧）→ 模态编码 → 注入上下文（03-context）→ 模型理解 → 输出
- RAG 链路：多模态文档入库（16-D 知识库扩展）→ 各模态分块索引 → 查询时跨模态检索 → 重排序 → 增强生成
- 生成链路：用户 Prompt → 生成任务入队 → 模型执行 → 产物入库 → 前端展示（含生成过程进度）
- 语音链路：语音输入 → ASR → 文本进入对话（08-voice）；回答 TTS 输出
- 降级链路：多模态模型不可用 → 提示"当前模型不支持该格式"→ 转文本描述或拒绝并引导

## 六、安全与权限

- 资产权限：多模态资产按 RBAC 授权（own/team/all，联动 13-iam）
- 内容安全：图片/视频 NSFW 检测、OCR 文本敏感词检测（联动 27-AI 安全）
- 隐写注入防护：图片内嵌文字可能携带提示注入（多模态隐形注入），入库前检测
- 生成合规：生成内容水印、版权声明、禁止生成违禁内容
- 存储加密：敏感资产加密存储、访问留痕

## 七、前后端对齐矩阵 + 验证方法

| 功能 | 前端 | 后端 | 状态 |
|---|---|---|---|
| 多模态资产库 | MultimodalAssetLibrary | CRUD /api/multimodal/assets + POST /api/multimodal/assets/upload | ⬜ |
| 处理任务中心 | TranscribeJobCenter | POST /api/multimodal/jobs + GET /api/multimodal/jobs/{id} | ⬜ |
| 索引管理 | ModalityIndexManager | POST /api/multimodal/index/rebuild + GET /api/multimodal/index/status | ⬜ |
| 跨模态检索台 | CrossModalSearch | POST /api/multimodal/search | ⬜ |
| 生成工作台 | GenWorkbench | POST /api/multimodal/gen + GET /api/multimodal/gen/{id} | ⬜ |
| 多模态 RAG 配置 | MultiModalRAGConfig | PUT /api/multimodal/rag-config | ⬜ |

验证：① 上传图片后对话能描述图片内容 ② 上传视频自动 ASR+抽帧，可问"视频里说了什么" ③ 文本查图返回相关图片 ④ 文生图任务完成并入库 ⑤ 图片内嵌恶意指令被检测拦截 ⑥ 多模态模型故障时优雅降级不崩溃
