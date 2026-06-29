# frm-* 移动端技能体系建设方案

> **状态**：草稿，等待审阅
> **日期**：2026-06-23
> **背景**：fr-* 系列技能在企业微信 PC 端验证通过后，需要把加壳方案迁移到移动端。
> 经过 mobile_probe 探针完整调研，确认了移动端浏览器内核能力充足、antd-mobile
> 是合适的 UI 库、移动端不读取 ReportWebAttr.jsImportList 必须自己动态加载库。
> 本文档定义 frm-* 系列技能套件的设计与实施计划。

---

## 第一部分 · 核心决策与依据

### 1.1 探针调研已确认的事实

通过 `E:\fr-projects\mobile_probe\pages\env_probe.cpt` 在 PC / Android / iOS 三端
取得的数据，以下结论已经实锤：

| 维度 | PC 企微 | Android 企微 | iOS 企微 |
|---|---|---|---|
| 内核 | Chrome 126 / XWEB 13241 | Chrome 138 / XWEB 1380347 | WebKit 605（≈ Safari 18） |
| ES2020+ | 全部支持 | 全部支持 | 全部支持 |
| CSS Grid/flex gap/:has() | 全部支持 | 全部支持 | 全部支持 |
| 现代 Web API | 全部支持 | 全部支持 | 全部支持 |
| FR / afterload 执行 | ✓ | ✓ | ✓ |
| 静态注入 React/antd | ✓（PC 路由读 jsImportList） | ✗（移动 SPA 不读） | ✗（移动 SPA 不读） |
| 资源 HEAD 可达 | （略） | 5/5 200 OK | 高置信推断 ✓ |
| 动态注入 React/antd | （略） | 4/4 全部成功 + 全部挂载 | 高置信推断 ✓ |
| `window.wx`（jweixin） | ✗ | ✓ | ✓ |
| `WeixinJSBridge` | ✓ | ✓ | ✗（iOS 走 messageHandler） |

**核心结论**：

1. 浏览器内核完全够用，不是技术栈瓶颈
2. 真正差异是路由 —— PC 走 `decision/view/report?reportlet=...` 注入 jsImportList，
   移动端走 `/url/mobile#/report?nodePath=...` 是独立 SPA，不读取 jsImportList
3. cpt 的 afterload 脚本在两端都正常执行，加壳方案立得住
4. 资源可达 + 动态注入可行 = 移动端能跑 React 18 + antd-mobile 5

### 1.2 方案总方向

- **PC 端继续使用 fr-* 技能 + antd**，靠 ReportWebAttr.jsImportList 注入，**完全不动**
- **移动端新建 frm-* 技能套件 + antd-mobile**，靠 cpt 自身的 afterload 动态加载库
- **两套技能并行存在**，PM 根据项目场景选择
- **数据层 fr-data-dev 不复制**，两端共用（数据层只跟 DB 相关，与 UI 库无关）

### 1.3 与现有 fr-* 的关系

```
                       ┌─── fr-pm（PC 端 PM）
                       │
                       ├─── fr-data-dev（数据层，两端共用）  ←─┐
fr-flow-v3 plugin ─────┤                                       │
                       ├─── fr-display-dev（PC 端 antd）        │ 共用
                       │                                       │
                       ├─── fr-qa（PC 端测试）                   │
                       │                                       │
                       ├─── frm-pm（移动端 PM）                  │
                       │                                       │
                       ├─── frm-display-dev（移动 antd-mobile）─┘
                       │
                       └─── frm-qa（移动端测试，UA 伪装）
```

---

## 第二部分 · 资源加载策略（核心机制）

### 2.1 PC 端：不变

继续依赖帆软 `ReportWebAttr.jsImportList`：

```json
[
  "help/lib/antd/react.min.js",
  "help/lib/antd/react-dom.min.js",
  "help/lib/antd/dayjs.min.js",
  "help/lib/antd/antd.min.js",
  ...
]
```

