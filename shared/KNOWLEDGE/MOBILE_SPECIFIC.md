# 移动端开发专属约定

> 本文档列出移动端开发中**与 PC 不同**的关键约束和实现要点。配合 [ANTD_MOBILE_GUIDE.md](./ANTD_MOBILE_GUIDE.md) 使用。
>
> 内容基于阶段 1 探针实测：企微 PC 端 Chrome 126、Android 企微 Chrome 138 / XWEB、iOS 企微 WebKit 605。

---

## 一、不同平台的 webview 差异

### 1.1 iOS / Android webview 三巨头对比

| 项 | PC 企微 | Android 企微 | iOS 企微 |
|---|---|---|---|
| 内核 | Chrome 126 | Chrome 138 / XWEB | WebKit 605（≈ Safari 18） |
| 操作系统 | Win 10/11 | Android 12+ | iOS 16+ |
| `window.wx` (jweixin) | 否 | **是** | **是** |
| `WeixinJSBridge` | 是 | **是** | **否** |
| `__wxjs_environment` | 否 | 否 | 否 |
| 静态注入 React/antd | **是**（读 jsImportList） | 否 | 否 |
| iframe 行为 | 稳定 | 不稳定 | 不稳定 |
| 100vh 抖动 | 否 | 轻微 | 明显 |
| safe-area-inset | 否（无意义） | 部分机型有 | **必有**（刘海/灵动岛） |

**结论**：移动端有底层差异，但 React 18 / antd-mobile 5 完全兼容。**不要为了"兼容老内核"做妥协** —— 探针证明都是 Chrome 138 / WebKit 605 这种现代内核。

### 1.2 企微 jssdk 调用：iOS 没有 WeixinJSBridge

iOS WKWebView 不暴露 `WeixinJSBridge` 对象，但 jweixin SDK（`window.wx`）在两端都有。**绝对不要直接调用 `WeixinJSBridge.invoke`**，会导致 iOS 上崩溃。

```jsx
// ❌ 错误：iOS 上 WeixinJSBridge 不存在，会抛 undefined
WeixinJSBridge.invoke('scanQRCode', {}, function(res) { /* ... */ });

// ✅ 正确：用 wx 顶层 API，iOS/Android 都能用
wx.scanQRCode({
    needResult: 1,
    scanType: ['qrCode', 'barCode'],
    success: function(res) {
        Toast.show('扫码结果：' + res.resultStr);
    },
    fail: function(err) {
        Toast.show({ icon: 'fail', content: '扫码失败' });
    }
});
```

### 1.3 企微常用 jssdk API

帆软移动 SPA 加载时已经引入了 `weixin.custom.api.min.js`，下面这些 API 可以直接用：

```jsx
// 扫码（QR 码 / 一维码）
wx.scanQRCode({
    needResult: 1,
    scanType: ['qrCode', 'barCode'],
    success: function(res) {
        var code = res.resultStr;  // 扫描结果
        // ...
    }
});

// 获取地理位置
wx.getLocation({
    type: 'gcj02',  // 国内火星坐标
    success: function(res) {
        var lat = res.latitude;
        var lng = res.longitude;
        // ...
    }
});

// 选择图片
wx.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: function(res) {
        var localIds = res.localIds;
        // ...
    }
});

// 拍照
wx.chooseImage({
    count: 1,
    sourceType: ['camera']  // 只允许相机
});

// 关闭当前页（返回上一页）
wx.closeWindow();
```

**注意事项**：
- 这些 API 都是**异步**的，结果在 `success` 回调里
- `fail` 回调要写，不然 iOS 上失败时静默
- 调用前最好 try/catch，避免某些版本企微缺失 API 导致整个页面挂掉

```jsx
function safeWxCall(method, params) {
    try {
        if (typeof wx === 'undefined' || typeof wx[method] !== 'function') {
            Toast.show({ icon: 'fail', content: '当前环境不支持' });
            return;
        }
        wx[method](params);
    } catch (e) {
        Toast.show({ icon: 'fail', content: '调用失败：' + e.message });
    }
}

safeWxCall('scanQRCode', { needResult: 1, success: handleScan });
```

---

## 二、布局与样式

### 2.1 100vh 抖动陷阱

iOS Safari 和 iOS 企微的地址栏会随着滚动伸缩，**`100vh` 会随之变化**，导致：

- 全屏元素在滚动时高度跳变
- fixed 元素位置错乱
- 整页布局突然短一段

**解决方案**（按优先级）：

