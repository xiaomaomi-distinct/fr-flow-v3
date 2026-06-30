# fr-flow-v3 帆软加壳前端开发技能包

**保留帆软后端能力（数据连接、用户体系、权限控制、接口鉴权），替换帆软前端开发为 React 页面。**

提供两套并行的开发流水线：

- **PC 端** (`fr-*`) — antd 5 + React 18，桌面浏览器场景
- **移动端** (`frm-*`) — antd-mobile 5 + React 18，企业微信 H5 / 移动浏览器场景

大模型通过角色技能（PM / 数据层 / 展示层 / QA）完成从需求分析到测试验证的完整流水线，无需操作帆软设计器。**数据层 (`fr-data-dev`) PC / 移动两套共用**，因为数据层只跟数据库相关、与 UI 库无关。

## 前置条件

| 依赖 | 最低版本 | 用途 |
|------|----------|------|
| Claude Code | 最新版 | 技能运行宿主 |
| FineReport 设计器 | 11.0 | 后端数据引擎，必须启动"报表平台管理" |
| MySQL | 5.7+ / 8.0 | 数据存储 |
| Python | 3.8+ | 工具链（data_writer / display_writer / display_mobile_writer） |
| Node.js | 18+ | api_tester + Playwright 自动化验证（含移动 UA 模拟） |

## 快速开始

```bash
# 1. 安装插件（在 Claude Code 中）
/plugin marketplace install fr-flow-plugin

# 2. 复制配置模板，填写本地环境
cp .fr.yaml.example .fr.yaml
# 编辑 .fr.yaml，填入你的帆软路径、数据库连接等信息

# 3. 生成环境配置
bash scripts/sync_env.sh
# 将输出的 env 块合并到 .claude/settings.json
# 并在 settings.json 中配置 PreToolUse Hook（见 docs/INSTALL.md）

# 4. 部署公共 CPT 模板
# 将 foundation/public_cpt/ 下文件复制到帆软 reportlets 目录
# 详见 docs/PUBLIC_CPT.md

# 5. （移动端）部署本地兜底静态库
# 移动骨架默认 CDN 优先（固定版本 jsDelivr）+ FineReport 本地兜底。
# 把 jquery / react / react-dom / dayjs / antd-mobile.umd.js / style.css
# 放到 FineReport contextPath 根目录下的 help/lib/antd-mobile/
# （所有项目共用一份，CDN 失败/超时时自动 fallback，本地兜底必须保留）
# 详见 docs/ENV_SETUP.md 移动端章节

# 6. 安装 api_tester 依赖
cd foundation/tools/api_tester && npm install && npx playwright install chromium

# 7. 开始使用
/fr     # PC 端入口
/frm    # 移动端入口
```

## 完整流水线

### PC 端

```
/fr-pm                          # 1. 需求分析 → 输出 dev_task.json (platform=pc)
    ↓ 自动触发
/fr-data-dev <项目名>            # 2. 数据层开发 + 接口验证
    ↓ 验收通过后自动触发
/fr-display-dev <项目名>         # 3. 展示层开发（antd + React）
    ↓ 自动触发
/fr-qa <项目名>                  # 4. 浏览器测试验证
```

### 移动端

```
/frm-pm                         # 1. 移动需求分析 + UI 设计 → 输出 dev_task.json (platform=mobile)
    ↓ 自动触发
/fr-data-dev <项目名>            # 2. 数据层（与 PC 共用同一技能）
    ↓ 验收通过后触发
/frm-display-dev <项目名>        # 3. 移动展示层（antd-mobile + React）
    ↓ 自动触发
/frm-qa <项目名>                 # 4. Playwright iPhone 设备 + 企微 UA 模拟 + 真机验证占位
```

## 核心理念

| 保留 | 替换 |
|------|------|
| 数据连接（JDBC） | 设计器拖拽 |
| 用户体系 / 权限控制 | 帆软控件 |
| 接口鉴权 / 填报机制 | 参数面板 / 样式系统 |
| 数据集 / 存储过程 | — |

技术栈：

| 端 | UI 库 | 全局变量 | 骨架模板 | 加载方式 |
|---|---|---|---|---|
| PC | antd 5 | `antd` | `base_cpt_page.cpt` | 帆软 jsImportList 自动注入 |
| 移动 | antd-mobile 5 | `antdMobile` | `base_cpt_page_mobile.cpt` | afterload 动态加载：**CDN 优先 + FineReport contextPath 本地兜底** |

## 目录结构

```
fr-flow-v3/
├── skills/                              # 角色技能定义
│   ├── fr/SKILL.md                      # PC 入口
│   ├── fr-pm/                           # PC 项目经理
│   ├── fr-data-dev/                     # 数据层工程师（PC/移动共用）
│   ├── fr-display-dev/                  # PC 展示层
│   ├── fr-qa/                           # PC 测试
│   ├── frm/SKILL.md                     # 移动入口
│   ├── frm-pm/                          # 移动项目经理
│   ├── frm-display-dev/                 # 移动展示层
│   └── frm-qa/                          # 移动测试
│
├── foundation/
│   ├── templates/
│   │   ├── base_cpt_data.cpt            # 数据层骨架
│   │   ├── base_cpt_page.cpt            # PC 展示层骨架
│   │   └── base_cpt_page_mobile.cpt     # 移动展示层骨架（含动态加载）
│   ├── scaffolds/
│   │   ├── starter*.jsx                 # PC 脚手架（list/form/detail/batch/selector）
│   │   └── mobile/starter.jsx           # 移动通用脚手架（单文件，无类型分支）
│   ├── tools/api_tester/                # 数据层接口自动化验证
│   └── public_cpt/                      # 公共组件 CPT
│
├── scripts/
│   ├── data/                            # 数据层工具链（共用）
│   ├── display/                         # PC 展示层工具链
│   └── display_mobile/                  # 移动展示层工具链（含 6 条质量门规则）
│
├── shared/KNOWLEDGE/                    # 知识库
├── schemas/                             # dev_task / qa_task JSON Schema
├── docs/                                # 安装、配置、方案文档
├── hooks/                               # 权限守卫
└── sql/                                 # 公共组件存储过程
```

