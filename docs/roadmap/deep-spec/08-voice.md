# 深度规格 08：语音系统（Voice System）

> 模板：docs/deep-spec/00-template.md
> 调研依据：阿里 Qoder Voice（实时语音交互智能体：语音唤醒→实时互动→执行任务，解放双手）、Qwen-Audio-3.0-TTS（Flash 实时版首包 300ms / Plus 高质量版，16 语言 20 方言，细粒度标签控制）、Kokoro-TTS（本地实时 TTS/音色融合）、海螺语音音色库（语言/口音/性别/年龄四维分类）、豆包高级语音模式 9 种音色。
> 核心结论：**语音不是"转写+朗读"两个独立按钮，而是一条流式全双工链路 + 可管理的音色资产体系**。

## 1. 定位与总体架构

**业务价值**：让用户"动动嘴，让 Agent 干活"。语音系统管住：**输入**（语音→文字：ASR）、**输出**（文字→语音：TTS）、**实时通话**（流式全双工低延迟对话）、**音色资产**（多音色管理/试听/增删）、**语音指令**（唤醒词/免唤醒指令）、**转写管理**（记录/回看）。

**语音链路全景**：

```
┌─ 非实时模式（网页端）────────────────────────────────┐
│ 用户点麦克风 → 录音上传 → POST /voice/transcribe (ASR)  │
│   → 文字进入对话 → 回复 → GET /voice/speak?text= (TTS)  │
│   → 前端播放音频                                        │
├─ 实时通话模式（WebSocket 全双工）──────────────────────┤
│ 用户说话 → 音频流分帧 → VAD(端点检测) → ASR 流式转写     │
│   → 语义断句后交给 LLM（或 LLM 直听音频）               │
│   → 回复文本 → TTS 流式合成 → 音频帧回推播放            │
│   （打断：用户再次说话 → 立即停止合成 → 切回聆听）       │
├─ 语音指令模式（唤醒）─────────────────────────────────┤
│ 唤醒词检测（如"小助手"）→ 进入聆听 → 指令转写 → 执行     │
└──────────────────────────────────────────────────────┘
```

**音色资产（对标豆包 9 音色/海螺四维分类）**：

```
VoiceAsset（音色资产）
├─ 系统预置音色：按 语言×口音×性别×年龄×风格 分类
├─ 用户自定义：克隆音色（上传样本训练）/ 导入音色包
├─ 每音色含：名称/引擎/参数(语速/音调/音量/情感)/试听/标签
└─ 使用分配：agent 默认音色 / 会话临时切换
```

## 2. 资产模型（语音数据模型）

### 2.1 音色（DB：`voices`）

| 字段 | 类型 | 必填 | 默认 | 说明 | 取值/约束 |
|------|------|------|------|------|-----------|
| id / name | — | ✅ | — | 音色名（唯一，如"知性女声-林溪"） | — |
| engine | enum | ✅ | default | 合成引擎 | default(默认厂商) / custom(自定义端点) / edge / qwen-tts / kokoro |
| provider | string | ✅ | — | 供应商（火山/阿里/微软/OpenAI/本地） | — |
| voice_id | string | ✅ | — | 供应商侧音色 ID | — |
| language | string | ✅ | zh-CN | 语言 | zh-CN/en-US/ja-JP…（16 语言 20 方言） |
| accent | string | 否 | — | 口音/方言 | 东北/粤语/川渝/English-US… |
| gender | enum | 否 | — | male/female | — |
| age_group | enum | 否 | — | child/young/middle/elder | — |
| style | list | 否 | [] | 风格标签 | 温柔/活泼/沉稳/播音/卡通… |
| params | json | 否 | {rate:1.0, pitch:1.0, volume:1.0} | 默认合成参数 | rate 0.5-2 / pitch 0.5-2 |
| emotion | json | 否 | {} | 情感控制 | {happy, sad, angry…} 每项 0-1 |
| preview_url | string | 否 | — | 预置试听音频 | 管理界面播放 |
| is_system | bool | ✅ | false | 系统预置（不可删）/用户自定义 | — |
| is_default | bool | 否 | false | 全局默认音色 | 唯一 |
| clone_sample_ref | string | 否 | — | 克隆音色用样本文件 | 1-10 分钟样本 |
| status | enum | ✅ | ready | ready/processing(克隆中)/failed/disabled | — |
| usage_count | int | ✅ | 0 | 被引用次数 | 防误删（被 agent 引用禁删） |
| created_by / created_at | — | ✅ | — | 审计 | — |

