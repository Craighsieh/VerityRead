# VerityRead → Codex 交接清单

**交接日期：** 2026-07-25  
**仓库路径：** `/Users/craighsieh/Documents/VaultLens`  
**正式名称：** VerityRead／真閱（隐私优先、本机 AI Chrome 扩展）
**当前阶段：** Phase 0 + Phase 1（MVP Alpha）代码骨架与核心功能已落地；真机验收与封闭测试未完成  
**技术栈：** TypeScript + Vite + CRXJS + React + Manifest V3 + pnpm  

---

## 0. 给 Codex 的开工指令（可直接粘贴）

```text
你正在接手 VerityRead（Chrome MV3 扩展）。仓库：/Users/craighsieh/Documents/VaultLens

必读（按顺序）：
1. VerityRead_Local_AI_Browser_PRD_v1.0.md（产品真相来源）
2. docs/HANDOFF_CODEX.md（本交接清单）
3. docs/ARCHITECTURE.md
4. docs/THREAT_MODEL.md
5. docs/TASKS.md
6. docs/adr/*（尤其 ADR-001~004：Chrome-only、activeTab、Provider 抽象、无云端推理）

硬约束（违反即错误）：
- 禁止云端推理 fallback；页面正文/选区/Prompt/回复不得外传
- 禁止 <all_urls>；MVP 权限保持 activeTab/scripting/storage/sidePanel/contextMenus + Ollama loopback
- Ollama 仅允许 127.0.0.1/localhost；不要接公网 API
- 第三方库必须 build-time 打包；禁止远程加载 JS/WASM
- 不要编辑任何 *.plan.md 计划文件

开工第一步：
cd /Users/craighsieh/Documents/VaultLens && pnpm install && pnpm pipeline && pnpm test:egress

通过后，优先处理「§5 未完成 / 已知问题」，不要重做已完成的脚手架。
每次改动后跑 pnpm pipeline；涉及隐私路径再跑 pnpm test:egress。
```

---

## 1. 项目一句话

VerityRead 让用户在 Chrome Side Panel 里**摘要当前页 / 问页面（带来源回跳）/ 翻译选区**，推理走 **Chrome Built-in AI** 或本机 **Ollama**；默认不把页面内容送给云端推理。

---

## 2. 仓库现状（接手时请核对）

| 项 | 状态 |
|---|---|
| Git | **尚无 commit**（全部 untracked）。接手后应先建初始 commit（需用户明确要求才 commit） |
| 构建 | `pnpm pipeline` 应通过（typecheck + unit + build + scan:dist） |
| 单测 | Vitest，约 19 tests |
| Egress | `pnpm test:egress` |
| 扩展加载 | `pnpm build` → Chrome 加载 `dist/` |
| 正式名称/商标/网域 | 英文 VerityRead；中文 真閱；商标与网域仍需正式清查 |
| 付费 / Pro / WebGPU / PDF / LM Studio | **不在当前 MVP 范围** |

### 关键命令

```bash
pnpm install
pnpm dev          # 开发
pnpm build        # 产出 dist/
pnpm pipeline     # CI 同款门槛
pnpm test
pnpm test:egress
pnpm scan:dist
```

### 加载扩展

1. `chrome://extensions` → 开发者模式  
2. 加载已解压 → 选 `dist/`  
3. 点扩展图标打开 Side Panel  

---

## 3. 必读文档地图

| 文件 | 用途 |
|---|---|
| [VerityRead_Local_AI_Browser_PRD_v1.0.md](../VerityRead_Local_AI_Browser_PRD_v1.0.md) | 完整 PRD（范围、验收、隐私、路线图） |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 三上下文、消息流、Provider、存储/网络边界 |
| [THREAT_MODEL.md](THREAT_MODEL.md) | 数据分类、注入、Ollama、XSS |
| [PRIVACY_TEST_PLAN.md](PRIVACY_TEST_PLAN.md) | egress / 残留 / 权限 / Offline Lock |
| [TASKS.md](TASKS.md) | Phase 0/1 任务勾选（代码侧多已勾完） |
| [PHASE0_GATE.md](PHASE0_GATE.md) | Phase 0 出口（**手动项多未勾**） |
| [ALPHA_CHECKLIST.md](ALPHA_CHECKLIST.md) | Alpha 发布检查 |
| [PERF.md](PERF.md) | 性能目标与如何测 |
| [adr/](adr/) | 架构决策 |
| [spikes/](spikes/) | Phase 0 spike 记录 |

---

## 4. 架构速查（改代码前先看）

```
Web Page --(用户点击)--> Content Script (extract / jump)
                              |
                              v
                     Side Panel Orchestrator
                              |
              +---------------+---------------+
              |                               |
     Chrome Built-in AI                 Ollama loopback
         (window 上下文)                127.0.0.1:11434
```

| 目录 | 职责 |
|---|---|
| `src/background/` | SW：菜单、偏好、转发给 tab；**不做长推理** |
| `src/sidepanel/` | React UI；Built-in AI session；流式结果 |
| `src/content/` | 用户触发后抽取、回跳高亮 |
| `src/providers/` | `LocalAIProvider`、Chrome、Ollama、Registry |
| `src/core/` | extract / chunk / retrieve / orchestrator / offlineLock |
| `src/storage/` | preferences + IndexedDB cache |
| `src/shared/` | messages、errors、sanitize |
| `scripts/scan-dist.ts` | 产物静态扫描（release 门槛） |
| `tests/` | unit + Playwright egress/flows |

消息协议：`src/shared/messages.ts`（discriminated union + `requestId` / `taskId`）。

---

## 5. 已完成 vs 未完成

### 已完成（不要无故重写）