PC 端打开 cpt 时帆软 viewer 自动注入这些 `<script>` 标签，`window.React`、
`window.ReactDOM`、`window.antd`、`window.dayjs` 在 afterload 执行前已就绪。

### 2.2 移动端：动态加载

#### 2.2.1 静态资源部署路径

```
项目部署根：D:\...\reportlets\
所有项目都在：\wuhan\whznjc\ 下
静态资源目录：\wuhan\whznjc\help\lib\antd-mobile\
```

对应 HTTP URL：`/wuhan/whznjc/help/lib/antd-mobile/`

具体文件清单（**保持原文件名**，便于版本追溯）：

```
/wuhan/whznjc/help/lib/antd-mobile/
├── react.min.js              （11 KB，从 antd/ 复制）
├── react-dom.min.js          （129 KB，从 antd/ 复制）
├── dayjs.min.js              （7 KB，从 antd/ 复制）
├── jquery-3.6.1.min.js       （88 KB，jquery.com 官方下载）
├── antd-mobile.umd.js        （468 KB，unpkg @5.42.3/bundle/）
└── style.css                 （147 KB，unpkg @5.42.3/bundle/）

合计 6 个文件，850 KB（gzip 后约 260 KB）
```

#### 2.2.2 路径计算

完全用 `PATH.apiBase` 动态计算，**不写死 contextPath**：

```javascript
var LIB_BASE = PATH.apiBase + '/help/lib/antd-mobile/';
// PATH.apiBase = '/wuhan/whznjc'
// LIB_BASE     = '/wuhan/whznjc/help/lib/antd-mobile/'
```

这样未来部署路径变更（比如改成 `/decision-mobile`）只需修改 PATH 计算逻辑，
所有 cpt 不用改。

#### 2.2.3 加载时序

```
afterload 触发
  ↓
执行 PREAMBLE（固定段）
  ↓
检测 window.React / ReactDOM / antdMobile 是否已存在
  ├─ 已存在 → 跳过加载（PC 端走这条，jsImportList 已注入）
  └─ 不存在 → 进入动态加载
     ↓
     注入 antd-mobile.min.css（link 标签）
     ↓
     按序加载 react.min.js → react-dom.min.js → dayjs.min.js → antd-mobile.min.js
     （每个 script 用 onload 回调串接，保证执行顺序）
     ↓
     全部加载完
  ↓
显示 #app-root，执行 DEVELOPER ZONE
```

#### 2.2.4 加载失败处理

- 任何一个 script onerror → 顶部红条横幅显示"库加载失败：xxx"
- 用 8 秒超时兜底（避免某个 script 永远不返回）
- 失败时 `#app-root` 显示降级提示文字，不空白

### 2.3 共用代码：PC 端跳过加载，移动端执行加载

骨架的 PREAMBLE 段会**在两端通用**。判断逻辑：

```javascript
var NEED_LOAD_LIBS = (
    typeof window.React === 'undefined' ||
    typeof window.ReactDOM === 'undefined' ||
    typeof window.antdMobile === 'undefined'
);
```

- PC 端：jsImportList 注入 antd（不是 antd-mobile），所以 `antdMobile` 仍为 undefined，
  会触发动态加载 antd-mobile —— 这正是我们想要的，**PC 调试时能看到移动端真实效果**
- 移动端：什么都没有，全部动态加载

> 这意味着 PC 端的 frm-* cpt 不会引用全局 antd（避免误用），它和移动端走完全
> 一样的加载逻辑。frm-display-dev 的业务代码里**禁止出现 `antd.` 调用**，
> 必须用 `antdMobile.`。质量门要加规则强制。

---

## 第三部分 · 技能套件清单

### 3.1 技能列表

| 技能名 | 角色 | 状态 |
|---|---|---|
| fr-pm | PC 端 PM | 现有，保留 |
| fr-data-dev | 数据层开发（两端共用） | 现有，保留 |
| fr-display-dev | PC 端展示层 | 现有，保留 |
| fr-qa | PC 端测试 | 现有，保留 |
| **frm-pm** | 移动端 PM | **新增** |
| **frm-display-dev** | 移动端展示层 | **新增** |
| **frm-qa** | 移动端测试 | **新增** |
| **frm** | 移动端入口路由 | **新增** |

