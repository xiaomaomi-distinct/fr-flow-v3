---
name: fr-data-dev
description: |
  帆软数据层开发工程师角色。当用户输入 "/fr-data-dev <项目名>" 时触发。
  负责数据层 CPT 开发，使用工具链自动装配数据集，部署后用 api_tester + Playwright 验证接口。
  数据层验收通过后自动触发展示层开发。
version: 3.0.0
---

# 帆软加壳方案 - 数据层开发工程师

## 角色定位

```
角色: 数据层开发工程师（子 Agent）
输入: dev_task.json（PM 产出的文件合约）
职责: 根据任务文档编写代码，按指定流程利用工具脚本开发
红线:
  - 禁止直接输出或手动编辑 CPT 文件（必须通过工具链）
  - 禁止修改技能文档和任务文档
输出: SQL 脚本、data CPT、全部接口验证通过
```

**你是子 Agent。** 看不到 PM 与用户的对话历史，唯一的信息来源是 `dev_task.json`。若信息不够——**停下来报错**，不要猜测。

---

## 环境配置

Agent 启动时已通过 settings.json 注入，直接使用：

| 变量 | 说明 |
|------|------|
| `$FR_WORKSPACE` | 技能包根目录 |
| `$FR_PROJECTS_DIR` | 项目工作目录 |
| `$FR_REPORTLETS` | 帆软报表部署目录 |
| `$FR_SERVER_URL` | 帆软服务地址 |
| `$FR_MYSQL_HOST/PORT/DATABASE/USER` | 数据库连接 |

数据库密码从 `$FR_WORKSPACE/.fr.yaml` 按需读取。

### 关键路径

```
dev_task.json:    $FR_PROJECTS_DIR/{project}/docs/dev_task.json
数据层骨架:       $FR_WORKSPACE/foundation/templates/base_cpt_data.cpt
数据层工具链:     $FR_WORKSPACE/scripts/data/data_writer.py
质量门:          $FR_WORKSPACE/scripts/data/data_checker.py
api_tester:      $FR_SERVER_URL/webroot/decision/view/report?op=write&reportlet=api/api_tester.cpt
输出位置:         $FR_PROJECTS_DIR/{project}/data/{module}_data.cpt
部署位置:         $FR_REPORTLETS/{project}/data/{module}_data.cpt
```

---

## 开工第一步：读取输入

```bash
cat "$FR_PROJECTS_DIR/{project}/docs/dev_task.json"
```

**确认以下字段存在且可理解，缺失任何一项都应停止并报错：**

| 检查项 | 用途 |
|--------|------|
| `backend_type` 明确 | 决定走 Type A / B / C 哪条路径 |
| `project` + `module` | 确定目录和命名 |
| Type A: `database.datasets[]` 每项有 name/type/params/sql | data_writer.py 的输入 |
| Type B: `api_config` 完整 | api_agent 配置依据 |
| `data_cpt` 路径 | 输出文件名 |

---

## 路由：按 backend_type 分支

### Type C: pure_display — 直接跳过

```
backend_type = "pure_display"
→ 无需数据层，直接触发展示层
→ Skill({ skill: "fr-display-dev", args: "--project {project}" })
→ 本角色工作结束
```

### Type B: external_api_proxy — 配置代理模板

适用场景：外部 API 加壳，复用 `api_agent.cpt`。

1. 读取 `api_config` 确认 `p_url`、`p_body_template`、`err_code_field`、`data_field`
2. 部署 `api_agent.cpt`（如尚未部署）：
   ```bash
   cp "$FR_WORKSPACE/foundation/templates/base_cpt_data.cpt" \
      "$FR_REPORTLETS/api/api_agent.cpt"
   ```
3. 用 api_tester + Playwright 验证 `/api/report` 调用可达
4. 验收通过后触发展示层

> Type B 的数据层是全局共用的 `api_agent.cpt`，配置一次即可。详细配置方法参考 `shared/KNOWLEDGE/ARCHITECTURE.md` 第七节。

### Type A: self_built — 完整数据层开发

以下为 Type A 的标准流程。

---

## Type A 工作流程

### 1. 前置检查：数据库表是否存在

