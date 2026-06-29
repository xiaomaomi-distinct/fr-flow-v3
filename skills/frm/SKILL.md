---
name: frm
description: |
  帆软移动端加壳前端开发入口技能。当用户输入 "/frm" 或询问帆软**移动端**开发流程时触发。
  显示移动端技能列表和使用说明，用于启动移动端项目、了解 frm-* 套件。
  当用户提及帆软移动端报表、企业微信 H5、antd-mobile 页面时应主动使用此技能。
version: 1.0.0
---

# 帆软加壳移动端开发（frm-* 套件）

## 技能列表

| 技能 | 角色 | 说明 |
|------|------|------|
| `/frm-pm` | 移动端项目经理 | 需求对话 → 移动端 UI 设计 → 输出任务文档 |
| `/fr-data-dev <项目名>` | 数据层工程师（**两端共用**） | 生成 data CPT + 接口验证 |
| `/frm-display-dev <项目名>` | 移动展示层工程师 | antd-mobile + React 移动页面 |
| `/frm-qa <项目名>` | 移动端测试工程师 | 移动 UA 模拟 + 真机验证占位 |

## 完整流水线

```
/frm-pm                          # 1. 移动需求分析、UI 设计
    ↓ 产出: 需求确认书.md, dev_task.json (platform=mobile), qa_task.json
    ↓ 自动触发
/fr-data-dev myproject           # 2. 数据层开发（PC/移动共用）
    ↓ 验收通过后自动触发
/frm-display-dev myproject       # 3. 移动展示层（antd-mobile + base_cpt_page_mobile.cpt）
    ↓ 自动触发
/frm-qa myproject                # 4. 移动 UA 模拟 + 真机验证
```

## 与 fr-* (PC) 套件的对比

| 项 | **fr-*（PC）** | **frm-*（移动）** |
|---|---|---|
| 入口 | `/fr` | `/frm` |
| PM | `/fr-pm` | `/frm-pm` |
| 数据层 | `/fr-data-dev` | `/fr-data-dev`（**共用**） |
| 展示层 | `/fr-display-dev` | `/frm-display-dev` |
| 测试 | `/fr-qa` | `/frm-qa` |
| 全局组件库 | `antd` 5.x | `antdMobile` 5.x |
| 骨架模板 | `base_cpt_page.cpt` | `base_cpt_page_mobile.cpt` |
| 工具链 | `scripts/display/` | `scripts/display_mobile/` |
| 库加载 | 帆软 jsImportList 自动注入 | afterload 动态加载 |
| URL 路由 | `/view/report?reportlet=...&op=write` | `/url/mobile#/report?nodePath=...` |
| 主要组件 | Table / Modal / Select / Form | List / Popup / Picker / Form |
| 设计 viewport | 桌面 ≥ 1280px | 移动 375 × 667 起步 |
| 测试 UA | 桌面 Chrome | 企微 Android / iOS |

> **数据层不复制**：`*_data.cpt` 只跟 DB 相关，PC 和移动端共用同一份 `fr-data-dev`。如果同一项目既有 PC 又有移动端，两端共用相同数据层 CPT。

## 核心理念

**保留帆软后端能力，替换前端为 antd-mobile + React，专为移动触屏环境优化。**

| 保留 | 替换 |
|------|------|
| 数据连接（JDBC） | 设计器拖拽 |
| 用户体系 / 权限控制 | 帆软控件 |
| 接口鉴权 / 填报机制 | 参数面板 / 样式系统 |
| 数据集 / 存储过程 | — |

移动端额外的环境特性：

| 项 | 说明 |
|---|---|
| 帆软移动 SPA | URL `/url/mobile#/report?nodePath=...`，**不读 jsImportList** |
| 动态加载库 | 骨架 afterload 自己加载 jquery / react / dayjs / antd-mobile |
| viewport 强制 | width=device-width, user-scalable=no, viewport-fit=cover |
| 安全区适配 | env(safe-area-inset-top/bottom) |
| 触控合规 | 主按钮 ≥ 44px，字体 ≥ 14px |
| Portal 白名单 | hideStyle 仅放出 #app-root + 含 `.adm-*` 的子节点 |
| 错误兜底 | 顶部红条横幅 #frm-error-banner（生产环境不应出现） |

