# 公共组件部署

`foundation/public_cpt/` 包含可复用的公共 CPT 模板，安装技能包后需一次性部署到帆软 reportlets 目录。

---

## 一、部署命令

```bash
# 公共组件 → reportlets/public_cpt/
cp -r "$FR_WORKSPACE/foundation/public_cpt/sftp_file_overlay" \
      "$FR_WORKSPACE/foundation/public_cpt/sftp_file" \
      "$FR_WORKSPACE/foundation/public_cpt/api_rs" \
      "$FR_REPORTLETS/public_cpt/"

# api_tester + api_agent → reportlets/api/
mkdir -p "$FR_REPORTLETS/api"
cp "$FR_WORKSPACE/foundation/public_cpt/api/api_tester.cpt" "$FR_REPORTLETS/api/"
cp "$FR_WORKSPACE/foundation/public_cpt/api/api_agent.cpt" "$FR_REPORTLETS/api/"
```

---

## 二、组件清单

### 附件管理（加壳版）

| 文件 | 部署路径 | 说明 |
|------|----------|------|
| `sftp_file_overlay/sftp_file_edit_overlay.cpt` | `public_cpt/sftp_file_overlay/` | 附件管理加壳版（antd UI + 原生上传） |
| `sftp_file_overlay/data/attachment_data.cpt` | `public_cpt/sftp_file_overlay/data/` | 数据层（查询 + 删除接口） |

**依赖**：
- 数据库表 `common_db.ftp_file_record`
- 存储过程（见下方"存储过程部署"）
- FR 全局参数 `file_upload_dir_new`、`file_service_ip_new`
- FR 后台 SFTP 连接 `sftp_connect`

**业务集成方式**：

```
${servletURL}?viewlet=/public_cpt/sftp_file_overlay/sftp_file_edit_overlay.cpt
  &op=write
  &file_path_uuid={业务UUID}
  &busi_path={模块名}
```

业务侧：
1. 生成 UUID 作为附件关联标识
2. 用 Modal + iframe 打开上述 URL
3. 提交业务表单时把 UUID 一起存入业务表
4. 查看/编辑时用同一个 UUID 打开附件管理

### 外部 API 代理

| 文件 | 部署路径 | 说明 |
|------|----------|------|
| `api/api_agent.cpt` | `api/` | 代理调用外部 HTTP 接口，封装为 FR 标准 JSON |

Type B（`external_api_proxy`）项目的通用数据层模板，全局共用一份。

调用方式：

```
POST /api/report
{
  "report_path": "api/api_agent.cpt",
  "parameters": [
    { "name": "p_url", "type": "String", "value": "https://external-api/endpoint" },
    { "name": "p_body", "type": "String", "value": "{...}" }
  ]
}
```

### API 测试工具

| 文件 | 部署路径 | 说明 |
|------|----------|------|
| `api/api_tester.cpt` | `api/` | 数据层接口验证工具（data-dev 专用） |

fr-data-dev 角色在接口验证环节使用此工具，自动填写 CPT 路径 + 数据集名称 + 参数，发送请求并显示响应。

### 附件管理（原始版）

| 文件 | 部署路径 | 说明 |
|------|----------|------|
| `sftp_file/sftp_file_edit.cpt` | `public_cpt/sftp_file/` | 原版附件管理（FR 原生控件） |
| `sftp_file/sftp_file_download.cpt` | `public_cpt/sftp_file/` | 原版附件下载页 |
| `sftp_file/sftp_file_del_confirm.cpt` | `public_cpt/sftp_file/` | 原版删除确认弹窗 |

> 新项目优先使用加壳版（sftp_file_overlay）。原始版保留供参考或在传统 FR 设计器场景中使用。

### API 响应处理器

| 文件 | 部署路径 | 说明 |
|------|----------|------|
| `api_rs/mobile_dev_agent_rs.cpt` | `public_cpt/api_rs/` | 通用 API 调用结果展示（loading + 倒计时关闭） |
| `api_rs/agent_rs_with_callback.cpt` | `public_cpt/api_rs/` | 同上 + 支持 parent.callbackFunction |

适用场景：调用外部接口后展示"处理中..."和结果反馈。

---

## 三、存储过程部署

如果使用附件管理公共组件，需在 `common_db` 中创建存储过程：

### 前置条件

`ftp_file_record` 表由帆软 SFTP 上传插件首次上传文件时自动创建。确保至少有过一次文件上传操作。

### 执行存储过程脚本

```bash
cd "$FR_WORKSPACE"

# 从 .fr.yaml 读取密码
MYSQL_PWD=$(grep 'password:' "$FR_WORKSPACE/.fr.yaml" | head -1 | sed 's/.*: //')

mysql -h "$FR_MYSQL_HOST" -P "$FR_MYSQL_PORT" -u "$FR_MYSQL_USER" -p"$MYSQL_PWD" \
  "$FR_MYSQL_DATABASE" < sql/attachment_overlay/procedures.sql
```

### 存储过程说明

| 存储过程 | 功能 | 说明 |
|----------|------|------|
| `sp_attachment_delete` | 软删除单条附件 | 设置 curr_status='2'，记录操作人 |
| `sp_attachment_delete_all` | 软删除指定 UUID 下全部附件 | 按 file_path_uuid 批量标记删除 |

两种操作均为**软删除**，不物理删除记录和文件。

---

## 四、更新公共组件

技能包更新后，如果 `foundation/public_cpt/` 有变更，重新执行部署命令即可：

```bash
cp -r "$FR_WORKSPACE/foundation/public_cpt/"* "$FR_REPORTLETS/public_cpt/"
cp "$FR_WORKSPACE/foundation/public_cpt/api/api_tester.cpt" "$FR_REPORTLETS/api/"
cp "$FR_WORKSPACE/foundation/public_cpt/api/api_agent.cpt" "$FR_REPORTLETS/api/"
```

已存在的 CPT 会被覆盖，不影响已部署的业务项目（业务项目在各自的 `{project}/` 子目录下）。
