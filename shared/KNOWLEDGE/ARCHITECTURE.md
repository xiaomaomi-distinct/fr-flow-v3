# 帆软加壳前端方案架构

> 版本：3.1
> 更新时间：2026-04-09

## 一、核心理念

**保留帆软后端能力，替换帆软前端开发**

| 保留 | 替换 |
|------|------|
| 数据连接（JDBC） | 设计器拖拽 |
| 用户体系/权限 | 帆软控件 |
| 填报机制 | 参数面板 |
| 数据集/存储过程 | 帆软样式系统 |
| JSON数据集插件 | |

**目标**：大模型可直接接手前端开发工作，无需操作帆软设计器。

---

## 二、整体架构

```
┌─────────────────────────────────────────────────────────────┐
│  前端展示模板                                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  afterload 事件                                      │   │
│  │  - 渲染原生 HTML/JS（Ant Design 风格）               │   │
│  │  - AJAX 调用帆软标准接口                             │   │
│  │  - 大模型可直接生成                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
┌───────────────────────────┐         ┌───────────────────────────┐
│  /api/data                │         │  /api/report              │
│  数据JSON服务API           │         │  报表JSON服务API           │
│                           │         │                           │
│  调用数据集，返回数组       │         │  调用单元格，返回单值       │
└───────────────────────────┘         └───────────────────────────┘
        │                                           │
        ▼                                           ▼
┌───────────────────────────┐         ┌───────────────────────────┐
│  专用数据层模板             │         │  通用代理模板              │
│  *_data.cpt               │         │  api_agent.cpt            │
│                           │         │                           │
│  数据集类型：              │         │  数据集类型：              │
│  - DBTableData（SQL）     │         │  - JSONScriptTableData    │
│  - 存储过程调用            │         │  - merge封装完整响应       │
│  - 全部数据库操作          │         │                           │
└───────────────────────────┘         └───────────────────────────┘
        │                                           │
        ▼                                           ▼
┌───────────────────────────┐         ┌───────────────────────────┐
│  数据库                    │         │  外部API                   │
│                           │         │                           │
│  - 查询列表                │         │  - 明道云API               │
│  - 查询字典                │         │  - 第三方接口              │
│  - 新增/编辑/删除          │         │  - Webhook                │
│  - 批量导入                │         │                           │
└───────────────────────────┘         └───────────────────────────┘
```

---

## 三、接口分工（核心约定）

### 3.1 分工原则

| 接口 | 模板 | 适用场景 |
|------|------|----------|
| `/api/data` | 专用数据层模板 `*_data.cpt` | **全部数据库操作** |
| `/api/report` | 通用代理模板 `api_agent.cpt` | **全部外部API** |

### 3.2 详细说明

**`/api/data` → 专用数据层模板**：
- 查询（列表、字典、统计）
- 单条增删改
- 批量导入
- 存储过程调用

**`/api/report` → 通用代理模板**：
- 外部API调用
- Webhook
- 第三方服务集成

---

## 四、模板类型

| 模板类型 | 命名规范 | 数据集 | 调用接口 | 数量 |
|----------|----------|--------|----------|------|
| 专用数据层 | `*_data.cpt` | SQL/存储过程 | `/api/data` | **每模块1个** |
| 通用代理 | `api_agent.cpt` | JSON程序数据集 | `/api/report` | **全局1个** |
| 展示模板 | `*_list.cpt` / `*_form.cpt` | 无 | 调用上述接口 | 按需 |
| 公共组件 | 参见 ASSETS.md | 按组件而定 | 直接引用 | **全局** |

> **公共组件**：附件管理、API 代理等通用能力已内置为独立模板，业务开发无需重复建设。详见 `shared/KNOWLEDGE/ASSETS.md`。

### 4.1 专用数据层模板 vs 通用代理

