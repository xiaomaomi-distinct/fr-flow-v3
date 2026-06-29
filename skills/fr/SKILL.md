---
name: fr
description: |
  帆软加壳前端开发入口技能。当用户输入 "/fr" 或询问帆软开发流程时触发。
  显示技能列表和使用说明，用于启动新项目、查看开发状态、了解帆软加壳方案。
  当用户提及帆软报表开发、FineReport 前端开发、antd 报表页面时应主动使用此技能。
version: 3.0.0
---

# 帆软加壳前端开发（v3）

## 技能列表

| 技能 | 角色 | 说明 |
|------|------|------|
| `/fr-pm` | 项目经理 | 需求对话 → 设计方案 → 输出任务文档 |
| `/fr-data-dev <项目名>` | 数据层工程师 | 生成 data CPT + 接口验证 |
| `/fr-display-dev <项目名>` | 展示层工程师 | antd + React 页面开发 |
| `/fr-qa <项目名>` | 测试工程师 | 逐项验证 → 产出测试报告 |

## 完整流水线

```
/fr-pm                          # 1. 需求分析、设计文档
    ↓ 产出: 需求确认书.md, dev_task.json, qa_task.json
    ↓ 自动触发
/fr-data-dev myproject          # 2. 数据层开发 + 接口验证
    ↓ 验收通过后自动触发
/fr-display-dev myproject       # 3. 展示层开发（antd + React）
    ↓ 自动触发
/fr-qa myproject                # 4. 浏览器测试验证
```

## 核心理念

**保留帆软后端能力，替换帆软前端开发。**

| 保留 | 替换 |
|------|------|
| 数据连接（JDBC） | 设计器拖拽 |
| 用户体系 / 权限控制 | 帆软控件 |
| 接口鉴权 / 填报机制 | 参数面板 / 样式系统 |
| 数据集 / 存储过程 | — |

前端使用 antd + React，大模型可直接接手开发，无需操作帆软设计器。

## 环境配置

Agent 启动时已注入环境变量（通过 settings.json），所有角色直接使用：

| 变量 | 说明 |
|------|------|
| `$FR_WORKSPACE` | 技能包根目录 |
| `$FR_PROJECTS_DIR` | 项目工作目录 |
| `$FR_REPORTLETS` | 帆软报表部署目录 |

完整路径速查表：`$FR_WORKSPACE/shared/PATHS.md`

## 知识库文档

| 文档 | 位置 | 说明 |
|------|------|------|
| 架构设计 | `shared/KNOWLEDGE/ARCHITECTURE.md` | 核心理念、接口分工、模板设计 |
| 公共组件 | `shared/KNOWLEDGE/ASSETS.md` | 附件管理、API代理等可复用模板，业务开发直接引用 |
| 环境注意事项 | `shared/KNOWLEDGE/FINEREPORT_ENV.md` | 帆软环境配置、常见错误 |
| antd 组件指南 | `shared/KNOWLEDGE/ANTD_REACT_GUIDE.md` | antd 5.x + React 18 组件速查（display-dev 专用） |
| JS 安全规范 | `shared/KNOWLEDGE/JS_SAFETY.md` | XSS 防护、JSON 安全解析（display-dev 专用） |

## 禁止行为

- **禁止修改** `skills/`、`shared/`、`foundation/`、`scripts/`、`hooks/` 目录
- **禁止参考** 外部目录（如 `finefront-solution/`、`docs/` 等）的旧文档——所有文档从技能包内获取
- **只允许修改** `$FR_PROJECTS_DIR/` 和 `$FR_REPORTLETS/` 目录
