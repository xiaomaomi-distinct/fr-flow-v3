# 阶段 1 实施回顾：踩坑与解法

> **日期**：2026-06-25
> **背景**：基于 `frm-mobile-skill-suite.md` 方案文档，从 0 开始搭建 frm-* 移动端骨架、工具链、冒烟测试。
> **本文档目的**：记录阶段 1 实施过程中遇到的所有问题、根因分析、解决方案，作为 frm-display-dev 知识库的素材，也作为阶段 2 写脚手架时的避坑指南。

---

## 一、根因诊断阶段的问题

在动手写 frm-* 体系之前，我们先做了 mobile_probe 探针调研，期间也踩了几个坑。

### 1.1 探针页第一版「自己依赖 React/antd」（设计错误）

**症状**：第一版探针页在企微移动端报 `ReactDOM is not defined`，整页白屏。

**根因**：探针的核心原则是**零依赖**，但我第一版用 React + antd 写 UI，结果生产环境 antd 全局变量没注入时，探针自己先挂了 —— **探针测的就是 React/antd 能不能用，自己却依赖它们，因果倒置**。

**解法**：第二版重写为纯原生 JS（`document.createElement`），只**探测** React/antd 是否存在，不依赖它们。

**给阶段 2 的启示**：**任何用于排查问题的诊断工具**（探针、错误兜底、状态展示组件）都必须零依赖。frm-display-dev 的页面业务代码可以依赖 antd-mobile，但骨架自身的错误兜底（`window.onerror` 红条横幅）必须用原生 DOM。

---

### 1.2 nginx 转发漏配静态资源（根因 1）

**症状**：第二版探针在 8076 直连下能正常加载，但走 8080 nginx 转发就 `ReactDOM is not defined`。

**根因**：帆软的 `ReportWebAttr.jsImportList` 把 React/ReactDOM/antd 的 `<script>` 路径设置成 `/wuhan/help/lib/antd/react.min.js`，但 nginx 只转发了 `/wuhan/whznjc/` —— `/wuhan/help/...` 不在转发规则里，全部 404。

**解法**（你做的）：把静态资源放到 `/wuhan/whznjc/help/lib/antd/`，避开 nginx 转发漏洞。

**给阶段 2 的启示**：移动端骨架的资源 URL **必须用 `PATH.apiBase` 动态推导**（`/wuhan/whznjc/help/lib/antd-mobile/`），不要写死 contextPath。生产环境的资源路径跟服务部署路径绑定，PATH 推导能让 cpt 跨环境通用。

---

### 1.3 帆软移动 SPA 不读 jsImportList（根因 2）

**症状**：nginx 修好后 PC 端正常，但**企业微信移动端仍报 `ReactDOM is not defined`**。

**根因**（探针 v2 拿到的实锤）：
- PC 端 URL：`decision/view/report?reportlet=...` → 走传统报表 viewer → 读 jsImportList → 自动注入 React/antd
- 移动端 URL：`/url/mobile#/report?nodePath=...` → 走帆软自家移动 SPA（FRPage、Platform 等） → **完全不读 jsImportList** → 全局没有 React/antd

**解法**：在 base_cpt_page_mobile.cpt 骨架的 afterload 里**主动动态加载** React/ReactDOM/dayjs/jQuery/antd-mobile，不依赖帆软自动注入。

**给阶段 2 的启示**：
- 移动端骨架的动态加载逻辑是核心，**不能省略**
- PC 端 cpt 走 frm-* 骨架时也会动态加载（一份代码两端通用）
- 用 `NEED_LOAD` 标志判断"全局变量是否已存在"，存在就跳过下载

---

## 二、骨架实现阶段的问题

### 2.1 IIFE 闭合方式：`});` vs `})();`

**症状**：第一版骨架部署后，`#app-root` 不存在，body 子节点里没有任何 hideStyle 注入痕迹 —— **整个 afterload listener 完全没执行**。