数据层不复制（fr-data-dev 两端共用），理由：

- 数据层 cpt 只包含数据集 + 存储过程调用，与 UI 库无关
- 复制会导致同样的逻辑双处维护
- frm-pm 产出的 dev_task.json 直接交给 fr-data-dev 处理

### 3.2 目录结构

```
fr-flow-v3/
├── skills/
│   ├── fr-pm/                  (现有)
│   ├── fr-data-dev/            (现有，两端共用)
│   ├── fr-display-dev/         (现有)
│   ├── fr-qa/                  (现有)
│   ├── frm/                    (新增，入口路由)
│   ├── frm-pm/                 (新增)
│   ├── frm-display-dev/        (新增)
│   └── frm-qa/                 (新增)
│
├── foundation/
│   ├── scaffolds/
│   │   ├── starter*.jsx              (现有 PC 脚手架)
│   │   └── mobile/                   (新增)
│   │       ├── README.md             (页面类型映射表)
│   │       ├── starter.jsx           (通用回退骨架)
│   │       ├── starter_list.jsx      (List + 下拉刷新 + 上拉加载)
│   │       ├── starter_form.jsx      (Form + Picker + DatePicker + Popup)
│   │       ├── starter_detail.jsx    (Card / List 展示型)
│   │       └── starter_selector.jsx  (CheckList + Popup 弹出选择)
│   │
│   └── templates/
│       ├── base_cpt_data.cpt         (现有，两端共用)
│       ├── base_cpt_page.cpt         (现有 PC 骨架)
│       └── base_cpt_page_mobile.cpt  (新增，带动态加载逻辑)
│
├── scripts/
│   ├── data/                         (现有，两端共用)
│   ├── display/                      (现有 PC 工具链)
│   │   ├── display_writer.py
│   │   ├── display_checker.py
│   │   └── rules/
│   └── display_mobile/               (新增，移动端工具链)
│       ├── display_writer.py
│       ├── display_checker.py
│       └── rules/
│           ├── js_path_resolution.py          (复用 PC)
│           ├── js_no_unicode_escape.py        (复用 PC)
│           ├── cpt_xml_wellformed.py          (复用 PC)
│           ├── js_uses_antd_mobile.py         (新增，禁止 `antd.` 出现)
│           ├── js_mobile_no_modal.py          (新增，禁止用 Modal，应该用 Popup)
│           ├── js_mobile_no_table.py          (新增，提醒别在移动端用 Table)
│           └── js_mobile_safe_area.py         (新增，提醒安全区适配)
│
└── shared/
    └── KNOWLEDGE/
        ├── ANTD_REACT_GUIDE.md       (现有 PC 速查)
        ├── ANTD_MOBILE_GUIDE.md      (新增，移动端组件速查)
        ├── MOBILE_SPECIFIC.md        (新增，安全区/触控/Portal/100vh)
        ├── ARCHITECTURE.md           (现有，需补充移动 SPA 路由说明)
        └── JS_SAFETY.md              (现有，两端共用)
```

### 3.3 工具脚本独立 vs 共享

`scripts/display/` 和 `scripts/display_mobile/` 物理目录分开，但**规则模块复用**：

- `rules/js_path_resolution.py` 等通用规则：两边都 import 同一份
- `rules/js_uses_antd_mobile.py` 等移动专属规则：只在 display_mobile/rules/ 下

工具脚本 99% 代码一致，只换骨架模板路径和默认 import。**用独立目录**而不是
"加 --mobile flag"，避免 PC 端工具误带移动逻辑。

---

## 第四部分 · 移动骨架 base_cpt_page_mobile.cpt 设计

### 4.1 骨架结构

