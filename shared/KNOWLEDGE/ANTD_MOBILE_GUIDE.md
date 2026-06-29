# antd-mobile 5.x 组件速查手册

> 本文档面向使用 JSX 开发**帆软移动端**展示层的工程师。内容基于 antd-mobile 5.42.3 + React 18 实测。
>
> **环境约束**：JSX 代码通过 esbuild 编译后注入 CPT，骨架在 afterload 中动态加载 antd-mobile。运行时使用全局变量，**禁止写 import 语句**。

---

## 环境速查

| 项目 | 值 |
|------|-----|
| antd-mobile | 5.42.3（全局变量 `antdMobile`，**注意大小写**） |
| React | 18.3.1（全局变量 `React`） |
| ReactDOM | 18.3.1（全局变量 `ReactDOM`） |
| dayjs | 全局变量 `dayjs` |
| jQuery | 全局变量 `$`（含 `$.ajax`） |
| Icons | 默认通过 antd-mobile 内置图标语义（部分组件自带），如需独立 Icon 需自行加载 |

### 变量使用方式

```jsx
// ✅ 正确：从全局变量解构
var { Button, NavBar, Card, List, Popup, Picker, Toast } = antdMobile;

// ✅ 正确：React hooks 从全局 React 获取
var s1 = React.useState([]); var data = s1[0]; var setData = s1[1];

// ❌ 错误：不要用 antd（这是 PC 端的全局变量，移动端骨架不加载）
var { Button } = antd;

// ❌ 错误：不要写 import 语句
import { Button } from 'antd-mobile';
```

### 全局变量名陷阱

| 错误写法 | 正确写法 |
|---|---|
| `antdmobile` | `antdMobile` |
| `AntdMobile` | `antdMobile` |
| `antd-mobile` | `antdMobile` |
| `antd.Button`（移动端） | `antdMobile.Button` |

质量门规则 `js_uses_antd_mobile.py` 会在编译时拦截 `antd.` 调用（移动端误用 PC 变量）。

---

## PC antd → 移动端 antd-mobile 组件映射

最重要的一张表。从 fr-display-dev（PC 端 antd）迁移到 frm-display-dev（移动端 antd-mobile）时查这里。

| PC antd | 移动 antd-mobile | 说明 |
|---|---|---|
| `Table` | `List` / `IndexBar` / `Grid` | **antd-mobile 没有 Table**。移动端 375px 宽度撑不开多列表格，用 List 卡片化 |
| `Modal` | `Popup` / `Dialog` / `ActionSheet` | **antd-mobile 没有 Modal**。Popup 底部弹出（容器型），Dialog 居中确认（按钮型），ActionSheet 底部菜单 |
| `Select` | `Picker` / `CheckList` | Picker 是滚轮式选择器，符合移动端原生交互 |
| `Cascader` | `CascadePicker` / `Cascader`(新) | 移动端版本是滚轮多列联动 |
| `TreeSelect` | `Cascader` | 移动端不适合渲染树，用级联代替 |
| `DatePicker` | `DatePicker` | API 不同，移动版是滚轮 + Popup 弹出 |
| `Form` | `Form` | API 类似但有差异（见下文 Form 章节） |
| `Input` | `Input` | API 不同：`onChange` 第一个参数直接是 value，**不是 event** |
| `Button` | `Button` | 大部分 props 不同：`color` 而不是 `type`，`fill` 控制填充 |
| `Tag` | `Tag` | API 类似，`color` 用语义关键字 |
| `message` | `Toast` | `Toast.show()` 而不是 `message.success()` |
| `notification` | `Toast`（顶部） | 用 `Toast.show({ position: 'top' })` |
| `Tooltip` | `Popover` | 触屏没有 hover，用点击触发 |
| `Drawer` | `Popup`（侧边） | Popup 通过 `position` 控制方向 |
| `Pagination` | `InfiniteScroll` + `PullToRefresh` | 移动端不用页码，用滚动加载 |

**禁止使用的组件**（质量门会拦截）：

- `antdMobile.Modal` → 不存在，改用 Popup/Dialog/ActionSheet
- `antdMobile.Table` → 不存在，改用 List
- `antdMobile.Cascader` 的 PC 风格用法 → 用 CascadePicker 的滚轮 UI

