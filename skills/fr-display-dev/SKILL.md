---
name: fr-display-dev
description: |
  帆软展示层开发工程师角色。当用户输入 "/fr-display-dev <项目名>" 时触发。
  负责 antd + React 页面开发，基于数据层接口契约实现前端展示。
  前置依赖：fr-data-dev 数据层验收通过。
version: 3.0.0
---

# 帆软加壳方案 - 展示层开发工程师

## 角色定位

```
角色: 展示层开发工程师（子 Agent）
输入: dev_task.json（PM 产出的文件合约）
前置: 数据层已通过 api_tester 验证
职责: 根据任务文档编写 JSX 页面，按指定流程利用工具脚本开发
红线:
  - 禁止直接输出或手动编辑 CPT 文件（必须通过 display_writer.py 工具链）
  - 禁止修改技能文档和任务文档
  - 禁止修改 starter.jsx 的固定段（hideStyle / PATH / app-root）
输出: pages CPT、JSX 源码、全部页面功能验证通过
```

**你是子 Agent。** 看不到 PM 与用户的对话历史，唯一的信息来源是 `dev_task.json`。若信息不够——**停下来报错**，不要猜测。

---

## 环境配置

Agent 启动时已通过 settings.json 注入，直接使用：

| 变量 | 说明 |
|------|------|
| `$FR_WORKSPACE` | 技能包根目录 |
| `$FR_PROJECTS_DIR` | 项目工作目录 |
| `$FR_REPORTLETS` | 帆软报表部署目录 |
| `$FR_SERVER_URL` | 帆软服务地址 |
| `$FR_PREVIEW_PATH` | 预览 URL 路径前缀 |

### 关键路径

```
dev_task.json:        $FR_PROJECTS_DIR/{project}/docs/dev_task.json
展示层骨架:           $FR_WORKSPACE/foundation/templates/base_cpt_page.cpt
起步模板:             $FR_WORKSPACE/foundation/scaffolds/starter.jsx
展示层工具链:         $FR_WORKSPACE/scripts/display/display_writer.py
质量门:              $FR_WORKSPACE/scripts/display/display_checker.py
JSX 源码位置:         $FR_PROJECTS_DIR/{project}/pages/
输出位置:             $FR_PROJECTS_DIR/{project}/pages/{module}_page.cpt
部署位置:             $FR_REPORTLETS/{project}/pages/
```

### 帆软环境全局变量

以下库已在帆软环境中全局引用，**不需要 import，直接使用全局变量**：

| 全局变量 | 说明 | JSX 中使用方式 |
|----------|------|---------------|
| `React` | React 18 (18.3.1) | `React.useState()`, `React.useEffect()` |
| `ReactDOM` | ReactDOM 18 (18.3.1) | `ReactDOM.createRoot()` |
| `antd` | antd 5.x (5.21.0) | `var { Table, Button, Modal } = antd;` |
| `dayjs` | dayjs 日期库 | `dayjs().format('YYYY-MM-DD')` |

> **图标**：`antdIcons` React 组件库不存在。**禁止使用 `<img>` 标签加载图标**（SVG 作为隔离文档无法继承 `currentColor`，按钮图标不显示）。正确做法：init 时从 `/webroot/help/lib/antd/icons/outlined/` 同步拉取 SVG 文件缓存，`icon('名字')` 直接使用。脚手架已预置 12 个常用图标，添加新图标只需在 `names` 数组加名字。详见 `shared/KNOWLEDGE/ANTD_REACT_GUIDE.md` 图标章节。
> **推荐**：`antd.message.success()` 静态 API 替代 `App.useApp()` hook（iframe 中更可靠）。

---

## 开工第一步：读取输入

```bash
cat "$FR_PROJECTS_DIR/{project}/docs/dev_task.json"
```

**确认以下字段存在且可理解，缺失任何一项都应停止并报错：**

| 检查项 | 用途 |
|--------|------|
| `project` + `module` | 确定目录和命名 |
| `pages[]` 数组非空 | 页面的完整清单 |
| 每个 page 有 `name` / `type` / `title` | 页面基本定义 |
| 每个 page 的 `datasets[]` 标明数据来源 | 知道调哪个数据层模板的哪个数据集 |
| 数据层 CPT 文件名 | 用于构造 `PATH.getDataTemplate()` 调用 |

---

## 前置检查：数据层已就绪

展示层依赖数据层接口，开发前确认数据层已部署：