| 对比项 | 专用数据层 `*_data.cpt` | 通用代理 `api_agent.cpt` |
|--------|------------------------|-------------------------|
| 数据源 | 数据库 | 外部HTTP接口 |
| 数据集类型 | DBTableData | JSONScriptTableData |
| 参数风格 | 具名参数 `p_asset_no` | URL + Body |
| 业务逻辑 | 可嵌入SQL/存储过程 | 无，纯转发 |
| 适用场景 | 数据库CRUD | 外部API调用 |

### 4.2 为什么数据库操作用专用模板？

1. **参数可读性**：`p_asset_no` 比 JSON数组更直观
2. **业务逻辑**：增删改往往有校验、状态转换等逻辑
3. **维护简单**：一个模块一个文件，改数据层只改一处
4. **大模型友好**：具名参数更易理解和生成

---

## 五、目录结构

```
reportlets/
├── api/                          # 公共模板（全局唯一）
│   └── api_agent.cpt             # 外部API代理
│
└── {项目名}/{模块名}/             # 业务模块
    ├── data/                     # 数据层模板目录
    │   └── {模块名}_data.cpt     # 数据层（唯一，含全部数据库操作）
    │
    └── pages/                    # 展示层模板目录
        ├── {模块名}_list.cpt     # 列表页（挂菜单入口）
        ├── {模块名}_form.cpt     # 表单弹窗（新增/编辑）
        ├── {模块名}_selector.cpt # 选择器弹窗（可选）
        └── {模块名}_batch.cpt    # 批量导入页（可选）
```

**目录拆分优势**：
- 数据层和展示层分离，挂菜单时一目了然
- 只需挂载 `pages/` 目录下的模板

### 示例：设备借用模块

```
reportlets/
├── api/
│   └── api_agent.cpt
│
└── jiangcheng/borrow/
    ├── data/
    │   └── borrow_data.cpt       # 数据层（查询+增删改+批量导入）
    │
    └── pages/
        ├── borrow_list.cpt       # 列表页（挂菜单）
        ├── borrow_apply.cpt      # 借用申请弹窗
        ├── borrow_return.cpt     # 归还操作弹窗
        ├── equipment_form.cpt    # 设备表单弹窗
        ├── equipment_selector.cpt# 设备选择器
        ├── equipment_batch.cpt   # 批量导入页
        └── api_scheduler.cpt     # API调度中心（示例）
```

---

## 六、专用数据层模板设计

### 6.1 模板结构

一个模块一个数据层模板，包含该模块所有数据库操作：

```
{模块名}_data.cpt
├── 查询类数据集
│   ├── xxx_qry           # 列表查询
│   ├── xxx_total         # 总数统计
│   ├── xxx_stats         # 统计数据
│   ├── xxx_by_id         # 单条查询
│   └── dict_xxx          # 字典查询
│
├── 写入类数据集（调用存储过程）
│   ├── insert_xxx        # 新增
│   ├── update_xxx        # 更新
│   └── sp_delete         # 删除（通用）
│
└── 批量导入数据集
    ├── batch_insert      # 写入临时表
    ├── validate          # 校验数据
    ├── commit            # 提交到业务表
    ├── errors            # 错误记录
    └── stats             # 导入统计
```

### 6.2 数据集配置示例

**查询类**：
```xml
<TableData name="equipment_qry" class="com.fr.data.impl.DBTableData">
  <Parameters>
    <Parameter><Attributes name="p_page"/></Parameter>
    <Parameter><Attributes name="p_pagesize"/></Parameter>
    <Parameter><Attributes name="p_status"/></Parameter>
  </Parameters>
  <Connection class="com.fr.data.impl.NameDatabaseConnection">
    <DatabaseName><![CDATA[common_db]]></DatabaseName>
  </Connection>
  <Query><![CDATA[
    SELECT * FROM equipment
    WHERE 1=1
    ${if(len(p_status) == 0, "", "AND status = '" + p_status + "'")}
    ORDER BY id DESC
    LIMIT ${(p_page - 1) * p_pagesize}, ${p_pagesize}
  ]]></Query>
</TableData>
```

