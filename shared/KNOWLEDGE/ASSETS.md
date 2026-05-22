# 公共组件

以下模板已内置完整功能，业务开发中直接引用，无需重复建设。

---

## 一、附件管理（sftp_file_overlay）

**模板路径**: `public_cpt/sftp_file_overlay/sftp_file_edit_overlay.cpt`

**能力**: 上传 / 文件列表 / 逐条下载 / 打包下载 / 逐条删除 / 全部删除

**依赖**:
- 数据库表: `common_db.ftp_file_record`（已存在）
- 存储过程: `sp_attachment_delete` / `sp_attachment_delete_all`
- FR 全局参数: `file_upload_dir_new`、`file_service_ip_new`
- SFTP 连接: `sftp_connect`（FR 后台配置）

**集成方式**:

任何需要附件的业务页面，通过 Modal + iframe 加载：

```
${servletURL}?viewlet=/public_cpt/sftp_file_overlay/sftp_file_edit_overlay.cpt
  &op=write
  &file_path_uuid={UUID}
  &busi_path={模块名}
```

业务侧接入步骤：
1. 生成 UUID 作为附件关联标识
2. 用 Modal + iframe 打开上述 URL（传入 UUID 和模块名）
3. 提交业务表单时把 UUID 一起存入业务表
4. 查看/编辑时用同一个 UUID 打开附件管理

**目录结构**:
```
public_cpt/sftp_file_overlay/
├── sftp_file_edit.cpt              ← 基础上传模板（不动）
├── sftp_file_edit_overlay.cpt      ← 加壳版（蒙版 + antd + /api/data）
└── data/
    └── attachment_data.cpt         ← 数据层（查询 + 删除）
```

---

## 二、外部 API 代理（api_agent）

**模板路径**: `api/api_agent.cpt`

**能力**: 代理调用外部 HTTP 接口，封装响应为 FR 标准 JSON 格式

**调用方式**:

```
POST /api/report
{
  "report_path": "api/api_agent.cpt",
  "start_page": 1, "end_page": 1,
  "parameters": [
    { "name": "p_url", "type": "String", "value": "https://external-api/endpoint" },
    { "name": "p_body", "type": "String", "value": "{...}" }
  ]
}
```

响应三层错误体系：帆软层(err_code) → 代理层(A1 解析) → 外部 API 层(success字段)。详见 `ARCHITECTURE.md` 第九节。

**使用场景**: 任何需要调用外部 HTTP 接口的业务（明道云、第三方服务、Webhook 等），通过 `api_agent.cpt` 统一代理，不直接在 CPT 中写 URL。

---

## 三、附件管理旧版（sftp_file）

> **注意**: 此版本为原始帆软设计器开发的模板，新项目优先使用 sftp_file_overlay。

**模板路径**: `public_cpt/sftp_file/`

| 文件 | 说明 |
|------|------|
| `sftp_file_edit.cpt` | 附件管理（填报模式，原生 FR 控件） |
| `sftp_file_download.cpt` | 附件下载页（只读） |
| `sftp_file_del_confirm.cpt` | 删除确认弹窗 |

**适用场景**: 需要在原有 FR 设计器环境中直接使用的附件管理（不经过加壳框架）。

---

## 四、开发工具

| 模板 | 路径 | 说明 |
|------|------|------|
| api_tester | `api/api_tester.cpt` | 数据层接口验证（data-dev 专用），输入 CPT 路径 + 数据集名称 + 参数，发送请求并显示响应 |

---

## 五、API 响应处理器

| 模板 | 路径 | 说明 |
|------|------|------|
| 通用响应代理 | `public_cpt/api_rs/mobile_dev_agent_rs.cpt` | 通用 API 调用结果展示（loading 动画 + 倒计时关闭 + 回调） |
| 带回调响应代理 | `public_cpt/api_rs/agent_rs_with_callback.cpt` | 同上 + 支持 parent.callbackFunction |

**使用场景**: 在调用外部接口后，用这些模板展示"处理中..."和结果反馈，避免用户面对空白等待。
