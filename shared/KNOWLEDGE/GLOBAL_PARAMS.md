# 全局参数速查

> 来源：内网决策系统全局参数配置
> 取值方式：SQL 中 `'${参数名}'`，JS 中 `FR.remoteEvaluate("=$参数名")`

## 权限类（数据隔离）

| 参数名 | 取值方式 | 说明 |
|--------|----------|------|
| `ihr_dept_id` | `FR.remoteEvaluate("=$ihr_dept_id")` | 登录用户在人力系统的部门 ID |
| `ihr_dept_id_p` | `FR.remoteEvaluate("=$ihr_dept_id_p")` | 登录用户的管辖部门 ID（一级部门/支行） |
| `user_branch_no_p` | `FR.remoteEvaluate("=$user_branch_no_p")` | 登录用户的一级部门核心机构码 |
| `user_branch_no` | `FR.remoteEvaluate("=$user_branch_no")` | 登录用户的核心机构码 |

**SQL 中用法**：
```sql
-- 按部门隔离
WHERE dept_id = '${ihr_dept_id}'

-- 管理员看全部，其余按管辖部门
${if(INARRAY("管理员", $fine_role) > 0, "", "AND dept_id = '" + $ihr_dept_id_p + "'")}
```

## 环境类

| 参数名 | 说明 |
|--------|------|
| `env_desc` | 环境描述（测试/生产） |

**用法**：根据环境切换行为（如测试环境显示调试信息）。

## 服务地址类

| 参数名 | 说明 |
|--------|------|
| `fine_report_dev_service` | 帆软二开服务地址 |
| `sync_v2_url` | 数据同步服务器地址（引用 `$fine_report_dev_service`） |
| `dev_agent_url` | Java 服务地址 |
| `mobile_py_url` | Python 服务地址 |
| `pm_url` | 项目管理 URL |

**用法**：Type B 外部 API 代理场景，JS 中通过 `FR.remoteEvaluate` 取值后拼接：
```javascript
var baseUrl = FR.remoteEvaluate("=$fine_report_dev_service");
var p_url = baseUrl + "/api/xxx";
```

## 文件类

| 参数名 | 说明 |
|--------|------|
| `file_upload_dir_new` | 文件上传路径 |
| `file_service_ip_new` | 文件服务器地址 |

---

## 帆软内置会话参数

| 参数名 | 说明 | 来源 |
|--------|------|------|
| `fine_username` | 登录用户名 | 登录 Session |
| `fine_role` | 用户角色（数组） | 登录 Session |
| `fine_dept` | 用户部门名称 | 登录 Session |

**内置参数不需要 `$` 前缀即可在 SQL 中使用**（如 `${fine_username}`），自定义参数需要 `$` 前缀（如 `${ihr_dept_id}` 或 `'${ihr_dept_id}'`）。