```css
/* ✅ 方案 1：用 dvh（dynamic viewport height） */
.full-screen {
    height: 100dvh;  /* 动态视口高度，会跟随地址栏变化平滑过渡 */
}

/* ✅ 方案 2：position:fixed 占满（骨架默认用这个） */
#app-root {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
}

/* ❌ 不要这样写 */
.bad {
    height: 100vh;  /* iOS 上会抖动 */
}
```

骨架的 `#app-root` 已经用 `position: fixed` 处理了这个问题，业务代码内部如果再嵌套需要满屏的元素，**不要再用 100vh**，用 `100%` 或继承父高度。

### 2.2 安全区适配（iPhone 刘海 / 底部 Home 条）

iPhone X 之后所有 iPhone 都有刘海或灵动岛，底部有 Home 条。**fixed 在顶部和底部的元素必须留出安全区**。

骨架已经给 `#app-root` 加上了安全区 padding：

```css
#app-root {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
}
```

但业务代码内**自己写的 fixed 元素**也要加：

```jsx
// 底部固定操作栏
<div style={{
    position: 'fixed',
    left: 0, right: 0, bottom: 0,
    paddingBottom: 'env(safe-area-inset-bottom)',  // ← 必须
    background: '#fff',
    padding: '12px'
}}>
    <Button block color="primary">确认</Button>
</div>
```

**HTML viewport meta 必须带 `viewport-fit=cover`**，否则 `env(safe-area-inset-*)` 永远是 0。骨架的 `ensureViewport()` 已经处理。

### 2.3 触控规范（44px / 14-16px）

iOS HIG（Human Interface Guidelines）和 Android Material 都要求：

- **触控目标 ≥ 44pt × 44pt**：iOS 是 44pt，Android 是 48dp，统一按 44px 设计
- **文字 ≥ 12px**：辅助信息 12px，正文 14-16px，标题 16-20px
- **触控元素之间 ≥ 8px 间距**：避免误触

```jsx
// ❌ 不要这样写
<span onClick={handler} style={{ fontSize: '10px' }}>详情</span>

// ✅ 至少 14px + 足够触控区域
<Button fill="none" size="small" onClick={handler}>
    <span style={{ fontSize: '14px' }}>详情</span>
</Button>
```

antd-mobile 默认组件大都满足触控规范：

| 组件 | 默认触控高度 |
|---|---|
| `Button` | 36-50px（按 size） |
| `List.Item` | 48px+ |
| `Input` | 44px+ |
| `Tag` | 24px（**不要单独点 Tag，包一层 wrapper**）|

### 2.4 z-index 协作约定

骨架定义的 z-index 层级，业务代码遵守：

| 元素 | z-index | 说明 |
|---|---|---|
| 帆软原生容器 | 默认 | 被 `display:none` 隐藏 |
| `#app-root` | **100** | 应用主体 |
| antd-mobile Portal（.adm-popup / .adm-mask / .adm-toast 等） | **1000**（库内置） | 浮在 app-root 上方 |
| 错误横幅 `frm-error-banner` | **9999** | 最高，置顶错误信息 |

业务代码里**不要给元素 z-index > 1000**（会盖住 Portal）。如果必须层叠：

```jsx
// ❌ 盖住所有 Popup
<div style={{ position: 'fixed', zIndex: 99999 }}>...</div>

// ✅ 用合理的层级
<div style={{ position: 'fixed', zIndex: 50 }}>...</div>

// 或者直接用 Popup 浮起来（推荐）
<Popup visible={visible}>...</Popup>
```

---

## 三、不要用 iframe

PC 端 fr-display-dev 习惯用 `Modal + iframe` 实现弹出表单，**移动端不要这样做**。

### 3.1 iframe 在移动端的问题

| 问题 | 表现 |
|---|---|
| 高度计算不可靠 | iframe 内 `document.body.scrollHeight` 在 iOS 上经常返回 0 |
| 100vh 嵌套抖动 | iframe 外层是 vh，内层也是 vh，两层抖动叠加 |
| postMessage 时机问题 | iframe 内 React 渲染完成事件难以捕获 |
| 安全区不传递 | iframe 内拿不到 `env(safe-area-inset-*)`，要重新算 |
| iOS WKWebView 限制 | 部分 iOS 版本对 iframe 内 webview 行为有限制 |
| 性能差 | 每个 iframe 是独立 webview 进程，开销大 |

### 3.2 移动端替代方案

**场景 1：表单弹窗** → 用 Popup 同页内弹出