```
<![CDATA[
(function() {
    'use strict';

    /* ========================================
       PREAMBLE（固定段，frm-display-dev 不得修改）
       ======================================== */

    // 1. viewport meta 强制注入（部分帆软移动 SPA 不带）
    var ensureViewport = function() {
        var meta = document.querySelector('meta[name="viewport"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'viewport');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content',
            'width=device-width, initial-scale=1, maximum-scale=1, ' +
            'user-scalable=no, viewport-fit=cover');
    };
    ensureViewport();

    // 2. PATH 路径基础设施（与 PC 版完全一致，由 fr-data-dev 数据接口共用）
    var PATH = {
        currentDir: (function() {
            try {
                var name = FR.remoteEvaluate("=reportName");
                return name.substring(0, name.lastIndexOf('/') + 1);
            } catch (e) { return ''; }
        })(),
        apiBase: (function() {
            try {
                var servletURL = FR.remoteEvaluate("=servletURL");
                var parts = servletURL.split('/');
                return '/' + parts[1] + '/' + parts[2];
            } catch (e) { return ''; }
        })(),
        getDataTemplate: function(filename) {
            return this.currentDir.replace('/pages/', '/data/') + filename;
        },
        getTemplatePath: function(filename) {
            return this.currentDir + filename;
        }
    };

    // 3. hideStyle —— 通杀模式 + Portal 白名单
    var hideStyle = document.createElement('style');
    hideStyle.innerHTML =
        'html,body{margin:0!important;padding:0!important;background:#f5f5f5!important;' +
            '-webkit-text-size-adjust:100%;}' +
        'body>*{display:none!important;}' +
        'body>#app-root{display:block!important;position:fixed!important;' +
            'top:0!important;left:0!important;right:0!important;bottom:0!important;' +
            'z-index:2147483647!important;overflow-y:auto!important;' +
            '-webkit-overflow-scrolling:touch;background:#f5f5f5!important;' +
            'padding-top:env(safe-area-inset-top);' +
            'padding-bottom:env(safe-area-inset-bottom);}' +
        /* antd-mobile Portal 白名单 —— Popup/Mask/Toast/Dialog 都用 Portal 渲染到 body */
        'body>.adm-popup,body>.adm-mask,body>.adm-toast-wrap,' +
            'body>.adm-dialog,body>.adm-action-sheet,body>.adm-picker-popup,' +
            'body>.adm-image-viewer,body>[class^="adm-"]{display:block!important;}';
    document.head.appendChild(hideStyle);

    // 4. 创建 #app-root，初始显示 loading
    var appRoot = document.createElement('div');
    appRoot.id = 'app-root';
    appRoot.innerHTML =
        '<div style="text-align:center;padding:80px 20px;color:#888;font-size:14px;">' +
        '正在加载组件库...</div>';
    document.body.appendChild(appRoot);

    // 5. 全局错误兜底
    window.addEventListener('error', function(e) {
        var box = document.getElementById('frm-error-banner');
        if (!box) {
            box = document.createElement('div');
            box.id = 'frm-error-banner';
            box.style.cssText = 'position:fixed;top:0;left:0;right:0;' +
                'background:#ff4d4f;color:#fff;padding:8px;font-size:12px;' +
                'z-index:2147483647;word-break:break-all;';
            document.body.appendChild(box);
        }
        box.textContent = '[JS Error] ' + (e.message || '') +
            ' @ ' + (e.filename || '?') + ':' + (e.lineno || '?');
    });

    // 6. 动态加载库（共用逻辑：PC/移动端走同一份）
    var LIB_BASE = PATH.apiBase + '/help/lib/antd-mobile/';

    var NEED_LOAD = (
        typeof window.React === 'undefined' ||
        typeof window.ReactDOM === 'undefined' ||
        typeof window.antdMobile === 'undefined'
    );

    function loadCSS(url) {
        var l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = url;
        document.head.appendChild(l);
    }

    function loadScripts(urls, onComplete, onError) {
        var i = 0;
        function next() {
            if (i >= urls.length) { onComplete(); return; }
            var s = document.createElement('script');
            s.src = urls[i++];
            s.async = false;
            s.onload = next;
            s.onerror = function() { onError(s.src); };
            document.head.appendChild(s);
        }
        next();
    }

    function bootBusiness() {
        /* ========================================
           DEVELOPER ZONE
           （display_writer.py 把 .jsx 编译后的内容注入到这里）
           ======================================== */

        /* ===== DEVELOPER ZONE BEGIN ===== */
        // ↑ writer 替换标记

        // 业务代码：可使用 window.React、ReactDOM、antdMobile、dayjs、$、FR、PATH

        /* ===== DEVELOPER ZONE END ===== */
    }

    if (!NEED_LOAD) {
        bootBusiness();
    } else {
        loadCSS(LIB_BASE + 'style.css');
        loadScripts([
            LIB_BASE + 'jquery-3.6.1.min.js',
            LIB_BASE + 'react.min.js',
            LIB_BASE + 'react-dom.min.js',
            LIB_BASE + 'dayjs.min.js',
            LIB_BASE + 'antd-mobile.umd.js'
        ], bootBusiness, function(failedUrl) {
            appRoot.innerHTML =
                '<div style="text-align:center;padding:60px 20px;color:#ff4d4f;">' +
                '<div style="font-size:16px;margin-bottom:8px;">⚠ 组件库加载失败</div>' +
                '<div style="font-size:12px;word-break:break-all;">' + failedUrl + '</div>' +
                '<div style="font-size:11px;color:#888;margin-top:12px;">' +
                '请检查 ' + LIB_BASE + ' 下文件是否存在</div>' +
                '</div>';
        });
    }
})();
]]>
```

