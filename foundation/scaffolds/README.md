# 脚手架目录

每个 `starter_*.jsx` 文件对应 `dev_task.json` 中 `pages[].type` 的一种取值。display-dev 按 type 选择对应脚手架，开发者只需填写数据集调用和字段映射。

## 已支持的类型

| `type` | 脚手架 | 布局说明 |
|--------|--------|----------|
| `list` | starter_list.jsx | 搜索栏左 + 新增按钮右 → Table → 分页组件 |
| `form` | starter_form.jsx | Modal 弹窗，Form vertical，底部取消+保存 |
| `detail` | starter_detail.jsx | 独立页面，Descriptions bordered，顶部返回 |
| `batch` | starter_batch.jsx | 4 步向导（选择→预览→写入→结果），自定义步骤条 |
| `selector` | starter_selector.jsx | Modal 弹窗，搜索+Table(rowSelection)+底部固定栏 |
| *（其他） | starter.jsx | 通用骨架，无预设布局 |

## 脚手架结构

每个脚手架包含：

```
固定段（禁止修改）
├── PATH 对象         —— 路径动态解析
├── hideStyle         —— 隐藏帆软框架
├── app-root          —— React 挂载点
└── zhCN + ConfigProvider —— 中文国际化

骨架代码（可直接使用）
├── 标准布局结构      —— 按类型约定好的组件排列
├── 状态管理          —— loading/data/total/page 等
└── iframe 通信       —— postMessage 收发

填空区（开发者修改，搜索 "TODO"）
├── 页面标题 / 模块名
├── 数据层 CPT 文件 + 数据集名称
├── 筛选字段 / 表单字段 / 表格列
└── 新增/编辑/删除 的 datasource_name + parameters
```

## 新增类型

要为新的 `type` 添加脚手架：

1. 复制最相近的 `starter_*.jsx` → 改名为 `starter_新type.jsx`
2. 实现该类型的标准布局骨架
3. 运行 `display_writer.py` 验证通过
4. 在本文件的"已支持类型"表中增加一行
5. 更新 `fr-display-dev/SKILL.md` 的 type→脚手架映射表
6. 在 `ANTD_REACT_GUIDE.md` 补充布局规范章节