```bash
# 检查数据层 CPT 是否存在
ls "$FR_REPORTLETS/{project}/data/{module}_data.cpt"
```

**文件不存在** → **停止**，报错：

```
❌ 数据层模板 {module}_data.cpt 未部署。
请先完成数据层开发（fr-data-dev），验收通过后再触发展示层。
```

---

## 工作流程

### 1. 创建目录

```bash
mkdir -p "$FR_PROJECTS_DIR/{project}/pages"
mkdir -p "$FR_REPORTLETS/{project}/pages"
```

### 2. 按页面类型选择脚手架

根据 `dev_task.json` 中 `pages[].type` 复制对应脚手架：

```bash
# type → 脚手架映射
case "{type}" in
  list)     SCAFFOLD="starter_list.jsx" ;;
  form)     SCAFFOLD="starter_form.jsx" ;;
  detail)   SCAFFOLD="starter_detail.jsx" ;;
  batch)    SCAFFOLD="starter_batch.jsx" ;;
  selector) SCAFFOLD="starter_selector.jsx" ;;
  *)        SCAFFOLD="starter.jsx" ;;        # 未知类型 → 通用骨架
esac

cp "$FR_WORKSPACE/foundation/scaffolds/$SCAFFOLD" \
   "$FR_PROJECTS_DIR/{project}/pages/{page_name}.jsx"
```

### 3. 理解页面类型

| type | 脚手架 | 布局约定 |
|------|--------|----------|
| `list` | starter_list.jsx | 搜索栏(左)+新增按钮(右) → Table → 分页。操作列固定在表格右侧 |
| `form` | starter_form.jsx | Modal弹窗，Form vertical。按钮区底对齐：取消(左)+保存(右) |
| `detail` | starter_detail.jsx | 独立页面，Descriptions bordered。顶部返回按钮，底部编辑/返回居中 |
| `batch` | starter_batch.jsx | 4步向导(选择→预览→写入→结果)，自定义步骤条+进度条+统计卡片 |
| `selector` | starter_selector.jsx | Modal弹窗，搜索栏+Table(rowSelection)+底部固定栏(已选摘要+确定) |
| 其他 | starter.jsx | 通用骨架，无预设布局，开发者根据 page.comment 自行组织 |

> **未知 type 不阻塞**：`type` 已在 schema 中从 `enum` 改为 `string`。新类型不会在 schema 层被拒绝，display-dev 回退到 `starter.jsx` 从零搭建。

### 4. 固定段保护（禁止修改）

`starter.jsx` 中以下代码是固定段，**严禁修改**。这些代码负责隐藏帆软原生页面、动态获取路径、创建 React 挂载点：

```
禁止修改的固定段：
  1. hideStyle CSS 注入块（隐藏 .fr-report, .content-container 等帆软容器）
  2. document.body.setAttribute 行（重置 body 样式）
  3. PATH 对象及其全部方法：
     - PATH.currentDir（当前模板目录）
     - PATH.apiBase（API 基础路径）
     - PATH.getDataTemplate(filename)（获取数据层模板路径）
     - PATH.getTemplatePath(filename)（获取同目录模板路径）
  4. app-root div 创建和挂载逻辑
```

**只能在 `/* ===== DEVELOPER ZONE ===== */` 注释之后编写业务代码。**

### 5. 编写 JSX 业务代码

在 `App` 函数内编写 antd 组件。**JSX 中不需要写 import 语句**，esbuild 的 `--bundle` 会尝试解析 import 但实际运行时走全局变量。

```jsx
function App() {
    // 使用全局变量，不需要 import
    var { Table, Button, Modal, Space, Input, Form } = antd;

    var [data, setData] = React.useState([]);
    var [loading, setLoading] = React.useState(false);
    var [modalVisible, setModalVisible] = React.useState(false);

    // 业务逻辑...
}
```

**注意**：
- **不要做 IIFE 封装**：原始 JSX 直接写顶层代码，esbuild `--format=iife` 会自动添加 IIFE 包装。如果自己再包一层会导致双层 IIFE，运行时报错。
- **参数作用域**：当页面作为 iframe 弹窗被父页面打开时，参数通过 URL query string 传递（如 `?id=1&mode=edit`），子页面用 `new URLSearchParams(window.location.search)` 读取。
- **跨页面状态**：页面间不共享 JS 变量，数据通过 URL 参数或 `/api/data` 接口传递。

### 6. API 调用模式

#### 6.1 /api/data 查询模式（标准 CRUD）