**写入类（调用存储过程）**：
```xml
<TableData name="insert_equipment" class="com.fr.data.impl.DBTableData">
  <Parameters>
    <Parameter><Attributes name="p_asset_no"/></Parameter>
    <Parameter><Attributes name="p_name"/></Parameter>
    ...
  </Parameters>
  <Connection class="com.fr.data.impl.NameDatabaseConnection">
    <DatabaseName><![CDATA[common_db]]></DatabaseName>
  </Connection>
  <Query><![CDATA[
    CALL sp_insert_equipment('${p_asset_no}', '${p_name}', ...)
  ]]></Query>
</TableData>
```

---

## 七、通用代理模板设计

### 7.1 api_agent.cpt

**用途**：调用外部HTTP接口

**参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| p_url | String | 目标API地址 |
| p_body | String | 请求体（JSON字符串） |

**数据集类型**：JSON程序数据集（JSONScriptTableData）

**配置要点**：

1. **数据连接配置**（帆软内置数据库 finedb）：
   - host: `${p_url}`
   - postRAWParameter: `${p_body}`
   - requestType: 2（POST请求）

2. **模板配置**：
   ```xml
   <TableData name="api" class="com.fr.plugin.db.json.core.JSONScriptTableData">
     <Parameters>
       <Parameter><Attributes name="p_url"/>
         <O t="XMLable" class="com.fr.base.Formula">
           <Attributes><![CDATA[=$p_url]]></Attributes>
         </O>
       </Parameter>
       <Parameter><Attributes name="p_body"/>
         <O t="XMLable" class="com.fr.base.Formula">
           <Attributes><![CDATA[=$p_body]]></Attributes>
         </O>
       </Parameter>
     </Parameters>
     <Connection class="com.fr.data.impl.NameDatabaseConnection">
       <DatabaseName><![CDATA[api_agent]]></DatabaseName>
     </Connection>
     <ScriptText><![CDATA[return merge([[JSON.stringify($)]], ["aaa"]);]]></ScriptText>
   </TableData>
   ```

3. **单元格绑定**：A1单元格绑定数据集列 `aaa`

**merge公式说明**：
- `$` 代表外部API的原始JSON响应
- `JSON.stringify($)` 将响应转为字符串
- `merge([[...]], ["aaa"])` 将字符串封装到名为 `aaa` 的列中
- 前端解析 `res.data[0].A1` 即可获得外部API原始响应

---

## 八、路径动态获取

**问题**：硬编码路径无法适应目录迁移和不同部署环境。

**解决方案**：利用帆软全局参数动态获取路径。

### 8.1 核心参数

| 参数 | 获取方式 | 示例值 |
|------|----------|--------|
| `reportName` | `FR.remoteEvaluate("=reportName")` | `jiangcheng/borrow/pages/borrow_list.cpt` |
| `servletURL` | `FR.remoteEvaluate("=servletURL")` | `/webroot/decision/view/report` |

### 8.2 展示页必须隐藏帆软框架

所有展示页（列表页、表单页、导入页）都使用 `innerHTML` 替换整个 body，必须先隐藏帆软框架：

```javascript
(function() {
    'use strict';
    
    // ⚠️ 展示页第一行必须添加（隐藏帆软框架）
    var hideStyle = document.createElement('style');
    hideStyle.innerHTML = '.fr-report{display:none!important}.content-container{height:auto!important}body{overflow:auto!important}';
    document.head.appendChild(hideStyle);
    
    // 然后定义 PATH 对象...
})();
```

**统一渲染方式**：所有页面类型都使用相同的隐藏和渲染方式

| 页面类型 | 渲染方式 | 隐藏方式 |
|----------|----------|----------|
| 列表页 | `innerHTML` | `display:none!important` |
| 表单页 | `innerHTML` | `display:none!important` |
| 导入页 | `innerHTML` | `display:none!important` |

### 8.3 PATH配置对象

每个展示模板开头定义：