### 2.2 ASR 引擎（DB：`asr_engines`）

| 字段 | 说明 |
|------|------|
| id / name | 引擎名（如 whisper-local / volcano-asr / qwen-audio） |
| provider / engine_type | 供应商 + 类型（cloud/local） |
| language | 识别语言（多语言自动/指定） |
| vad_enabled / vad_sensitivity | 端点检测开关与灵敏度 |
| streaming_supported | 是否支持流式转写 |
| params | 附加参数（热词列表/标点/数字格式化） |
| enabled / status | 启停 + 健康状态 |

### 2.3 语音会话（DB：`voice_sessions`）——实时通话

| 字段 | 说明 |
|------|------|
| id / session_type | 会话 ID + 类型（transcribe/voice_chat/wake_word） |
| user_id / agent_id | 归属 |
| status | idle/listening/processing/speaking/interrupted/ended |
| engine_ids | 使用的 ASR+TTS 引擎 |
| voice_id | 当前音色 |
| transcript | 完整转写记录（可回看） |
| audio_ref | 录音文件引用（可选，合规保留） |
| metrics | 延迟统计（VAD→ASR→LLM→TTS 各段） |
| started_at / ended_at | 时长 |

## 3. 配置项全清单（怎么配置）

### 3.1 全局配置（.env）

| 键名 | 类型 | 默认 | 说明 | 取值 | 生效时机 |
|------|------|------|------|------|----------|
| VOICE_ENABLED | bool | true | 语音总开关 | true/false | 热加载 |
| VOICE_ASR_ENGINE | string | 默认 | 转写引擎 | 已注册引擎名 | 热加载 |
| VOICE_TTS_ENGINE | string | 默认 | 合成引擎 | 已注册引擎名 | 热加载 |
| VOICE_DEFAULT_VOICE | string | — | 默认音色 | 音色名 | 热加载 |
| VOICE_REALTIME_ENABLED | bool | true | 实时通话开关 | true/false | 热加载 |
| VOICE_REALTIME_PROTOCOL | enum | websocket | 实时通道 | websocket / webrtc | 重启 |
| VOICE_REALTIME_SAMPLE_RATE | int | 16000 | 音频采样率 | 8000/16000/24000 | 重启 |
| VOICE_VAD_ENABLED | bool | true | 端点检测 | true/false | 热加载 |
| VOICE_VAD_SENSITIVITY | float | 0.6 | 灵敏度（高=更易断句） | 0-1 | 热加载 |
| VOICE_SILENCE_TIMEOUT | int | 800 | 静音判定 ms | 200-3000 | 热加载 |
| VOICE_MAX_RECORD_SECONDS | int | 60 | 单段录音上限 | 5-600 | 热加载 |
| VOICE_INTERRUPT_ENABLED | bool | true | 允许打断（边说边停合成） | true/false | 热加载 |
| VOICE_INTERRUPT_DEBOUNCE | int | 250 | 打断判定防抖 ms | 100-1000 | 热加载 |
| VOICE_TTS_STREAMING | bool | true | TTS 流式输出 | true/false | 热加载 |
| VOICE_TTS_FIRST_PACKET_MS | int | 300 | 首包目标（实时模式） | 100-1000 | 监控指标 |
| VOICE_WAKE_WORD | string | 小助手 | 唤醒词 | 2-6 字 | 热加载 |
| VOICE_WAKE_ENABLED | bool | false | 唤醒词总开关 | true/false | 热加载 |
| VOICE_TRANSCRIPT_RETENTION_DAYS | int | 30 | 转写保留 | 1-3650 | 热加载 |
| VOICE_AUDIO_RETENTION_DAYS | int | 0 | 录音保留（0=不存） | 0-3650 | 热加载 |
| VOICE_MAX_CLONE_SECONDS | int | 600 | 音色克隆样本上限 | 30-3600 | 上传校验 |

### 3.2 按 agent 配置（agent.yaml）

```yaml
voice:
  enabled: true
  voice: 知性女声-林溪            # 默认音色
  tts_params: {rate: 1.1, pitch: 1.0}
  realtime: true                  # 允许实时通话
  wake_word: false                # 单独唤醒
  language: zh-CN
  interruptible: true
```

### 3.3 会话内切换（对话指令）

| 用户说 | 行为 |
|--------|------|
| "换个男声" / "用温柔一点的声音" | 切换音色（按标签匹配最接近） |
| "说慢一点" / "大声点" | 调整 rate/volume 参数（会话内生效） |
| "用英语回答" | 切换输出语言（对应音色族） |

