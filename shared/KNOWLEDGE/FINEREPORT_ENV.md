# 帆软预览环境注意事项

> 版本：3.1
> 适用：fr-data-dev / fr-display-dev / fr-qa 开发调试时参考
> 最后验证：2026-05-14（Playwright 实测）

## 已验证的全局变量

以下变量在 `op=write` 填报预览模式下经过 Playwright 实测确认，可直接使用：

| 变量 | 来源 | 版本 | 状态 |
|------|------|------|------|
| `React` | react.min.js | 18.3.1 | ✅ 可用 |
| `ReactDOM` | react-dom.min.js | 18.3.1 | ✅ 可用 |
| `antd` | antd.min.js | 5.21.0 | ✅ 可用 |
| `dayjs` | dayjs.min.js | - | ✅ 可用 |
| `$` | 帆软内置 jQuery | - | ✅ 可用（含 `$.ajax`） |
| `FR` | 帆软运行时 | - | ✅ 可用（含 `FR.remoteEvaluate`） |

### 不可用的变量

| 变量 | 说明 |
|------|------|
| `antdIcons` | **不存在**。`@ant-design/icons` React 组件 JS 库未加载。但 SVG 图标文件可直接使用（见下方"图标"节）。 |
| `antd.locale` | **不存在**。antd locale 模块未预加载，需自行注入中文配置（见下方"国际化"节）。 |

### 图标

`/webroot/help/lib/antd/icons/` 下有 **831 个标准 SVG 图标文件**（filled 234 + outlined 447 + twotone 150），可通过 URL 直接引用或 fetch 获取。

**推荐用法：`<img>` 标签作为 antd Button 的 `icon` prop**（Playwright 实测通过）：

```javascript
var iconBase = '/webroot/help/lib/antd/icons';

var searchIcon = React.createElement('img', {
    src: iconBase + '/outlined/search.svg',
    style: { width: 14, height: 14 }
});

// antd Button 的 icon prop 接受任何 ReactElement
React.createElement(antd.Button, { icon: searchIcon, type: 'primary' }, '搜索');
```

**常用图标路径速查**：

| 用途 | 路径 |
|------|------|
| 搜索 | `/webroot/help/lib/antd/icons/outlined/search.svg` |
| 新增/添加 | `/webroot/help/lib/antd/icons/outlined/plus.svg` |
| 编辑 | `/webroot/help/lib/antd/icons/outlined/edit.svg` |
| 删除 | `/webroot/help/lib/antd/icons/outlined/delete.svg` |
| 重置/刷新 | `/webroot/help/lib/antd/icons/outlined/reload.svg` |
| 关闭/取消 | `/webroot/help/lib/antd/icons/outlined/close.svg` |
| 确认/完成 | `/webroot/help/lib/antd/icons/outlined/check.svg` |
| 导出 | `/webroot/help/lib/antd/icons/outlined/export.svg` |
| 导入 | `/webroot/help/lib/antd/icons/outlined/import.svg` |
| 下载 | `/webroot/help/lib/antd/icons/outlined/download.svg` |
| 上传 | `/webroot/help/lib/antd/icons/outlined/upload.svg` |
| 设置 | `/webroot/help/lib/antd/icons/outlined/setting.svg` |
| 用户 | `/webroot/help/lib/antd/icons/outlined/user.svg` |

> **注意**：`<img>` 方式在浏览器中会产生 HTTP 请求。对于高频使用的图标，也可以用内联 SVG（`React.createElement('svg', ...)`），将 path 数据直接嵌入 JSX。

### 环境特征

- **iframe 独立实例**：在 iframe 中加载的子页面会获得独立的 `React` 和 `antd` 实例（与父页面 `===` 比较为 `false`）。这意味着 React Context 不跨 iframe 共享。
- **静态 API vs Hook**：`antd.message.success()` 等静态方法在父页面和 iframe 中均正常工作。`App.useApp()` hook 在 iframe 中行为不稳定（`message.success` 可能不是函数），**推荐统一使用静态 API**。
- **已知无害错误**：`ReferenceError: BI is not defined` 来自帆软云插件 `plugin.min.js`，不影响业务功能，可忽略。

---

## 国际化

antd 默认英文。要显示中文（如 Pagination 的"下一页"/"上一页"），需通过 `ConfigProvider` 注入 locale：

```javascript
// 精简的中文 locale（字段覆盖 antd 默认英文）
var zhCN = {
    locale: 'zh-cn',
    Pagination: { items_per_page: '条/页', jump_to: '跳至', jump_to_confirm: '确定', page: '页',
        prev_page: '上一页', next_page: '下一页', prev_5: '向前 5 页', next_5: '向后 5 页',
        prev_3: '向前 3 页', next_3: '向后 3 页', page_size: '页码' },
    Table: { filterTitle: '筛选', filterConfirm: '确定', filterReset: '重置', selectAll: '全选',
        selectInvert: '反选', sortTitle: '排序', expand: '展开行', collapse: '折叠行',
        emptyText: '暂无数据' },
    Modal: { okText: '确定', cancelText: '取消', justOkText: '知道了' },
    Popconfirm: { okText: '确定', cancelText: '取消' },
    Form: { optional: '（可选）', defaultValidateMessages: {
        default: '字段验证错误 ${label}', required: '请输入 ${label}',
        enum: '${label} 必须是其中一个', whitespace: '不能输入空格',
        string: { len: '长度应为 ${len}', min: '最少 ${min} 个字符', max: '最多 ${max} 个字符' },
        number: { len: '值应为 ${len}', min: '最小值为 ${min}', max: '最大值为 ${max}' } } },
    Empty: { description: '暂无数据' }
};

// 在 App 渲染时包裹
var app = React.createElement(antd.ConfigProvider, { locale: zhCN },
    React.createElement(App)
);
ReactDOM.createRoot(document.getElementById('app-root')).render(app);
```