```javascript
var PATH = {
    // 当前模板目录
    currentDir: (function() {
        var name = FR.remoteEvaluate("=reportName");
        return name.substring(0, name.lastIndexOf('/') + 1);
    })(),

    // API基础路径
    apiBase: (function() {
        var servletURL = FR.remoteEvaluate("=servletURL");
        var parts = servletURL.split('/');
        return '/' + parts[1] + '/' + parts[2];
    })(),

    // 数据层模板路径
    getDataTemplate: function(filename) {
        return this.currentDir.replace('/pages/', '/data/') + filename;
    },

    // 同目录模板路径
    getTemplatePath: function(filename) {
        return this.currentDir + filename;
    }
};
```

### 8.4 使用示例

```javascript
// API调用
$.ajax({
    url: PATH.apiBase + '/api/data',
    data: JSON.stringify({
        report_path: PATH.getDataTemplate('borrow_data.cpt'),
        ...
    })
});

// 弹窗iframe
var url = PATH.apiBase + '/view/report?viewlet=' +
          PATH.getTemplatePath('equipment_form.cpt') + '&op=write';
```

### 8.5 优势

| 场景 | 优势 |
|------|------|
| 目录迁移 | 整个模块目录移动后，JS无需修改 |
| 不同部署环境 | 适配 `/webroot/decision`、`/demo/fr` 等不同路径 |
| 团队协作 | 模板间调用不依赖绝对路径 |

### 8.6 相对路径 vs 绝对路径

| 方式 | 示例 | 适用场景 |
|------|------|----------|
| 相对路径 | `PATH.getDataTemplate('borrow_data.cpt')` | **推荐**，模块内部调用 |
| 绝对路径 | `'api/api_agent.cpt'` | 公共模板，从reportlets根目录开始 |

**说明**：
- 展示层模板（pages/）调用数据层模板（data/）：使用 `PATH.getDataTemplate()`
- 所有模板调用公共代理（api/api_agent.cpt）：使用绝对路径
- 弹窗模板调用同目录模板：使用 `PATH.getTemplatePath()`

### 8.7 弹窗高度动态调整

弹窗内容高度不固定（表单内容、选择器数据量不同），需要子页面通知父页面动态调整iframe高度。

#### 原理

```
子页面内容 → postMessage → 父页面 → 调整iframe高度
```

#### 父页面（列表页）- 必须实现

**CSS**：
```css
.ad-modal-body iframe {
    width: 100%;
    height: 500px;        /* 默认高度 */
    min-height: 400px;    /* 最小高度 */
    border: none;
    transition: height .2s;
}
```

**JS - 监听消息**：
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

#### 子页面（表单/选择器）- 必须实现

**JS - 通知函数**：
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