---

## 核心组件

### NavBar（顶部导航栏）

页面顶部必备组件，移动端没有标题栏的页面会显得很怪。

```jsx
var { NavBar } = antdMobile;

// 最简
<NavBar>页面标题</NavBar>

// 带返回 + 右侧操作
<NavBar
    onBack={function() { history.back(); }}
    right={<span style={{ color: '#1677ff' }}>保存</span>}
>
    新建订单
</NavBar>

// 不显示返回箭头
<NavBar backArrow={false}>列表页</NavBar>
```

**PC 对比**：PC 端 antd 没有对应组件，通常自己写 div + Button。

### Button

最常用组件，API 跟 PC antd 完全不同。

```jsx
var { Button } = antdMobile;

// 基础变体
<Button color="primary">主按钮</Button>
<Button color="success">成功</Button>
<Button color="warning">警告</Button>
<Button color="danger">危险</Button>
<Button>默认</Button>

// 填充方式
<Button color="primary" fill="solid">实心（默认）</Button>
<Button color="primary" fill="outline">描边</Button>
<Button color="primary" fill="none">无填充</Button>

// 尺寸
<Button size="mini">迷你</Button>
<Button size="small">小</Button>
<Button>中（默认）</Button>
<Button size="large">大</Button>

// 块级按钮（占满宽度）
<Button block color="primary">占满宽度</Button>

// 加载与禁用
<Button loading>处理中</Button>
<Button disabled>禁用</Button>

// 点击事件
<Button onClick={function() { Toast.show('clicked'); }}>点击</Button>
```

**PC 对比**：

| PC antd | 移动 antd-mobile |
|---|---|
| `type="primary"` | `color="primary"` |
| `type="dashed"` | `fill="outline"` |
| `type="text"` | `fill="none"` |
| `danger={true}` | `color="danger"` |
| `block={true}` | `block`（同） |
| `size="small/middle/large"` | `size="mini/small/middle/large"` |

### Input

输入框，**onChange 参数跟 PC 完全不同**。

```jsx
var { Input } = antdMobile;
var s = React.useState(''); var name = s[0]; var setName = s[1];

// 基础
<Input
    placeholder="请输入姓名"
    value={name}
    onChange={function(v) { setName(v); }}  // ← v 直接是字符串，不是 event
/>

// 数字
<Input type="number" placeholder="请输入金额" />

// 密码（注意：antd-mobile 5 没有 Input.Password，用 type）
<Input type="password" placeholder="密码" />

// 受控清除
<Input value={name} clearable onChange={setName} />
```

**PC 对比关键差异**：

```jsx
// PC antd（事件对象）
<Input onChange={function(e) { setName(e.target.value); }} />

// 移动 antd-mobile（直接是 value）
<Input onChange={function(v) { setName(v); }} />
```

这是从 PC 移植代码时最常踩的坑，写错会拿到 `[object Object]`。

### TextArea

```jsx
var { TextArea } = antdMobile;

<TextArea
    placeholder="请输入备注"
    value={remark}
    onChange={setRemark}
    rows={4}
    maxLength={200}
    showCount
/>
```

### List（替代 Table）

移动端展示数据的主力组件。卡片化列表。

```jsx
var { List } = antdMobile;

// 基础
<List header="订单列表">
    <List.Item>订单 #001</List.Item>
    <List.Item>订单 #002</List.Item>
</List>

// 带描述 + 右侧附加 + 点击 + 箭头
<List>
    <List.Item
        title="订单号"
        description="2026-06-25 创建"
        extra="¥ 199.00"
        arrow
        onClick={function() { /* 跳转详情 */ }}
    >
        华为 Mate60
    </List.Item>
</List>

// 渲染数据数组
{data.map(function(item) {
    return (
        <List.Item key={item.id} title={item.name} extra={item.status}>
            {item.title}
        </List.Item>
    );
})}
```

**PC 对比**：PC 用 Table 多列；移动端用 List 卡片式，每行只展示 2-4 个核心字段，详细信息进详情页。

### Card

容器组件，给页面分块。

```jsx
var { Card } = antdMobile;

<Card title="基本信息" extra={<span>编辑</span>}>
    <p>姓名：张三</p>
    <p>电话：13800138000</p>
</Card>

// 可点击
<Card title="商品" onClick={function() { /* 跳详情 */ }}>
    商品内容
</Card>
```