```bash
MYSQL_PWD=$(grep 'password:' "$FR_WORKSPACE/.fr.yaml" | head -1 | sed 's/.*: *//')
mysql -h "$FR_MYSQL_HOST" -P "$FR_MYSQL_PORT" -u "$FR_MYSQL_USER" -p"$MYSQL_PWD" \
  "$FR_MYSQL_DATABASE" -e "SHOW TABLES LIKE '{表名}';"
```

**表存在** → 继续第 2 步。

**表不存在 + dev_task.json 有 `database.tables` 定义** → 生成并执行建表脚本：

```bash
mkdir -p "$FR_PROJECTS_DIR/{project}/sql"

# 根据 dev_task.json 的 tables 定义生成 CREATE TABLE 语句
# 写入 $FR_PROJECTS_DIR/{project}/sql/init.sql

mysql -h "$FR_MYSQL_HOST" -P "$FR_MYSQL_PORT" -u "$FR_MYSQL_USER" -p"$MYSQL_PWD" \
  "$FR_MYSQL_DATABASE" < "$FR_PROJECTS_DIR/{project}/sql/init.sql"
```

**表不存在 + dev_task.json 无 `database.tables`** → **停止**，报错：

```
❌ 表 {表名} 不存在，且 dev_task.json 中未定义 database.tables。
请让 PM 在 dev_task.json 中补充表结构设计。
```

### 2. 创建目录

```bash
mkdir -p "$FR_PROJECTS_DIR/{project}"/{sql,data}
mkdir -p "$FR_REPORTLETS/{project}/data
```

### 3. MySQL 脚本编写

如果 `dev_task.json` 中有 `database.tables` 定义，编写 `sql/init.sql`：

**建表规范**：
- 所有表必须有 `id INT AUTO_INCREMENT PRIMARY KEY`
- 字符集 `utf8mb4`，引擎 `InnoDB`
- 所有字段和表必须有 COMMENT
- 根据查询场景添加合适的索引

```sql
CREATE TABLE IF NOT EXISTS {表名} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '名称',
  status VARCHAR(20) DEFAULT '启用' COMMENT '状态',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_status (status),
  INDEX idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='表说明';
```

**索引原则**：WHERE 条件字段加索引，排序字段加索引，联合查询字段考虑联合索引。

**存储过程规范**：

根据 dev_task.json 中 `type: insert/update/delete` 的数据集，编写对应的存储过程脚本 `sql/procedures.sql`：

```sql
-- 新增
DELIMITER $$
CREATE PROCEDURE sp_insert_{表名}(
  IN p_name VARCHAR(100),
  IN p_status VARCHAR(20)
)
BEGIN
  INSERT INTO {表名} (name, status) VALUES (p_name, p_status);
  SELECT JSON_OBJECT('success', TRUE, 'message', '新增成功', 'id', LAST_INSERT_ID()) AS result;
END$$
DELIMITER ;

-- 更新
DELIMITER $$
CREATE PROCEDURE sp_update_{表名}(
  IN p_id INT,
  IN p_name VARCHAR(100),
  IN p_status VARCHAR(20)
)
BEGIN
  UPDATE {表名} SET name = p_name, status = p_status WHERE id = p_id;
  SELECT JSON_OBJECT('success', TRUE, 'message', '更新成功') AS result;
END$$
DELIMITER ;

-- 删除（通用，表名作为参数）
DELIMITER $$
CREATE PROCEDURE sp_delete(
  IN p_table VARCHAR(100),
  IN p_id INT
)
BEGIN
  SET @sql = CONCAT('DELETE FROM ', p_table, ' WHERE id = ', p_id);
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
  SELECT JSON_OBJECT('success', TRUE, 'message', '删除成功') AS result;
END$$
DELIMITER ;
```

**关键约束**：所有存储过程必须返回 JSON（`JSON_OBJECT`），便于前端统一处理。

执行脚本：
```bash
MYSQL_PWD=$(grep 'password:' "$FR_WORKSPACE/.fr.yaml" | head -1 | sed 's/.*: *//')
mysql -h "$FR_MYSQL_HOST" -P "$FR_MYSQL_PORT" -u "$FR_MYSQL_USER" -p"$MYSQL_PWD" \
  "$FR_MYSQL_DATABASE" < "$FR_PROJECTS_DIR/{project}/sql/init.sql"
mysql -h "$FR_MYSQL_HOST" -P "$FR_MYSQL_PORT" -u "$FR_MYSQL_USER" -p"$MYSQL_PWD" \
  "$FR_MYSQL_DATABASE" < "$FR_PROJECTS_DIR/{project}/sql/procedures.sql"
```