**根因**：PC 版骨架以 `});` 结尾，是因为 PC 工程链是**整体替换 `<Content>` 节点**，开发者的 .jsx 文件末尾必须有自调用括号 `})()`。但移动骨架我改成了**「标记替换模式」**（注入到 `bootBusiness()` 函数体内），整个 IIFE 完全由骨架自己控制，**必须以 `})();` 结尾**（自调用），否则只是定义了一个匿名函数，从不执行。

**解法**：移动骨架以 `})();` 结尾，自调用。

**给阶段 2 的启示**：
- 骨架 IIFE 闭合方式跟工程链注入模式强绑定 —— **如果未来改注入策略（整体替换 vs 标记替换），骨架闭合方式必须同步改**
- 这种 bug **不会被 node --check 发现**（语法是合法的），只会在运行时静默失败 → 加 e2e 冒烟测试是必要的

---

### 2.2 hideStyle 的 z-index 战争

**症状**：修复 IIFE 后页面能渲染了，但**点击 Popup 按钮没反应、Picker / DatePicker 不弹窗**。

**根因**：为了让 `#app-root` 盖住帆软所有原生容器，我给它 `z-index: 2147483647`（32 位 int 最大值）。结果 antd-mobile 的 Portal 元素（Popup / Mask）默认 `z-index: 1000`，完全被压在 #app-root 下面看不到。

**解法**：z-index 层级重新设计：

| 元素 | z-index | 说明 |
|---|---|---|
| 帆软原生容器 | 默认 | 被 `display:none` 隐藏，z-index 无关 |
| `#app-root` | 100 | 高于 fr 普通容器（auto），远低于 Portal |
| antd-mobile Portal（.adm-popup / .adm-mask 等） | 1000 | 库内置，可正常浮在 app-root 上方 |
| 错误横幅（frm-error-banner） | 9999 | 最高，即使页面挂了也能显示错误信息 |

**给阶段 2 的启示**：
- 不要无脑用最大 z-index，要考虑**跟第三方库 Portal 的协作**
- antd-mobile 默认 z-index 1000，开发者代码里需要更高 z-index 的元素必须 ≥ 1000 + 一定余量

---

### 2.3 Portal 容器无 class 时白名单失效

**症状**：z-index 修好后，Popup / Picker / DatePicker 能正常弹出了，但**点"弹出 Toast"按钮没反应**。

**根因**：antd-mobile 不同组件的 Portal 实现方式不一致：

| 组件 | Portal 容器结构 | 旧白名单 `body > [class^="adm-"]` 是否匹配 |
|---|---|---|
| Popup / Picker | 直接挂 `<div class="adm-popup">` | ✅ 匹配 |
| Mask / ActionSheet | 同上 | ✅ 匹配 |
| **Toast / Dialog** | **包一层无 class 的 wrapper div** | ❌ 不匹配，被 `body > *` 隐藏了 |

**解法**：用 CSS `:has()` 选择器精准识别"body 直接子节点包含 adm- 后代"：

```css
body > *:not(#app-root):not([class*="adm-"]):not(:has([class*="adm-"])) {
    display: none !important;
}
```

含义：body 直接子节点中，**不是 #app-root** 且 **本身没有 adm- 类** 且 **后代里也没有 adm- 元素** 的，才隐藏。

**给阶段 2 的启示**：
- `:has()` 在 Chrome 105+ / WebKit 18+ 支持，探针确认 PC 端 Chrome 126 / 移动端 Chrome 138 / iOS WebKit 605 都支持，可放心用
- **不要假设第三方库的 Portal 实现一致** —— 写 hideStyle 用最宽松的"放出包含库元素的所有容器"，比白名单具体类名更稳

---

### 2.4 本机 contextPath 不一致

**症状**：本机 PC 验证时，资源 URL 解析成 `/webroot/decision/help/lib/antd-mobile/`，但资源放在 `/webroot/help/lib/antd-mobile/`，404。