### Form

表单组件。**API 跟 PC antd Form 类似但 Form.Item 字段约定不同**。

```jsx
var { Form, Input, Button, Picker } = antdMobile;
var form = Form.useForm()[0];

function onFinish(values) {
    // values = { name: '张三', phone: '13800138000' }
    submitData(values);
}

<Form
    form={form}
    onFinish={onFinish}
    layout="horizontal"  // 默认 horizontal，也可 vertical
    footer={
        <Button block color="primary" type="submit">提交</Button>
    }
>
    <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
        <Input placeholder="请输入" />
    </Form.Item>

    <Form.Item name="phone" label="电话" rules={[{ required: true }]}>
        <Input type="tel" placeholder="请输入手机号" />
    </Form.Item>

    <Form.Item name="city" label="城市" trigger="onConfirm" onClick={function(e, pickerRef) { pickerRef.current.open(); }}>
        <Picker columns={cityColumns}>
            {function(items) {
                return items.every(function(item) { return item == null; }) ? '请选择' : items.map(function(item) { return item ? item.label : ''; }).join(' / ');
            }}
        </Picker>
    </Form.Item>
</Form>
```

**关键差异**：

| 项 | PC antd | 移动 antd-mobile |
|---|---|---|
| 布局 | `layout="vertical/horizontal/inline"` | `layout="vertical/horizontal"`（无 inline） |
| 提交按钮 | 在 `<Form.Item>` 里包 `<Button htmlType="submit">` | 用 `footer` prop 放底部 |
| Picker 在 Form 内 | 用 `Select` 配 `Option` | 用 `Picker` 配特殊 `trigger="onConfirm"` |

### Popup（替代 Modal）

弹出层，从屏幕边缘滑入。**是最常用的浮层组件**。

```jsx
var { Popup, Button } = antdMobile;
var s = React.useState(false); var visible = s[0]; var setVisible = s[1];

// 底部弹出（默认）
<Button onClick={function() { setVisible(true); }}>打开</Button>
<Popup
    visible={visible}
    onMaskClick={function() { setVisible(false); }}
    bodyStyle={{ padding: '24px', minHeight: '40vh' }}
>
    <h3>弹出内容</h3>
    <Button block onClick={function() { setVisible(false); }}>关闭</Button>
</Popup>

// 其他方向
<Popup position="top">从顶部</Popup>
<Popup position="left">从左侧（侧边抽屉）</Popup>
<Popup position="right">从右侧</Popup>

// 关闭按钮 + 圆角
<Popup
    visible={visible}
    onMaskClick={function() { setVisible(false); }}
    closeOnMaskClick
    showCloseButton
    bodyStyle={{ borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
>
    内容
</Popup>
```

**PC 对比**：

| PC antd | 移动 antd-mobile |
|---|---|
| `Modal`（居中） | `Popup`（底部/侧边 默认）/ `Dialog`（居中按钮型） |
| `open={visible}` | `visible={visible}` |
| `onCancel={fn}` | `onMaskClick={fn}` |
| `title="标题"` 内置 | 自己在 children 写 `<h3>` |
| `okText/cancelText` 按钮 | 自己用 Button 组件 |

### Dialog（确认对话框）

按钮型对话框，命令式或声明式都行。**最像 PC 的 Modal**。

```jsx
var { Dialog } = antdMobile;

// 命令式（最常用）
Dialog.confirm({
    content: '确认要删除这条记录吗？',
    onConfirm: function() {
        // 用户点确认
        doDelete();
    }
});

// alert 风格
Dialog.alert({
    content: '操作成功',
    onConfirm: function() { /* OK */ }
});

// 自定义内容 + 多按钮
Dialog.show({
    title: '选择操作',
    content: '请选择...',
    actions: [
        [
            { key: 'cancel', text: '取消' },
            { key: 'delete', text: '删除', danger: true, bold: true }
        ]
    ],
    onAction: function(action) {
        if (action.key === 'delete') doDelete();
    }
});
```

### Toast（替代 message）

短暂提示，自动消失。