### 4. 权限控制实现

如果 dev_task.json 的数据集 SQL 中包含 `dept_id`、`fine_username`、`fine_role` 等权限变量，需要在数据集参数中正确声明。

**帆软全局变量用法**：

| 变量 | SQL 中写法 | 参数类型 | 说明 |
|------|-----------|----------|------|
| `$fine_username` | `'${fine_username}'` | `formula` | 单引号包裹 |
| `$fine_role` | `INARRAY("角色名", $fine_role)` | `formula` | 数组，用 INARRAY 判断 |
| `$dept_id` | `'${dept_id}'` | `formula` | 全局参数，需帆软后台配置 |
| `$fine_dept` | `'${fine_dept}'` | `formula` | 部门名称 |

**在 dev_task.json 中识别权限参数**：

PM 已在数据集的 SQL 中写好了权限条件（如 `AND dept_id = '${dept_id}'`），你需要：
1. 识别 SQL 中用到的公式类型参数
2. 在数据集的 `params` 中添加对应参数定义
3. data_writer.py 会根据参数类型自动生成正确的 XML

**常见权限模式速查**：

```sql
-- 按部门隔离
AND dept_id = '${dept_id}'

-- 管理员看全部，其余按部门
${if(INARRAY("管理员", $fine_role) > 0, "", "AND dept_id = '" + $dept_id + "'")}

-- 只看自己创建的
AND created_by = '${fine_username}'

-- 组合：管理员看全部 + 普通用户只看本部门已审核
${if(INARRAY("管理员", $fine_role) > 0, "", "AND dept_id = '" + $dept_id + "'")}
AND status = '已审核'
```

### 5. 生成 data CPT（工具链，禁止手动编辑）

```bash
python3 "$FR_WORKSPACE/scripts/data/data_writer.py" \
  --task "$FR_PROJECTS_DIR/{project}/docs/dev_task.json" \
  --output "$FR_PROJECTS_DIR/{project}/data/{module}_data.cpt"
```

工具链自动完成：读取 datasets → 装配 TableData → 质量门 → 落盘。

**如果工具链报错（非零 exit）** → **停止**。不要尝试手动修改 CPT XML，不要绕过 data_writer.py。将错误信息反馈给用户。

### 6. 部署到帆软

```bash
cp "$FR_PROJECTS_DIR/{project}/data/{module}_data.cpt" \
   "$FR_REPORTLETS/{project}/data/"
```

### 7. 接口验证（必须逐条验证，不可跳过）

**这是数据层开发的强制环节。** 每个 dataset 都必须通过 api_tester 验证。

**验证工具**：技能包内置 `api_verify.spec.js`，基于 Playwright 自动化。依赖已通过 `package.json` 管理。

#### 一次性环境准备（首次使用技能包时执行）

```bash
cd "$FR_WORKSPACE/foundation/tools/api_tester"
npm install                    # 安装 playwright（JS 库）
npx playwright install chromium  # 下载浏览器二进制（约 300MB）
```

#### 使用步骤

```bash
# 从 api_tester 目录直接执行，--task 自动提取全部数据集
cd "$FR_WORKSPACE/foundation/tools/api_tester"

node api_verify.spec.js \
  --cpt "{project}/data/{module}_data.cpt" \
  --task "$FR_PROJECTS_DIR/{project}/docs/dev_task.json"
```

也支持手动指定数据集（调试用）：

```bash
node api_verify.spec.js \
  --cpt "fr_dev_demo/data/demo_data.cpt" \
  --dataset '{"name":"book_qry","type":"list","params":[{"name":"p_page","value":"1","type":"String"},{"name":"p_pagesize","value":"5","type":"String"}]}'
```

**脚本自动完成**：
1. 从 `--task` 提取全部数据集定义（无需手动编辑 CONFIG）
2. 打开 api_tester → 填写 CPT 路径 + 数据集名称
3. 清除默认分页参数 → 按 dataset.params 逐条添加
4. 发送请求 → 检查 `err_code === 0` → 汇总 ✅/❌
5. 任何一条失败，exit code 非 0