---

## 固定段结构（starter.jsx）

展示层模板使用以下结构，固定段**禁止修改**：

```javascript
// 1. PATH 对象（动态路径解析）
var PATH = {
    currentDir: ...,
    apiBase: ...,
    getDataTemplate: function(filename) { ... },
    getTemplatePath: function(filename) { ... }
};

// 2. hideStyle（隐藏帆软原生框架）
var hideStyle = document.createElement('style');
hideStyle.innerHTML = '...';
document.head.appendChild(hideStyle);

// 3. app-root 挂载点
var appRoot = document.createElement('div');
appRoot.id = 'app-root';
document.body.insertBefore(appRoot, document.body.firstChild);

// 4. 开发者区域（在这里编写业务代码）
function App() { ... }
var app = React.createElement(antd.ConfigProvider, { locale: zhCN },
    React.createElement(App)
);
ReactDOM.createRoot(document.getElementById('app-root')).render(app);
```

**路径规范**（Playwright 实测验证）：
- `FR.remoteEvaluate("=servletURL")` → `"/webroot/decision/view/report"`
- `PATH.apiBase` → `"/webroot/decision"`
- `PATH.getDataTemplate('demo_data.cpt')` → `"{project}/data/demo_data.cpt"`
- `PATH.getTemplatePath('book_form.cpt')` → `"{project}/pages/book_form.cpt"`
- 公共模板：直接写 `api/api_agent.cpt` → 从 reportlets 根目录开始

---

## 模板编译流程

展示层 CPT 不能手动编辑，必须走工具链：

```
JSX 源码 → esbuild 编译 → display_writer.py 注入骨架 → 质量门 → 落盘 CPT
```

关键参数：
- `esbuild --charset=utf8`：防止中文字符被转成 `\uXXXX`
- `esbuild --format=iife`：自动添加 IIFE 包装，**原始 JSX 不要自己写 IIFE**
- `display_writer.py`：自动完成 Hook 解构转换（React.useState → 两步赋值，帆软预览环境兼容）
- `display_checker.py`：自动校验 JS 路径解析、Unicode 转义、XML 格式

---

## 预览模式差异

### 填报预览（op=write）
- 完整执行 afterload 事件
- **所有展示页面必须带 `op=write`**，否则页面空白
- 预览地址格式：`/view/report?op=write&reportlet={project}/pages/{page}.cpt`

### 设计器预览
- 可能缺少部分全局对象
- 不建议用于展示层开发调试

### 开发阶段缓存处理
- URL 添加 `&t={Date.now()}` 避免帆软缓存
- 或使用浏览器无痕模式

---

## 常见错误排查

### 1. BI is not defined
```
// 帆软云插件加载问题，非模板代码引起
// 可忽略，不影响功能
```

### 2. 页面空白（白屏）
```
可能原因：
1. URL 缺少 op=write 参数
2. JSX 编译有语法错误（检查 esbuild 输出）
3. React 组件渲染报错（检查 Console）
4. display_writer.py 质量门未通过

排查：F12 → Console 查看错误信息
```

### 3. antd / React is not defined
```
// 确认帆软已加载公共库（webroot/help/lib/antd/）
// 检查预览方式是否为填报预览（op=write）
// 不要在 JSX 中写 import 语句，用全局变量
```

### 4. antdIcons / SearchOutlined is not defined
```
// antdIcons 全局变量不存在，@ant-design/icons React 组件库未加载
// 解决方法：按钮不使用 icon prop，改用纯文本或 Unicode 字符
// 或者使用 antd 内置的图标渲染方式
```

### 5. message.success is not a function（iframe 内）
```
// App.useApp() hook 在 iframe 中可能返回不正确的 message 对象
// 解决方法：使用 antd.message.success() 静态方法代替
// 静态 API 在父页面和 iframe 中均正常工作
```

### 6. CPT XML 解析失败
```
// CPT 文件 XML 格式损坏
// 必须通过 display_writer.py 重新生成，不要手动编辑
```

### 7. /api/data 返回 {}（空对象）
```
可能原因：
1. 数据 JSON 服务插件未安装或未启用
2. report_path 路径不正确
3. datasource_name 不存在于目标 CPT 中
```

---

## 禁止行为

| 禁止 | 原因 |
|------|------|
| ❌ 手动编辑 CPT XML | 必须走工具链（data_writer.py / display_writer.py） |
| ❌ 修改固定段（PATH/hideStyle/app-root/ConfigProvider） | 路径解析和框架隔离依赖这些代码 |
| ❌ 在 JSX 中写 `import` 语句 | 运行时走全局变量，esbuild bundle 会因模块不存在而失败 |
| ❌ 使用 `antdIcons` | 全局变量不存在 |
| ❌ 使用 `App.useApp()` hook（尤其 iframe 场景） | 静态 API `antd.message.xxx()` 更可靠 |
| ❌ 在 JSX 中做 IIFE 封装 | esbuild `--format=iife` 自动添加，双层 IIFE 导致报错 |
| ❌ 硬编码绝对路径 | 使用 PATH 对象方法动态获取 |
| ❌ URL 不带 `op=write` | afterload 事件不触发，页面空白 |