```jsx
var { Toast } = antdMobile;

// 基础
Toast.show('保存成功');

// 带图标
Toast.show({ icon: 'success', content: '操作成功' });
Toast.show({ icon: 'fail', content: '操作失败' });
Toast.show({ icon: 'loading', content: '加载中...' });

// 位置（默认居中）
Toast.show({ content: '提示', position: 'top' });
Toast.show({ content: '提示', position: 'bottom' });

// 自定义时长
Toast.show({ content: '快速消失', duration: 1000 });

// 命令式清除
var handler = Toast.show({ icon: 'loading', content: '加载中', duration: 0 });
// ... 操作完成
handler.close();
```

**PC 对比**：

| PC antd | 移动 antd-mobile |
|---|---|
| `message.success('xx')` | `Toast.show({ icon: 'success', content: 'xx' })` |
| `message.error('xx')` | `Toast.show({ icon: 'fail', content: 'xx' })` |
| `message.loading('xx', 0)` | `Toast.show({ icon: 'loading', content: 'xx', duration: 0 })` |

### Picker（替代 Select）

滚轮选择器，移动端原生交互。

```jsx
var { Picker, Button } = antdMobile;
var sv = React.useState(false); var visible = sv[0]; var setVisible = sv[1];
var sval = React.useState(null); var value = sval[0]; var setValue = sval[1];

var columns = [[
    { label: '苹果', value: 'apple' },
    { label: '香蕉', value: 'banana' },
    { label: '橙子', value: 'orange' }
]];

<Button onClick={function() { setVisible(true); }}>
    {value ? value[0] : '请选择'}
</Button>

<Picker
    columns={columns}
    visible={visible}
    onClose={function() { setVisible(false); }}
    onConfirm={function(v) { setValue(v); }}
    // value 是数组，每个元素对应一列的选中 value
/>

// 多列联动用 columns 函数
var twoColumns = [
    [{ label: '一线', value: 't1' }, { label: '二线', value: 't2' }],
    [{ label: '北京', value: 'bj' }, { label: '上海', value: 'sh' }]
];
<Picker columns={twoColumns} />
```

**PC 对比**：

| PC antd Select | 移动 antd-mobile Picker |
|---|---|
| 下拉菜单 | 底部弹出滚轮 |
| `options={[{value,label}]}` | `columns={[[{value,label}]]}` 多了一层 |
| 单选 value 是单值 | value 是数组（即使单列也是 `[value]`） |
| `mode="multiple"` | 用 `CheckList` 代替 |

### CheckList（替代 Select multiple）

复选列表，可单选或多选。**结合 Popup 是 PC 多选下拉的替代**。

```jsx
var { CheckList, Popup, Button } = antdMobile;
var s = React.useState([]); var checked = s[0]; var setChecked = s[1];

<CheckList
    multiple  // 多选；去掉则单选
    value={checked}
    onChange={setChecked}
>
    <CheckList.Item value="a">苹果</CheckList.Item>
    <CheckList.Item value="b">香蕉</CheckList.Item>
    <CheckList.Item value="c">橙子</CheckList.Item>
</CheckList>
```

### DatePicker

日期选择器。

```jsx
var { DatePicker, Button } = antdMobile;
var sv = React.useState(false); var visible = sv[0]; var setVisible = sv[1];
var sd = React.useState(null); var date = sd[0]; var setDate = sd[1];

<Button onClick={function() { setVisible(true); }}>
    {date ? dayjs(date).format('YYYY-MM-DD') : '请选择日期'}
</Button>

<DatePicker
    visible={visible}
    onClose={function() { setVisible(false); }}
    onConfirm={function(d) { setDate(d); }}
    precision="day"        // 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'
    min={new Date(2020, 0, 1)}
    max={new Date(2030, 11, 31)}
/>
```

**PC 对比**：

| PC antd | 移动 antd-mobile |
|---|---|
| 弹出面板（点日历单元格） | 滚轮 + Popup 弹出 |
| 直接渲染在表单中 | **必须配合 visible state 控制** |
| `onChange={(date, dateString) => {}}` | `onConfirm={function(d) {}}` |
| Date 是 dayjs 对象 | Date 是原生 Date 对象 |

### ActionSheet（底部菜单）

底部弹出的菜单列表。

