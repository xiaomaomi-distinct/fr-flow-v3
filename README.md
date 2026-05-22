# fr-flow-v3 帆软加壳前端开发技能包

**保留帆软后端能力（数据连接、用户体系、权限控制、接口鉴权），替换帆软前端开发为 antd + React 页面。**

大模型通过 `/fr-pm`、`/fr-data-dev`、`/fr-display-dev`、`/fr-qa` 四个角色技能，完成从需求分析到测试验证的完整流水线，无需操作帆软设计器。

## 前置条件

| 依赖 | 最低版本 | 用途 |
|------|----------|------|
| Claude Code | 最新版 | 技能运行宿主 |
| FineReport 设计器 | 11.0 | 后端数据引擎，必须启动"报表平台管理" |
| MySQL | 5.7+ / 8.0 | 数据存储 |
| Python | 3.8+ | 工具链（data_writer.py / display_writer.py） |
| Node.js | 18+ | api_tester 自动化验证（Playwright） |

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

# 5. 安装 api_tester 依赖
cd foundation/tools/api_tester && npm install && npx playwright install chromium

# 6. 开始使用
/fr
```

## 完整流水线

```
/fr-pm                          # 1. 需求分析 → 输出 dev_task.json
    ↓ 自动触发
/fr-data-dev <项目名>            # 2. 数据层开发 + 接口验证
    ↓ 验收通过后自动触发
/fr-display-dev <项目名>         # 3. 展示层开发（antd + React）
    ↓ 自动触发
/fr-qa <项目名>                  # 4. 浏览器测试验证
```

## 核心理念

| 保留 | 替换 |
|------|------|
| 数据连接（JDBC） | 设计器拖拽 |
| 用户体系 / 权限控制 | 帆软控件 |
| 接口鉴权 / 填报机制 | 参数面板 / 样式系统 |
| 数据集 / 存储过程 | — |

## 目录结构

```
fr-flow-v3/
├── skills/                   # 四角色技能定义
│   ├── fr/SKILL.md           # 入口技能
│   ├── fr-pm/SKILL.md        # 项目经理
│   ├── fr-data-dev/SKILL.md  # 数据层工程师
│   ├── fr-display-dev/SKILL.md # 展示层工程师
│   └── fr-qa/SKILL.md        # 测试工程师
├── foundation/
│   ├── templates/            # CPT 骨架模板
│   ├── scaffolds/            # JSX 脚手架（list/form/detail/batch/selector）
│   ├── tools/api_tester/     # 数据层接口自动化验证工具
│   └── public_cpt/           # 公共组件 CPT（附件管理、API 代理等）
├── schemas/                  # dev_task.json / qa_task.json 格式约束
├── scripts/                  # 工具链（data_writer / display_writer / checker）
├── hooks/                    # 权限守卫（permission-guard.js）
├── shared/KNOWLEDGE/         # 知识库文档
├── sql/                      # 公共组件存储过程脚本
└── docs/                     # 安装与配置文档
```

## 技能列表

| 技能 | 角色 | 说明 |
|------|------|------|
| `/fr` | 入口 | 显示技能列表和使用说明 |
| `/fr-pm` | 项目经理 | 需求对话 → 设计方案 → 输出任务文档 |
| `/fr-data-dev <项目名>` | 数据层工程师 | 生成 data CPT + 接口验证 |
| `/fr-display-dev <项目名>` | 展示层工程师 | antd + React 页面开发 |
| `/fr-qa <项目名>` | 测试工程师 | 逐项验证 → 产出测试报告 |

## 知识库文档

| 文档 | 说明 |
|------|------|
| `shared/KNOWLEDGE/ARCHITECTURE.md` | 核心理念、接口分工、模板设计 |
| `shared/KNOWLEDGE/ASSETS.md` | 公共组件清单（附件管理、API 代理等） |
| `shared/KNOWLEDGE/ANTD_REACT_GUIDE.md` | antd 5.x + React 18 组件速查 |
| `shared/KNOWLEDGE/FINEREPORT_ENV.md` | 帆软环境配置、常见错误 |
| `shared/KNOWLEDGE/JS_SAFETY.md` | XSS 防护、JSON 安全解析 |
| `shared/KNOWLEDGE/GLOBAL_PARAMS.md` | 帆软全局参数说明 |

## 文档

| 文档 | 内容 |
|------|------|
| `docs/INSTALL.md` | 安装指南（插件安装 → settings.json 配置 → Hook 配置） |
| `docs/CONFIG.md` | 配置详解（.fr.yaml 字段说明 + settings.json 完整写法） |
| `docs/ENV_SETUP.md` | 环境搭建（antd 资源部署、MySQL、帆软设计器、Python/Node） |
| `docs/PUBLIC_CPT.md` | 公共组件部署（附件管理、API 代理、存储过程） |

## 禁止行为

- **禁止修改** `skills/`、`shared/`、`foundation/`、`scripts/`、`hooks/` 目录
- **只允许修改** `$FR_PROJECTS_DIR/` 和 `$FR_REPORTLETS/` 目录
- CPT 文件必须通过工具链生成，禁止手动编辑 XML