// init() 之后调用
init();
notifyParentHeight();
document.addEventListener('DOMContentLoaded', notifyParentHeight);
window.addEventListener('resize', notifyParentHeight);
```

#### 高度规范

| 禁止 | 原因 |
|------|------|
| ❌ `.modal { height: 600px; }` | 固定高度，内容溢出被截断 |
| ❌ `.modal { height: 85%; }` | 相对高度，父元素无明确高度时不生效 |
| ✅ `.modal { max-height: 90vh; overflow-y: auto; }` | 最大高度限制，超出可滚动 |

---

## 九、接口调用格式

### 9.1 /api/data 数据JSON服务API

**请求格式**：
```json
{
    "report_path": "jiangcheng/borrow/data/borrow_data.cpt",
    "datasource_name": "equipment_qry",
    "page_number": -1,
    "page_size": -1,
    "parameters": [
        { "name": "p_page", "type": "Integer", "value": 1 },
        { "name": "p_pagesize", "type": "Integer", "value": 10 }
    ]
}
```

> **⚠️ 分页参数说明（常见错误）**
>
> - `page_number` 和 `page_size` 是 **帆软的内部分页控制**，设为 `-1` 表示**禁用帆软分页**，由我们自己在 SQL 中控制分页
> - **业务分页参数**（如 `p_page`、`p_pagesize`）必须放在 `parameters` 数组中传递，不能放在 body 顶层
> - 帆软会自动将 `parameters` 中的参数绑定到数据集的对应参数上

**示例：正确的分页用法**

前端请求（帆软分页禁用）：
```json
{
    "report_path": "employee/data/employee_data.cpt",
    "datasource_name": "employee_qry",
    "page_number": -1,
    "page_size": -1,
    "parameters": [
        { "name": "p_page", "type": "Integer", "value": 1 },
        { "name": "p_pagesize", "type": "Integer", "value": 10 }
    ]
}
```

数据集 SQL（自己控制分页）：
```sql
SELECT * FROM employee
WHERE 1=1
ORDER BY id DESC
LIMIT ${(p_page - 1) * p_pagesize}, ${p_pagesize}
```

**错误示例：把分页参数放在 body 顶层**
```json
{
    "report_path": "...",
    "datasource_name": "employee_qry",
    "page_number": 1,        <!-- 错误：这是帆软分页，不是业务分页 -->
    "page_size": 10,         <!-- 错误：会和 SQL 中的 LIMIT 冲突 -->
    "parameters": []
}
```

**响应格式**：
```json
{
    "err_code": 0,
    "err_msg": "",
    "data": [
        { "id": "1", "asset_no": "EQ001", "name": "笔记本" }
    ]
}
```

**异常处理**：

| err_code | 含义 | 处理方式 |
|----------|------|----------|
| 0 | 成功 | 正常处理data字段 |
| 非0 | 失败 | 显示err_msg或提示用户重试 |

```javascript
// 异常处理示例
$.ajax({
    url: PATH.apiBase + '/api/data',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({...}),
    success: function(res) {
        // 处理字符串响应（未指定dataType时）
        if (typeof res === 'string') {
            res = JSON.parse(res);
        }

        if (res.err_code !== 0) {
            alert('查询失败：' + res.err_msg);
            return;
        }

        // 正常处理
        renderTable(res.data);
    },
    error: function(xhr, status, error) {
        alert('网络错误：' + error);
    }
});
```

### 9.2 /api/report 报表JSON服务API

**请求格式**：
```json
{
    "report_path": "api/api_agent.cpt",
    "start_page": 1,
    "end_page": 1,
    "parameters": [
        { "name": "p_url", "type": "String", "value": "http://external/api" },
        { "name": "p_body", "type": "String", "value": "{\"foo\":\"bar\"}" }
    ]
}
```

**响应格式**：
```json
{
    "err_code": 0,
    "err_msg": "",
    "data": [
        { "A1": "{\"success\":true,\"data\":{...}}" }
    ]
}
```

**异常处理**（三层异常）：

| 层级 | 异常来源 | 表现 | 处理方式 |
|------|----------|------|----------|
| 帆软层 | 模板不存在、参数错误 | err_code非0 | 显示err_msg |
| 代理层 | 数据连接失败、merge执行错误 | A1包含错误信息 | 解析A1判断 |
| 外部API层 | HTTP错误、超时、业务错误 | A1包含外部API响应 | 解析并判断success字段 |

```javascript
// 完整异常处理示例
function callExternalApi(url, body) {
    return new Promise(function(resolve, reject) {
        $.ajax({
            url: PATH.apiBase + '/api/report',
            type: 'POST',
            contentType: 'application/json',
            timeout: 30000,  // 30秒超时
            data: JSON.stringify({
                report_path: 'api/api_agent.cpt',
                start_page: 1,
                end_page: 1,
                parameters: [
                    { name: 'p_url', type: 'String', value: url },
                    { name: 'p_body', type: 'String', value: JSON.stringify(body) }
                ]
            }),
            success: function(res) {
                // 第一层：帆软层异常
                if (typeof res === 'string') {
                    try {
                        res = JSON.parse(res);
                    } catch (e) {
                        reject({ layer: '帆软层', error: '响应解析失败' });
                        return;
                    }
                }

                if (res.err_code !== 0) {
                    reject({ layer: '帆软层', error: res.err_msg });
                    return;
                }

                // 第二层：代理层异常
                var rawResponse = res.data[0].A1;
                if (!rawResponse) {
                    reject({ layer: '代理层', error: '代理模板返回空响应' });
                    return;
                }

                // 第三层：外部API异常
                try {
                    var apiResult = typeof rawResponse === 'string'
                        ? JSON.parse(rawResponse)
                        : rawResponse;

                    if (apiResult.success === false) {
                        reject({ layer: '外部API', error: apiResult.message, code: apiResult.code });
                        return;
                    }

                    resolve(apiResult);
                } catch (e) {
                    reject({ layer: '外部API', error: '响应解析失败', raw: rawResponse });
                }
            },
            error: function(xhr, status, error) {
                if (status === 'timeout') {
                    reject({ layer: '网络层', error: '请求超时' });
                } else {
                    reject({ layer: '网络层', error: error });
                }
            }
        });
    });
}