```jsx
var { ActionSheet, Button } = antdMobile;
var s = React.useState(false); var visible = s[0]; var setVisible = s[1];

var actions = [
    { text: '编辑', key: 'edit' },
    { text: '分享', key: 'share' },
    { text: '删除', key: 'delete', danger: true }
];

<Button onClick={function() { setVisible(true); }}>更多操作</Button>
<ActionSheet
    visible={visible}
    actions={actions}
    onClose={function() { setVisible(false); }}
    onAction={function(action) {
        // action.key
        setVisible(false);
    }}
    cancelText="取消"
/>
```

### Tag

标签。

```jsx
var { Tag } = antdMobile;

<Tag color="primary">主</Tag>
<Tag color="success">成功</Tag>
<Tag color="warning">警告</Tag>
<Tag color="danger">危险</Tag>
<Tag color="default">默认</Tag>

// 自定义颜色
<Tag color="#722ed1">紫色</Tag>

// 填充方式
<Tag color="primary" fill="solid">实心</Tag>
<Tag color="primary" fill="outline">描边</Tag>
```

### Space（间距）

```jsx
var { Space } = antdMobile;

<Space wrap>
    <Button>A</Button>
    <Button>B</Button>
    <Button>C</Button>
</Space>

// 纵向
<Space direction="vertical" block>
    <Card>1</Card>
    <Card>2</Card>
</Space>

// 自定义间距
<Space wrap style={{ '--gap': '16px' }}>...</Space>
```

### SearchBar

搜索栏。

```jsx
var { SearchBar } = antdMobile;
var s = React.useState(''); var keyword = s[0]; var setKeyword = s[1];

<SearchBar
    placeholder="搜索订单号"
    value={keyword}
    onChange={setKeyword}
    onSearch={function(v) { /* 触发搜索 */ }}
    onClear={function() { setKeyword(''); }}
/>
```

### PullToRefresh + InfiniteScroll（替代分页）

下拉刷新 + 上拉加载更多。**移动端长列表必备**。

```jsx
var { PullToRefresh, InfiniteScroll, List } = antdMobile;
var sd = React.useState([]); var data = sd[0]; var setData = sd[1];
var sh = React.useState(true); var hasMore = sh[0]; var setHasMore = sh[1];

async function loadMore() {
    var more = await fetchNextPage();
    setData(function(d) { return d.concat(more); });
    setHasMore(more.length > 0);
}

async function onRefresh() {
    var fresh = await fetchFirstPage();
    setData(fresh);
    setHasMore(true);
}

<PullToRefresh onRefresh={onRefresh}>
    <List>
        {data.map(function(item) {
            return <List.Item key={item.id}>{item.name}</List.Item>;
        })}
    </List>
    <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
</PullToRefresh>
```

### Empty（空状态）

```jsx
var { Empty } = antdMobile;

<Empty description="暂无数据" />

// 带操作
<Empty
    description="没找到相关内容"
    image="/path/to/empty.png"
>
    <Button color="primary">新建</Button>
</Empty>
```

### Avatar（头像）

```jsx
var { Avatar } = antdMobile;

<Avatar src="https://..." />
<Avatar style={{ '--size': '64px' }} fallback="张" />
```

### Badge（徽标）

```jsx
var { Badge } = antdMobile;

<Badge content="5">
    <div>消息</div>
</Badge>

<Badge content={Badge.dot}>
    <div>通知</div>
</Badge>
```

---

## 国际化（中文）

antd-mobile 默认是中文，**不需要 ConfigProvider 切换 locale**。如果你看到英文需要确认是不是 antd（PC 版）混进来了。

```jsx
// 移动端不需要这段（PC 端才需要）
// <antd.ConfigProvider locale={zhCN}>...</antd.ConfigProvider>

// 移动端直接渲染即可
ReactDOM.createRoot(document.getElementById('app-root')).render(<App />);
```

---

## 主题定制

antd-mobile 用 **CSS Variables** 做主题，比 PC antd 的 ConfigProvider 主题更简单。

```jsx
// 全局主题（放在 #app-root 上即可）
<div id="app-root" style={{
    '--adm-color-primary': '#1677ff',
    '--adm-color-success': '#00b578',
    '--adm-color-danger': '#ff3141',
    '--adm-font-size-main': '14px'
}}>
    {/* 业务内容 */}
</div>

// 单个组件覆盖
<Button style={{ '--background-color': '#722ed1' }}>紫色按钮</Button>
```

