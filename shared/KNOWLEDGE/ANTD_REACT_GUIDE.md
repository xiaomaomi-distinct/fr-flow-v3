# Ant Design 5.x 组件速查手册

> 本文档面向使用 JSX 开发帆软展示层的工程师。内容基于 antd 5.21.0 + React 18.3.1 实测。
>
> **环境约束**：JSX 代码通过 esbuild 编译后注入 CPT。运行时使用全局变量，**禁止写 import 语句**。

---

## 环境速查

| 项目 | 值 |
|------|-----|
| antd | 5.21.0（全局变量 `antd`） |
| React | 18.3.1（全局变量 `React`） |
| ReactDOM | 18.3.1（全局变量 `ReactDOM`） |
| dayjs | 全局变量 `dayjs` |
| jQuery | 全局变量 `$`（含 `$.ajax`） |
| antdIcons | **不可用，不存在此全局变量** |
| antd.locale | **不可用，需自行内联 locale 对象** |

### 变量使用方式

```jsx
// ✅ 正确：从全局变量解构
var { Table, Button, Modal, Form, Input, Select, Tag, Space, message } = antd;

// ✅ 正确：React hooks 从全局 React 获取
var [data, setData] = React.useState([]);

// ❌ 错误：不要写 import 语句
import { Table } from 'antd';              // 编译不报错但运行时模块不存在
import { SearchOutlined } from '@ant-design/icons';  // antdIcons 不存在
```

### 推荐的 message 用法

```jsx
// ✅ 静态 API（父页面和 iframe 均可靠）
antd.message.success('操作成功');
antd.message.error('操作失败');

// ❌ App.useApp() hook（iframe 中 message.success 可能不是函数）
var { message } = antd.App.useApp();
```

### 国际化（中文）

antd 默认英文。在 `starter.jsx` 中通过 `ConfigProvider` + 内联 locale 实现中文：

```jsx
var zhCN = { locale: 'zh-cn', Pagination: { items_per_page: '条/页', jump_to: '跳至',
    prev_page: '上一页', next_page: '下一页', page: '页' },
    Modal: { okText: '确定', cancelText: '取消' }, Table: { emptyText: '暂无数据' } };

ReactDOM.createRoot(document.getElementById('app-root')).render(
    React.createElement(antd.ConfigProvider, { locale: zhCN },
        React.createElement(App)
    )
);
```

### iframe 注意事项

- iframe 内会重新加载一套独立的 React/antd 实例（与父页面 `===` 比较为 `false`）
- React Context 不跨 iframe 共享
- `antd.message` 静态 API 在 iframe 中正常工作（推荐）
- `App.useApp()` hook 在 iframe 中不可靠

---

## antd 5 vs 6 主要 API 差异

| 特性 | antd 5 | antd 6 |
|------|--------|--------|
| Modal 打开状态 | `open` | `open` |
| Space 间距 | `size` (small/large) | `gap` (数值) |
| Button type | 无 `type="secondary"` | 新增 `type="secondary"` |
| Countdown | `Statistic.Countdown` | `Countdown` (独立) |
| moment.js | 不再内置 | 不再内置 |

---

## 目录

