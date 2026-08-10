# 深度规格 02：沙箱系统（Sandbox System）

> 模板：docs/deep-spec/00-template.md
> 用户点名示例："沙箱里面环境肯定要控制的，可以选择开启或者关闭，有云沙箱、有本地沙箱，里面的环境可以自己添加、自己管理修改，有默认的环境。"

## 1. 定位与总体架构

**业务价值**：智能体要执行代码、跑 shell、抓网页、操作浏览器，这些能力如果不隔离，等于把服务器大门敞开给不可信模型输出。沙箱系统的职责：**让不可信代码在受限环境执行**，执行结果安全回流，且环境本身可被用户添加、修改、管理、选择开关。

**安全边界模型（分层信任）**：

```
┌─ 不可信层：模型生成的代码/shell/浏览器操作 ─┐
│   ↓ 经过沙箱边界（隔离/限权/限资源/审计）    │
├─ 沙箱层：subprocess / Docker / Firecracker / 云沙箱 / V8 Isolate ─┤
│   ↓ 受控出口（网络白名单、文件白名单、数据回流）                     │
├─ 宿主层：主服务 / 数据库 / 密钥库 ───────────────────────────────────┤
```

**沙箱类型矩阵（全部可选，按 agent 需求配置）**：

| 类型 | 隔离级别 | 启动延迟 | 适用场景 | 成本 |
|------|----------|----------|----------|------|
| 本地 subprocess | 进程级（OS 用户隔离+资源限制） | ~10ms | 快速 Python/JS 脚本、确定性计算 | 免费 |
| Docker 容器 | 容器级（namespace+cgroup） | ~300ms-1s | 通用代码执行、依赖安装、浏览器 | 低 |
| Firecracker MicroVM | 虚拟机级（硬件隔离） | ~125ms | 多租户高安全、不可信第三方代码 | 中 |
| 云沙箱（E2B/Modal/腾讯 Cube） | 云端远程环境 | ~500ms-2s | 无本地资源、大规模并发、异地隔离 | 按量付费 |
| V8 Isolate（secure-exec 类） | 进程内隔离 | ~1ms | Node.js 纯函数执行 | 免费 |
| 浏览器沙箱（Playwright + 容器） | 浏览器级 | ~1-3s | 网页操作、截图、抓取 | 中 |

**开关控制**（用户明确要求）：
- 全局开关：`SANDBOX_ENABLED=false` 时所有执行类工具返回"沙箱已禁用"，对话中提示用户开启。
- 按 agent 开关：`agent.yaml → sandbox.enabled`。
- 按工具开关：M4 工具注册时声明 `sandboxed: true/false`，非沙箱工具在沙箱外执行受限。

## 2. 资产模型（沙箱环境数据模型）

### 2.1 环境模板（DB：`sandbox_templates`）——用户可"自己添加、自己管理修改"

| 字段 | 类型 | 必填 | 默认 | 说明 | 取值/约束 |
|------|------|------|------|------|-----------|
| id | UUID | ✅ | 自动 | 环境模板 ID | — |
| name | string | ✅ | — | 环境名（如 `python3.12-data`） | 1-64 字符，全局唯一 |
| runtime_type | enum | ✅ | docker | 沙箱类型 | subprocess/docker/firecracker/cloud/v8/browser |
| base_image | string | ✅ | python:3.12-slim | 基础镜像（docker/firecracker/cloud 用） | 合法镜像名 |
| default | bool | 否 | false | 是否为默认环境（新建 agent 自动选用） | 全局仅一个 default=true |
| enabled | bool | ✅ | true | 该环境是否可用（关闭=引用它的 agent 降级） | true/false |
| resource_limits | json | 否 | {cpu:1, mem:1G, disk:2G} | 资源限制 | cpu(核)/mem/disk(字节) |
| network_policy | json | 否 | {mode: off, whitelist: []} | 网络策略 | mode: off/whitelist/on；whitelist=域名列表 |
| fs_policy | json | 否 | {read: [/data], write: [/tmp], env: []} | 文件系统+环境变量策略 | 路径白名单 |
| syscalls | string | 否 | seccomp-default | 系统调用策略 | default/block_all/自定义 profile |
| startup_script | string | 否 | "" | 启动时执行的初始化脚本 | 如 `pip install -r req.txt` |
| env_vars | json | 否 | {} | 注入环境变量 | 值支持 `{SECRET}` 引用密钥库 |
| packages | list | 否 | [] | 预装包 | pip/npm/apt 包名列表 |
| mounts | list | 否 | [] | 宿主机挂载 | {host_path, container_path, readonly} |
| timeout | int | ✅ | 60 | 单次执行超时（秒） | 1-3600 |
| max_output_chars | int | ✅ | 10000 | 输出截断上限 | 100-1M |
| persistent | bool | 否 | false | 会话内是否保留状态（临时文件跨调用） | true/false |
| created_by / created_at / updated_at | — | ✅ | — | 审计字段 | — |