// 调用示例
callExternalApi('http://api.example.com/data', { action: 'query' })
    .then(function(result) {
        console.log('成功', result);
    })
    .catch(function(err) {
        console.error('[' + err.layer + ']', err.error);
        alert('操作失败：' + err.error);
    });
```

---

## 十、存储过程设计规范

### 10.1 返回格式

所有写入类存储过程统一返回JSON：

```sql
SELECT JSON_OBJECT(
    'success', TRUE,
    'message', '操作成功',
    'id', v_new_id
) as result;
```

### 10.2 命名规范

| 类型 | 命名 | 示例 |
|------|------|------|
| 新增 | `sp_insert_{表名}` | `sp_insert_equipment` |
| 更新 | `sp_update_{表名}` | `sp_update_equipment` |
| 删除 | `sp_delete` | `sp_delete`（通用，表名作为参数） |
| 批量导入 | `sp_batch_import` | `sp_batch_import`（通用） |
| 业务操作 | `sp_{动词}_{名词}` | `sp_borrow_equipment` |

---

## 十一、参数类型映射

| 数据库类型 | API参数类型 |
|-----------|------------|
| VARCHAR | String |
| INT | Integer |
| BIGINT | Integer |
| DECIMAL | Double |
| DATE | String (YYYY-MM-DD) |
| DATETIME | String (YYYY-MM-DD HH:mm:ss) |

---

## 十二、调度示例

### 12.1 API调度中心

**模板位置**：`jiangcheng/borrow/pages/api_scheduler.cpt`

**功能**：
- 接口列表展示
- 请求配置（URL、Method、Headers、Body）
- 响应结果展示（状态码、响应时间、响应内容）
- 请求日志记录

**用途**：作为调用外部API的参考案例，展示完整的异常处理流程。

### 12.2 核心代码片段

```javascript
// 调用外部API（通过代理模板）
function callExternalApi(url, body) {
    return new Promise(function(resolve) {
        $.ajax({
            url: PATH.apiBase + '/api/report',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                report_path: 'api/api_agent.cpt',
                start_page: 1,
                end_page: 1,
                parameters: [
                    { name: 'p_url', type: 'String', value: url },
                    { name: 'p_body', type: 'String', value: body ? JSON.stringify(body) : '{}' }
                ]
            }),
            success: function(res) {
                resolve(parseProxyResponse(res));
            }
        });
    });
}

