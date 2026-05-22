#!/bin/bash
# ============================================================================
# pack.sh — fr-flow-v3 技能包打包脚本
# ============================================================================
#
# 用途：从 marketplace 源目录同步最新技能文件到 GitHub 发布目录，
#       排除敏感文件和构建产物，准备好可直接 git commit + push。
#
# 使用场景：修改技能 SKILL.md、工具链、知识库后，运行此脚本更新打包。
#
# 用法：
#   bash pack.sh
#   bash pack.sh --dry-run        # 仅显示将要复制的内容，不实际复制
#   bash pack.sh --commit         # 打包后自动 git add + commit + push
#
# 环境要求：
#   - bash 4.0+
#   - find / cp / diff
#
# 路径约定（按需修改）：
#   SRC_DIR:   marketplace 源目录（技能包实际位置）
#   DST_DIR:   GitHub 发布目录（git 仓库所在位置）
# ============================================================================

set -euo pipefail

# ============================================================================
# 路径配置
# ============================================================================

# marketplace 源目录（Claude Code 插件安装位置）
SRC_DIR="${FR_SRC_DIR:-$HOME/.claude/plugins/marketplaces/fr-flow-v3/fr-flow-v3}"

# GitHub 发布目录（打包目标位置）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DST_DIR="${FR_DST_DIR:-$SCRIPT_DIR}"

# ============================================================================
# 参数解析
# ============================================================================

DRY_RUN=false
AUTO_COMMIT=false

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        --commit)  AUTO_COMMIT=true ;;
        --src=*)   SRC_DIR="${arg#*=}" ;;
        --dst=*)   DST_DIR="${arg#*=}" ;;
        *)
            echo "用法: bash pack.sh [--dry-run] [--commit] [--src=PATH] [--dst=PATH]"
            echo ""
            echo "  --dry-run  仅显示将要复制的文件，不实际复制"
            echo "  --commit   打包后自动 git add + commit + push"
            echo "  --src=PATH  marketplace 源目录（默认 ~/.claude/plugins/.../fr-flow-v3）"
            echo "  --dst=PATH  GitHub 发布目录（默认脚本所在目录）"
            exit 1
            ;;
    esac
done

# ============================================================================
# 前置检查
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  fr-flow-v3 技能包打包"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  源目录: $SRC_DIR"
echo "  目标目录: $DST_DIR"

if [[ ! -d "$SRC_DIR" ]]; then
    echo ""
    echo "❌ 源目录不存在: $SRC_DIR"
    echo "   请用 --src= 指定正确的 marketplace 路径"
    exit 1
fi

if [[ ! -d "$DST_DIR/.git" ]]; then
    echo ""
    echo "⚠️  目标目录不是 git 仓库（缺少 .git）"
    echo "   如果这是首次打包，请先: git clone https://github.com/toStudyVUE/fr-flow-v3.git \"$DST_DIR\""
    if [[ "$AUTO_COMMIT" == "true" ]]; then
        echo "   --commit 已自动取消"
        AUTO_COMMIT=false
    fi
fi

echo ""

# ============================================================================
# 排除规则
# ============================================================================

EXCLUDE_DIRS=(
    ".git"
    "__pycache__"
    "node_modules"
)

EXCLUDE_FILES=(
    ".fr.yaml"
    "*.pyc"
    "package-lock.json"
    "*.png"
    "*.jpg"
)

# ============================================================================
# 同步函数
# ============================================================================

sync_files() {
    local dir="$1"
    local src="$SRC_DIR/$dir"
    local dst="$DST_DIR/$dir"

    if [[ ! -d "$src" ]]; then
        echo "  ⏭ 跳过（源目录不存在）: $dir"
        return
    fi

    # 构建 find 排除参数
    local find_exclude=""
    for ed in "${EXCLUDE_DIRS[@]}"; do
        find_exclude="$find_exclude -not -path */$ed/* -not -name $ed"
    done
    for ef in "${EXCLUDE_FILES[@]}"; do
        find_exclude="$find_exclude -not -name '$ef'"
    done

    local count=0
    while IFS= read -r f; do
        local rel="${f#$src/}"
        local target="$dst/$rel"

        # 检查是否需要更新（内容不同或不存在）
        if [[ -f "$target" ]]; then
            if cmp -s "$f" "$target" 2>/dev/null; then
                continue  # 内容相同，跳过
            fi
        fi

        if [[ "$DRY_RUN" == "true" ]]; then
            echo "  → $dir/$rel"
        else
            mkdir -p "$(dirname "$target")"
            cp "$f" "$target"
        fi
        ((count++)) || true
    done < <(cd "$src" && find "$dir" -type f $find_exclude 2>/dev/null || true)

    if [[ $count -gt 0 ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            echo "  📋 共 $count 个文件需要更新"
        else
            echo "  ✅ $dir — $count 个文件已更新"
        fi
    else
        echo "  ✅ $dir — 无变化"
    fi
}

# ============================================================================
# 执行同步
# ============================================================================

SYNC_DIRS=(
    ".claude-plugin"
    "foundation"
    "hooks"
    "schemas"
    "scripts"
    "shared"
    "skills"
)

echo "▶ 同步技能文件..."
echo ""

for dir in "${SYNC_DIRS[@]}"; do
    sync_files "$dir"
done

echo ""

# 同步根目录非代码文件
echo "▶ 同步根目录配置文件..."
for f in .fr.yaml.example .gitignore; do
    if [[ -f "$SRC_DIR/$f" ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            echo "  → $f"
        else
            cp "$SRC_DIR/$f" "$DST_DIR/"
            echo "  ✅ $f"
        fi
    fi
done

echo ""

# ============================================================================
# 验证：确保敏感文件不会出现在目标目录
# ============================================================================

echo "▶ 安全检查..."
if [[ -f "$DST_DIR/.fr.yaml" ]]; then
    echo "  ⚠️  警告：.fr.yaml 存在于目标目录（含密码，不应提交）"
    echo "      .gitignore 已配置排除，但请确认文件内容未泄露"
fi

if [[ -d "$DST_DIR/foundation/tools/api_tester/node_modules" ]]; then
    echo "  ⚠️  警告：node_modules 存在于目标目录"
    echo "      将不会包含在 git commit 中（.gitignore 已排除）"
fi

echo "  ✅ 安全检查完成"

echo ""

# ============================================================================
# Git 操作
# ============================================================================

if [[ "$DRY_RUN" == "true" ]]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  --dry-run 模式完成。去掉 --dry-run 执行实际复制。"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
fi

echo "▶ 检查 git 状态..."
cd "$DST_DIR"
GIT_STATUS=$(git status --short 2>/dev/null || echo "")

if [[ -z "$GIT_STATUS" ]]; then
    echo "  ✅ 无变更，工作区干净"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  打包完成（无变更）"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
fi

echo "$GIT_STATUS"
echo ""

if [[ "$AUTO_COMMIT" == "true" ]]; then
    echo "▶ 自动提交 + 推送..."
    git add -A
    git status --short

    # 生成 commit message
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    COMMIT_MSG="chore: sync latest skill files ($TIMESTAMP)

- 同步 marketplace 源目录最新变更
- 更新技能 SKILL.md / 工具链 / 知识库
- 由 pack.sh 自动打包"

    git commit -m "$COMMIT_MSG"
    git push origin main

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  打包完成，已推送到 GitHub"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  打包完成。请检查变更后手动提交："
    echo ""
    echo "    cd \"$DST_DIR\""
    echo "    git add -A"
    echo "    git commit -m 'chore: sync skill files'"
    echo "    git push origin main"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