### 2.2 沙箱会话（运行时对象）

| 字段 | 说明 |
|------|------|
| session_id | 沙箱实例 ID（每次执行/每个对话轮次创建） |
| template_id | 来源模板 |
| status | creating/running/executing/idle/terminated/error |
| container_id / vm_id | 底层资源句柄 |
| created_at / expires_at | 生命周期（超时自动回收，防止泄漏） |
| last_activity | 空闲回收依据（如 5min 无活动销毁） |

### 2.3 执行记录（DB：`sandbox_executions`）——审计

| 字段 | 说明 |
|------|------|
| id / session_id / agent_id / user_id | 归属 |
| tool_name | 触发的工具（execute_code/execute_shell/browser_*） |
| command / code | 完整入参（审计关键） |
| exit_code / stdout / stderr | 结果（stdout 截断存储） |
| duration_ms / resource_peak | 性能 |
| policy_violations | 触发的策略违规列表（如访问白名单外网络） |
| verdict | allowed/blocked/error |
| created_at | 时间 |

## 3. 配置项全清单（怎么配置）

### 3.1 全局配置（.env）

| 键名 | 类型 | 默认 | 说明 | 取值 | 生效时机 |
|------|------|------|------|------|----------|
| SANDBOX_ENABLED | bool | true | 全局开关 | true/false | 热加载 |
| SANDBOX_DEFAULT_TYPE | enum | docker | 默认沙箱类型 | subprocess/docker/firecracker/cloud/v8/browser | 热加载 |
| SANDBOX_DOCKER_ENDPOINT | string | unix:///var/run/docker.sock | Docker 连接 | socket/TCP | 重启 |
| SANDBOX_DOCKER_NETWORK | string | bridge | 容器网络模式 | bridge/host/none/custom | 创建时 |
| SANDBOX_CLOUD_PROVIDER | enum | none | 云沙箱厂商 | none/e2b/modal/tencent_cube | 重启 |
| SANDBOX_CLOUD_API_KEY | secret | — | 云沙箱密钥（密钥库引用） | {SECRET:xxx} | 重启 |
| SANDBOX_MAX_CONCURRENT | int | 10 | 并发沙箱上限 | 1-1000 | 热加载 |
| SANDBOX_IDLE_TIMEOUT | int | 300 | 空闲回收秒数 | 10-86400 | 热加载 |
| SANDBOX_DEFAULT_TIMEOUT | int | 60 | 默认单次执行超时 | 1-3600 | 热加载 |
| SANDBOX_DEFAULT_MEM | int | 1024 | 默认内存 MB | 64-65536 | 热加载 |
| SANDBOX_DEFAULT_CPU | float | 1.0 | 默认 CPU 核 | 0.1-64 | 热加载 |
| SANDBOX_NETWORK_DEFAULT | enum | off | 默认网络策略 | off/whitelist/on | 热加载 |
| SANDBOX_LOG_LEVEL | enum | info | 执行日志级别 | debug/info/warn | 热加载 |
| SANDBOX_REQUIRE_APPROVAL | enum | never | 高危操作审批 | never/on_network/on_write/always | 热加载 |

### 3.2 按 agent 配置（agent.yaml）

```yaml
sandbox:
  enabled: true                  # 本 agent 开关
  template: python3.12-data      # 引用环境模板（默认用 default=true 的）
  type: docker                   # 覆盖模板类型
  network: whitelist             # 网络策略
  network_whitelist: [api.example.com]
  read_paths: [/data]            # 文件读白名单
  write_paths: [/tmp/out]        # 写白名单
  timeout: 120
  persistent: false
  approval_required: on_write    # 写操作需人工审批
```

### 3.3 工具级声明（@tool 装饰器）

```python
@tool("execute_code", sandboxed=True, sandbox_type="docker",
      sandbox_policy={"network": "off", "timeout": 30})
def execute_code(code: str) -> str:
    """在沙箱内执行 Python 代码"""
```
- `sandboxed=False`（默认）：工具在宿主进程执行（仅限可信内置工具如 `get_time`）。
- 模型只能看到声明后的工具 schema；沙箱策略在运行时由 SandboxManager 强制，模型无法绕过。

## 4. 管理界面（增删改调 + 辅助功能）

### 4.1 环境列表页（SandboxList）

| 能力 | 说明 | 接口 |
|------|------|------|
| 环境列表 | 名称/类型/镜像/默认标记/启用状态/资源/网络策略/最近使用 | GET /admin/sandboxes |
| 筛选搜索 | 按类型/启用状态/关键字 | ?type=&enabled=&q= |
| 运行状态 | 当前活跃沙箱会话数/并发占用 | GET /admin/sandboxes/stats |
| 启用/停用 | 开关（停用后引用它的 agent 执行降级为"沙箱未启用"错误） | POST /admin/sandboxes/{id}/toggle |
| 设为默认 | 一键设为默认环境 | POST /admin/sandboxes/{id}/set-default |

