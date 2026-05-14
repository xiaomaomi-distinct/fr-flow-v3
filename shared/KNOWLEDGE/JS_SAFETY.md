# JS 安全规范

## XSS 防护

### ✅ 安全：使用 textContent
```javascript
// 安全，设置纯文本
td.textContent = userInput;  // 自动转义
```

### ⚠️ 危险：innerHTML
```javascript
// 危险，可能导致 XSS
cell.innerHTML = userInput;  // 如果包含 <script> 会执行

// 如果必须使用 innerHTML，先转义
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
cell.innerHTML = escapeHtml(userInput);
```

---

## 数据类型检查

```javascript
// ✅ 检查是否为数组
Array.isArray(data);

// ✅ 检查对象是否有属性
if (obj && obj.hasOwnProperty('name'));

// ✅ 检查是否为 null/undefined
if (value != null)  // 注意用 != 而非 !==
```

---

## JSON 安全解析

```javascript
// ✅ 安全：try-catch
let data;
try {
    data = JSON.parse(jsonString);
} catch (e) {
    console.error('JSON解析失败:', e);
    data = {};
}

// ❌ 危险：直接解析
let data = JSON.parse(jsonString);  // 可能抛异常
```

---

## 字符串模板安全

```javascript
// ✅ 使用模板字符串
let html = `<div>${escapeHtml(name)}</div>`;

// ❌ 危险：字符串拼接
let html = '<div>' + name + '</div>';  // XSS风险
```

---

## 正则表达式防护

```javascript
// ✅ 转义用户输入用于正则
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ✅ 使用正则构建安全
let pattern = new RegExp('^' + escapeRegex(userInput) + '$');
```