- [x] MV3 脚手架、最小权限、CSP  
- [x] 三上下文 + 类型消息  
- [x] Chrome / Ollama Provider + Registry + 隐私收据  
- [x] 摘要三模式、问页面、选区翻译、右键菜单  
- [x] Onboarding、Privacy Center、Offline Lock、错误码目录  
- [x] 分块 / map-reduce 计划 / BM25 检索 / 拒答阈值  
- [x] 单测 + egress harness + scan-dist + GitHub Actions  
- [x] 交接文档与 ADR  

### 未完成 / 弱项（接手优先）

- [ ] **Git 初始 commit**（用户要求后再做）  
- [ ] **Phase 0 手动闸门**（见 `PHASE0_GATE.md`）：真机 Chrome AI 摘要、真机 Ollama 摘要、回跳手测  
- [ ] **Ollama CORS 本机配置**：用户环境曾出现 `OLLAMA_ORIGINS` 为空 → 扩展「没反应」；需引导设置 `chrome-extension://<ID>`  
- [ ] Settings UX：模型名需手填（如 `qwen3.6:latest`）；建议改为从 `/api/tags` 下拉选择  
- [ ] CORS/连接失败时 Side Panel 错误应更醒目（健康检查失败时用户常以为「没反应」）  
- [ ] 完整 Playwright `--load-extension` E2E（当前多为 harness，非完整扩展加载）  
- [ ] 两台基准设备性能实测并记录（`PERF.md`）  
- [ ] Alpha 封闭测试 10–20 人与指标收集（`ALPHA_CHECKLIST.md`）  
- [ ] 历史关闭时「重启浏览器无残留」的自动化断言仍可加强  

### 明确不要做（除非产品改范围）

- 云端大模型 API  
- WebGPU 推理（P1 以后）  
- LM Studio / 非 loopback OpenAI-compatible（P2）  
- PDF、多分页、RAG、付费授权  
- Firefox / Edge 完整适配  
- `<all_urls>`、远程代码  

---

## 6. 已知现场问题（用户已踩过）

### 6.1 Ollama「没反应」

**根因：** 扩展 origin 被 Ollama CORS 拒绝（`OLLAMA_ORIGINS` 未设时 OPTIONS → 403）。  
**模型名：** 本机曾出现 `qwen3.6:latest`（约 23GB）；Settings 须填 Ollama 列表里的真实 name。  
**修复步骤（macOS）：**

1. `chrome://extensions` 开开发者模式 → 复制 VerityRead **ID**
2. 菜单栏 Quit Ollama  
3. `launchctl setenv OLLAMA_ORIGINS "chrome-extension://<ID>"`  
4. 重启 Ollama  
5. VerityRead → Settings：Provider=Ollama，model=`qwen3.6:latest`（或 `llama3.2:latest` 做链路验证）
6. Labs → Spike Ollama → `healthy: true`  

大模型首次加载可能要很久；链路验证优先用小模型。

### 6.2 Chrome Built-in AI

不可用时属正常（设备/频道限制）。Onboarding/Labs 应显示 availability；引导改用 Ollama，**禁止**静默改 Provider。

---

## 7. 建议接手后的工作顺序

1. **环境绿灯**：`pnpm pipeline` + `pnpm test:egress` + 加载 `dist/`  
2. **打通 Ollama 真机路径**：修好 CORS + Settings 模型选择 UX + 一次成功 Summarize  
3. **补强失败可见性**：连接失败/CORS/模型加载中的 UI 状态  
4. **完成 PHASE0_GATE 手动项** 并更新勾选  
5. **加强 E2E**（load-extension 冒烟：Onboarding → Summarize → 引用回跳）  
6. **按 ALPHA_CHECKLIST 准备封闭测试**  
7. （可选，需产品确认）loopback-only OpenAI-compatible（LM Studio）——仅 `127.0.0.1`，仍禁止云端  

---

## 8. Definition of Done（改动验收）

每次功能/修复合并前：

- [ ] `pnpm pipeline` 通过  
- [ ] 若动到网络/Provider/抽取：`pnpm test:egress` 通过  
- [ ] 无新增未审批外连；`scan-dist` 不回归  
- [ ] UI 始终显示当前可选 Provider；无静默 fallback  
- [ ] 页面内容未进入健康检查 / 授权 / 更新请求  
- [ ] 错误含：原因、影响、下一步（见 `src/shared/errors.ts`）  

Alpha 出口（产品）：

- 首次设置成功率 ≥ 60%  
- 核心任务成功率 ≥ 85%  
- 无 P0 隐私/安全问题  

---

## 9. 给人类维护者的备注

- 产品真相以 PRD 为准；代码与 PRD 冲突时先问，勿擅自接云端 API。  
- 用户母语偏繁中；对用户可见文案可中英并存，错误下一步尽量可操作。  
- 需要 commit / PR 时须用户明确要求（遵循其 git 规则）。  
- 计划文件（`*.plan.md`）不要改。  

---

## 10. 快速联系点（代码入口）

| 问题 | 先看 |
|---|---|
| Ollama 连不上 / CORS | `src/providers/ollama.ts`、Onboarding Labs、`OLLAMA_CORS_GUIDE` |
| 摘要/问答编排 | `src/core/orchestrator.ts` |
| 抽取与回跳 | `src/core/extract.ts`、`src/content/index.ts` |
| Provider 切换 | `src/providers/registry.ts`、`src/storage/preferences.ts` |
| 隐私/离线锁 | `src/core/offlineLock.ts`、`PrivacyCenter.tsx` |
| 消息协议 | `src/shared/messages.ts`、`messaging.ts` |

---

**交接完成标准：** Codex 能独立跑通 pipeline、加载扩展、理解硬约束，并按 §7 继续推进真机验收与 Alpha，而无需重搭脚手架。