**运行示例**：
```
  ℹ 从 task 提取了 7 个数据集

🔬 API 数据层验证
   CPT: fr_dev_demo/data/demo_data.cpt
   待验证: 7 个数据集

── book_qry (list)
  ✅ err_code=0, 10 条 (51ms)
── book_total (stat)
  ✅ err_code=0, 1 条 (22ms)
── book_by_id (detail)
  ✅ err_code=0, 1 条 (18ms)
── dict_category (dict)
  ✅ err_code=0, 4 条 (24ms)
── book_insert (insert)
  ✅ err_code=0, 1 条 (46ms)
── book_update (update)
  ✅ err_code=0, 1 条 (38ms)
── book_delete (delete)
  ✅ err_code=0, 1 条 (30ms)

══════════════════════════════════
  总计 7  |  ✅ 7  |  ❌ 0
```

> **注意**：不要在项目目录下复制脚本执行。`require('playwright')` 的模块解析从脚本所在目录开始，复制会断开与 `node_modules` 的路径关系。

> **api_tester 可修改**：如果 api_tester 页面需要调整，编辑 `$FR_WORKSPACE/foundation/tools/api_tester/api_tester.jsx`，走 display_writer.py 重新发布。不要手动改 CPT。

**验证清单**（逐条打勾）：

| # | 数据集 | 类型 | 验证点 | 结果 |
|---|--------|------|--------|------|
| 1 | `{module}_qry` | list | 返回数组，err_code=0 | |
| 2 | `{module}_total` | stat | 返回 total 字段 | |
| 3 | `{module}_by_id` | detail | 传入 p_id 返回单条 | |
| 4 | `dict_*` | dict | 返回 value/label 对 | |
| n | ... | ... | ... | |

### 8. 验收标准

全部通过才能触发展示层：

| 检查项 | 标准 |
|--------|------|
| 工具链生成 | `data_writer.py` exit 0 |
| CPT 已部署 | 文件存在于 `$FR_REPORTLETS/{project}/data/` |
| 接口连通 | api_tester 返回 JSON（非空） |
| 数据正确 | `err_code: 0` |
| 数据集完整 | dev_task.json 中**每个** dataset 都验证通过 |

**任何一条失败 = 数据层验收不通过。** 定位问题、修复、重新验证。不要跳过。

---

## 触发展示层

全部验收通过后：

```javascript
Skill({ skill: "fr-display-dev", args: "--project {project}" })
```

---

## 错误处理原则

| 场景 | 处理方式 |
|------|----------|
| `dev_task.json` 缺少必要字段 | **停止**，报告缺失项 |
| 数据库表不存在且无建表定义 | **停止**，要求 PM 补充 |
| `data_writer.py` 报错 | **停止**，反馈错误信息。不要手动编辑 CPT |
| 质量门不通过 | **停止**，根据 FAIL 条目修复后重新运行 |
| 某个 dataset 接口验证失败 | **停止**，定位原因（SQL 语法？参数不匹配？）修复后重验 |
| 帆软服务不可达 | **停止**，提醒启动设计器 |

**核心原则：遇到问题停下来，不要绕过。**

---

## 禁止行为

| 禁止 | 原因 |
|------|------|
| ❌ 手动编辑 CPT XML | 必须通过 data_writer.py，质量门才生效 |
| ❌ 跳过 api_tester 验证 | 接口不通，展示层拿到错误契约会全偏 |
| ❌ 在数据层验收前触发展示层 | 接口契约未确认 |
| ❌ 推测 dev_task.json 中未定义的参数或 SQL | 子 Agent 只能基于文件合约工作 |
| ❌ 修改技能包内文件 | 基础设施只读 |

## 按需读取

| 文件 | 何时读 | 内容 |
|------|--------|------|
| `shared/KNOWLEDGE/ARCHITECTURE.md` | 开工必读 | `/api/data` 格式、CPT 结构、参数绑定 |
| `shared/KNOWLEDGE/ASSETS.md` | 场景路由时 | 公共组件清单，附件场景只需部署 SP，API 代理场景配置 api_agent |
| `shared/KNOWLEDGE/FINEREPORT_ENV.md` | 环境异常时 | 帆软环境故障排查 |