### 4.2 与 PC 骨架的关键差异

| 项 | PC 骨架（base_cpt_page.cpt） | 移动骨架（base_cpt_page_mobile.cpt） |
|---|---|---|
| viewport meta | 不强制 | 强制注入，禁 user-scalable |
| hideStyle | 黑名单（fr-report 等具体类名） | 白名单（body>* 全隐，只露 app-root + adm-* Portal） |
| app-root 定位 | 普通 div | `position: fixed`，覆盖整个 viewport |
| 安全区适配 | 无 | padding-top/bottom 用 env(safe-area-inset-*) |
| 库加载 | 依赖 jsImportList，不动态加载 | afterload 内主动动态加载 |
| 全局变量 | `antd` | `antdMobile` |
| Portal 元素 | `.ant-` 由 fr 默认样式覆盖 | `.adm-` 需白名单放出 |

---

## 第五部分 · 工程链 display_mobile/ 设计

### 5.1 工程链流程（与 PC 同构）

```
.jsx 源码（真正的 JSX 语法，<Button>...</Button>）
   ↓ esbuild --bundle --format=iife --jsx=transform --charset=utf8
.mjs（去注释 + Hook 解构转换）
   ↓ node --check 语法门
   ↓ 注入到 base_cpt_page_mobile.cpt 的 DEVELOPER ZONE
.cpt 临时文件
   ↓ display_checker.py 质量门（含移动专属规则）
   ↓ 原子落盘
最终 .cpt
```

**重要约定**：业务代码必须用**真正的 JSX 语法**，不是 `React.createElement()` 调用。
esbuild 的 `--jsx=transform` 会把 JSX 编译成 React.createElement 调用，所以源码
保持简洁可读，跟 fr-display-dev 完全一致。AI 写 JSX 比写 createElement 更不容易出错。

示例（正确写法）：

```jsx
var { Button, NavBar, Card, Popup } = antdMobile;
return (
    <div style={{ padding: '8px' }}>
        <NavBar>页面标题</NavBar>
        <Card title="操作区">
            <Button color="primary" onClick={handleClick}>提交</Button>
        </Card>
    </div>
);
```

### 5.2 与 PC 工程链的差异

| 项 | display/display_writer.py | display_mobile/display_writer.py |
|---|---|---|
| 骨架模板 | base_cpt_page.cpt | base_cpt_page_mobile.cpt |
| 默认规则集 | rules/（5 条） | rules/（5 条 PC + 3 条 mobile 专属） |
| Hook 转换 | React.useState / antd.useState | React.useState / antdMobile.useState |
| 输出位置 | $FR_PROJECTS_DIR/{project}/pages/ | 同 |

