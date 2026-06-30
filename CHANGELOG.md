# 更新日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [3.1.1] — 2026-06-30

### Changed · 移动端资源加载改为 CDN 优先 + 本地兜底

- `foundation/templates/base_cpt_page_mobile.cpt`
  - 移动端组件库加载策略从"仅 FineReport contextPath 本地静态资源"升级为：
    **CDN 优先 → FineReport contextPath 本地兜底**
  - CDN 固定版本：
    - `jquery@3.6.1`
    - `react@18.3.1`
    - `react-dom@18.3.1`
    - `dayjs@1.11.13`
    - `antd-mobile@5.42.3`
  - CDN 默认 3 秒超时，本地兜底默认 8 秒超时
  - 任一 CDN 文件失败 / 超时 / 全局变量未出现，会自动切换本地兜底
  - 本地兜底仍失败才显示 `#frm-error-banner` 与 app-root 错误提示
  - 新增运行时监控变量：
    - `window.__FRM_LIB_SOURCE = 'CDN' | '本地兜底' | 'global'`
    - `window.__FRM_LIB_SOURCE_TRYING`
  - 资源加载逻辑仍在骨架 PREAMBLE 固定段，不放入 `starter.jsx`，确保 `display_writer.py` 装配业务 JSX 时不会被替换掉
- `foundation/scaffolds/mobile/starter.jsx`
  - 补充注释：业务 JSX 不要手写 script/link，不要关心 CDN URL，资源策略由骨架统一处理
- `skills/frm-*` 全部升级到 `version: 1.1.0`
  - `frm-display-dev` 明确说明：**不是必须走本地资源**，本地仅作为 CDN 不可用时的兜底
  - `frm-pm` 环境自检调整为"检查本地兜底资源"
  - `frm-qa` 增加资源来源检测项，记录 `window.__FRM_LIB_SOURCE`
  - `frm` 入口更新资源策略说明
- `README.md`
  - 快速开始第 5 步改为"部署本地兜底静态库"
  - 技术栈表与移动端关键差异表更新为 CDN 优先 + 本地兜底

### Notes

- 本次改动不影响业务 JSX 写法。业务代码仍只使用全局变量：`React` / `ReactDOM` / `antdMobile` / `dayjs` / `$`
- 已生成的旧 CPT 需要重新用 `display_mobile/display_writer.py` 编译部署后，才能获得新的 CDN 优先策略
- 生产环境如安全审查要求禁止公共 CDN，可将骨架内 `RESOURCE_CONFIG.preferCdn` 改为 `false`，仍走本地兜底



### Added · 移动端 `frm-*` 技能套件首发

完整的帆软移动端（企业微信 H5）加壳前端开发流水线，与 PC 端 `fr-*` 套件并行运行，
数据层 `fr-data-dev` 两端共用。基于阶段 1 探针实测 + 阶段 5 端到端验证（15/15 PASS）。

#### 新技能

- `/frm` — 移动端套件入口路由，含 fr-* vs frm-* 完整对比表
- `/frm-pm` — 移动项目经理（10 个移动需求维度 + 14 类业务场景到 antd-mobile 组件映射）
- `/frm-display-dev` — 移动展示层（antd-mobile + React，6 条质量门红线）
- `/frm-qa` — 移动测试（Playwright iPhone 13 + 企微 UA + 17 项移动专项 + 真机验证占位）

#### 基础设施

- `foundation/templates/base_cpt_page_mobile.cpt` — 移动展示骨架
  - viewport meta 强制注入（`user-scalable=no`, `viewport-fit=cover`）
  - hideStyle 白名单（含 antd-mobile Portal `.adm-*` 容器）
  - `#app-root` 安全区 padding（`env(safe-area-inset-*)`）
  - 顶部红条横幅错误兜底（`#frm-error-banner`）
  - afterload 内动态串行加载 6 个库
    （jquery / react / react-dom / dayjs / antd-mobile.umd / style.css）
  - 自适应判定：检测全局变量已存在则跳过加载（双轨兼容未来全局注入方案）
- `foundation/scaffolds/mobile/starter.jsx` — 单文件通用脚手架
  （替代 PC 5 类分支：list/form/detail/batch/selector）
- `scripts/display_mobile/` — 移动专属工具链
  - `display_writer.py` / `display_checker.py`
  - 6 条质量门规则：3 条 PC 共用（`js_path_resolution` / `js_no_unicode_escape` /
    `cpt_xml_wellformed`）+ 3 条移动专属（`js_uses_antd_mobile` 拦截 `antd.` 调用 /
    `js_mobile_no_modal` / `js_mobile_no_table`）

#### 知识库

- `shared/KNOWLEDGE/ANTD_MOBILE_GUIDE.md`（833 行）—— antd-mobile 5 组件速查 +
  PC antd → 移动 antd-mobile 完整 API 映射