## 技能列表

| 技能 | 角色 | 平台 | 说明 |
|------|------|------|------|
| `/fr` | 入口 | PC | 显示 PC 套件技能列表 |
| `/fr-pm` | 项目经理 | PC | 需求对话 → 设计方案 → 输出任务文档 |
| `/fr-data-dev <项目名>` | 数据层 | **共用** | 生成 data CPT + 接口验证（移动端也用这个） |
| `/fr-display-dev <项目名>` | 展示层 | PC | antd + React 页面开发 |
| `/fr-qa <项目名>` | 测试 | PC | 桌面浏览器验证 |
| `/frm` | 入口 | 移动 | 显示移动端套件技能列表 + 与 PC 套件对比 |
| `/frm-pm` | 项目经理 | 移动 | 移动需求 + UI 设计（NavBar / List / Popup 模式） |
| `/frm-display-dev <项目名>` | 展示层 | 移动 | antd-mobile + React 移动页面开发 |
| `/frm-qa <项目名>` | 测试 | 移动 | iPhone 13 + 企微 UA 模拟 + 17 项移动专项 + 真机占位 |

## 知识库文档

| 文档 | 端 | 说明 |
|------|---|------|
| `shared/KNOWLEDGE/ARCHITECTURE.md` | 共用 | 核心理念、接口分工、模板设计 |
| `shared/KNOWLEDGE/ASSETS.md` | 共用 | 公共组件清单（附件管理、API 代理等） |
| `shared/KNOWLEDGE/FINEREPORT_ENV.md` | 共用 | 帆软环境配置、常见错误 |
| `shared/KNOWLEDGE/JS_SAFETY.md` | 共用 | XSS 防护、JSON 安全解析 |
| `shared/KNOWLEDGE/GLOBAL_PARAMS.md` | 共用 | 帆软全局参数说明 |
| `shared/KNOWLEDGE/ANTD_REACT_GUIDE.md` | PC | antd 5.x 组件速查（fr-display-dev 必读） |
| **`shared/KNOWLEDGE/ANTD_MOBILE_GUIDE.md`** | **移动** | **antd-mobile 5 组件速查 + PC→移动 API 映射（frm-display-dev 必读）** |
| **`shared/KNOWLEDGE/MOBILE_SPECIFIC.md`** | **移动** | **安全区 / 触控合规 / iOS-Android webview 差异 / wx jssdk（必读）** |

## 文档

| 文档 | 内容 |
|------|------|
| `docs/INSTALL.md` | 安装指南（插件安装 → settings.json 配置 → Hook 配置） |
| `docs/CONFIG.md` | 配置详解（.fr.yaml 字段说明 + settings.json 完整写法） |
| `docs/ENV_SETUP.md` | 环境搭建（antd / antd-mobile 资源部署、MySQL、帆软设计器） |
| `docs/PUBLIC_CPT.md` | 公共组件部署（附件管理、API 代理、存储过程） |
| `docs/proposals/frm-mobile-skill-suite.md` | 移动端方案总设计（核心决策、骨架设计、工具链） |
| `docs/proposals/stage-1-retrospective.md` | 移动端阶段 1 实施回顾（探针发现的 5 大坑） |
| `docs/proposals/stage-2-handoff.md` | 移动端阶段 2 进度交接 |

## 移动端关键差异（PC 开发者必看）

| 项 | PC (`fr-*`) | 移动 (`frm-*`) |
|---|---|---|
| 全局组件库 | `antd` | `antdMobile`（注意大小写） |
| 列表展示 | `Table` | `List`（antd-mobile 没有 Table） |
| 弹窗 | `Modal` | `Popup` / `Dialog` / `ActionSheet`（没有 Modal） |
| 选择器 | `Select` / `Cascader` | `Picker`（滚轮）/ `CheckList` / `CascadePicker` |
| 弹出表单 | Modal + iframe | Popup 同页弹出（禁 iframe） |
| 删除确认 | `Modal.confirm` | `Dialog.confirm` |
| 顶部导航 | 自由布局 | 必须 `NavBar` |
| 触控合规 | 无 | 所有交互 ≥ 44px |
| 列表项删除 | 右侧操作列 | `SwipeAction` 左滑（推荐，更符合移动规范） |
| 字号 | 12-14px | 14-16px 主体，最小 12px 辅助 |
| URL 路由 | `/decision/view/report?reportlet=...&op=write` | `/decision/url/mobile#/report?nodePath=...` |
| 库加载 | 帆软 jsImportList 自动注入 | 骨架 afterload 主动动态加载：CDN 优先 + 本地兜底 |
| 测试 | 桌面 Chromium | Playwright iPhone 13 + 企微 UA + 必须真机验证 |

更多差异详见 `shared/KNOWLEDGE/ANTD_MOBILE_GUIDE.md` 与 `shared/KNOWLEDGE/MOBILE_SPECIFIC.md`。

## 禁止行为

- **禁止修改** `skills/`、`shared/`、`foundation/`、`scripts/`、`hooks/` 目录
- **只允许修改** `$FR_PROJECTS_DIR/` 和 `$FR_REPORTLETS/` 目录
- CPT 文件必须通过工具链生成，禁止手动编辑 XML
- 移动端 `frm-*` 红线：**禁用** `antd.` / `Modal` / `Table` / `<iframe>` / `100vh` / `z-index > 1000`（质量门会拦截）