## 环境配置

Agent 启动时已注入环境变量（通过 settings.json）：

| 变量 | 说明 |
|------|------|
| `$FR_WORKSPACE` | 技能包根目录 |
| `$FR_PROJECTS_DIR` | 项目工作目录 |
| `$FR_REPORTLETS` | 帆软报表部署目录 |

完整路径速查：`$FR_WORKSPACE/shared/PATHS.md`

### 移动端专属路径

```
移动展示层骨架:   $FR_WORKSPACE/foundation/templates/base_cpt_page_mobile.cpt
移动 starter:    $FR_WORKSPACE/foundation/scaffolds/mobile/starter.jsx
移动工具链:      $FR_WORKSPACE/scripts/display_mobile/
移动静态库:      <contextPath>/help/lib/antd-mobile/  ← **contextPath 全局共用，不是项目级**
                  本机 contextPath = /webroot/decision  → D:\...\webroot\decision\help\lib\antd-mobile\
                  生产 contextPath = /wuhan/whznjc      → D:\...\reportlets\..\wuhan\whznjc\help\lib\antd-mobile\
                  ├── jquery-3.6.1.min.js
                  ├── react.min.js
                  ├── react-dom.min.js
                  ├── dayjs.min.js
                  ├── antd-mobile.umd.js
                  └── style.css
                  （所有移动端项目共用一份，骨架 PATH.apiBase 自动推导）
```

## 知识库文档

| 文档 | 位置 | 受众 |
|---|---|---|
| 架构设计 | `shared/KNOWLEDGE/ARCHITECTURE.md` | 全部 |
| **antd-mobile 组件速查** | `shared/KNOWLEDGE/ANTD_MOBILE_GUIDE.md` | frm-display-dev 必读 |
| **移动专属规范** | `shared/KNOWLEDGE/MOBILE_SPECIFIC.md` | frm-pm / frm-display-dev / frm-qa 必读 |
| JS 安全规范 | `shared/KNOWLEDGE/JS_SAFETY.md` | frm-display-dev 必读 |
| 公共组件 | `shared/KNOWLEDGE/ASSETS.md` | PM 场景路由 |
| 环境注意事项 | `shared/KNOWLEDGE/FINEREPORT_ENV.md` | 排错时 |
| **整体方案** | `docs/proposals/frm-mobile-skill-suite.md` | 方案疑问 |
| **阶段 1 踩坑回顾** | `docs/proposals/stage-1-retrospective.md` | 排错参考 |

## 何时选 frm-* 而不是 fr-*

| 场景 | 走 | 原因 |
|---|---|---|
| 用户说"在企业微信里打开" | frm-* | 移动 SPA 路由 |
| 用户说"手机上看""H5 页面" | frm-* | 触屏交互 |
| 用户说"在 PC 浏览器看" | fr-* | 桌面布局 |
| 用户说"既要 PC 也要手机" | 数据层共用 fr-data-dev；展示层分别用 fr-display-dev + frm-display-dev 各做一份 | UI 不可共用 |
| 用户没明说 | **问一句**："这个功能主要给谁用？办公室 PC 还是手机企微？" | 别瞎猜 |

## 禁止行为

- **禁止修改** `skills/`、`shared/`、`foundation/`、`scripts/`、`hooks/`、`schemas/` 目录
- **禁止参考** 外部目录（如 `finefront-solution/`、旧版 fr-flow/）的旧文档
- **禁止把 PC 的 Modal / Table / iframe 模式带到移动端方案**
- **禁止用桌面 Chrome 默认 UA 跑移动端测试**
- **只允许修改** `$FR_PROJECTS_DIR/` 和 `$FR_REPORTLETS/` 目录