// 解析代理响应
function parseProxyResponse(res) {
    if (typeof res === 'string') {
        res = JSON.parse(res);
    }

    if (res.err_code !== 0) {
        return { success: false, error: res.err_msg };
    }

    var rawResponse = res.data[0].A1;
    var parsed = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;

    return {
        success: parsed.success !== false,
        data: parsed.data,
        message: parsed.message
    };
}
```

---

## 十二、页面引导功能

### 12.1 概述

对于复杂功能页面，提供交互式引导帮助用户快速上手。引导功能基于 Driver.js 实现，支持分步骤高亮元素并显示说明。

### 12.2 设计原则

1. **手动触发 + 首次提示**：不自动全屏启动引导，避免打断用户操作
2. **用户状态持久化**：引导状态存储在数据库，跨设备一致
3. **按功能ID管理**：每个功能模块独立ID，便于扩展
4. **本地资源依赖**：内网环境，所有资源下载到本地

### 12.3 目录结构

```
reportlets/
├── common/
│   ├── data/
│   │   └── common_data.cpt     # 公共数据层（用户偏好）
│   └── lib/
│       └── driver/             # Driver.js 本地资源
│           ├── driver.min.js
│           └── driver.min.css

webapps/webroot/help/lib/driver/  # 静态资源访问路径
```

### 12.4 数据库设计

**用户偏好表**：
```sql
CREATE TABLE user_preference (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL COMMENT '用户ID',
    pref_key VARCHAR(100) NOT NULL COMMENT '偏好键',
    pref_value VARCHAR(500) COMMENT '偏好值',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_pref (user_id, pref_key)
);
```

**功能ID命名规范**：`guide_{模块}_{页面}`

| 页面 | 功能ID |
|------|--------|
| borrow_list.cpt | `guide_borrow_list` |
| borrow_apply.cpt | `guide_borrow_apply` |
| equipment_form.cpt | `guide_equipment_form` |

### 12.5 公共数据层模板

**路径**：`common/data/common_data.cpt`

| 数据集 | 功能 | 参数 |
|--------|------|------|
| user_pref_get | 获取用户偏好 | p_user_id, p_key |
| user_pref_set | 设置用户偏好 | p_user_id, p_key, p_value |
| user_pref_delete | 删除用户偏好 | p_user_id, p_key |

### 12.6 前端调用流程

```javascript
// 1. 检查引导状态
function checkGuideStatus(guideId, callback) {
    $.ajax({
        url: PATH.apiBase + '/api/data',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            report_path: 'common/data/common_data.cpt',
            datasource_name: 'user_pref_get',
            page_number: -1,
            page_size: -1,
            parameters: [
                { name: 'p_user_id', type: 'String', value: currentUserId },
                { name: 'p_key', type: 'String', value: guideId }
            ]
        }),
        success: function(res) {
            var data = typeof res === 'string' ? JSON.parse(res) : res;
            var shown = data.data && data.data.length > 0;
            callback(shown);
        }
    });
}

// 2. 标记引导已读
function markGuideRead(guideId) {
    $.ajax({
        url: PATH.apiBase + '/api/data',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            report_path: 'common/data/common_data.cpt',
            datasource_name: 'user_pref_set',
            page_number: -1,
            page_size: -1,
            parameters: [
                { name: 'p_user_id', type: 'String', value: currentUserId },
                { name: 'p_key', type: 'String', value: guideId },
                { name: 'p_value', type: 'String', value: 'true' }
            ]
        })
    });
}

// 3. 启动引导
function startGuide() {
    // Driver.js 新版本 API: window.driver.js.driver()
    var driverApi = window.driver && window.driver.js && window.driver.js.driver;
    if (typeof driverApi !== 'function') {
        console.error('引导组件未加载或版本不兼容');
        return;
    }

    var driver = driverApi({
        animate: true,
        showProgress: true,
        progressText: '{{current}} / {{total}}',
        nextBtnText: '下一步',
        prevBtnText: '上一步',
        doneBtnText: '完成',
        steps: [
            { element: '#element1', popover: { title: '标题', description: '说明', side: 'bottom' } },
            // ... 更多步骤
        ]
    });

    driver.drive();

    // 引导完成后标记已读（监听事件）
    var checkInterval = setInterval(function() {
        if (!document.querySelector('.driver-active-element')) {
            clearInterval(checkInterval);
            markGuideRead('guide_borrow_list');
        }
    }, 500);
}
```

### 12.7 资源加载

**本地资源路径**：
```javascript
var libBase = '/webroot/help/lib/driver/';