### 4.2 环境编辑器（SandboxEditor）

| 能力 | 说明 |
|------|------|
| 基础信息 | 名称/类型/镜像选择器（带常用镜像推荐：python/ubuntu/node/browser）+ 镜像搜索 |
| 资源限制 | CPU 核/内存/磁盘 滑块+数字输入，显示默认值 |
| 网络策略 | 模式单选（关闭/白名单/全开）+ 白名单域名增删（校验域名格式） |
| 文件系统 | 读/写路径白名单表格（增删改）+ 只读开关 |
| 环境变量 | 键值对表格 + `{SECRET}` 引用密钥库的下拉选择 |
| 预装包 | pip/npm/apt 三段输入，逗号分隔 |
| 启动脚本 | 多行编辑器 + 语法提示 |
| 超时与输出 | 超时秒数 + 输出截断上限 |
| 持久化 | 开关 + 说明 |
| 测试执行 | **内置试跑台**：输入一段代码 → 立即在该环境执行 → 显示结果/耗时/违规记录 |

### 4.3 辅助功能

| 功能 | 详情 | 状态 |
|------|------|------|
| 模板市场 | 预置环境模板库（python3.12-slim / pytorch / node20 / playwright / chrome 等），一键复制为自定义环境 | 🔶 |
| 环境复制 | 从现有环境复制为新环境再修改（克隆） | 🔶 |
| 导出/导入 | 环境配置导出为 YAML，可跨部署迁移 | 🔶 |
| 镜像管理 | 本地镜像列表、拉取进度、删除 | ⬜ |
| 执行日志查看器 | 按 agent/用户/工具过滤的沙箱执行记录 + stdout/stderr 回看 + 违规标记 | ⬜ |
| 资源监控 | 沙箱 CPU/内存实时曲线 + 配额告警 | ⬜ |

### 4.4 操作-接口对照总表

| 操作 | 后端接口 | 状态 |
|------|----------|------|
| 环境 CRUD | GET/POST/PUT/DELETE /admin/sandboxes(/id) | 🔶 待补 |
| 启用/停用 | POST /admin/sandboxes/{id}/toggle | 🔶 待补 |
| 设默认 | POST /admin/sandboxes/{id}/set-default | 🔶 待补 |
| 试跑 | POST /admin/sandboxes/{id}/test {code} | 🔶 待补 |
| 执行记录 | GET /admin/sandboxes/executions | 🔶 待补 |
| 统计 | GET /admin/sandboxes/stats | 🔶 待补 |

## 5. 运行时嵌入（真正被调用）

### 5.1 执行调用链

```
模型返回 tool_call{name: execute_code, args: {code}}
  └─ ToolRegistry.execute(name, args)                    # app/l5_tools/registry.py
       └─ 工具声明 sandboxed=True → SandboxManager.execute()
            ├─ 1. 检查 SANDBOX_ENABLED && agent.sandbox.enabled → 否则返回禁用错误
            ├─ 2. 选环境：agent.sandbox.template → default 模板 → 内置最小模板
            ├─ 3. 组装执行配置：镜像/资源/网络/文件策略/环境变量/超时
            ├─ 4. 创建沙箱实例（docker run / subprocess / 云沙箱 API / V8 isolate）
            ├─ 5. 注入策略：
            │     - 网络：off → --network=none / 白名单 → 代理侧 ACL
            │     - 文件：只读挂载 /data，写 /tmp；seccomp profile 挂载
            │     - 资源：--cpus --memory --pids-limit（防 fork 炸弹）
            │     - 环境变量：注入（密钥从密钥库解密，仅注入沙箱）
            ├─ 6. 执行（stdin 传代码，超时器，输出截断）
            ├─ 7. 策略审计：记录 verdict/违规/资源峰值 → sandbox_executions
            ├─ 8. 回收：非持久 → 立即销毁；持久 → 挂起等待会话复用
            └─ 返回 {stdout, stderr, exit_code} → 作为 tool_result 回喂模型
```

### 5.2 各沙箱类型的执行细节

| 类型 | 创建命令/机制 | 回收 | 备注 |
|------|--------------|------|------|
| subprocess | `Popen(..., preexec_fn=setuid(nobody), cwd=/tmp, env=过滤后)` + `resource.setrlimit` | 进程结束即回收 | 仅限可信场景 |
| docker | `docker run --rm -i --network=none --cpus --memory --pids-limit --security-opt seccomp=... -v /data:ro` | --rm 自动 | 最常用 |
| firecracker | 预先准备 rootfs+微内核，API 创建 MicroVM | API 销毁 | 多租户首选 |
| cloud | E2B/Modal SDK 创建远程 sandbox，WebSocket 传代码 | API 销毁 | 需网络可达 |
| v8 isolate | `secure-exec` 等库进程内隔离执行 | 同步返回 | 纯函数场景 |
| browser | `docker run playwright/chromium` + Playwright 连接 | 会话结束销毁 | 网页操作 |