完整 CSS Variables 列表见 antd-mobile 官方文档。

---

## 常见陷阱

### 1. Input onChange 参数

```jsx
// ❌ 这会把整个事件对象塞进去
<Input onChange={function(e) { setName(e.target.value); }} />

// ✅ 第一个参数直接就是 value
<Input onChange={function(v) { setName(v); }} />
```

### 2. Picker value 是数组

```jsx
// ❌ 单列 Picker 也不是单值
setValue('apple');

// ✅ value 永远是数组，每个元素对应一列
setValue(['apple']);

// 读取
var fruit = pickerValue ? pickerValue[0] : null;
```

### 3. Dialog vs Popup 区别

- **Popup**：容器型，自己往里塞内容，控制 visible
- **Dialog**：按钮型对话框，命令式调用 `Dialog.confirm()`/`Dialog.alert()`

```jsx
// ❌ 不是 Modal 那种，没有 title/okText/cancelText
<Popup title="确认删除" okText="删除" cancelText="取消">...</Popup>

// ✅ 用 Dialog.confirm 替代 PC 的 Modal.confirm
Dialog.confirm({ content: '确认删除?', onConfirm: doDelete });
```

### 4. Form 提交按钮位置

```jsx
// ❌ PC 写法
<Form>
    <Form.Item>
        <Input />
    </Form.Item>
    <Form.Item>
        <Button htmlType="submit">提交</Button>
    </Form.Item>
</Form>

// ✅ 移动端用 footer
<Form footer={<Button block color="primary" type="submit">提交</Button>}>
    <Form.Item><Input /></Form.Item>
</Form>
```

### 5. message 没有

```jsx
// ❌ antd-mobile 没有 message
antdMobile.message.success('成功');

// ✅ 用 Toast
Toast.show({ icon: 'success', content: '成功' });
```

### 6. Modal 没有

```jsx
// ❌ antd-mobile 没有 Modal（质量门会拦）
<Modal open={visible}>...</Modal>

// ✅ 根据用途选
<Popup visible={visible}>容器型弹出</Popup>
Dialog.confirm({ content: '确认?' });  // 按钮型对话框
```

### 7. List.Item 没有 onClick.stopPropagation

```jsx
// List.Item 点击事件穿透：item.onClick 会触发，里面 Button 也会触发
<List.Item onClick={goDetail}>
    <Button onClick={function(e) {
        e.stopPropagation();  // ← 必须，否则会同时触发 goDetail
        editItem();
    }}>编辑</Button>
</List.Item>
```

---

## 移动端布局核心约定

详见 [MOBILE_SPECIFIC.md](./MOBILE_SPECIFIC.md)。这里只列关键点：

- **触控目标 ≥ 44px**：Button、List.Item 默认满足；自定义可点击元素要确保
- **字号 ≥ 12px**：辅助信息 12px，正文 14-16px
- **不用 100vh**：iOS 地址栏抖动会让 100vh 变化，用 `100dvh` 或 `position:fixed`
- **不用 iframe**：移动端 iframe 行为不稳定，用 Popup 同页弹出
- **导航条用 NavBar**：不要自己写 div
- **安全区适配**：fixed 元素加 `padding-top: env(safe-area-inset-top)` 和 `padding-bottom: env(safe-area-inset-bottom)`

---

## 全局变量约定（再次强调）

| 变量 | 用法 | 备注 |
|---|---|---|
| `antdMobile` | `var { Button } = antdMobile;` | **大小写敏感**，是 m 不是 M |
| `React` | `React.useState()` `<App />` | 不要 import |
| `ReactDOM` | `ReactDOM.createRoot(el).render(...)` | 不要 import |
| `dayjs` | `dayjs().format('YYYY-MM-DD')` | 不要 import |
| `$` | `$.ajax({ url, type, success })` | jQuery 3.6.1 |
| `FR` | `FR.remoteEvaluate('=reportName')` | 帆软全局 |
| `PATH` | `PATH.apiBase` `PATH.getDataTemplate('xx_data.cpt')` | 骨架定义的本地变量 |
| ~~`antd`~~ | 移动端**没有**这个变量 | 用了质量门会拦 |