// 加载CSS
function loadCSS(href) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

// 加载JS
function loadScript(src, callback) {
    var script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    document.head.appendChild(script);
}

// 使用
loadCSS(libBase + 'driver.min.css');
loadScript(libBase + 'driver.min.js', function() {
    // Driver.js 加载完成，可以启动引导
});
```

### 12.8 首次提示气泡

当用户首次访问页面时，显示一个小气泡提示，引导用户点击查看功能介绍：

```javascript
function showGuideBubble(guideId) {
    var bubble = document.createElement('div');
    bubble.id = 'guideBubble';
    bubble.innerHTML = '新功能！点击查看操作引导 →';
    bubble.style.cssText = 'position:fixed;top:60px;right:16px;background:#1677ff;color:#fff;padding:8px 16px;border-radius:6px;font-size:13px;cursor:pointer;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,.15);';
    bubble.onclick = function() {
        document.body.removeChild(bubble);
        startGuide();
    };
    document.body.appendChild(bubble);
}
```

### 12.9 样式规范

引导按钮应与页面整体风格一致（Ant Design）：

```css
.ad-guide-btn {
    padding: 4px 15px;
    height: 32px;
    font-size: 14px;
    border-radius: 6px;
    border: 1px solid #d9d9d9;
    background: #fff;
    color: rgba(0,0,0,.88);
    cursor: pointer;
}
.ad-guide-btn:hover {
    color: #1677ff;
    border-color: #1677ff;
}
```

---

## 十三、关键注意事项

1. **URL必须带 `op=write`**：所有展示模板访问时必须带 `&op=write` 参数，否则 `afterload` 事件不执行

2. **`/api/data` 与 `/api/report` 区别**：
   - `/api/data` → 数据库操作 → 专用数据层模板
   - `/api/report` → 外部API → 通用代理模板

3. **帆软缓存问题**：开发阶段 URL 可添加时间戳参数 `&t=` + `Date.now()` 避免缓存

4. **存储过程必须返回JSON**：便于前端统一处理响应

5. **展示层模板说明标注**：在单元格添加功能说明，便于设计器中识别模板用途

---

## 十四、附录

### 14.1 示例项目文件清单

| 类型 | 路径 | 说明 |
|------|------|------|
| 公共模板 | `api/api_agent.cpt` | 外部API代理 |
| 公共数据层 | `common/data/common_data.cpt` | 用户偏好管理 |
| 数据层 | `jiangcheng/borrow/data/borrow_data.cpt` | 数据操作模板 |
| 展示层 | `jiangcheng/borrow/pages/borrow_list.cpt` | 借用管理列表 |
| | `jiangcheng/borrow/pages/borrow_apply.cpt` | 借用申请弹窗 |
| | `jiangcheng/borrow/pages/borrow_return.cpt` | 设备归还弹窗 |
| | `jiangcheng/borrow/pages/equipment_form.cpt` | 设备表单弹窗 |
| | `jiangcheng/borrow/pages/equipment_selector.cpt` | 设备选择器弹窗 |
| | `jiangcheng/borrow/pages/equipment_batch.cpt` | 批量导入页面 |
| | `jiangcheng/borrow/pages/api_scheduler.cpt` | API调度中心 |

### 14.2 SQL脚本清单

| 脚本 | 说明 |
|------|------|
| sp_insert.sql | 通用插入 |
| sp_update.sql | 通用更新 |
| sp_delete.sql | 通用删除 |
| sp_insert_equipment.sql | 设备新增 |
| sp_update_equipment.sql | 设备更新 |
| sp_borrow_equipment.sql | 借用申请 |
| sp_return_borrow.sql | 归还设备 |
| sp_batch_import.sql | 批量写入临时表 |
| sp_equipment_import_validate.sql | 导入校验 |
| sp_equipment_import_commit.sql | 导入提交 |
| user_preference.sql | 用户偏好表 |
