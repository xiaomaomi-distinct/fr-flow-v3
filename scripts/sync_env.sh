#!/bin/bash
# ============================================================================
# sync_env.sh — 从 .fr.yaml 同步生成 env 配置
#
# 输出两样东西：
#   1. settings.json 的 env 块（非敏感字段，Agent 启动即注入）
#   2. shared/PATHS.md（Markdown 速查表，供 SKILL.md 引用）
#
# 用法:
#   bash scripts/sync_env.sh
#   或指定输出目录:
#   bash scripts/sync_env.sh --target-dir /path/to/project
#
# 变更 .fr.yaml 后跑一次即可，全技能自动跟随。
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(cd "${SCRIPT_DIR}/.." && pwd)"
FR_YAML="${WORKSPACE}/.fr.yaml"
TARGET_DIR="${WORKSPACE}"

# 解析 --target-dir 参数
for arg in "$@"; do
    if [[ "$arg" == --target-dir=* ]]; then
        TARGET_DIR="${arg#*=}"
    elif [[ "$arg" == --target-dir ]]; then
        shift
        TARGET_DIR="$1"
    fi
done

if [[ ! -f "$FR_YAML" ]]; then
    echo "ERROR: .fr.yaml not found at $FR_YAML"
    exit 1
fi

# ============================================================================
# 简单 YAML 解析（不依赖外部工具）
# ============================================================================

declare -A YAML_VALUES

parse_yaml() {
    local section=""
    local indent=0
    while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        [[ "$line" =~ ^[[:space:]]*# ]] && continue

        local leading="${line%%[![:space:]]*}"
        local i=${#leading}
        local content="${line#"$leading"}"

        if [[ "$content" != *": "* ]]; then
            section="${content%%:*}"
            section="${section//-/_}"
            continue
        fi

        local key="${content%%:*}"
        local val="${content#*: }"
        val="${val#\"}"; val="${val%\"}"
        val="${val#\'}"; val="${val%\'}"
        key="${key//-/_}"

        local full_key
        if (( i == 0 )); then
            full_key="$key"
        else
            full_key="${section}_${key}"
        fi
        YAML_VALUES["$full_key"]="$val"
    done < "$FR_YAML"
}

parse_yaml

# ============================================================================
# 1. 生成 settings.json env 块（去敏感字段）
# ============================================================================

# 读取 YAML 值（带默认值）
W_PROJECTS_DIR="${YAML_VALUES[paths_projects_dir]:-/home/zeng/fr-antd-project}"
W_REPORTLETS="${YAML_VALUES[paths_finereport_reportlets]:-/home/zeng/FineReport_designer/webapps/webroot/WEB-INF/reportlets}"
W_SERVER_URL="${YAML_VALUES[finereport_server_url]:-http://localhost:18080}"
W_PREVIEW_PATH="${YAML_VALUES[finereport_preview_path]:-/webroot/decision/view/report?op=write&reportlet=}"
W_ADMIN_USER="${YAML_VALUES[finereport_admin_user]:-admin}"
W_MYSQL_HOST="${YAML_VALUES[mysql_host]:-localhost}"
W_MYSQL_PORT="${YAML_VALUES[mysql_port]:-13306}"
W_MYSQL_DATABASE="${YAML_VALUES[mysql_database]:-common_db}"
W_MYSQL_USER="${YAML_VALUES[mysql_user]:-finereport}"

# 直接生成 env block（不用占位符替换，避免特殊字符问题）
ENV_BLOCK=$(cat <<ENVEOF
  "env": {
    "FR_WORKSPACE": "${WORKSPACE}",
    "FR_PROJECTS_DIR": "${W_PROJECTS_DIR}",
    "FR_REPORTLETS": "${W_REPORTLETS}",
    "FR_SERVER_URL": "${W_SERVER_URL}",
    "FR_PREVIEW_PATH": "${W_PREVIEW_PATH}",
    "FR_ADMIN_USER": "${W_ADMIN_USER}",
    "FR_MYSQL_HOST": "${W_MYSQL_HOST}",
    "FR_MYSQL_PORT": "${W_MYSQL_PORT}",
    "FR_MYSQL_DATABASE": "${W_MYSQL_DATABASE}",
    "FR_MYSQL_USER": "${W_MYSQL_USER}"
  }
ENVEOF
)

# ============================================================================
# 2. 生成 shared/PATHS.md 速查表
# ============================================================================

generate_paths_md() {
    cat <<MDEOF
# 环境路径速查表

> 由 \`scripts/sync_env.sh\` 自动生成，每次修改 \`.fr.yaml\` 后重新运行。
> 生成时间: $(date '+%Y-%m-%d %H:%M:%S')

## 路径变量

| 变量 | 值 | 说明 |
|------|-----|------|
| \`\$FR_WORKSPACE\` | \`$WORKSPACE\` | 技能包根目录 |
| \`\$FR_PROJECTS_DIR\` | \`${W_PROJECTS_DIR}\` | 项目工作目录 |
| \`\$FR_REPORTLETS\` | \`${W_REPORTLETS}\` | 帆软报表部署目录 |

## 服务地址

| 变量 | 值 | 说明 |
|------|-----|------|
| \`\$FR_SERVER_URL\` | \`${W_SERVER_URL}\` | 帆软服务地址 |
| \`\$FR_PREVIEW_PATH\` | \`${W_PREVIEW_PATH}\` | 预览路径前缀 |

## MySQL 连接

| 变量 | 值 | 说明 |
|------|-----|------|
| \`\$FR_MYSQL_HOST\` | \`${W_MYSQL_HOST}\` | 数据库主机 |
| \`\$FR_MYSQL_PORT\` | \`${W_MYSQL_PORT}\` | 数据库端口 |
| \`\$FR_MYSQL_DATABASE\` | \`${W_MYSQL_DATABASE}\` | 数据库名 |
| \`\$FR_MYSQL_USER\` | \`${W_MYSQL_USER}\` | 数据库用户 |

> 数据库密码等敏感信息存储在 \`.fr.yaml\` 中，不在环境变量里。
> 需要密码时，从 \`.fr.yaml\` 按需读取。
MDEOF
}

# ============================================================================
# 输出
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  fr-flow-v3 环境同步"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 输出 env block 到 stdout
echo "▶ settings.json env 块（复制到 .claude/settings.json）："
echo ""
echo "$ENV_BLOCK"
echo ""

# 写入 PATHS.md
PATHS_FILE="${WORKSPACE}/shared/PATHS.md"
generate_paths_md > "$PATHS_FILE"
echo "▶ PATHS.md 已写入: $PATHS_FILE"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  同步完成。"
echo "  1. 将上方的 env 块合并到项目的 .claude/settings.json"
echo "  2. SKILL.md 中通过 \$FR_* 变量直接使用路径"
echo "  3. 数据库密码仍需从 .fr.yaml 读取"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
