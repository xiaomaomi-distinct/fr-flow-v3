# 配置详解

## 配置文件总览

| 文件 | 位置 | 用途 |
|------|------|------|
| `.fr.yaml` | `$FR_WORKSPACE/` | 本地环境参数（路径、数据库、密码） |
| `.claude/settings.json` | 项目根目录 | Claude Code 环境变量 + Hooks |
| `shared/PATHS.md` | `$FR_WORKSPACE/shared/` | 路径速查表（sync_env.sh 自动生成） |

---

## 一、.fr.yaml 字段说明

```yaml
# ===== 路径配置 =====
paths:
  projects_dir          # 项目工作目录，存放代码、文档、SQL 等中间产物
                        # Agent 的代码产出写入此目录
  finereport_reportlets  # 帆软 CPT 部署目录，最终 CPT 文件落盘位置
                        # 通常是 FineReport/webapps/webroot/WEB-INF/reportlets

# ===== 帆软服务 =====
finereport:
  server_url            # 帆软设计器内置 Tomcat 地址（含端口）
                        # 用于 api_tester 和 Playwright 浏览器测试
  preview_path          # 帆软填报预览 URL 前缀
                        # 默认: /webroot/decision/view/report?op=write&reportlet=
  admin_user            # 帆软管理员用户名
  admin_pwd             # 帆软管理员密码（api_tester 登录用）

# ===== MySQL 数据库 =====
mysql:
  host                  # 数据库主机地址
  port                  # 数据库端口（默认 3306）
  database              # 数据库名（默认 common_db）
  user                  # 数据库用户名
  password              # 数据库密码（不在 env 中暴露，仅从 .fr.yaml 按需读取）
```

---

## 二、sync_env.sh 做了什么

```bash
bash scripts/sync_env.sh
```

1. 读取 `.fr.yaml`，解析所有键值
2. 输出 settings.json 的 `env` 块（排除 `password`、`admin_pwd` 敏感字段）
3. 生成 `shared/PATHS.md`（Markdown 速查表，供 SKILL.md 引用）

**每次修改 .fr.yaml 后运行一次即可**，所有技能 SKILL.md 通过 `$FR_*` 变量自动跟随。

---

## 三、settings.json 完整参考

```json
{
  "env": {
    // ===== 路径变量 =====
    "FR_WORKSPACE": "/path/to/fr-flow-v3",
    "FR_PROJECTS_DIR": "/path/to/your-projects",
    "FR_REPORTLETS": "/path/to/FineReport/webapps/webroot/WEB-INF/reportlets",

    // ===== 帆软服务 =====
    "FR_SERVER_URL": "http://localhost:18080",
    "FR_PREVIEW_PATH": "/webroot/decision/view/report?op=write&reportlet=",
    "FR_ADMIN_USER": "admin",

    // ===== MySQL =====
    "FR_MYSQL_HOST": "localhost",
    "FR_MYSQL_PORT": "13306",
    "FR_MYSQL_DATABASE": "common_db",
    "FR_MYSQL_USER": "finereport"
  },

  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|Delete|Bash",
        "command": "node ${FR_WORKSPACE}/hooks/permission-guard.js"
      }
    ]
  }
}
```

### 环境变量一览

| 变量 | 来源 | 使用者 |
|------|------|--------|
| `$FR_WORKSPACE` | sync_env.sh 自动检测 | 全体技能 |
| `$FR_PROJECTS_DIR` | `.fr.yaml` paths.projects_dir | data-dev, display-dev, qa |
| `$FR_REPORTLETS` | `.fr.yaml` paths.finereport_reportlets | data-dev, display-dev |
| `$FR_SERVER_URL` | `.fr.yaml` finereport.server_url | api_tester, Playwright |
| `$FR_PREVIEW_PATH` | `.fr.yaml` finereport.preview_path | display-dev |
| `$FR_ADMIN_USER` | `.fr.yaml` finereport.admin_user | api_tester |
| `$FR_MYSQL_HOST` | `.fr.yaml` mysql.host | data-dev |
| `$FR_MYSQL_PORT` | `.fr.yaml` mysql.port | data-dev |
| `$FR_MYSQL_DATABASE` | `.fr.yaml` mysql.database | data-dev |
| `$FR_MYSQL_USER` | `.fr.yaml` mysql.user | data-dev |

> **密码不在环境变量中**。`$FR_MYSQL_PWD` 和 `$FR_ADMIN_PWD` 不注入环境。Agent 在需要时从 `$FR_WORKSPACE/.fr.yaml` 按需读取。

---

## 四、PreToolUse Hook 权限模型

`hooks/permission-guard.js` 保护技能包文件不被误改。

### 黑名单（拒绝修改）

| 路径模式 | 示例 |
|----------|------|
| `skills/` | skills/fr-pm/SKILL.md |
| `shared/` | shared/KNOWLEDGE/ARCHITECTURE.md |
| `foundation/` | foundation/templates/base_cpt_page.cpt |
| `scripts/` | scripts/data/data_writer.py |
| `hooks/` | hooks/permission-guard.js |

### 白名单（允许操作）

| 路径模式 | 说明 |
|----------|------|
| 含 `projects` 的目录段 | $FR_PROJECTS_DIR 及其子目录 |
| `.fr.yaml` 中的 `finereport_reportlets` | 帆软 CPT 部署目录及其子目录 |

### 放行

- `.fr.yaml` 用户配置文件
- PostToolUse / Notification 等其他 Hook 事件
- Agent 不使用 Write/Edit/Delete/Bash 工具的场景

---

## 五、多环境配置

如果团队有多套环境（开发/测试/生产），可以创建多个 `.fr.yaml` 副本：

```bash
.fr.yaml.dev        # 开发环境
.fr.yaml.test       # 测试环境
.fr.yaml.prod       # 生产环境

# 切换环境
cp .fr.yaml.dev .fr.yaml && bash scripts/sync_env.sh
```

**注意**：生产环境的 `.fr.yaml` 不要在 GitHub 上泄露。`.gitignore` 已排除所有 `.fr.yaml` 文件。