- `shared/KNOWLEDGE/MOBILE_SPECIFIC.md`（669 行）—— 安全区适配 / 44px 触控 /
  100vh 抖动 / iOS-Android webview 差异 / wx jssdk 用法

#### 方案与回顾文档

- `docs/proposals/frm-mobile-skill-suite.md` — 整体设计方案（核心决策、骨架、工具链）
- `docs/proposals/stage-1-retrospective.md` — 阶段 1 实施回顾（5 大坑及解法）
- `docs/proposals/stage-2-handoff.md` — 阶段 2 进度交接

#### 阶段 5 实测沉淀到技能文档的模板（直接影响后续项目）

- **静态库部署**：contextPath 全局共用（**不是项目级**），自检用 HTTP HEAD 而不是 ls
- **Popup 可见性判定**：用 `.adm-popup-body`，**不要用 `.adm-popup` 根容器**（Portal 容器即使闭合仍 visible=true）
- **Tag 语义色判定**：antd-mobile Tag 通过**内联 `style.background-color`** 表达，**不通过 class**（找 `.adm-tag-success` 类名永远 FAIL）
- **Picker.value**：必须传数组（**不能传 `null`**，否则 antd-mobile 内部抛 `Cannot read '0'`）
- **Popup 关闭动画**：~300ms transition，spec 必须 `waitForFunction` 等待
- **SwipeAction 测试边界**：桌面 Chromium 只能断言渲染+touch swipe 位移；
  `click → onClick → Dialog` 全流程**本机不可靠**，必须留真机验证
- **多匹配元素**：Playwright strict mode 拒绝多匹配，用 `.first()` 或容器 scope 收紧
- **本机 URL 回退**：本机帆软未启用 `/url/mobile` SPA 时，回退到 `view/report?op=write`
  路径（骨架自适应判定仍走移动加载链路）

### Changed

- `plugin.json`
  - `version`: 3.0.0 → 3.1.0
  - `description`: 更新为"PC + 移动双套并行"描述
  - `skills`: 增加 4 个移动技能（`./skills/frm`, `frm-pm`, `frm-display-dev`, `frm-qa`）
- `README.md`：完整升级反映双套并行
  - 摘要明确两套流水线的关系与共用数据层
  - 新增"移动端关键差异"对照表（13 行 PC vs 移动 API/规范差异）
  - 技能列表 5 → 9 个
  - 目录结构补全移动端产物
  - 禁止行为加入移动端红线
- `skills/fr-data-dev/SKILL.md`：schema/SQL 说明细化（50 行修订）
- `skills/fr-pm/SKILL.md` / `fr-display-dev/SKILL.md` / `fr-qa/SKILL.md` / `fr/SKILL.md`：小幅文档修订
- `shared/KNOWLEDGE/ARCHITECTURE.md`：文档表述细化
- `scripts/data/data_writer.py`：3 行小调整
- `foundation/tools/api_tester/qa_verify.spec.js`：小调整

### Fixed

- 静态库部署路径表述：4 个 frm-* SKILL.md 早期版本误写为"项目级路径
  `$FR_REPORTLETS/{project}/help/lib/antd-mobile/`"（11 处），修正为
  contextPath 全局共用 + HTTP HEAD 自检方式

---

## [3.0.0] — 2026-05 (初版)

### Added

- PC 端 `fr-*` 完整四角色技能套件（fr / fr-pm / fr-data-dev / fr-display-dev / fr-qa）
- 数据层骨架 `base_cpt_data.cpt`、PC 展示骨架 `base_cpt_page.cpt`
- PC 脚手架 5 类（list / form / detail / batch / selector）
- 工具链 `scripts/data/` + `scripts/display/`（writer + checker + 质量门规则）
- 公共组件 CPT（附件管理 `sftp_file_overlay`、API 代理 `api_agent` 等）
- 知识库 ARCHITECTURE / ASSETS / ANTD_REACT_GUIDE / FINEREPORT_ENV / JS_SAFETY / GLOBAL_PARAMS
- `api_tester` 数据层接口自动化验证工具
- 安装与配置文档（docs/INSTALL / CONFIG / ENV_SETUP / PUBLIC_CPT）
- 权限守卫 hook（`permission-guard.js`）

---

## 版本号策略

| 段 | 含义 | 示例 |
|---|---|---|
| Major | 破坏性变更（如重写技能契约、改变 dev_task.json schema 不兼容）| 3.x → 4.0 |
| Minor | 新增能力（如新增 frm-* 套件）、向后兼容的改进 | 3.0 → 3.1 |
| Patch | bug 修复、文档调整、小幅 SKILL.md 文案修订 | 3.1.0 → 3.1.1 |

各技能内 `SKILL.md` 的 `version` 字段是该技能自身的契约版本，与 plugin 总版本独立演进。
当前：

- PC 套件（`fr-*`）：技能 `version: 3.0.0`
- 移动套件（`frm-*`）：技能 `version: 1.0.0`（首版）
- Plugin 总版本：`3.1.0`（PC + 移动并行）