**根因**：`PATH.apiBase` 算出来：
- 本机：`/webroot/decision`（帆软 11.x 默认 contextPath）
- 生产：`/wuhan/whznjc`（你的部署路径）

资源在 `apiBase + /help/lib/antd-mobile/` 下，本机和生产的实际路径不同。

**解法**（你做的）：本机额外把资源拷贝一份到 `/webroot/decision/help/lib/antd-mobile/`，让本机调试也能跑通。生产环境 contextPath 是 `/wuhan/whznjc`，资源放 `/wuhan/whznjc/help/lib/antd-mobile/`，PATH.apiBase 算出来正好匹配。

**给阶段 2 的启示**：
- 静态资源部署路径**必须严格跟 contextPath 对齐**
- frm-display-dev 技能文档要明确写：本机和生产的资源部署路径不一定相同，需要根据各自 contextPath 调整

---

## 三、写业务代码的问题

### 3.1 第一版 smoke_test 用 React.createElement（写法选错）

**症状**：第一版 smoke_test.jsx 用 `React.createElement(Button, {...}, '...')` 嵌套写法，代码繁琐难读，500+ 行。

**根因**：我没想清楚 —— `display_mobile/display_writer.py` 工具链是 `esbuild --jsx=transform`，**完全支持原生 JSX 语法**，跟 PC 的 fr-display-dev 一模一样。

**解法**：重写为真正的 JSX：

```jsx
<Card title="② Button">
    <Button color="primary">主按钮</Button>
</Card>
```

代码量大幅减少（500+ 行 → 200 行），可读性显著提升。

**给阶段 2 的启示**：
- 脚手架 `starter*.jsx` **必须全部用 JSX 语法**
- 写 ANTD_MOBILE_GUIDE.md 时所有示例都用 JSX 语法
- 给 AI 的指令明确强调"用 JSX 写，不要用 React.createElement"

---

## 四、跨端差异的发现

### 4.1 WeixinJSBridge 在 iOS 上缺失

**症状**：iOS 探针 JSON 显示 `WeixinJSBridge: false`，Android 是 true。

**根因**：WeixinJSBridge 是 Android 微信 webview 桥接老协议，iOS 走 WKWebView messageHandler 机制，不暴露这个对象。但 `window.wx`（jweixin SDK）在两端都在。

**给阶段 2 的启示**：
- 调用企微原生能力（扫码、定位、分享、拍照）必须用 `wx.xxx` 顶层 API，**不要直接调 `WeixinJSBridge.invoke`**
- 知识库 MOBILE_SPECIFIC.md 要单独写一节"iOS 跟 Android 的 webview 差异"

---

### 4.2 移动端 Chrome 比 PC 还新（出乎意料）

**症状**：探针数据显示：
- PC 企微：Chrome 126 / XWEB 13241
- Android 企微：Chrome 138 / XWEB 1380347
- iOS 企微：WebKit 605（≈ Safari 18）

**判断**：移动端浏览器内核**完全不是瓶颈**。React 18 / antd-mobile 5 要求 Chrome 73+，移动端轻松满足。

**给阶段 2 的启示**：
- 不要为了"兼容老内核"做过度妥协（不用 polyfill、不写 ES5 兼容代码）
- 可以放心用 ES2020+ 特性、CSS Grid、:has()、optional chaining 等

---

## 五、本机调试体验问题

### 5.1 Playwright 必须从有 node_modules 的目录运行

**症状**：写在 `/tmp/_test.js` 的 Playwright 脚本，运行时报 `Cannot find module 'playwright'`。

**根因**：Node.js 的模块解析从脚本所在目录向上找 node_modules，临时目录没有。

**解法**：把脚本写到 `E:/fr-projects/`（项目根目录）执行。

**给阶段 2 的启示**：frm-qa 技能要明确写"Playwright 脚本必须放到项目根目录或其子目录运行"。

---

### 5.2 Python 在 Windows 终端的 Unicode 输出问题

