# 帆软预览环境注意事项

> 版本：v3
> 适用：fr-data-dev / fr-display-dev / fr-qa 开发调试时参考

## afterload 执行环境

### v3 可用全局对象

```javascript
// ✅ 框架级（由帆软加载的公共库提供）
FR.remoteEvaluate("=reportName");  // 获取当前模板路径
FR.remoteEvaluate("=servletURL");  // 获取 servlet 路径前缀

// ✅ 展示层全局变量（已注入，不需要 import）
React           // React 18
ReactDOM        // ReactDOM 18
antd            // antd 5.x
antdIcons       // @ant-design/icons
dayjs           // dayjs 日期库

// ✅ jQuery（帆松环境已加载）
$               // jQuery
$.ajax()        // 标准 AJAX 调用
```

### 固定段结构（starter.jsx）

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
ReactDOM.createRoot(document.getElementById('app-root')).render(<App />);
```

**路径规范**：
- 数据层模板：`PATH.getDataTemplate('{module}_data.cpt')` → 自动从 `pages/` 切换到 `data/`
- 同目录模板：`PATH.getTemplatePath('{page}.cpt')` → 保持在当前目录
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

### 4. CPT XML 解析失败
```
// CPT 文件 XML 格式损坏
// 必须通过 display_writer.py 重新生成，不要手动编辑
```

### 5. /api/data 返回 {}（空对象）
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
| ❌ 修改固定段（PATH/hideStyle/app-root） | 路径解析和框架隔离依赖这些代码 |
| ❌ 在 JSX 中写 `import` 语句 | 运行时走全局变量，esbuild bundle 会因模块不存在而失败 |
| ❌ 在 JSX 中做 IIFE 封装 | esbuild `--format=iife` 自动添加，双层 IIFE 导致报错 |
| ❌ 硬编码绝对路径 | 使用 PATH 对象方法动态获取 |
| ❌ URL 不带 `op=write` | afterload 事件不触发，页面空白 |