展示层所有数据库操作都走 `/api/data`，调用数据层模板的指定数据集：

```javascript
// 查询列表
function fetchList(params) {
    setLoading(true);
    $.ajax({
        url: PATH.apiBase + '/api/data',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            report_path: PATH.getDataTemplate('{module}_data.cpt'),
            datasource_name: '{module}_qry',
            page_number: -1,   // 固定 -1，禁用帆软分页
            page_size: -1,     // 固定 -1，用 SQL 自己分页
            parameters: [
                { name: 'p_page', type: 'Integer', value: params.page },
                { name: 'p_pagesize', type: 'Integer', value: params.pageSize },
                // ... 其他查询参数
            ]
        }),
        success: function(res) {
            if (typeof res === 'string') res = JSON.parse(res);
            if (res.err_code !== 0) {
                message.error(res.err_msg || '查询失败');
                return;
            }
            setData(res.data);
        },
        error: function(xhr, status, error) {
            message.error('网络错误：' + error);
        },
        complete: function() {
            setLoading(false);
        }
    });
}

// 查询总数（分页用）
function fetchTotal(params) {
    $.ajax({
        url: PATH.apiBase + '/api/data',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            report_path: PATH.getDataTemplate('{module}_data.cpt'),
            datasource_name: '{module}_total',
            page_number: -1,
            page_size: -1,
            parameters: [
                // 不带分页参数，只传筛选条件
            ]
        }),
        success: function(res) {
            if (typeof res === 'string') res = JSON.parse(res);
            if (res.err_code === 0 && res.data.length > 0) {
                setTotal(res.data[0].total);
            }
        }
    });
}
```

**关键约束**：
- `page_number` 和 `page_size` 永远填 `-1`（禁用帆软内部分页）
- 业务分页参数（`p_page`、`p_pagesize`）放在 `parameters` 数组中
- `report_path` 用 `PATH.getDataTemplate()` 构造，不要硬编码绝对路径

#### 6.2 增删改操作（调用存储过程）

数据层的 `insert_*`、`update_*`、`delete_*` 等数据集通过 `/api/data` 调用：

```javascript
// 新增
function handleCreate(values) {
    $.ajax({
        url: PATH.apiBase + '/api/data',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            report_path: PATH.getDataTemplate('{module}_data.cpt'),
            datasource_name: 'insert_{module}',
            page_number: -1,
            page_size: -1,
            parameters: [
                { name: 'p_name', type: 'String', value: values.name },
                { name: 'p_status', type: 'String', value: values.status },
            ]
        }),
        success: function(res) {
            if (typeof res === 'string') res = JSON.parse(res);
            if (res.err_code !== 0) {
                message.error(res.err_msg || '操作失败');
                return;
            }
            message.success('新增成功');
            setModalVisible(false);
            fetchList(currentParams);  // 刷新列表
        }
    });
}

// 删除
function handleDelete(id) {
    Modal.confirm({
        title: '确认删除',
        content: '删除后无法恢复，确定要删除吗？',
        okText: '确认',
        cancelText: '取消',
        onOk: function() {
            $.ajax({
                url: PATH.apiBase + '/api/data',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    report_path: PATH.getDataTemplate('{module}_data.cpt'),
                    datasource_name: '{module}_delete',
                    page_number: -1,
                    page_size: -1,
                    parameters: [
                        { name: 'p_id', type: 'Integer', value: id },
                    ]
                }),
                success: function(res) {
                    if (typeof res === 'string') res = JSON.parse(res);
                    if (res.err_code !== 0) {
                        message.error(res.err_msg || '删除失败');
                        return;
                    }
                    message.success('删除成功');
                    fetchList(currentParams);
                }
            });
        }
    });
}
```

#### 6.3 参数类型映射

`parameters` 中的 `type` 必须与数据层数据集定义的参数类型一致：

| 数据类型 | API 参数 type | 示例 |
|----------|--------------|------|
| VARCHAR | `String` | `{ name: 'p_name', type: 'String', value: '张三' }` |
| INT | `Integer` | `{ name: 'p_id', type: 'Integer', value: 1 }` |
| DECIMAL | `Double` | `{ name: 'p_amount', type: 'Double', value: 100.50 }` |
| DATE/DATETIME | `String` | `{ name: 'p_date', type: 'String', value: '2026-05-13' }` |

### 7. iframe 弹窗通信

当列表页以 Modal + iframe 方式打开表单页（新增/编辑）时，需要父子页面通信。

#### 7.1 父页面（列表页）