工具脚本可以**完全复制**一份过来改 5 个常量即可，不重写。代码逻辑 100% 一致。

### 5.3 移动端专属质量门规则

#### `rules/js_uses_antd_mobile.py`（error）

- 触发：jsx 中出现 `antd.` 或 `antd[` 调用
- 修复：改成 `antdMobile.`
- 防止误用 PC 端 antd 组件，移动端没注入这个全局

#### `rules/js_mobile_no_modal.py`（warning）

- 触发：jsx 中出现 `antdMobile.Modal`
- 提示：移动端用 `Popup` / `Dialog` / `ActionSheet`，Modal 居中布局不符合移动习惯

#### `rules/js_mobile_no_table.py`（warning）

- 触发：jsx 中出现 `antdMobile.Table`（antd-mobile v5 没有 Table 组件，但防止 AI 想当然写错）
- 提示：移动端数据展示用 `List`、`IndexBar`、`Grid`

#### `rules/js_mobile_safe_area.py`（warning）

- 触发：jsx 中出现 fixed 定位但没有 `safe-area-inset` padding
- 提示：iPhone 刘海/底部 home 条会遮挡固定布局

---

## 第六部分 · frm-display-dev 技能要点

### 6.1 与 fr-display-dev 的关键差异

| 项 | fr-display-dev | frm-display-dev |
|---|---|---|
| 全局组件库 | `antd`（PC） | `antdMobile`（移动） |
| 全局图标 | 自加载 SVG | 用 `@ant-design/icons-svg`（如果 UMD 不带，沿用 PC 自加载方式） |
| 列表展示 | `Table` | `List`（卡片型）+ `IndexBar`（按字母分组） |
| 表单 | `Modal + Form` | `Popup + Form` 或独立页面 + Form |
| 字段输入 | `Input / Select / DatePicker` | `Input / Picker / DatePicker(列模式)` |
| 弹窗 | `Modal` 居中 | `Popup` 底部弹出 / `Dialog` 居中确认 |
| 选择器 | `Select / Cascader / TreeSelect` | `Picker / CheckList / CascadePicker` |
| 顶部导航 | 无（自由布局） | `NavBar`（必须） |
| 底部 Tab | 无 | `TabBar`（可选） |
| 触控规范 | 无 | 所有交互元素 ≥ 44px |
| 字体规范 | 12-14px | 14-16px 主体，最小 12px 辅助 |
| 跨页面 | Modal + iframe | URL 跳转或同页 Popup |
| 网络 | 同 | 同（PATH.apiBase + /api/data） |

### 6.2 页面类型映射

| frm 页面类型 | 主要组件 | 用途 |
|---|---|---|
| list | List + SearchBar + PullToRefresh + InfiniteScroll | 数据列表（替代 PC 的 Table） |
| form | Form + Input + Picker + DatePicker + Button | 表单提交 |
| detail | Card + List + Image + NavBar | 详情查看 |
| selector | CheckList / Picker + Popup | Modal 弹出的选择器 |

### 6.3 数据接口（与 PC 完全一致）

```javascript
$.ajax({
    url: PATH.apiBase + '/api/data',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({
        report_path: PATH.getDataTemplate('{module}_data.cpt'),
        datasource_name: '{module}_qry',
        page_number: -1,
        page_size: -1,
        parameters: [...]
    }),
    success: function(res) { ... }
});
```

注意：jQuery `$` 在 PC 端通过 jsImportList 自动加载，但**移动端不会自动加载 jQuery**。

**讨论点**：移动端是否要把 jQuery 也加入动态加载？还是改用原生 fetch 重写所有
数据接口？倾向方案 A（继续用 jQuery）：

- 优点：fr-display-dev 现有数据接口代码可以直接迁移，AI 不需要学新模式
- 代价：多加载 30KB 的 jQuery

方案 A 的具体实现：

