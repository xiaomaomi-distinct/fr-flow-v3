# 环境路径速查表

> 由 `scripts/sync_env.sh` 自动生成，每次修改 `.fr.yaml` 后重新运行。
> 生成时间: 2026-05-13 14:44:50

## 路径变量

| 变量 | 值 | 说明 |
|------|-----|------|
| `$FR_WORKSPACE` | `/home/zeng/.claude/plugins/marketplaces/fr-flow-v3` | 技能包根目录 |
| `$FR_PROJECTS_DIR` | `/home/zeng/fr-antd-project` | 项目工作目录 |
| `$FR_REPORTLETS` | `/home/zeng/FineReport_designer/webapps/webroot/WEB-INF/reportlets` | 帆软报表部署目录 |

## 服务地址

| 变量 | 值 | 说明 |
|------|-----|------|
| `$FR_SERVER_URL` | `http://localhost:18080` | 帆软服务地址 |
| `$FR_PREVIEW_PATH` | `/webroot/decision/view/report?op=write&reportlet=` | 预览路径前缀 |

## MySQL 连接

| 变量 | 值 | 说明 |
|------|-----|------|
| `$FR_MYSQL_HOST` | `localhost` | 数据库主机 |
| `$FR_MYSQL_PORT` | `13306` | 数据库端口 |
| `$FR_MYSQL_DATABASE` | `common_db` | 数据库名 |
| `$FR_MYSQL_USER` | `finereport` | 数据库用户 |

> 数据库密码等敏感信息存储在 `.fr.yaml` 中，不在环境变量里。
> 需要密码时，从 `.fr.yaml` 按需读取。