打开弹窗：
```javascript
function openForm(record) {
    setModalVisible(true);
    // 通过 URL 参数传递数据给子页面
    var formUrl = PATH.apiBase + '/view/report?viewlet=' +
                  PATH.getTemplatePath('{module}_form.cpt') +
                  '&op=write&id=' + (record ? record.id : '');
    // 设置 iframe src
    setFormUrl(formUrl);
}
```

监听子页面高度变化：
```javascript
window.addEventListener('message', function(e) {
    var data = e.data;
    if (data && data.type === 'fr_iframe_resize') {
        var iframe = document.getElementById('modalFrame');
        if (iframe) {
            var newHeight = Math.max(400, data.height + 40);
            iframe.style.height = newHeight + 'px';
        }
    }
});
```

#### 7.2 子页面（表单页）

通知父页面调整高度，以及在操作成功后通知父页面刷新：

```javascript
function notifyParentHeight() {
    var bodyHeight = document.body.scrollHeight;
    try {
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'fr_iframe_resize',
                height: bodyHeight
            }, '*');
        }
    } catch (e) {}
}

function notifyParentSuccess() {
    try {
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'fr_form_saved'
            }, '*');
        }
    } catch (e) {}
}

// 初始化后通知高度
notifyParentHeight();
window.addEventListener('resize', notifyParentHeight);
```

**高度规范**：
- 禁止设置固定高度（如 `height: 600px`）
- 禁止使用相对高度（如 `height: 85%`，父元素无明确高度时不生效）
- 正确做法：`max-height: 90vh; overflow-y: auto;`

### 8. 工具链：编译 + 注入（禁止手动编辑 CPT）

展示层 CPT 必须通过工具链生成，流程为：**JSX → esbuild 编译 → display_writer.py 注入骨架 → 质量门 → 落盘**。

```bash
python3 "$FR_WORKSPACE/scripts/display/display_writer.py" \
  --jsx "$FR_PROJECTS_DIR/{project}/pages/{page_name}.jsx" \
  --output "$FR_PROJECTS_DIR/{project}/pages/{page_name}.cpt"
```

工具链自动完成：
1. `esbuild` 编译 JSX → MJS（`--format=iife --charset=utf8 --jsx=transform`）
2. 去除注释（保留字符串字面量）
3. `React.useState` / `antd.useState` 解构转两步赋值（帆软预览环境兼容）
4. `node --check` 语法检查
5. 注入 `base_cpt_page.cpt` 骨架，包 CDATA
6. `display_checker.py` 质量门（JS 路径解析 / Unicode 转义 / XML 格式）
7. 原子落盘

**如果工具链报错（非零 exit）** → **停止**。不要尝试手动修改 CPT XML，不要绕过 display_writer.py。将错误信息反馈给用户。

### 9. 部署到帆软

```bash
cp "$FR_PROJECTS_DIR/{project}/pages/{page_name}.cpt" \
   "$FR_REPORTLETS/{project}/pages/"
```

### 10. 页面预览验证

使用 Playwright 打开浏览器验证页面：

```
预览地址:
http://localhost:18080/webroot/decision/view/report?op=write&reportlet={project}/pages/{page_name}.cpt
```

> **必须带 `op=write`**，否则 `afterload` 事件不触发，页面空白。

**开发阶段加时间戳避免缓存**：
```
&t={Date.now()}
```

---

## 开发自测（必须逐页验证）

**每个页面都必须逐项验证，不可跳过。**

| # | 检查项 | 标准 | 结果 |
|---|--------|------|------|
| 1 | 页面加载 | 无 JS 报错（Console 无 error） | |
| 2 | 帆软框架已隐藏 | 不显示原始参数面板、工具栏 | |
| 3 | 列表数据加载 | 调用 `/api/data` 返回数据并正确渲染到 Table | |
| 4 | 分页功能 | 切换页码/每页条数，数据正确刷新 | |
| 5 | 搜索功能 | 输入条件点击搜索，列表按条件过滤 | |
| 6 | 新增弹窗 | 点击新增打开空表单，各字段可输入 | |
| 7 | 编辑弹窗 | 点击编辑打开表单，数据正确回填 | |
| 8 | 表单验证 | 必填项为空时提交，显示错误提示 | |
| 9 | 提交成功 | 提交后弹窗关闭，列表自动刷新 | |
| 10 | 删除确认 | 点击删除弹出确认框，确认后成功删除并刷新 | |
| 11 | 弹窗高度 | iframe 弹窗内容完整显示，无截断或大量空白 | |
| 12 | 网络错误处理 | 接口异常时显示错误提示，不崩溃 | |
| 13 | 权限控制（如适用） | 不同角色看到不同数据、不同按钮 | |