**症状**：`python display_writer.py` 报 `UnicodeEncodeError: 'gbk' codec can't encode character '▶'`。

**根因**：display_writer.py 用了 `▶` `✅` 等 Unicode 符号，但 Windows 终端默认 GBK 编码。

**解法**：所有 python 命令前缀 `PYTHONIOENCODING=utf-8`。

**给阶段 2 的启示**：
- frm-display-dev 技能文档里所有 python 调用命令必须带 `PYTHONIOENCODING=utf-8` 前缀
- 这条已经在 memory 里：[[feedback-display-writer-win32]]

---

## 六、生产部署流程的反思

### 6.1 反复"改代码 → 编译 → 同步生产 → 测试 → 发现问题 → 改代码"循环

整个阶段 1 你至少同步了 4-5 次生产，每次都是因为本机测试和企微移动端表现不一致：

| 问题 | 本机能否复现 |
|---|---|
| nginx 漏配 | 否（本机无 nginx） |
| 移动 SPA 不读 jsImportList | 否（本机 UA 是 PC） |
| iOS WeixinJSBridge 缺失 | 否 |

**给阶段 2 的启示**：
- 本机 Playwright 用 mobile UA 能模拟绝大多数移动端行为
- 但 **少数行为只能在真机企微里复现**（jsImportList、UA 嗅探、iOS 桥差异）
- frm-qa 技能要建立"本机 Playwright + 生产真机"的双层验证流程

---

## 七、阶段 1 最终成果

| 项 | 路径 | 状态 |
|---|---|---|
| 移动骨架 | `foundation/templates/base_cpt_page_mobile.cpt` | ✅ 生产验证通过 |
| 工具链 writer | `scripts/display_mobile/display_writer.py` | ✅ |
| 工具链 checker | `scripts/display_mobile/display_checker.py` | ✅ |
| 质量门规则（PC 通用 × 3） | `scripts/display_mobile/rules/` 复用 | ✅ |
| 质量门规则（移动专属 × 3） | `js_uses_antd_mobile / js_mobile_no_modal / js_mobile_no_table` | ✅ |
| 冒烟测试 JSX（JSX 写法） | `mobile_probe/pages/smoke_test.jsx` | ✅ |
| 冒烟测试 CPT 部署 | 本机 + 生产 | ✅ 全部组件验证通过 |

**核心结论**：移动端的 React 18 + antd-mobile 5 加壳方案完全成立，端到端跑通。

---

## 八、阶段 2 的待办事项（基于本次回顾）

写脚手架和知识库时要明确包含以下内容：

### scaffolds/mobile/ 脚手架要求
1. 全部用 **JSX 语法**（不用 React.createElement）
2. 顶部统一 `var { Button, NavBar, ... } = antdMobile;`
3. 列表用 `List`（不要 Table），表单用 `Popup + Form`（不要 Modal）
4. 安全区适配示例代码

### ANTD_MOBILE_GUIDE.md 知识库要求
1. 核心组件速查（List, NavBar, Popup, Picker, DatePicker, Form, Toast, Dialog）
2. **PC antd → 移动 antd-mobile 组件名映射表**（Modal→Popup, Table→List, Select→Picker）
3. 跟 fr-display-dev 的关键差异（全局变量、组件 API）

### MOBILE_SPECIFIC.md 知识库要求
1. iOS / Android webview 差异（WeixinJSBridge、wx 调用方式）
2. 安全区 `env(safe-area-inset-*)` 适配
3. 触控规范（44px、字号 14-16px）
4. 100vh 抖动陷阱
5. iframe 不可靠 → 用 Popup 或页面跳转

### frm-display-dev SKILL.md 要求
1. python 命令必须带 `PYTHONIOENCODING=utf-8`
2. 资源 URL 必须用 `PATH.apiBase` 推导
3. 禁止 `antd.` 调用（质量门会拦）
4. 禁止 Modal / Table 组件
5. **生产部署后必须企微真机验证一次**（本机 Playwright 不能覆盖所有差异）