## 4. 管理界面（增删改调 + 辅助功能）

### 4.1 音色管理（VoiceManager）——用户明确要求的"管理音色"

| 能力 | 说明 | 接口 |
|------|------|------|
| 音色列表 | 名称/引擎/语言口音/性别年龄/风格/状态/用量 | GET /admin/voices |
| 试听 | 内置示例文本播放（"你好，我是你的智能助手"） | 前端 audio 播放 preview |
| 多维筛选 | 语言/口音/性别/年龄/风格/引擎 组合筛选（海螺式分类） | ?lang=&accent=&gender=&style= |
| 新增音色 | 选供应商+voice_id+语言+参数 → 试听确认后保存 | POST /admin/voices |
| 编辑音色 | 名称/参数（语速/音调/音量）/风格标签/默认标记 | PUT /admin/voices/{id} |
| 删除音色 | 被 agent 引用禁删（409+引用列表） | DELETE /admin/voices/{id} |
| 设为默认 | 一键设为全局默认 | POST /admin/voices/{id}/set-default |
| 音色克隆 | 上传样本 → 处理中 → ready（可试听对比） | POST /admin/voices/clone |
| 启停 | 停用后引用它的 agent 回退默认音色 | POST /admin/voices/{id}/toggle |

### 4.2 语音引擎配置（VoiceSettings）

| 能力 | 说明 | 接口 |
|------|------|------|
| ASR 引擎管理 | 引擎列表/启停/参数（VAD 灵敏度/热词表/多语言） | GET/PUT /admin/voice/engines |
| TTS 引擎管理 | 引擎列表/启停/参数（流式/首包目标/并发） | 同上 |
| 实时通话设置 | 协议/采样率/打断开关/静音阈值 | PUT /admin/voice/settings |
| 唤醒词设置 | 唤醒词/灵敏度/免唤醒指令列表 | PUT /admin/voice/settings |
| 录音与合规 | 录音保留策略/转写保留/隐私提示文案 | PUT /admin/voice/settings |

### 4.3 通话与转写管理（VoiceLogs）

| 能力 | 说明 | 接口 |
|------|------|------|
| 通话记录 | 会话列表/时长/音色/状态 | GET /admin/voice/sessions |
| 转写回看 | 完整转写文本 + 分段时间戳 | GET /admin/voice/sessions/{id} |
| 延迟指标 | VAD→ASR→LLM→TTS 分段耗时（优化实时体验） | GET /admin/voice/sessions/{id}/metrics |
| 音频回放 | 存录音频的会话可回放（合规场景） | GET /admin/voice/sessions/{id}/audio |
| 实时监听 | 正在进行的通话状态面板（可选，需授权） | WS 管理通道 |

### 4.4 辅助功能

| 功能 | 详情 | 状态 |
|------|------|------|
| 音色市场 | 预置音色包浏览/一键导入（对标豆包 9 音色） | 🔶 待补 |
| 批量导入 | 从供应商控制台导出的音色清单批量添加 | 🔶 待补 |
| 文本转语音试听台 | 输入任意文本 + 选音色 + 参数 → 合成试听（**验证 TTS 工作**） | 🔶 待补 |
| 语音识别测试台 | 上传音频 → 转写 → 显示文本+置信度（**验证 ASR 工作**） | 🔶 待补 |
| 音色对比 | 两音色同文本并排试听 | 🔶 待补 |

## 5. 运行时嵌入（真正被调用）

### 5.1 非实时链路（网页端按钮）

```
前端录音（MediaRecorder）→ POST /voice/transcribe（multipart audio）
  ├─ ASR 引擎调用（whisper 本地 / 云 API）
  ├─ 返回 {text, confidence, segments[{start,end,text}]}
  └─ 文字填入输入框 → 正常对话
回复文本 → GET /voice/speak?text=...&voice_id=...&rate=...
  ├─ TTS 合成 → 音频流返回（可流式播放）
  └─ 前端 audio 播放（可在播放中切换音色/语速）
```

### 5.2 实时通话链路（WebSocket 全双工，核心）