```javascript
// 移动端骨架的动态加载列表加上 jquery：
var SCRIPTS = [
    LIB_BASE + 'jquery.min.js',          // 新增
    LIB_BASE + 'react.min.js',
    LIB_BASE + 'react-dom.min.js',
    LIB_BASE + 'dayjs.min.js',
    LIB_BASE + 'antd-mobile.min.js'
];
```

需要把 jQuery 也放到 `/wuhan/whznjc/help/lib/antd-mobile/` 下。

### 6.4 iframe 通信

移动端**不推荐 iframe 弹窗**，原因：

- 移动浏览器 iframe 高度计算不可靠（100vh 抖动）
- 嵌套滚动体验差
- 企微 webview 对 iframe 安全策略不一致

**新模式**：

- 选择器/表单：用 `Popup` 同页内弹出，不开 iframe
- 大表单：用页面跳转（修改 `location.hash` 或 `location.href` 到另一个 cpt 路由）

---

## 第七部分 · frm-pm 和 frm-qa 要点

### 7.1 frm-pm

复制 fr-pm/SKILL.md 改造：

- dev_task.json schema 加 `platform: "mobile"` 字段
- 页面类型 enum 改为：`list / form / detail / selector`
- 数据层任务仍交给 fr-data-dev（共用）
- 展示层任务交给 frm-display-dev
- 输出移动端 UI 设计要点：导航结构、底部 Tab 是否需要、表单流程

### 7.2 frm-qa

复制 fr-qa/SKILL.md 改造：

- Playwright 用 `devices['iPhone 13']` 或 `devices['Pixel 7']`
- UA 强制设为生产环境企微 UA（参考探针 JSON）
- 测试视口固定 375×667（iPhone SE）或 390×844（iPhone 13）
- 验证项：
  - viewport meta 已注入
  - safe-area padding 生效
  - 触控元素 ≥ 44px
  - Popup 能正常弹出和关闭
  - 下拉刷新 / 上拉加载（如果用了）
  - 表单键盘弹起不遮挡输入框

---

## 第八部分 · 实施阶段计划

### 阶段 0：准备工作（你做）

1. 从 npm/unpkg 下载 antd-mobile v5 latest 的 UMD bundle：
   - `antd-mobile.min.js`
   - `antd-mobile.min.css`