```jsx
// ❌ PC 写法
<Modal open={visible}>
    <iframe src="/.../form.cpt?op=write&id=123" />
</Modal>

// ✅ 移动端：Popup 同页内
var sv = React.useState(false); var visible = sv[0]; var setVisible = sv[1];
<Button onClick={function() { setVisible(true); }}>新增</Button>
<Popup
    visible={visible}
    onMaskClick={function() { setVisible(false); }}
    bodyStyle={{ padding: '24px', minHeight: '50vh' }}
>
    <Form form={form} onFinish={onSubmit}>
        {/* 表单内容 */}
    </Form>
</Popup>
```

**场景 2：需要完整页面跳转**（比如复杂表单需要全屏） → 跳到另一个 cpt

```jsx
// 跳转到另一个 cpt 页面
function goToForm() {
    window.location.href = PATH.apiBase
        + '/url/mobile#/report?nodePath='
        + PATH.currentDir + 'form.cpt'
        + '&id=123';
}

// 配合企微关闭当前页（如果是新 webview 打开）
function closeAndReturn() {
    if (typeof wx !== 'undefined' && wx.closeWindow) {
        wx.closeWindow();
    } else {
        history.back();
    }
}
```

**场景 3：跨页面数据传递**

```jsx
// PC 用 postMessage；移动端推荐 URL hash / sessionStorage
// 方案 A：URL 参数
window.location.href = '/path?id=' + encodeURIComponent(id);
var id = new URLSearchParams(location.search).get('id');

// 方案 B：sessionStorage（同源跨页面）
sessionStorage.setItem('form_data', JSON.stringify(data));
var data = JSON.parse(sessionStorage.getItem('form_data') || '{}');
```

---

## 四、网络请求

### 4.1 jQuery `$.ajax` 是首选

骨架动态加载了 jQuery 3.6.1，跟 PC 端 fr-display-dev 完全一致。所有 `/api/data` 调用复用 PC 写法：

```jsx
function fetchList(params) {
    $.ajax({
        url: PATH.apiBase + '/api/data',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            report_path: PATH.getDataTemplate('orders_data.cpt'),
            datasource_name: 'orders_qry',
            page_number: -1,  // 固定 -1，禁用帆软分页
            page_size: -1,
            parameters: [
                { name: 'p_page', type: 'Integer', value: params.page },
                { name: 'p_pagesize', type: 'Integer', value: params.pageSize }
            ]
        }),
        success: function(res) {
            if (typeof res === 'string') res = JSON.parse(res);
            if (res.err_code !== 0) {
                Toast.show({ icon: 'fail', content: res.err_msg || '查询失败' });
                return;
            }
            setData(res.data);
        },
        error: function(xhr, status, err) {
            Toast.show({ icon: 'fail', content: '网络错误' });
        }
    });
}
```

### 4.2 长请求要给 loading 提示

移动网络可能慢，等 3 秒以上的请求一定要 Toast/Dialog 显示 loading。

```jsx
// ✅ 显式 loading
var handler = Toast.show({
    icon: 'loading',
    content: '提交中...',
    duration: 0  // 不自动消失
});

$.ajax({
    url: PATH.apiBase + '/api/data',
    // ... config
    success: function(res) {
        handler.close();  // ← 必须关闭
        Toast.show({ icon: 'success', content: '提交成功' });
    },
    error: function() {
        handler.close();
        Toast.show({ icon: 'fail', content: '提交失败' });
    }
});
```

### 4.3 网络异常友好提示

```jsx
$.ajax({
    // ...
    timeout: 10000,  // 移动网络下设 10 秒比较合理
    error: function(xhr, status, err) {
        var msg;
        if (status === 'timeout') {
            msg = '请求超时，请检查网络';
        } else if (xhr.status === 0) {
            msg = '网络断开';
        } else if (xhr.status >= 500) {
            msg = '服务器错误';
        } else {
            msg = '请求失败：' + err;
        }
        Toast.show({ icon: 'fail', content: msg });
    }
});
```

---

## 五、用户输入特殊处理

### 5.1 数字输入

移动端要让数字键盘弹出，不是普通键盘：

```jsx
// ❌ 弹普通键盘
<Input placeholder="请输入金额" />

// ✅ 弹数字键盘（iOS/Android 都支持）
<Input type="number" placeholder="请输入金额" />

// 手机号场景
<Input type="tel" placeholder="请输入手机号" />

// 邮箱场景
<Input type="email" placeholder="请输入邮箱" />
```

### 5.2 输入框遮挡问题

iOS 键盘弹起会把底部固定按钮遮挡。**Popup 内的输入框风险最大**。

解决方案：