```
WS 连接建立（/voice/realtime?agent_id=&voice_id=）
  ├─ 上行：客户端推音频帧（16k PCM/Opus）
  │    → VAD 端点检测（说话开始/结束）
  │    → ASR 流式转写（增量文本）
  │    → 断句完成 → 交给对话引擎（LLM，支持工具调用）
  ├─ 下行：LLM 回复 → 文本分段
  │    → TTS 流式合成（按句合成，首包 <300ms 目标）
  │    → 音频帧推给客户端播放
  ├─ 打断处理：
  │    用户再次说话（VAD 检测）→ 立即停止当前 TTS 合成
  │    → 丢弃未播完帧 → 切回聆听（防抖 250ms 防误判）
  ├─ 状态机：idle ↔ listening ↔ processing ↔ speaking（互斥）
  └─ 会话指标实时上报（分段延迟 → 前端显示"网络延迟 xx ms"）
```

### 5.3 唤醒词链路

```
VOICE_WAKE_ENABLED=true 时：
  → 常驻轻量音频监听（本机 VAD + 唤醒词模型）
  → 命中唤醒词 → 进入聆听模式 → 后续指令转写执行
  → 无指令 10s → 回到待唤醒
```

### 5.4 语音与 Agent 能力打通（不是两个独立按钮）

- 语音转写后的文字走**完整对话管线**（工具调用/记忆/RAG/编排全部可用）——"动动嘴让 Agent 干活"。
- 回复生成前可选**语义预判**：TTS 先合成"好的，我来查一下"（缓冲），完整结果出来后打断补播（体验优化）。
- 语音会话与文字会话共享同一会话记录（转写即消息），切设备可继续。

### 5.5 失败降级

| 场景 | 降级 |
|------|------|
| ASR 引擎不可用 | 提示"语音识别不可用，请用文字输入"（对话不中断） |
| TTS 引擎失败 | 回退浏览器内置 speechSynthesis（前端兜底） |
| 实时通道不稳定 | 自动降级为"录音-转写-文字回复"模式（半双工） |
| 音色被停用 | 引用它的 agent 回退默认音色（告警） |
| 克隆处理失败 | 音色状态 failed + 提示重新上传样本 |

## 6. 安全与权限

| 维度 | 策略 |
|------|------|
| 隐私 | 录音默认不持久化（VOICE_AUDIO_RETENTION_DAYS=0）；转写保留可配；合规场景可开启全量留存 |
| 角色 | 管理员：音色/引擎/设置全量；用户：试听+会话内切换；音色克隆需管理员审核（防滥用） |
| 审计 | 音色增删改/克隆/引擎变更审计；通话记录按用户隔离 |
| 注入防护 | 转写文本含语音注入指令 → 走对话层统一防护（03-5.5） |
| 防滥用 | 合成配额（每分钟/每天限制，防批量生成）；克隆样本版权声明 |

## 7. 前后端对齐矩阵 + 状态 + 缺口

| 功能 | 后端接口 | 前端组件 | 状态 | 缺口/补齐路径 |
|------|----------|----------|------|---------------|
| 转写 | POST /voice/transcribe | chat/VoiceInput（已有基础） | ✅ | — |
| 合成 | GET /voice/speak | VoiceInput 播放 | ✅ | — |
| 引擎列表 | GET /voice/engines | 设置页 | ✅ | — |
| 音色 CRUD | /admin/voices* | 新组件 VoiceManager.tsx | 🔶 待补 | 后端+前端 |
| 音色试听 | GET /admin/voices/{id}/preview | VoiceManager | 🔶 | 前端 audio |
| 音色克隆 | POST /admin/voices/clone | VoiceManager | ⬜ | 上传+异步处理 |
| 实时通话 | WS /voice/realtime | 新组件 VoiceChat.tsx（通话浮层） | 🔶 待补 | WebSocket 管线+前端 |
| 通话记录/转写回看 | /admin/voice/sessions* | 新组件 VoiceLogs.tsx | ⬜ | 落库+前端 |
| 延迟指标 | GET .../sessions/{id}/metrics | VoiceLogs | ⬜ | 分段埋点 |
| TTS/ASR 测试台 | POST /admin/voice/test | VoiceSettings | ⬜ | 复用链路 |
| 唤醒词 | VOICE_WAKE_ENABLED + 监听模块 | 客户端 SDK | ⬜ | 唤醒模型集成 |

**验证方法**：
1. 管理台新增一个音色（选引擎+voice_id+参数）→ 试听示例文本 → 保存（管理链路通）。
2. 对话页点麦克风说"你好" → 转写为文字 → 对话正常回复（ASR 链路通）。
3. 输入文本点朗读 → 音频播放；说"换男声" → 音色切换（TTS+切换通）。
4. 开实时通话 → 连续对话 3 轮（含一次打断）→ 会话记录显示分段转写与延迟指标（实时链路通）。
5. 删除被 agent 引用的音色 → 409 + 引用列表（防误删生效）。