2. 同时下载 jquery.min.js（用 PC 同一份 jQuery 3.6.1）
3. 部署到本地：`D:\...\reportlets\wuhan\whznjc\help\lib\antd-mobile\`
4. 部署到生产：同路径
5. 用浏览器手工验证 5 个文件 URL 都返回 200：
   - `/wuhan/whznjc/help/lib/antd-mobile/react.min.js`
   - `/wuhan/whznjc/help/lib/antd-mobile/react-dom.min.js`
   - `/wuhan/whznjc/help/lib/antd-mobile/dayjs.min.js`
   - `/wuhan/whznjc/help/lib/antd-mobile/jquery.min.js`
   - `/wuhan/whznjc/help/lib/antd-mobile/antd-mobile.min.js`
   - `/wuhan/whznjc/help/lib/antd-mobile/antd-mobile.min.css`

### 阶段 1：核心基础设施 + 冒烟测试（我做）

> **重要**：阶段 1 是验证整个方案能不能跑通的关键。冒烟测试通过前，不写后续阶段文档。

1. 写 `foundation/templates/base_cpt_page_mobile.cpt` 骨架
2. 写 `scripts/display_mobile/display_writer.py` 工具链（复制 PC 版改 5 个常量）
3. 写 `scripts/display_mobile/display_checker.py` + 3 条移动专属规则
4. 在 `mobile_probe` 项目里写一个**冒烟测试 cpt**：
   - 加载 antd-mobile
   - 渲染 NavBar + Button + Input + Picker + DatePicker + Popup + List
   - 触发一次 Popup 打开/关闭
   - 调用一次 `/api/data`（取个简单 sql 查询）
5. 部署到生产环境，PC + Android + iOS 三端打开验证
6. **冒烟测试通过 = 阶段 1 完成**

### 阶段 2：脚手架和知识库（我做）

1. 写 `foundation/scaffolds/mobile/starter*.jsx` 全套（5 个文件）
2. 写 `shared/KNOWLEDGE/ANTD_MOBILE_GUIDE.md`
3. 写 `shared/KNOWLEDGE/MOBILE_SPECIFIC.md`
4. 补充 `shared/KNOWLEDGE/ARCHITECTURE.md` 关于移动 SPA 路由的章节

### 阶段 3：frm-display-dev 技能（我做）

1. 写 `skills/frm-display-dev/SKILL.md`
2. 定义 dev_task.json schema 中 mobile 字段的处理逻辑
3. 写错误处理、验收标准

### 阶段 4：frm-pm + frm-qa（我做）

1. 写 `skills/frm-pm/SKILL.md`
2. 写 `skills/frm-qa/SKILL.md`
3. 写 `skills/frm/SKILL.md`（入口路由）

### 阶段 5：端到端真实需求验证（一起做）

用 frm-pm 处理一个真实小需求 → frm-display-dev 实施 → 部署 → 生产移动端验证 →
验收通过 = 方案正式投产。

---

## 第九部分 · 风险与待确认事项

### 9.1 已知风险

| 风险 | 影响 | 应对 |
|---|---|---|
| antd-mobile 5 的 Form API 与 antd 5 Form 不完全兼容 | AI 写错代码 | 知识库强调差异，质量门加规则 |
| 移动端 iframe 不可靠 | 选择器/表单需要重新设计 | 全用 Popup 替代 |
| iOS WKWebView 的 `WeixinJSBridge` 缺失 | 调用企微原生能力时有差异 | 知识库提示用 `wx.xxx` 顶层 API |
| 100vh 在企微 webview 中可能抖动 | 全屏布局错位 | 用 `dvh` 或 `position:fixed` 避免 vh |
| 帆软移动 SPA 后续版本变更路由 | 加载逻辑失效 | 探针数据归档，每次帆软升级跑一次回归 |

### 9.2 待确认事项（实施时再决定）

- [ ] antd-mobile 版本号锁定：v5 最新稳定版 vs 锁定某个中版本
- [ ] 是否要把 jQuery 也加入移动端动态加载（推荐：是）
- [ ] 是否需要把 `@ant-design/icons-svg` 也部署到 lib 下（按需）
- [ ] 移动端是否需要支持深色模式（antd-mobile 支持，但要不要在 frm-display-dev 默认启用）
- [ ] 移动端跨页面状态如何传递（URL hash vs sessionStorage）
- [ ] 是否需要 frm 入口路由技能，还是 frm-pm 自动触发即可

---

## 附录 A：探针数据归档

完整探针 JSON 数据（PC + Android + iOS 三端）保留在：

- `E:\fr-projects\mobile_probe\pages\env_probe.cpt`（探针页面）
- `E:\fr-projects\mobile_probe\pages\env_probe.jsx`（探针源码）

数据样本（关键字段）：

```
PC：     Chrome 126 / XWEB 13241  / wxwork 3.4.0 / Windows
Android: Chrome 138 / XWEB 1380347 / wxwork 4.0.0 / Android 16
iOS：    WebKit 605                / wxwork 4.0.0 / iOS 18.4.1
```

## 附录 B：参考 URL

- 探针页生产 URL（移动）：
  `https://fhzjyw.hxb.com.cn/wuhan/whznjc/url/mobile#/report?nodePath=mobile_probe/pages/env_probe.cpt`
- 探针页生产 URL（PC）：
  `https://fhzjyw.hxb.com.cn/wuhan/whznjc/v10/entry/access/<token>`
- antd-mobile v5 文档：https://mobile.ant.design/zh
- antd-mobile UMD bundle：https://unpkg.com/antd-mobile/bundle/

---

## 文档维护

- 实施过程中如方案有调整，本文档同步更新
- 每个阶段完成后在对应章节末尾打勾标记
- 待确认事项确认后从"风险与待确认"移至"已决策"
