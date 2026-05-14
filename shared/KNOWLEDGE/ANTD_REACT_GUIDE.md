# Ant Design 5.x 组件速查手册

> 本文档是内网知识库，面向使用 JSX 开发帆软展示层的工程师。内容基于 antd 5.x 官方文档组织。
>
> **帆软当前环境**：antd 5.x + React 18 + dayjs

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

1. [通用](#1-通用)
   - Button 按钮
   - Icon 图标
   - Typography 排版
2. [布局](#2-布局)
   - Space 间距
   - Grid 栅格
   - Layout 布局
3. [导航](#3-导航)
   - Tabs 标签页
   - Breadcrumb 面包屑
   - Pagination 分页
   - Steps 步骤条
4. [数据录入](#4-数据录入)
   - Input 输入框
   - InputNumber 数字输入框
   - Select 选择器
   - Cascader 级联选择
   - TreeSelect 树形选择
   - DatePicker 日期选择器
   - TimePicker 时间选择器
   - Switch 开关
5. [数据展示](#5-数据展示)
   - Table 表格
   - List 列表
   - Tree 树形控件
   - Card 卡片
   - Statistic 统计数值
   - Badge 徽章
   - Tag 标签
   - Descriptions 描述列表
6. [反馈](#6-反馈)
   - Modal 对话框
   - Drawer 抽屉
   - Message 全局提示
   - Notification 通知提醒
   - Alert 警告提示
   - Spin 加载
7. [表单](#7-表单)
   - Form 表单

---

## 1. 通用

### Button 按钮

**引入**：
```jsx
import { Button } from 'antd';
```

**基础用法**：
```jsx
<Button>默认按钮</Button>
<Button type="primary">主要按钮</Button>
<Button type="dashed">虚线按钮</Button>
<Button type="text">文字按钮</Button>
<Button type="link">链接按钮</Button>
```

**图标按钮**：
```jsx
import { SearchOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';

<Button icon={<SearchOutlined />}>搜索</Button>
<Button icon={<PlusOutlined />}>新增</Button>
<Button danger>删除</Button>
```

**尺寸**：
```jsx
<Button size="large">大按钮</Button>
<Button size="middle">中等按钮</Button>
<Button size="small">小按钮</Button>
```

**禁用状态**：
```jsx
<Button disabled>禁用</Button>
```

**加载状态**：
```jsx
<Button loading>加载中</Button>
```

**按钮组**：
```jsx
import { Button as Group } from 'antd';

<Group.Group>
  <Button>左</Button>
  <Button>中</Button>
  <Button>右</Button>
</Group.Group>
```

---

### Icon 图标

**引入方式**：
```jsx
import { SearchOutlined, PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';

// 使用
<Button icon={<SearchOutlined />}>搜索</Button>
```

**常用图标速查**：

| 图标 | 名称 | 适用场景 |
|------|------|----------|
| `<SearchOutlined />` | 搜索 | 搜索按钮 |
| `<PlusOutlined />` | 添加 | 新增按钮 |
| `<DeleteOutlined />` | 删除 | 删除按钮 |
| `<EditOutlined />` | 编辑 | 编辑按钮 |
| `<CheckOutlined />` | 确认 | 提交/完成 |
| `<CloseOutlined />` | 关闭 | 取消/关闭 |
| `<ArrowLeftOutlined />` | 返回 | 返回按钮 |
| `<SaveOutlined />` | 保存 | 保存按钮 |
| `<UploadOutlined />` | 上传 | 上传按钮 |
| `<DownloadOutlined />` | 下载 | 下载按钮 |
| `<SettingOutlined />` | 设置 | 设置按钮 |
| `<UserOutlined />` | 用户 | 用户信息 |

---

### Typography 排版

```jsx
import { Typography } from 'antd';

const { Text, Title, Paragraph } = Typography;

<Typography>
  <Title level={1}>标题1</Title>
  <Title level={2}>标题2</Title>
  <Title level={3}>标题3</Title>
  <Paragraph>
    正文内容，可以包含<Text code>代码</Text>和<Text mark>高亮</Text>。
  </Paragraph>
  <Text type="secondary">次要文字</Text>
  <Text type="danger">危险文字</Text>
  <Text disabled>禁用文字</Text>
</Typography>
```

---

## 2. 布局

### Space 间距

**控制元素之间的间距**：
```jsx
import { Space, Button, Input } from 'antd';

<Space>
  <Button>按钮1</Button>
  <Button>按钮2</Button>
  <Input placeholder="输入框" />
</Space>

// 垂直排列
<Space direction="vertical">
  <Button>按钮1</Button>
  <Button>按钮2</Button>
</Space>

// 控制间距大小（antd 5）
<Space size="large">
  <Button>按钮1</Button>
  <Button>按钮2</Button>
</Space>

<Space size={8}>
  <Button>按钮1</Button>
  <Button>按钮2</Button>
</Space>

// 自动换行
<Space wrap>
  {items.map(item => <Button key={item.id}>{item.name}</Button>)}
</Space>
```

---

### Grid 栅格

**24分栏系统**：
```jsx
import { Row, Col, Button } from 'antd';

<Row>
  <Col span={24}>
    <Button>24列 - 整行</Button>
  </Col>
</Row>

<Row>
  <Col span={12}>
    <Button>12列 - 一半</Button>
  </Col>
  <Col span={12}>
    <Button>12列 - 一半</Button>
  </Col>
</Row>

<Row>
  <Col span={8}>
    <Button>8列</Button>
  </Col>
  <Col span={8}>
    <Button>8列</Button>
  </Col>
  <Col span={8}>
    <Button>8列</Button>
  </Col>
</Row>

// 偏移
<Row>
  <Col span={8} offset={8}>
    <Button>偏移8列</Button>
  </Col>
</Row>

// 响应式
<Row>
  <Col xs={24} sm={12} md={8} lg={6}>
    <Button>响应式列</Button>
  </Col>
</Row>
```

---

### Layout 布局

```jsx
import { Layout, Menu, Breadcrumb } from 'antd';

const { Header, Content, Sider, Footer } = Layout;

// 典型页面布局
<Layout>
  <Header>顶部导航</Header>
  <Layout>
    <Sider width={200}>侧边栏</Sider>
    <Content>主内容区</Content>
  </Layout>
  <Footer>页脚</Footer>
</Layout>
```

---

## 3. 导航

### Tabs 标签页

**基础用法**：
```jsx
import { Tabs } from 'antd';

<Tabs
  items={[
    { key: '1', label: '标签1', children: <div>内容1</div> },
    { key: '2', label: '标签2', children: <div>内容2</div> },
    { key: '3', label: '标签3', children: <div>内容3</div> },
  ]}
/>
```

**带图标**：
```jsx
import { SearchOutlined, SettingOutlined } from '@ant-design/icons';

<Tabs
  items={[
    { key: '1', label: <span><SearchOutlined />搜索</span>, children: <div>搜索内容</div> },
    { key: '2', label: <span><SettingOutlined />设置</span>, children: <div>设置内容</div> },
  ]}
/>
```

**胶囊风格**：
```jsx
<Tabs type="card">
  <Tabs.TabPane tab="标签1" key="1">
    <div>内容1</div>
  </Tabs.TabPane>
  <Tabs.TabPane tab="标签2" key="2">
    <div>内容2</div>
  </Tabs.TabPane>
</Tabs>
```

**受控模式**：
```jsx
const [activeKey, setActiveKey] = React.useState('1');

<Tabs
  activeKey={activeKey}
  onChange={setActiveKey}
  items={[
    { key: '1', label: '标签1', children: <div>内容1</div> },
    { key: '2', label: '标签2', children: <div>内容2</div> },
  ]}
/>
```

---

### Breadcrumb 面包屑

```jsx
import { Breadcrumb } from 'antd';

<Breadcrumb
  items={[
    { title: '首页' },
    { title: '列表' },
    { title: '详情' },
  ]}
/>

// 带链接
<Breadcrumb
  items={[
    { title: <a href="/">首页</a> },
    { title: <a href="/list">列表</a> },
    { title: '详情' },
  ]}
/>
```

---

### Pagination 分页

**基础用法**：
```jsx
import { Pagination } from 'antd';

<Pagination
  defaultCurrent={1}
  total={100}
  onChange={(page, pageSize) => {
    console.log('页码:', page, '每页条数:', pageSize);
  }}
/>
```

**完整配置**：
```jsx
<Pagination
  current={current}
  pageSize={pageSize}
  total={total}
  showSizeChanger
  showQuickJumper
  showTotal={(total) => `共 ${total} 条`}
  onChange={(page, pageSize) => {
    setCurrent(page);
    setPageSize(pageSize);
  }}
/>
```

---

### Steps 步骤条

```jsx
import { Steps } from 'antd';

const { Step } = Steps;

<Steps current={1}>
  <Step title="步骤1" description="描述信息" />
  <Step title="步骤2" description="描述信息" />
  <Step title="步骤3" description="描述信息" />
</Steps>

// 带图标
<Steps current={0}>
  <Step title="选择商品" icon={<ShoppingOutlined />} />
  <Step title="核对信息" icon={<EditOutlined />} />
  <Step title="完成" icon={<CheckOutlined />} />
</Steps>

// 简洁状态
<Steps current={2} size="small" items={[
  { title: '已完成' },
  { title: '进行中' },
  { title: '待处理' },
]} />
```

---

## 4. 数据录入

### Input 输入框

**基础用法**：
```jsx
import { Input } from 'antd';

<Input placeholder="请输入" />

// 带前缀/后缀
<Input
  prefix={<SearchOutlined />}
  suffix={<CloseCircleOutlined />}
/>
```

**密码框**：
```jsx
import { Input } from 'antd';

<Input.Password placeholder="请输入密码" />
```

**文本域**：
```jsx
<Input.TextArea rows={4} placeholder="请输入" />

// 自动适应高度
<Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
```

**尺寸**：
```jsx
<Input size="large" placeholder="大尺寸" />
<Input size="middle" placeholder="中等" />
<Input size="small" placeholder="小尺寸" />
```

**禁用**：
```jsx
<Input disabled placeholder="禁用状态" />
```

---

### InputNumber 数字输入框

```jsx
import { InputNumber } from 'antd';

<InputNumber min={0} max={100} defaultValue={10} />

// 带步进
<InputNumber
  min={0}
  max={100}
  step={10}
  defaultValue={50}
/>

// 格式化显示
<InputNumber
  defaultValue={1000}
  formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
  parser={(value) => value.replace(/¥\s?|(,*)/g, '')}
/>
```

---

### Select 选择器

**基础用法**：
```jsx
import { Select } from 'antd';

<Select
  placeholder="请选择"
  options={[
    { value: '1', label: '选项1' },
    { value: '2', label: '选项2' },
    { value: '3', label: '选项3' },
  ]}
/>
```

**支持搜索**：
```jsx
<Select
  showSearch
  placeholder="搜索选择"
  options={[
    { value: '1', label: '选项1' },
    { value: '2', label: '选项2' },
  ]}
/>
```

**多选**：
```jsx
<Select
  mode="multiple"
  placeholder="多选"
  options={[
    { value: '1', label: '选项1' },
    { value: '2', label: '选项2' },
    { value: '3', label: '选项3' },
  ]}
/>
```

**禁用**：
```jsx
<Select disabled placeholder="禁用" options={[{ value: '1', label: '选项1' }]} />
```

---

### Cascader 级联选择

```jsx
import { Cascader } from 'antd';

const options = [
  {
    value: 'zhejiang',
    label: '浙江',
    children: [
      { value: 'hangzhou', label: '杭州' },
      { value: 'ningbo', label: '宁波' },
    ],
  },
  {
    value: 'jiangsu',
    label: '江苏',
    children: [
      { value: 'nanjing', label: '南京' },
    ],
  },
];

<Cascader options={options} placeholder="请选择" />
```

---

### TreeSelect 树形选择

```jsx
import { TreeSelect } from 'antd';

const treeData = [
  {
    value: 'parent 1',
    title: '父节点1',
    children: [
      { value: 'child 1', title: '子节点1' },
      { value: 'child 2', title: '子节点2' },
    ],
  },
];

<TreeSelect
  treeData={treeData}
  placeholder="请选择"
/>
```

---

### DatePicker 日期选择器

**基础用法**：
```jsx
import { DatePicker } from 'antd';

<DatePicker
  onChange={(date, dateString) => {
    console.log(date, dateString);
  }}
/>
```

**选择日期范围**：
```jsx
import { DatePicker } from 'antd';
const { RangePicker } = DatePicker;

<RangePicker
  onChange={(dates, dateStrings) => {
    console.log('选中的日期:', dates);
    console.log('日期字符串:', dateStrings);
  }}
/>
```

**选择周/月/年**：
```jsx
<DatePicker picker="week" />
<DatePicker picker="month" />
<DatePicker picker="quarter" />
<DatePicker picker="year" />
```

**不可选日期**：
```jsx
<DatePicker
  disabledDate={(current) => {
    // 禁用未来日期（使用 dayjs）
    return current && current > dayjs().endOf('day');
  }}
/>
```

---

### TimePicker 时间选择器

```jsx
import { TimePicker } from 'antd';

<TimePicker
  onChange={(time, timeString) => {
    console.log(time, timeString);
  }}
/>

// 12小时制
<TimePicker use12Hours format="h:mm:ss A" />
```

---

### Switch 开关

```jsx
import { Switch } from 'antd';

<Switch
  checked={checked}
  onChange={setChecked}
/>

// 禁用
<Switch disabled />
```

---

## 5. 数据展示

### Table 表格

**基础用法**：
```jsx
import { Table } from 'antd';

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '状态', dataIndex: 'status', key: 'status' },
];

const data = [
  { id: 1, name: '项目1', status: '启用' },
  { id: 2, name: '项目2', status: '禁用' },
];

<Table columns={columns} dataSource={data} rowKey="id" />
```

**带分页**：
```jsx
<Table
  columns={columns}
  dataSource={data}
  rowKey="id"
  pagination={{
    current: 1,
    pageSize: 10,
    total: 100,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
  }}
/>
```

**带选择框**：
```jsx
const [selectedRowKeys, setSelectedRowKeys] = React.useState([]);

<Table
  rowSelection={{
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  }}
  columns={columns}
  dataSource={data}
  rowKey="id"
/>
```

**自定义列渲染**：
```jsx
const columns = [
  { title: '状态', dataIndex: 'status', key: 'status',
    render: (text) => (
      <Badge status={text === '启用' ? 'success' : 'default'} text={text} />
    )
  },
  { title: '操作', key: 'action',
    render: (_, record) => (
      <Space>
        <Button size="small" onClick={() => handleEdit(record)}>编辑</Button>
        <Button size="small" danger onClick={() => handleDelete(record.id)}>删除</Button>
      </Space>
    )
  },
];
```

---

### List 列表

```jsx
import { List, Button, Space } from 'antd';

<List
  dataSource={data}
  renderItem={(item) => (
    <List.Item
      actions={[
        <Button key="edit" size="small">编辑</Button>,
        <Button key="delete" size="small" danger>删除</Button>,
      ]}
    >
      <List.Item.Meta
        title={item.title}
        description={item.description}
      />
    </List.Item>
  )}
/>
```

---

### Tree 树形控件

```jsx
import { Tree } from 'antd';

const treeData = [
  {
    title: '父节点',
    key: '0',
    children: [
      { title: '子节点1', key: '0-0' },
      { title: '子节点2', key: '0-1' },
    ],
  },
];

<Tree
  treeData={treeData}
  selectable
  onSelect={(selectedKeys) => {
    console.log('选中:', selectedKeys);
  }}
/>
```

---

### Card 卡片

**基础用法**：
```jsx
import { Card } from 'antd';

<Card title="卡片标题">
  <p>卡片内容</p>
  <p>卡片内容</p>
</Card>
```

**带操作**：
```jsx
<Card
  title="标题"
  extra={<Button size="small">更多</Button>}
>
  <p>内容</p>
</Card>
```

**带图片**：
```jsx
<Card
  cover={<img src="https://example.com/image.jpg" alt="图片" />}
  title="图片卡片"
>
  <p>描述内容</p>
</Card>
```

**网格布局中的卡片**：
```jsx
import { Row, Col, Card } from 'antd';

<Row gutter={16}>
  <Col span={8}>
    <Card title="卡片1">内容1</Card>
  </Col>
  <Col span={8}>
    <Card title="卡片2">内容2</Card>
  </Col>
  <Col span={8}>
    <Card title="卡片3">内容3</Card>
  </Col>
</Row>
```

---

### Statistic 统计数值

```jsx
import { Statistic } from 'antd';

<Statistic
  title="总用户数"
  value={1000}
  suffix="人"
/>

// 带格式化
<Statistic
  title="收入"
  value={1234567.89}
  precision={2}
  prefix="¥"
/>

// 倒计时（antd 5）
<Statistic.Countdown
  value={Date.now() + 86400000}
  format="HH:mm:ss"
/>
```

---

### Badge 徽章

**基础用法**：
```jsx
import { Badge } from 'antd';

<Badge status="success" text="成功" />
<Badge status="processing" text="进行中" />
<Badge status="error" text="错误" />
<Badge status="default" text="默认" />
<Badge status="warning" text="警告" />
```

**带数字**：
```jsx
<Badge count={5}>
  <a href="#" className="head-example" />
</Badge>

// 显示最大值
<Badge count={100} overflowCount={99}>
  <a href="#" className="head-example" />
</Badge>
```

**独立使用**：
```jsx
<Badge count={5} />
```

---

### Tag 标签

```jsx
import { Tag } from 'antd';

// 基础
<Tag>标签1</Tag>
<Tag color="blue">蓝色</Tag>

// 各种颜色
<Tag color="success">成功</Tag>
<Tag color="processing">进行中</Tag>
<Tag color="error">错误</Tag>
<Tag color="warning">警告</Tag>

// 可关闭
<Tag closable onClose={(e) => console.log('关闭')}>
  可关闭标签
</Tag>

// 组合使用
<Space>
  {tags.map((tag) => (
    <Tag key={tag.id} closable onClose={() => handleClose(tag)}>
      {tag.name}
    </Tag>
  ))}
</Space>
```

---

### Descriptions 描述列表

```jsx
import { Descriptions } from 'antd';

<Descriptions title="用户信息">
  <Descriptions.Item label="用户名">张三</Descriptions.Item>
  <Descriptions.Item label="手机号">13800138000</Descriptions.Item>
  <Descriptions.Item label="邮箱">zhangsan@example.com</Descriptions.Item>
  <Descriptions.Item label="状态">
    <Badge status="success" text="启用" />
  </Descriptions.Item>
</Descriptions>

// 带边框
<Descriptions bordered>
  <Descriptions.Item label="用户名">张三</Descriptions.Item>
  <Descriptions.Item label="手机号">13800138000</Descriptions.Item>
</Descriptions>
```

---

## 6. 反馈

### Modal 对话框

**基础用法**：
```jsx
import { Modal, Button } from 'antd';

const [visible, setVisible] = React.useState(false);

<>
  <Button onClick={() => setVisible(true)}>打开弹窗</Button>
  <Modal
    title="弹窗标题"
    open={visible}
    onOk={() => setVisible(false)}
    onCancel={() => setVisible(false)}
    footer={[
      <Button key="cancel" onClick={() => setVisible(false)}>取消</Button>,
      <Button key="ok" type="primary" onClick={() => setVisible(false)}>确定</Button>,
    ]}
  >
    <p>弹窗内容</p>
  </Modal>
</>
```

**确认对话框**：
```jsx
import { Modal } from 'antd';

Modal.confirm({
  title: '确认删除',
  content: '删除后无法恢复，确定要删除吗？',
  okText: '确认',
  cancelText: '取消',
  onOk: () => {
    console.log('确认删除');
  },
});
```

**表单弹窗**：
```jsx
<Modal
  title={editingId ? '编辑' : '新增'}
  open={modalVisible}
  onOk={handleSave}
  onCancel={() => setModalVisible(false)}
  footer={null}  // 自定义底部
>
  <Form form={form} layout="vertical">
    <Form.Item name="title" label="标题" rules={[{ required: true }]}>
      <Input />
    </Form.Item>
    <Form.Item name="content" label="内容">
      <Input.TextArea rows={4} />
    </Form.Item>
  </Form>
</Modal>
```

---

### Drawer 抽屉

```jsx
import { Drawer, Button, Form, Input } from 'antd';

const [drawerVisible, setDrawerVisible] = React.useState(false);

<>
  <Button onClick={() => setDrawerVisible(true)}>打开抽屉</Button>
  <Drawer
    title="抽屉标题"
    placement="right"
    open={drawerVisible}
    onClose={() => setDrawerVisible(false)}
    width={400}
  >
    <Form layout="vertical">
      <Form.Item label="标题">
        <Input />
      </Form.Item>
      <Form.Item label="内容">
        <Input.TextArea rows={4} />
      </Form.Item>
    </Form>
  </Drawer>
</>
```

---

### Message 全局提示

```jsx
import { message } from 'antd';

message.success('操作成功');
message.error('操作失败');
message.warning('警告信息');
message.info('提示信息');

// 加载中
const hide = message.loading('加载中...', 0);
// 关闭
hide();
```

---

### Notification 通知提醒

```jsx
import { notification } from 'antd';

notification.success({
  message: '通知标题',
  description: '通知内容',
});

notification.error({
  message: '错误',
  description: '操作失败，请重试',
});

notification.info({
  message: '提示',
  description: '有新消息',
});
```

---

### Alert 警告提示

```jsx
import { Alert } from 'antd';

<Alert message="成功提示" type="success" />
<Alert message="错误提示" type="error" />
<Alert message="警告提示" type="warning" />
<Alert message="信息提示" type="info" />

// 带描述
<Alert
  message="标题"
  description="详细描述信息"
  type="info"
/>

// 可关闭
<Alert
  message="可关闭的警告"
  type="warning"
  closable
  onClose={() => console.log('关闭')}
/>
```

---

### Spin 加载

**基础用法**：
```jsx
import { Spin } from 'antd';

<Spin />

// 全屏加载
<Spin size="large" tip="加载中..." />
```

**放在内容区**：
```jsx
<Spin spinning={loading}>
  <div>实际内容</div>
</Spin>
```

---

## 7. 表单

### Form 表单

**基础用法**：
```jsx
import { Form, Input, Button } from 'antd';

const [form] = Form.useForm();

<Form
  form={form}
  layout="vertical"
  onFinish={(values) => {
    console.log('表单值:', values);
  }}
>
  <Form.Item
    name="username"
    label="用户名"
    rules={[{ required: true, message: '请输入用户名' }]}
  >
    <Input placeholder="请输入用户名" />
  </Form.Item>

  <Form.Item
    name="password"
    label="密码"
    rules={[{ required: true, message: '请输入密码' }]}
  >
    <Input.Password placeholder="请输入密码" />
  </Form.Item>

  <Form.Item>
    <Button type="primary" htmlType="submit">提交</Button>
    <Button htmlType="button" onClick={() => form.resetFields()}>重置</Button>
  </Form.Item>
</Form>
```

**水平布局**：
```jsx
<Form layout="horizontal">
  <Form.Item name="username" label="用户名">
    <Input style={{ width: 200 }} />
  </Form.Item>
</Form>
```

**内联布局**：
```jsx
<Form layout="inline">
  <Form.Item name="username" label="用户名">
    <Input style={{ width: 200 }} />
  </Form.Item>
  <Form.Item name="password" label="密码">
    <Input.Password style={{ width: 200 }} />
  </Form.Item>
  <Form.Item>
    <Button type="primary" htmlType="submit">提交</Button>
  </Form.Item>
</Form>
```

**编辑回填**：
```jsx
// 设置初始值
form.setFieldsValue({
  username: '张三',
  password: '123456',
});

// 获取值
const values = form.getFieldsValue();
```

**表单验证规则**：
```jsx
<Form.Item
  name="email"
  label="邮箱"
  rules={[
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入有效的邮箱地址' },
  ]}
/>

<Form.Item
  name="phone"
  label="手机号"
  rules={[
    { required: true, message: '请输入手机号' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
  ]}
/>
```

---

## 附录：常用模式

### 受控组件模式

```jsx
// Input 受控
const [value, setValue] = React.useState('');
<Input value={value} onChange={(e) => setValue(e.target.value)} />

// Select 受控
const [selected, setSelected] = React.useState('');
<Select value={selected} onChange={setSelected} options={[]} />
```

### 列表渲染

```jsx
// 数组映射
{data.map((item, index) => (
  <div key={item.id}>
    <span>{item.name}</span>
    <Button onClick={() => handleDelete(item.id)}>删除</Button>
  </div>
))}
```

### 条件渲染

```jsx
// 简单条件
{visible && <Modal open={visible} />}

// 复杂条件
{status === 'success' ? (
  <Alert type="success" message="成功" />
) : status === 'error' ? (
  <Alert type="error" message="失败" />
) : (
  <Alert type="info" message="等待中" />
)}
```

### 阻止默认行为

```jsx
<form onSubmit={(e) => {
  e.preventDefault();
  handleSubmit();
}}>
```

### useEffect 依赖

```jsx
// 模拟 componentDidMount
React.useEffect(() => {
  loadData();
}, []);

// 模拟 componentDidUpdate
React.useEffect(() => {
  loadData(param);
}, [param]);

// 清理
React.useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer);
}, []);
```

### fetch 数据模式

```jsx
React.useEffect(() => {
  setLoading(true);
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: value }),
  })
    .then((res) => res.json())
    .then((data) => {
      setLoading(false);
      setData(data);
    })
    .catch((err) => {
      setLoading(false);
      message.error('请求失败');
    });
}, []);
```