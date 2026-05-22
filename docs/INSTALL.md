# 安装指南

## 一、安装插件

### 方式一：通过 Marketplace CLI（推荐）

在 Claude Code 中输入：

```
/plugin marketplace install fr-flow-plugin
```

重启 Claude Code 后生效。

### 方式二：手动克隆

```bash
# 克隆到 Claude Code 的 marketplace 插件目录
# Windows: %USERPROFILE%\.claude\plugins\marketplaces\
# Linux/macOS: ~/.claude/plugins/marketplaces/

cd ~/.claude/plugins/marketplaces/
git clone https://github.com/toStudyVUE/fr-flow-v3.git fr-flow-v3
```

---

## 二、配置本地环境

### 2.1 创建 .fr.yaml

```bash
cd ~/.claude/plugins/marketplaces/fr-flow-v3/fr-flow-v3
cp .fr.yaml.example .fr.yaml
```

编辑 `.fr.yaml`，替换所有占位符为实际值：

```yaml
paths:
  projects_dir: /home/you/fr-antd-project          # 开发中间产物存放处
  finereport_reportlets: /path/to/FineReport/webapps/webroot/WEB-INF/reportlets

finereport:
  server_url: http://localhost:18080/              # 帆软服务地址（含端口）
  preview_path: /webroot/decision/view/report?op=write&reportlet=
  admin_user: admin
  admin_pwd: your_password

mysql:
  host: localhost
  port: 3306
  database: common_db
  user: root
  password: your_password
```

**Windows 用户注意**：路径使用正斜杠 `/` 或双反斜杠 `\\`。

### 2.2 生成 settings.json 配置

```bash
bash scripts/sync_env.sh
```

脚本输出两部分：
1. **env 块**（复制到 settings.json）
2. **shared/PATHS.md**（自动生成到本地）

### 2.3 配置 settings.json

打开项目的 `.claude/settings.json`（如 `E:\fr-projects\.claude\settings.json`），填入：

```json
{
  "env": {
    "FR_WORKSPACE": "/home/you/.claude/plugins/marketplaces/fr-flow-v3/fr-flow-v3",
    "FR_PROJECTS_DIR": "/home/you/fr-antd-project",
    "FR_REPORTLETS": "/path/to/FineReport/webapps/webroot/WEB-INF/reportlets",
    "FR_SERVER_URL": "http://localhost:18080",
    "FR_PREVIEW_PATH": "/webroot/decision/view/report?op=write&reportlet=",
    "FR_ADMIN_USER": "admin",
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

**配置说明**：

| 字段 | 说明 |
|------|------|
| `env` | Agent 启动时注入的环境变量，技能 SKILL.md 直接通过 `$FR_*` 引用 |
| `FR_WORKSPACE` | sync_env.sh 自动检测，技能包根目录 |
| `FR_PROJECTS_DIR` | 项目工作目录，代码和文档存放处 |
| `FR_REPORTLETS` | 帆软 CPT 部署目录，工具链最终写入位置 |
| `FR_SERVER_URL` | 帆软服务地址，用于 api_tester 和 Playwright 测试 |
| `FR_PREVIEW_PATH` | 帆软填报预览 URL 前缀 |
| `FR_ADMIN_USER` | 帆软管理员账号（api_tester 登录用） |
| `FR_MYSQL_*` | 数据库连接参数（密码在 .fr.yaml 中） |
| `hooks.PreToolUse` | 权限守卫，阻止 Agent 修改技能包内文件 |

### 2.4 权限守卫

`hooks/permission-guard.js` 在 Agent 执行 Write/Edit/Delete/Bash 操作时介入：

- **黑名单**：禁止修改 `skills/`、`shared/`、`foundation/`、`scripts/`、`hooks/`
- **白名单**：允许操作 `$FR_PROJECTS_DIR` 和 `$FR_REPORTLETS`
- **放行**：`.fr.yaml` 用户配置文件

---

## 三、部署公共 CPT

```bash
# 将 foundation/public_cpt/ 复制到帆软 reportlets 目录
cp -r "$FR_WORKSPACE/foundation/public_cpt/"* "$FR_REPORTLETS/public_cpt/"

# api_tester 和 api_agent 放在 reportlets/api/ 下
mkdir -p "$FR_REPORTLETS/api"
cp "$FR_WORKSPACE/foundation/public_cpt/api/api_tester.cpt" "$FR_REPORTLETS/api/"
cp "$FR_WORKSPACE/foundation/public_cpt/api/api_agent.cpt" "$FR_REPORTLETS/api/"
```

**如果使用附件管理公共组件**，还需要执行存储过程：

```bash
MYSQL_PWD=$(grep 'password:' "$FR_WORKSPACE/.fr.yaml" | head -1 | sed 's/.*: *//')
mysql -h "$FR_MYSQL_HOST" -P "$FR_MYSQL_PORT" -u "$FR_MYSQL_USER" -p"$MYSQL_PWD" \
  "$FR_MYSQL_DATABASE" < "$FR_WORKSPACE/sql/attachment_overlay/procedures.sql"
```

详见 [`PUBLIC_CPT.md`](PUBLIC_CPT.md)。

---

## 四、安装 api_tester 依赖

```bash
cd "$FR_WORKSPACE/foundation/tools/api_tester"
npm install
npx playwright install chromium
```

---

## 五、验证安装

在 Claude Code 中输入：

```
/fr
```

看到技能列表即表示安装成功。

可以运行 demo 项目验证完整流水线：

```
/fr-pm
# 输入一个简单的 CRUD 需求，确认各角色能正常触发
```

---

## 六、已知问题

| 问题 | 处理方式 |
|------|----------|
| Windows `display_writer.py` Unicode 报错 | 设置 `PYTHONIOENCODING=utf-8` |
| Playwright `require('playwright')` 不可用 | 设置 `NODE_PATH` 指向 npm 全局目录，或用 `npx playwright` |
| 帆软平台管理未启动 | 打开设计器 → 服务器 → 报表平台管理 |
| SSH clone 失败 | 用 HTTPS：`git clone https://github.com/toStudyVUE/fr-flow-v3.git` |
