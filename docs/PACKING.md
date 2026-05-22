# 打包与更新流程

## 目录说明

fr-flow-v3 有两份目录：

| 目录 | 位置 | 用途 |
|------|------|------|
| 源目录（src） | `~/.claude/plugins/marketplaces/fr-flow-v3/fr-flow-v3/` | Claude Code 实际加载的技能包，日常修改在这里 |
| 发布目录（dist） | `E:/fr-projects/fr-flow-v3/` | GitHub 发布仓库，对外分发的打包产物 |

## 标准更新流程

```
1. 在 marketplace 源目录修改技能文件
     ↓
2. 在 Claude Code 中测试验证
     ↓
3. 运行 pack.sh 同步到发布目录
     ↓
4. 检查 git diff，确认变更正确
     ↓
5. git commit + push 到 GitHub
```

## pack.sh 使用

### 基本用法

```bash
cd E:/fr-projects/fr-flow-v3
bash pack.sh
```

### 预览模式

```bash
bash pack.sh --dry-run
```

仅显示将要复制的文件，不实际复制。

### 自动提交

```bash
bash pack.sh --commit
```

打包完成后自动 `git add -A && git commit && git push`。

commit message 格式：
```
chore: sync latest skill files (2026-05-22 10:30:00)

- 同步 marketplace 源目录最新变更
- 更新技能 SKILL.md / 工具链 / 知识库
- 由 pack.sh 自动打包
```

### 自定义路径

```bash
# 指定不同的源目录
bash pack.sh --src=/custom/path/to/fr-flow-v3

# 指定不同的目标目录
bash pack.sh --dst=/custom/publish/dir
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `FR_SRC_DIR` | `~/.claude/plugins/marketplaces/fr-flow-v3/fr-flow-v3` | 源目录 |
| `FR_DST_DIR` | pack.sh 所在目录 | 目标目录 |

## 同步内容

pack.sh 同步以下目录：

| 目录 | 说明 |
|------|------|
| `.claude-plugin/` | 插件配置 |
| `foundation/` | 模板、脚手架、工具、公共 CPT |
| `hooks/` | 权限守卫 |
| `schemas/` | JSON Schema |
| `scripts/` | 工具链（data_writer / display_writer） |
| `shared/` | 知识库文档 |
| `skills/` | 四角色技能定义 |

## 自动排除

以下内容不会被同步（通过 pack.sh 的排除规则 + .gitignore 双重保护）：

| 排除项 | 原因 |
|--------|------|
| `.fr.yaml` | 用户本地配置（含密码） |
| `__pycache__/` / `*.pyc` | Python 构建缓存 |
| `node_modules/` | npm 依赖（用户本地安装） |
| `package-lock.json` | 自动生成 |
| `shared/PATHS.md` | 由 sync_env.sh 本地生成 |
| `*.mjs` | esbuild 中间产物 |
| `*.png` / `*.jpg` | 截图 |

## 注意事项

1. **先测试再打包**：在 marketplace 源目录修改技能后，先在 Claude Code 中验证功能正常
2. **检查 diff**：提交前用 `git diff --cached` 查看变更，确认没有意外包含敏感文件
3. **不要手动同步**：始终用 `pack.sh` 同步，它会自动排除敏感文件和构建缓存
4. **.fr.yaml 不进库**：GitHub 上只有 `.fr.yaml.example` 模板，真实配置只在本地
5. **公共 CPT 变更**：如果修改了 `foundation/public_cpt/` 下的 CPT，记得同时更新 `sql/` 下的相关脚本