```jsx
// 方案 A：Popup 不要太满（留出键盘高度）
<Popup
    visible={visible}
    bodyStyle={{
        maxHeight: '70vh',  // 别占满整屏
        overflowY: 'auto'
    }}
>
    <Form>...</Form>
</Popup>

// 方案 B：监听键盘弹起调整布局（复杂，按需）
React.useEffect(function() {
    function onResize() {
        // 视口高度变化 = 键盘弹起 / 收起
        // 重新计算需要滚动的位置
    }
    window.addEventListener('resize', onResize);
    return function() { window.removeEventListener('resize', onResize); };
}, []);
```

### 5.3 防止滚动穿透

Popup 打开时，背景内容不应该跟着滚动。antd-mobile Popup 默认会处理，但**自己写浮层时要注意**：

```jsx
// 自己写浮层时，打开后 body 加 overflow:hidden
React.useEffect(function() {
    if (visible) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
    return function() { document.body.style.overflow = ''; };
}, [visible]);
```

---

## 六、URL 路由约定

### 6.1 帆软移动 SPA 的 URL 结构

```
https://your-host/wuhan/whznjc/url/mobile?...#/report?nodePath=mobile_probe/pages/env_probe.cpt&id=xxx
```

- `/url/mobile` 是固定路径（帆软移动入口）
- `?...` 是查询参数（企微鉴权等，不要碰）
- `#/report?nodePath=...&...` 是路由参数

业务代码读 URL 参数时，**`window.location.search` 是问号那部分，`window.location.hash` 是井号那部分**。

```jsx
// 推荐：用 URLSearchParams 解析 hash 中的参数部分
function getQueryParam(name) {
    // hash 形如 "#/report?nodePath=xx&id=123"
    var hash = window.location.hash;
    var idx = hash.indexOf('?');
    if (idx < 0) return null;
    var params = new URLSearchParams(hash.substring(idx + 1));
    return params.get(name);
}

var id = getQueryParam('id');
```

### 6.2 跳转到另一个 cpt 页面

```jsx
function gotoPage(cptName, params) {
    var paramStr = '';
    if (params) {
        paramStr = '&' + Object.keys(params).map(function(k) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
        }).join('&');
    }
    window.location.href = PATH.apiBase
        + '/url/mobile#/report?nodePath='
        + PATH.currentDir + cptName + paramStr;
}

// 用法
gotoPage('order_detail.cpt', { id: '123', from: 'list' });
```

---

## 七、生产部署与调试

### 7.1 资源加载策略：CDN 优先 + 本地兜底

移动端骨架 `base_cpt_page_mobile.cpt` 的 PREAMBLE 固定段统一处理资源加载，**业务 JSX 不要手写任何 `<script>` / `<link>` / CDN URL**。

加载顺序：

```text
1. 如果全局变量已存在（React / ReactDOM / antdMobile / $）
   → 直接 bootBusiness()，window.__FRM_LIB_SOURCE = 'global'

2. 否则优先尝试 CDN（固定版本，默认 3 秒超时）
   → 成功：window.__FRM_LIB_SOURCE = 'CDN'

3. CDN 任一文件失败 / 超时 / 全局变量未出现
   → 自动切换 FineReport contextPath 本地兜底
   → 成功：window.__FRM_LIB_SOURCE = '本地兜底'

4. 本地兜底仍失败
   → 顶部红条 + app-root 错误提示
```

CDN 固定版本：

| 库 | 版本 |
|---|---|
| jQuery | 3.6.1 |
| React | 18.3.1 |
| ReactDOM | 18.3.1 |
| dayjs | 1.11.13 |
| antd-mobile | 5.42.3 |

> **不要使用 latest**。公共 CDN 上生产建议后续补 SRI；当前策略依赖固定版本 + 本地兜底控制风险。

本地兜底仍通过 `PATH.apiBase + '/help/lib/antd-mobile/'` 动态计算资源 URL：

| 环境 | apiBase | 本地兜底资源实际位置 |
|---|---|---|
| 本机开发 | `/webroot/decision` | `webroot/decision/help/lib/antd-mobile/` |
| 生产 | `/wuhan/whznjc` | `wuhan/whznjc/help/lib/antd-mobile/` |

需要部署的本地兜底 6 个文件：
- `react.min.js`、`react-dom.min.js`、`dayjs.min.js`、`jquery-3.6.1.min.js`、`antd-mobile.umd.js`、`style.css`

运行时可以在控制台检查：

```js
window.__FRM_LIB_SOURCE        // 'CDN' | '本地兜底' | 'global'
window.__FRM_LIB_SOURCE_TRYING // 当前尝试来源
```

### 7.1.1 为什么不放 starter.jsx？

资源加载必须在业务代码前完成，且 `display_writer.py` 只替换骨架里的 DEVELOPER ZONE。`starter.jsx` 只是起步模板，真实项目可能完全重写。因此 CDN 优先 / 本地兜底必须放在骨架 PREAMBLE 中，不能放到 starter。