### 5.3 浏览器操作沙箱（网页工具专用）

- `browser_navigate / browser_click / browser_screenshot / browser_extract` 全部走容器化 Playwright。
- 配置：`BROWSER_ALLOWED_DOMAINS`（默认空=禁止所有外部导航）、`BROWSER_SCREENSHOT_ENABLED`、`BROWSER_MAX_NAVIGATIONS=20`（防死循环跳转）。
- 下载防护：禁止容器写宿主下载目录，产物经 `download` 白名单目录回传。

### 5.4 高危操作审批（HITL 联动）

- `SANDBOX_REQUIRE_APPROVAL=on_write`：沙箱尝试写白名单外路径 / 外发数据 → 挂起执行 → 管理台/对话内出现审批卡片 → 用户允许/拒绝 → 恢复或终止。
- 实现：LangGraph interrupt（M3.11）或 FastAPI 侧 pending 队列 + WebSocket 推送审批卡片。

### 5.5 失败降级

| 场景 | 降级 |
|------|------|
| 沙箱不可用（docker 未启动） | 返回明确错误"沙箱服务不可用"，agent 可切换无工具模式或停止执行 |
| 云沙箱配额耗尽 | 自动切换到本地 Docker（配置 `SANDBOX_CLOUD_FALLBACK=local`） |
| 执行超时 | 强杀进程 + 返回"执行超时，已终止" + 部分输出 |
| 策略违规 | 拦截并返回违规说明（不执行），记审计 |

## 6. 安全与权限

| 维度 | 策略 |
|------|------|
| 角色 | 管理员：环境 CRUD/开关/设默认/删除；开发者：试跑+复制（不可改公共模板）；用户：不可见沙箱管理页 |
| 审计 | 每次执行全量记录（代码/命令/结果/违规/审批记录），保留 N 天 |
| 密钥 | 环境变量只引用密钥库 ID，回显打码；沙箱内可读但宿主日志脱敏 |
| 防逃逸 | seccomp 默认阻断 mount/ptrace/reboot 等危险 syscall；容器不挂 docker.sock；非 root 运行（--user 1000） |
| 防滥用 | 并发上限、单 agent 速率限制、镜像拉取白名单（防挖矿镜像） |
| Prompt 注入 | 沙箱输出（网页抓取文本等）回喂模型时加隔离标记，降低注入影响（见 03-context 5.5） |

## 7. 前后端对齐矩阵 + 状态 + 缺口

| 功能 | 后端接口 | 前端组件 | 状态 | 缺口/补齐路径 |
|------|----------|----------|------|---------------|
| 运行时执行（核心链路） | SandboxManager（app/l4_agent/ 或 l5_tools/） | —（对话内触发） | 🔶 核心类待实现 | sandbox_manager.py + docker/firecracker/cloud 驱动 |
| 环境 CRUD | /admin/sandboxes* | 新组件 SandboxList.tsx + SandboxEditor.tsx | ⬜ 全新 | 后端 admin.py 加路由 + 前端两组件 |
| 启用/停用/设默认 | /admin/sandboxes/{id}/toggle、set-default | SandboxList.tsx | ⬜ | 同上 |
| 试跑台 | /admin/sandboxes/{id}/test | SandboxEditor.tsx | ⬜ | 复用执行链路 |
| 执行记录查看 | /admin/sandboxes/executions | 新组件 SandboxLogs.tsx | ⬜ | 后端查询 + 前端表格 |
| 资源监控 | /admin/sandboxes/stats | SandboxList.tsx | ⬜ | 聚合查询 |
| 审批卡片 | POST /admin/sandboxes/{id}/approvals | 对话页审批 UI | ⬜ | 与 HITL 通道打通 |

**验证方法**：
1. `SANDBOX_ENABLED=false` → 对话中让 agent 执行代码 → 应返回"沙箱已禁用"提示（开关生效）。
2. 管理台创建环境：docker + python:3.12-slim + 网络 off → 试跑 `import socket; socket.gethostbyname('x')` → 应网络失败；跑 `print(1+1)` → 输出 2（策略生效）。
3. 设置 write_paths 白名单 → 沙箱内写白名单外路径 → 应被拦截并记录违规（文件策略生效）。
4. 高危操作审批开启 → 触发写外路径 → 对话出现审批卡片 → 允许后恢复（HITL 生效）。