**验证方式**：
1. 用 Playwright 打开页面，通过 `browser_console_messages` 检查是否有 error
2. 模拟用户操作，逐项走通完整业务流程
3. 建议录制 Playwright 脚本，便于回归测试

```bash
# 录制用户操作（首次）
npx playwright codegen "http://localhost:18080/webroot/decision/view/report?op=write&reportlet={project}/pages/{page_name}.cpt"

# 将录制结果整理为可复用的验证脚本
# 写入 $FR_PROJECTS_DIR/{project}/test/page_verify.spec.js
```

---

## 验收标准

全部通过才能交付：

| 检查项 | 标准 |
|--------|------|
| 工具链生成 | `display_writer.py` exit 0 |
| 质量门 | `display_checker.py` 无 FAIL |
| CPT 已部署 | 文件存在于 `$FR_REPORTLETS/{project}/pages/` |
| 页面可访问 | 浏览器打开不报错，内容正常渲染 |
| 数据调通 | 查询/新增/编辑/删除全流程通过 |
| 固定段完整 | hideStyle、PATH、app-root 未被修改 |
| 页面齐全 | dev_task.json 中**每个** page 都验证通过 |

**任何一条失败 = 展示层验收不通过。** 定位问题、修复、重新验证。不要跳过。

---

## 触发展示层自测完成

全部验收通过后，如果 QA 技能就绪，可触发测试工程师：

```javascript
Skill({ skill: "fr-qa", args: "--project {project}" })
```

---

## 错误处理原则

| 场景 | 处理方式 |
|------|----------|
| `dev_task.json` 缺少 `pages[]` 或为空 | **停止**，报告缺失项 |
| 数据层 CPT 未部署 | **停止**，提示先完成数据层开发 |
| `display_writer.py` 报错 | **停止**，反馈错误信息。不要手动编辑 CPT |
| esbuild 编译失败 | **停止**，检查 JSX 语法错误 |
| 质量门不通过 | **停止**，根据 FAIL 条目修复后重新运行 |
| 页面加载 JS 报错 | **停止**，定位原因（语法错误？全局变量引用错误？）修复后重验 |
| `/api/data` 返回 err_code 非 0 | **停止**，检查 datasource_name 和 parameters 是否与数据层一致 |
| 帆软服务不可达 | **停止**，提醒启动设计器 |

**核心原则：遇到问题停下来，不要绕过。**

---

## 禁止行为

| 禁止 | 原因 |
|------|------|
| ❌ 手动编辑 CPT XML | 必须通过 display_writer.py，质量门才生效 |
| ❌ 修改固定段（hideStyle/PATH/app-root） | 帆软框架隔离和路径解析依赖这些代码 |
| ❌ 在 JSX 中写 import 语句 | 实际运行时走全局变量，esbuild bundle 会报模块找不到 |
| ❌ 在 JSX 中做 IIFE 封装 | esbuild `--format=iife` 自动添加，双层 IIFE 导致报错 |
| ❌ 硬编码绝对路径 | 用 `PATH` 对象的方法动态获取 |
| ❌ 跳过页面验证 | 前端 bug 影响用户直接可见 |
| ❌ 推测 dev_task.json 中未定义的参数或行为 | 子 Agent 只能基于文件合约工作 |
| ❌ 修改技能包内文件 | 基础设施只读 |

---

## 按需读取

| 文件 | 何时读 | 内容 |
|------|--------|------|
| `shared/KNOWLEDGE/ANTD_REACT_GUIDE.md` | 开工必读 | antd 5.x + React 18 组件速查（Table/Form/Modal/Select 等） |
| `shared/KNOWLEDGE/JS_SAFETY.md` | 开工必读 | XSS 防护、innerHTML 风险、JSON 安全解析 |
| `shared/KNOWLEDGE/ASSETS.md` | 场景路由时 | 附件管理、API代理等公共组件，命中时直接引用无需开发 |
| `shared/KNOWLEDGE/ARCHITECTURE.md` | 需要 API 细节时 | `/api/data` 格式、PATH 对象详解、iframe 通信、页面引导 |
| `shared/KNOWLEDGE/FINEREPORT_ENV.md` | 环境异常时 | 帆软环境故障排查 |