### 7.2 本机用 Playwright 模拟移动端

frm-qa 技能会用到。开发期间想本机测移动端效果：

```javascript
const { chromium, devices } = require('playwright');
const ctx = await browser.newContext({
    ...devices['iPhone 13'],
    // 或者用真实企微 UA
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_4_1 like Mac OS X) ' +
               'AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 ' +
               'wxworklocal/3.3.0 wxwork/4.0.0 MicroMessenger/7.0.1'
});
```

但要知道：**Playwright 不能完全替代真机企微测试**。下表是 Playwright 能覆盖的范围：

| 能 Playwright 测 | 不能 Playwright 测 |
|---|---|
| 布局是否错乱 | 真实企微注入的全局变量（jsImportList 差异） |
| 组件交互是否正常 | iOS WKWebView 跟 Chrome 真实差异 |
| 网络请求是否通 | 企微 jssdk（`wx.xxx`）调用 |
| Console 错误 | 真机网络环境（4G/弱网） |
| z-index / Portal 渲染 | 真机性能问题 |

**所以最终验证必须真机企微测试**。

### 7.3 真机调试

**Android（USB 调试）**：
1. Android 手机开发者模式 → USB 调试
2. USB 连电脑
3. 电脑 Chrome 打开 `chrome://inspect`
4. 手机企微打开页面 → Inspect

能看 Console、Network、Elements，完整的 Chrome DevTools。

**iOS（需 Mac）**：
1. iPhone 设置 → Safari → 高级 → 网页检查器 打开
2. lightning 连 Mac
3. Mac Safari → 开发菜单 → 你的 iPhone → 选 WebView

**没 Mac 时的 iOS 调试**：
- 在骨架的 `window.onerror` 红条横幅里看错误
- 用 Toast 临时打印调试信息
- 探针页（mobile_probe/env_probe）作为最后兜底，看运行时环境

---

## 八、常见陷阱合集

阶段 1 实测踩过的坑，避免重蹈：

### 8.1 全局变量误用

```jsx
// ❌ 误用 PC 版变量名
var { Button } = antd;  // 移动端骨架没加载 antd
// → 质量门 js_uses_antd_mobile.py 会拦截

// ✅ 正确
var { Button } = antdMobile;
```

### 8.2 资源 URL 写死

```jsx
// ❌ 写死路径
loadScript('/wuhan/whznjc/help/lib/antd-mobile/react.min.js');
// → 本机环境跑不通

// ✅ 用 PATH 动态计算
loadScript(PATH.apiBase + '/help/lib/antd-mobile/react.min.js');
```

### 8.3 不该有 import

```jsx
// ❌ 不会编译报错，但运行时模块不存在
import { Button } from 'antd-mobile';

// ✅ 用全局变量
var { Button } = antdMobile;
```

### 8.4 Input onChange 拿到 event

```jsx
// ❌ PC 写法
<Input onChange={function(e) { setName(e.target.value); }} />
// → 拿到 "[object Object]"

// ✅ antd-mobile 第一参数直接是 value
<Input onChange={function(v) { setName(v); }} />
```

### 8.5 z-index 用最大值

```jsx
// ❌ 盖住 antd-mobile Portal
<div style={{ position: 'fixed', zIndex: 9999999 }}>...</div>

// ✅ 用 Popup
<Popup visible={visible}>...</Popup>
```

### 8.6 100vh

```jsx
// ❌ iOS 上抖动
<div style={{ height: '100vh' }}>...</div>

// ✅ 用 dvh 或 position:fixed
<div style={{ height: '100dvh' }}>...</div>
```

### 8.7 直接调 WeixinJSBridge

```jsx
// ❌ iOS 上 WeixinJSBridge 不存在
WeixinJSBridge.invoke('scanQRCode', {}, callback);

// ✅ 用 wx 顶层 API
wx.scanQRCode({ success: callback });
```

### 8.8 用 Modal/Table

```jsx
// ❌ antd-mobile 没有这些组件
<Modal>...</Modal>
<Table />

// ✅ 用对应替代
<Popup>...</Popup>  或  Dialog.confirm({...})
<List>...</List>
```

---

## 九、相关文档

- [ANTD_MOBILE_GUIDE.md](./ANTD_MOBILE_GUIDE.md) - antd-mobile 组件速查
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 整体架构（PATH 对象、`/api/data` 协议）
- [JS_SAFETY.md](./JS_SAFETY.md) - XSS 防护、安全规范（PC/移动通用）
- [FINEREPORT_ENV.md](./FINEREPORT_ENV.md) - 帆软环境排查