1. [通用](#1-通用) — Button, Typography
2. [布局](#2-布局) — Space, Grid, Layout
3. [导航](#3-导航) — Tabs, Breadcrumb, Pagination, Steps
4. [数据录入](#4-数据录入) — Input, InputNumber, Select, Cascader, TreeSelect, DatePicker, TimePicker, Switch
5. [数据展示](#5-数据展示) — Table, List, Tree, Card, Statistic, Badge, Tag, Descriptions
6. [反馈](#6-反馈) — Modal, Drawer, Message, Notification, Alert, Spin
7. [表单](#7-表单) — Form

---

## 1. 通用

### Button 按钮

```jsx
var { Button } = antd;

// 基础
<Button>默认按钮</Button>
<Button type="primary">主要按钮</Button>
<Button type="dashed">虚线按钮</Button>
<Button type="text">文字按钮</Button>
<Button type="link">链接按钮</Button>
<Button danger>删除</Button>

// 尺寸
<Button size="small">小</Button>
<Button size="middle">中</Button>
<Button size="large">大</Button>

// 状态
<Button loading>加载中</Button>
<Button disabled>禁用</Button>
```

**带图标按钮**：

> **禁止使用 `<img>` 标签加载 SVG 图标。** `<img>` 内的 SVG 是隔离文档，无法通过 `fill: currentColor` 继承按钮颜色，导致图标不可见或尺寸异常（默认 0×0）。必须用内联 SVG + `dangerouslySetInnerHTML` 方案。
> 
> `/webroot/help/lib/antd/icons/` 下有 831 个 SVG 文件（`outlined/`、`filled/`、`twotone/`），init 时同步拉取并缓存，`icon('名字')` 直接使用。

```jsx
// ✅ 正确：init 时同步加载 SVG 文件到缓存，渲染时内联
// iconBase 由 PATH.apiBase 动态计算，适配不同部署环境（webroot / wuhan 等）
var iconBase = PATH.apiBase.replace('/decision', '/help/lib/antd/icons');
var iconCache = {};
(function() {
    var names = ['search', 'plus', 'reload', 'edit', 'delete', 'close', 'check', 'filter'];
    names.forEach(function(name) {
        $.ajax({
            url: iconBase + '/outlined/' + name + '.svg',
            type: 'GET', async: false, dataType: 'text',
            success: function(svg) { iconCache[name] = svg; },
            error: function() { iconCache[name] = null; }
        });
    });
})();

function icon(name) {
    var key = name.replace('/outlined/', '').replace('.svg', '');
    var svg = iconCache[key];
    if (!svg) return null;
    // 关键：fill="currentColor" 继承按钮颜色，width/height 防止 0×0
    svg = svg.replace('<svg ', '<svg fill="currentColor" width="1em" height="1em" ');
    return React.createElement('span', {
        style: { display: 'inline-flex', alignItems: 'center', lineHeight: 1 },
        dangerouslySetInnerHTML: { __html: svg }
    });
}

// 使用 — 直接用文件名（不含 .svg 后缀）
<Button type="primary" icon={icon('search')}>搜索</Button>
<Button icon={icon('reload')}>重置</Button>
<Input prefix={icon('search')} placeholder="搜索" />

// 添加新图标：在 names 数组里加名字即可，无需任何编码
// 可用图标名见：ls /webroot/help/lib/antd/icons/outlined/
```

```jsx
// ❌ 错误：<img> 标签 — SVG 隔离文档，无法继承 currentColor
var searchIcon = React.createElement('img', {
    src: '/webroot/help/lib/antd/icons/outlined/search.svg',
    style: { width: 14, height: 14 }
});
<Button type="primary" icon={searchIcon}>搜索</Button>
```

### Typography 排版

```jsx
var { Typography } = antd;
var { Text, Title, Paragraph } = Typography;

<Title level={2}>标题</Title>
<Paragraph>正文内容</Paragraph>
<Text type="secondary">次要文字</Text>
<Text type="danger">危险文字</Text>
```

---

## 2. 布局

### Space 间距

```jsx
var { Space } = antd;

<Space>
  <Button>按钮1</Button>
  <Button>按钮2</Button>
</Space>

<Space direction="vertical">
  <Button>按钮1</Button>
  <Button>按钮2</Button>
</Space>

<Space size="large">
  <Button>按钮1</Button>
  <Button>按钮2</Button>
</Space>

<Space wrap>
  {items.map(function(item) { return <Button key={item.id}>{item.name}</Button>; })}
</Space>
```

### Grid 栅格

```jsx
var { Row, Col } = antd;

<Row>
  <Col span={12}><Button>12列</Button></Col>
  <Col span={12}><Button>12列</Button></Col>
</Row>

<Row gutter={16}>
  <Col span={8}><Button>8列</Button></Col>
  <Col span={8}><Button>8列</Button></Col>
  <Col span={8}><Button>8列</Button></Col>
</Row>
```

### Layout 布局

```jsx
var { Layout } = antd;
var { Header, Content, Sider } = Layout;

<Layout>
  <Header>顶部导航</Header>
  <Layout>
    <Sider width={200}>侧边栏</Sider>
    <Content>主内容区</Content>
  </Layout>
</Layout>
```

---

## 3. 导航

### Tabs 标签页

```jsx
var { Tabs } = antd;

<Tabs
  items={[
    { key: '1', label: '标签1', children: <div>内容1</div> },
    { key: '2', label: '标签2', children: <div>内容2</div> },
  ]}
/>

// 受控模式
var [activeKey, setActiveKey] = React.useState('1');
<Tabs activeKey={activeKey} onChange={setActiveKey} items={[...]} />
```

### Breadcrumb 面包屑

```jsx
var { Breadcrumb } = antd;

<Breadcrumb
  items={[{ title: '首页' }, { title: '列表' }, { title: '详情' }]}
/>
```

### Pagination 分页

```jsx
var { Pagination } = antd;

<Pagination
  current={current}
  pageSize={pageSize}
  total={total}
  showSizeChanger
  showQuickJumper
  showTotal={function(total) { return '共 ' + total + ' 条'; }}
  onChange={function(page, pageSize) { setCurrent(page); setPageSize(pageSize); }}
/>
```

> **注意**：Pagination 默认英文（"Previous Page"、"Next Page"、"Page Size"）。要显示中文需通过 `ConfigProvider` 注入 locale。

### Steps 步骤条

```jsx
var { Steps } = antd;

<Steps current={1} items={[
  { title: '步骤1', description: '描述' },
  { title: '步骤2', description: '描述' },
  { title: '步骤3', description: '描述' },
]} />
```

---

## 4. 数据录入

### Input 输入框

```jsx
var { Input } = antd;

<Input placeholder="请输入" />
<Input.Password placeholder="请输入密码" />

// 文本域
<Input.TextArea rows={4} placeholder="请输入" />
<Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />

// 尺寸
<Input size="large" placeholder="大尺寸" />
<Input size="small" placeholder="小尺寸" />

// 禁用
<Input disabled placeholder="禁用" />
```

### InputNumber 数字输入框

```jsx
var { InputNumber } = antd;

<InputNumber min={0} max={100} defaultValue={10} />
<InputNumber min={0} precision={2} style={{ width: '100%' }} />
```

### Select 选择器

```jsx
var { Select } = antd;

<Select
  placeholder="请选择"
  options={[
    { value: '1', label: '选项1' },
    { value: '2', label: '选项2' },
  ]}
/>

// 支持搜索 + 允许清除
<Select showSearch allowClear placeholder="搜索选择" options={[...]} />
```

### Cascader 级联选择

```jsx
var { Cascader } = antd;

var options = [
  { value: 'zhejiang', label: '浙江', children: [
    { value: 'hangzhou', label: '杭州' }
  ]},
];

<Cascader options={options} placeholder="请选择" />
```

### TreeSelect 树形选择

```jsx
var { TreeSelect } = antd;

<TreeSelect treeData={treeData} placeholder="请选择" />
```

### DatePicker 日期选择器

```jsx
var { DatePicker } = antd;

<DatePicker onChange={function(date, dateString) { /* ... */ }} />
```

### TimePicker 时间选择器

```jsx
var { TimePicker } = antd;

<TimePicker onChange={function(time, timeString) { /* ... */ }} />
```

### Switch 开关

```jsx
var { Switch } = antd;

<Switch checked={checked} onChange={setChecked} />
```

---

## 5. 数据展示

### Table 表格

```jsx
var { Table, Button, Space, Tag } = antd;

var columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80,
    render: function(v) { return <Tag color={v === '启用' ? 'success' : 'default'}>{v}</Tag>; }
  },
  { title: '操作', key: 'action', width: 150,
    render: function(_, record) {
      return <Space>
        <Button size="small" type="link" onClick={function() { handleEdit(record); }}>编辑</Button>
        <Button size="small" type="link" danger onClick={function() { handleDelete(record.id); }}>删除</Button>
      </Space>;
    }
  },
];

<Table
  columns={columns}
  dataSource={data}
  rowKey="id"
  loading={loading}
  size="middle"
  scroll={{ x: 800 }}
  pagination={{
    current: current,
    pageSize: pageSize,
    total: total,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: function(t) { return '共 ' + t + ' 条'; },
    onChange: handlePageChange
  }}
/>
```

### List 列表

```jsx
var { List, Button } = antd;

<List
  dataSource={data}
  renderItem={function(item) {
    return <List.Item actions={[<Button key="edit" size="small">编辑</Button>]}>
      <List.Item.Meta title={item.title} description={item.description} />
    </List.Item>;
  }}
/>
```

### Tree 树形控件

```jsx
var { Tree } = antd;

<Tree treeData={treeData} selectable onSelect={function(keys) { /* ... */ }} />
```

### Card 卡片

```jsx
var { Card } = antd;

<Card title="卡片标题">
  <p>卡片内容</p>
</Card>

// 带操作
<Card title="标题" extra={<Button size="small">更多</Button>}>
  <p>内容</p>
</Card>
```

### Badge 徽章

```jsx
var { Badge } = antd;

<Badge status="success" text="成功" />
<Badge status="processing" text="进行中" />
<Badge status="error" text="错误" />
<Badge status="default" text="默认" />
<Badge status="warning" text="警告" />
```

### Tag 标签

```jsx
var { Tag } = antd;

<Tag>标签</Tag>
<Tag color="success">成功</Tag>
<Tag color="processing">进行中</Tag>
<Tag color="error">错误</Tag>
<Tag color="warning">警告</Tag>
```

### Descriptions 描述列表

```jsx
var { Descriptions } = antd;

<Descriptions title="信息" bordered>
  <Descriptions.Item label="用户名">张三</Descriptions.Item>
  <Descriptions.Item label="状态"><Badge status="success" text="启用" /></Descriptions.Item>
</Descriptions>
```

---

## 6. 反馈

### Modal 对话框

```jsx
var { Modal, Button } = antd;
var [visible, setVisible] = React.useState(false);

<>
  <Button onClick={function() { setVisible(true); }}>打开弹窗</Button>
  <Modal
    title="弹窗标题"
    open={visible}
    onOk={function() { setVisible(false); }}
    onCancel={function() { setVisible(false); }}
    footer={[
      <Button key="cancel" onClick={function() { setVisible(false); }}>取消</Button>,
      <Button key="ok" type="primary" onClick={function() { setVisible(false); }}>确定</Button>,
    ]}
  >
    <p>弹窗内容</p>
  </Modal>
</>
```

**确认对话框**：

```jsx
Modal.confirm({
  title: '确认删除',
  content: '删除后无法恢复，确定要删除吗？',
  okText: '确认',
  cancelText: '取消',
  okButtonProps: { danger: true },
  onOk: function() { /* ... */ },
});
```

**iframe 弹窗（表单页）**：

```jsx
var [formUrl, setFormUrl] = React.useState('');
var [modalVisible, setModalVisible] = React.useState(false);

function openForm(record) {
  var url = PATH.apiBase + '/view/report?viewlet=' +
            PATH.getTemplatePath('book_form.cpt') + '&op=write';
  if (record) url += '&id=' + record.id;
  setFormUrl(url);
  setModalVisible(true);
}

<Modal
  title={null}
  open={modalVisible}
  footer={null}
  width={600}
  destroyOnClose
  onCancel={function() { setModalVisible(false); }}
  styles={{ body: { padding: 0 } }}
>
  <iframe id="modalFrame" src={formUrl}
    style={{ width: '100%', height: '500px', minHeight: '400px', border: 'none' }} />
</Modal>
```

### Drawer 抽屉

```jsx
var { Drawer, Form, Input } = antd;

<Drawer title="抽屉标题" placement="right" open={visible} onClose={function() { setVisible(false); }} width={400}>
  <Form layout="vertical">
    <Form.Item label="标题"><Input /></Form.Item>
  </Form>
</Drawer>
```

### Message 全局提示

```jsx
// 推荐：静态 API（父页面和 iframe 均可靠）
antd.message.success('操作成功');
antd.message.error('操作失败');
antd.message.warning('警告信息');
antd.message.info('提示信息');

// 加载中
var hide = antd.message.loading('加载中...', 0);
// 关闭
hide();
```

### Notification 通知提醒

```jsx
antd.notification.success({ message: '通知标题', description: '通知内容' });
antd.notification.error({ message: '错误', description: '操作失败，请重试' });
```

### Alert 警告提示

```jsx
var { Alert } = antd;

<Alert message="成功提示" type="success" />
<Alert message="错误提示" type="error" closable />
```

### Spin 加载

```jsx
var { Spin } = antd;

<Spin spinning={loading}>
  <div>实际内容</div>
</Spin>
```

---

## 7. 表单

### Form 表单

```jsx
var { Form, Input, InputNumber, Select, Button } = antd;

var [form] = Form.useForm();

<Form
  form={form}
  layout="vertical"
  onFinish={function(values) { /* ... */ }}
>
  <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
    <Input placeholder="请输入" />
  </Form.Item>

  <Form.Item name="amount" label="金额">
    <InputNumber min={0} precision={2} style={{ width: '100%' }} />
  </Form.Item>

  <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
    <Select placeholder="请选择" options={[
      { value: 'active', label: '启用' },
      { value: 'inactive', label: '禁用' },
    ]} />
  </Form.Item>

  <Form.Item>
    <Button type="primary" htmlType="submit">提交</Button>
  </Form.Item>
</Form>
```

### 编辑回填

```jsx
// 从接口获取数据后回填
form.setFieldsValue({
  name: record.name,
  amount: record.amount,
  status: record.status,
});

// 获取表单值
var values = form.getFieldsValue();
```

### 表单验证规则

```jsx
<Form.Item name="email" label="邮箱"
  rules={[
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入有效的邮箱地址' },
  ]}
/>

<Form.Item name="phone" label="手机号"
  rules={[
    { required: true, message: '请输入手机号' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
  ]}
/>
```

---

## 附录：常用模式

### 受控组件

```jsx
var [value, setValue] = React.useState('');
<Input value={value} onChange={function(e) { setValue(e.target.value); }} />

var [selected, setSelected] = React.useState('');
<Select value={selected} onChange={setSelected} options={[]} />
```

### 列表渲染

```jsx
{data.map(function(item, index) {
  return <div key={item.id}><span>{item.name}</span></div>;
})}
```

### 条件渲染

```jsx
{visible && <Modal open={visible} />}
{status === 'success' ? <Alert type="success" message="成功" /> : <Alert type="info" message="等待中" />}
```

### useEffect 依赖

```jsx
// 初始化
React.useEffect(function() { loadData(); }, []);

// 依赖变化
React.useEffect(function() { loadData(param); }, [param]);

// 清理
React.useEffect(function() {
  var timer = setInterval(function() {}, 1000);
  return function() { clearInterval(timer); };
}, []);
```

---

## 8. 页面布局规范

> 各页面类型对应的脚手架路径：`foundation/scaffolds/starter_{type}.jsx`
> 完整说明见 `foundation/scaffolds/README.md`

### 列表页（`type: "list"`）

```
┌──────────────────────────────────────────────┐
│  页面标题                                     │
│  [搜索框] [筛选▼] [筛选▼] [搜索] [重置]        │ ← toolbar-left
│                                 [+ 新增]      │ ← toolbar-right
│  ┌──────────────────────────────────────────┐│
│  │ Table                                    ││
│  └──────────────────────────────────────────┘│
│  共 N 条  [<][1][2][>]  条/页 ▼  跳至__页    │
└──────────────────────────────────────────────┘
```

- 新增按钮固定于搜索栏右侧
- 操作列（编辑/删除）固定于表格最右列
- 表单弹窗通过 Modal + iframe 打开，不跳转页面
- `display:flex; justify-content:space-between` 实现左右分区

### 表单页（`type: "form"`）

```
┌──────────────────────────────┐
│  新增XX / 编辑XX          [✕]│
├──────────────────────────────┤
│  书名 *  [________________]  │
│  作者 *  [________________]  │  ← Form layout="vertical"
│  价格    [¥___]  状态 [▼]   │
│  ──────────────────────────  │
│               [取消] [保存]   │  ← 底部右对齐(flex-end)
└──────────────────────────────┘
```

- Modal 弹窗，destroyOnClose
- 编辑时通过 `?id=N` URL 参数传递记录 ID
- 保存后 `postMessage({type:'fr_form_saved'})`
- 取消按钮调用 `notifyParentSaved()` 关闭弹窗
- 加载后 `postMessage({type:'fr_iframe_resize',height:...})`

### 详情页（`type: "detail"`）

- 独立页面，Descriptions bordered，2 列
- 顶部标题行右侧"返回列表"按钮
- 底部操作区居中（编辑 + 返回）
- 通过 `?id=N` URL 参数获取记录 ID

### 批量导入页（`type: "batch"`）

- 4 步向导：选择文件 → 数据预览 → 写入校验 → 结果
- 自定义步骤条（CSS），不是 antd Steps
- 步骤 0：拖拽上传区 + 格式说明
- 步骤 1：预览表格（前 100 行）
- 步骤 2：进度条（分批写入 + 校验中）
- 步骤 3：统计卡片（通过/失败）+ 错误明细表格
- 底部按钮按 step 切换

### 选择器页（`type: "selector"`）

- Modal 弹窗，紧凑搜索栏 + Table(rowSelection)
- 底部固定栏：左侧已选摘要（逗号分隔），右侧取消+确定
- 确定后 `postMessage({type:'fr_selector_selected', data:[...]})`

---

### AJAX 数据请求

```jsx
React.useEffect(function() {
  setLoading(true);
  $.ajax({
    url: PATH.apiBase + '/api/data',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({
      report_path: PATH.getDataTemplate('demo_data.cpt'),
      datasource_name: 'book_qry',
      page_number: -1,
      page_size: -1,
      parameters: [
        { name: 'p_page', type: 'Integer', value: 1 },
        { name: 'p_pagesize', type: 'Integer', value: 10 },
      ]
    }),
    success: function(res) {
      if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }
      if (res.err_code !== 0) { antd.message.error(res.err_msg || '查询失败'); return; }
      setData(res.data || []);
    },
    error: function(xhr, status, error) {
      antd.message.error('网络错误：' + error);
    },
    complete: function() { setLoading(false); }
  });
}, []);
```
