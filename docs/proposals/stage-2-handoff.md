# 阶段 2 进度交接文档

> **日期**：2026-06-26
> **状态**：阶段 2 进行中（约 50% 完成）
> **目的**：给下轮新会话的 AI 一个完整背景包，无缝接上后续工作

---

## 当前进度

### ✅ 已完成

| 项 | 路径（生效目录） |
|---|---|
| 阶段 1 全部产物已同步到 plugins 目录 | `C:\Users\asus\.claude\plugins\marketplaces\fr-flow-v3\fr-flow-v3\` |
| 移动骨架 `base_cpt_page_mobile.cpt` | `foundation/templates/` |
| 工具链 `display_mobile/` | `scripts/` |
| 6 条质量门规则 | `scripts/display_mobile/rules/` |
| **新增** 知识库 `ANTD_MOBILE_GUIDE.md`（833 行） | `shared/KNOWLEDGE/` |
| **新增** 知识库 `MOBILE_SPECIFIC.md`（669 行） | `shared/KNOWLEDGE/` |

### ⏳ 待完成

| 项 | 说明 |
|---|---|
| 通用脚手架 `starter.jsx`（**单文件**，不是 5 个） | 用户已决定简化为 1 个通用版 |
| 技能文档 `frm-display-dev/SKILL.md` | 基于 fr-display-dev/SKILL.md 改造 |
| 阶段 2 完工后整体同步回备份 | `cp -r plugins/... E:/fr-projects/fr-flow-v3/`（去掉 __pycache__） |

---

## 重要：用户的关键决定

**用户在上轮明确说**："脚手架我觉得移动端写一个通用版就行"。

理由（AI 自己判断的，被用户认可）：
- smoke_test.jsx 本身就是个综合 starter，已经验证可行
- 移动端 UI 模式比 PC 连续，硬切 5 类反而绑死
- 维护成本低
- 代码量从 ~1000 行降到 ~200 行
- frm-display-dev 技能不再需要"按 type 选 starter"逻辑

**所以下轮不要写 5 个 starter，只写 1 个 `scaffolds/mobile/starter.jsx`**。

---

## 工作目录约定（重要）

| 目录 | 用途 |
|---|---|
| `C:\Users\asus\.claude\plugins\marketplaces\fr-flow-v3\fr-flow-v3\` | **生效目录**，所有改动做到这里 |
| `E:\fr-projects\fr-flow-v3\` | 仅用于上传 GitHub 的备份，**阶段 2 完工时一次性同步** |

用户上轮明确强调过：**之前我把改动只做到 E:/fr-projects/，结果 plugins 目录里没有阶段 1 产物，全失效了**。下轮 AI **必须把所有新文件写到 plugins 路径**。

---

## 下轮要读的文件清单

按这个顺序读，5 分钟能拿到完整背景：

### 必读 - 方案与回顾

1. `E:\fr-projects\fr-flow-v3\docs\proposals\frm-mobile-skill-suite.md` - 整体方案
2. `E:\fr-projects\fr-flow-v3\docs\proposals\stage-1-retrospective.md` - 阶段 1 踩坑回顾
3. **本文档** `E:\fr-projects\fr-flow-v3\docs\proposals\stage-2-handoff.md`

### 必读 - 知识库（已完成的产物）

4. `C:\Users\asus\.claude\plugins\marketplaces\fr-flow-v3\fr-flow-v3\shared\KNOWLEDGE\ANTD_MOBILE_GUIDE.md`
5. `C:\Users\asus\.claude\plugins\marketplaces\fr-flow-v3\fr-flow-v3\shared\KNOWLEDGE\MOBILE_SPECIFIC.md`

### 参照样本

6. `E:\fr-projects\mobile_probe\pages\smoke_test.jsx` - 阶段 1 写的综合冒烟测试，**作为通用 starter 的参照**（包含 NavBar、Card、Button、Input、List、Picker、DatePicker、Popup、Toast、Tag、API 调用，已生产验证通过）

### 参照 - PC 版对比

7. `C:\Users\asus\.claude\plugins\marketplaces\fr-flow-v3\fr-flow-v3\skills\fr-display-dev\SKILL.md` - 改造时的对照
8. `C:\Users\asus\.claude\plugins\marketplaces\fr-flow-v3\fr-flow-v3\foundation\scaffolds\starter.jsx` - PC 通用 starter

---

## 下轮要做的具体任务

### 任务 1：写 `foundation/scaffolds/mobile/starter.jsx`

**写到**：`C:\Users\asus\.claude\plugins\marketplaces\fr-flow-v3\fr-flow-v3\foundation\scaffolds\mobile\starter.jsx`

**结构要求**：

```jsx
/*
  移动端通用脚手架 starter.jsx
  - 基于 antd-mobile 5
  - JSX 语法（esbuild --jsx=transform 编译）
  - 包含 NavBar / List / Popup / Form / API 调用的最简示例
  - 业务代码替换 DEVELOPER ZONE 内的部分
*/

var { NavBar, Card, List, Button, Input, Form, Popup, Picker,
      DatePicker, Toast, Dialog, Space, Tag, SearchBar,
      PullToRefresh, InfiniteScroll, Empty } = antdMobile;

var App = function() {
    // ============================================
    //  示例 state（实际项目按需删除）
    // ============================================
    var s1 = React.useState([]); var data = s1[0]; var setData = s1[1];
    var s2 = React.useState(false); var loading = s2[0]; var setLoading = s2[1];
    var s3 = React.useState(false); var formVisible = s3[0]; var setFormVisible = s3[1];

    // ============================================
    //  示例：调用 /api/data
    //  实际项目按需修改 datasource_name 和 parameters
    // ============================================
    function fetchList() {
        setLoading(true);
        $.ajax({
            url: PATH.apiBase + '/api/data',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                report_path: PATH.getDataTemplate('{module}_data.cpt'),
                datasource_name: '{module}_qry',
                page_number: -1,
                page_size: -1,
                parameters: []
            }),
            success: function(res) {
                if (typeof res === 'string') res = JSON.parse(res);
                if (res.err_code !== 0) {
                    Toast.show({ icon: 'fail', content: res.err_msg || '查询失败' });
                    return;
                }
                setData(res.data || []);
            },
            error: function() { Toast.show({ icon: 'fail', content: '网络错误' }); },
            complete: function() { setLoading(false); }
        });
    }

    React.useEffect(function() {
        // fetchList();  // 启用时取消注释
    }, []);

    // ============================================
    //  示例：渲染列表 + 弹出表单
    // ============================================
    return (
        <div style={{ paddingBottom: '60px' }}>
            <NavBar backArrow={false}>页面标题</NavBar>

            <Card style={{ margin: '8px' }}>
                <Space wrap>
                    <Button color="primary" onClick={function() { setFormVisible(true); }}>
                        新增
                    </Button>
                    <Button onClick={fetchList}>刷新</Button>
                </Space>
            </Card>

            {/* 示例：列表展示 */}
            <List header="数据列表">
                {/* 假数据，开发时替换为真实数据 */}
                {[
                    { id: 1, name: '示例 1', extra: '¥ 99' },
                    { id: 2, name: '示例 2', extra: '¥ 199' }
                ].map(function(item) {
                    return (
                        <List.Item key={item.id} extra={item.extra} arrow>
                            {item.name}
                        </List.Item>
                    );
                })}
            </List>

            {/* 示例：弹出表单 */}
            <Popup
                visible={formVisible}
                onMaskClick={function() { setFormVisible(false); }}
                bodyStyle={{ padding: '24px', minHeight: '50vh' }}
            >
                <h3 style={{ margin: '0 0 16px 0' }}>新增</h3>
                <Form
                    layout="horizontal"
                    footer={
                        <Button block color="primary" type="submit">
                            提交
                        </Button>
                    }
                    onFinish={function(values) {
                        // submit values
                        Toast.show({ icon: 'success', content: '提交成功（示例）' });
                        setFormVisible(false);
                    }}
                >
                    <Form.Item name="name" label="名称">
                        <Input placeholder="请输入" />
                    </Form.Item>
                </Form>
            </Popup>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('app-root')).render(<App />);
```

**注意点**：
- 包含 `fetchList` API 调用示例，但默认注释掉（用户取消注释才生效）
- 包含 NavBar / Card / Button / Space / List / Popup / Form / Input 8 个最常用组件
- 假数据放在 `[{id:1,...}]` 内联数组，开发者一目了然
- 不要太复杂，~150-200 行
- 顶部解构所有"可能用到"的组件，让开发者直接用而不用查文档

### 任务 2：写 `skills/frm-display-dev/SKILL.md`

**写到**：`C:\Users\asus\.claude\plugins\marketplaces\fr-flow-v3\fr-flow-v3\skills\frm-display-dev\SKILL.md`

**改造起点**：基于 `skills/fr-display-dev/SKILL.md` 复制改造

**关键差异点**：

1. **frontmatter**：
   - `name: frm-display-dev`
   - `description: 帆软移动端展示层开发工程师角色。当用户输入 "/frm-display-dev <项目名>" 时触发。负责 antd-mobile + React 移动端页面开发，基于数据层接口契约实现前端展示。前置依赖：fr-data-dev 数据层验收通过。`

2. **工具链路径**：
   - PC：`scripts/display/display_writer.py`
   - 移动：`scripts/display_mobile/display_writer.py`
   - **所有 python 命令前缀 `PYTHONIOENCODING=utf-8`**

3. **骨架模板**：`base_cpt_page_mobile.cpt`

4. **全局变量**：`antdMobile` 不是 `antd`

5. **脚手架**：单个 `scaffolds/mobile/starter.jsx`，去掉 type 分支

6. **页面类型**：不再写 `list/form/detail/batch/selector` 分类，统一用通用 starter

7. **必读知识库**：
   - 开工必读：`ANTD_MOBILE_GUIDE.md` 和 `MOBILE_SPECIFIC.md`
   - 不再读 `ANTD_REACT_GUIDE.md`（PC 版）

8. **红线增强**：
   - 禁用 `antd.` 调用（质量门拦截）
   - 禁用 `<Modal>`, `<Table>`
   - 禁止 iframe
   - 禁止 100vh
   - 禁止 z-index > 1000

9. **验收标准增强**：
   - **必须企微真机验证**（本机 Playwright 不能完全覆盖）
   - viewport meta、safe-area、44px 触控、Popup 弹出等专项检查
   - 顶部红条横幅（错误兜底）不出现

10. **数据层共用**：明确说"数据层用 fr-data-dev，不要找 frm-data-dev"

### 任务 3：阶段 2 完成后整体同步备份

```bash
PLUGIN="C:/Users/asus/.claude/plugins/marketplaces/fr-flow-v3/fr-flow-v3"
BACKUP="E:/fr-projects/fr-flow-v3"

# 同步新增文件回备份（保持 .git/.gitignore 等不变）
cp "$PLUGIN/foundation/templates/base_cpt_page_mobile.cpt" "$BACKUP/foundation/templates/"
mkdir -p "$BACKUP/foundation/scaffolds/mobile/"
cp "$PLUGIN/foundation/scaffolds/mobile/starter.jsx" "$BACKUP/foundation/scaffolds/mobile/"
cp "$PLUGIN/shared/KNOWLEDGE/ANTD_MOBILE_GUIDE.md" "$BACKUP/shared/KNOWLEDGE/"
cp "$PLUGIN/shared/KNOWLEDGE/MOBILE_SPECIFIC.md" "$BACKUP/shared/KNOWLEDGE/"
cp -r "$PLUGIN/scripts/display_mobile" "$BACKUP/scripts/"
mkdir -p "$BACKUP/skills/frm-display-dev"
cp "$PLUGIN/skills/frm-display-dev/SKILL.md" "$BACKUP/skills/frm-display-dev/"

# 清理 __pycache__
find "$BACKUP/scripts/display_mobile" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null
```

---

## 下轮 AI 开场建议

下轮 AI 看到用户开场，可以这样确认：

```
我看到你之前在做 fr-flow-v3 移动端技能 (frm-*) 的开发，
阶段 1 已完成，阶段 2 进行到 50%。

我需要先读这些文件了解上下文：
- docs/proposals/stage-2-handoff.md（本文档）
- docs/proposals/frm-mobile-skill-suite.md（整体方案）
- docs/proposals/stage-1-retrospective.md（阶段 1 回顾）

然后准备完成：
1. scaffolds/mobile/starter.jsx（通用脚手架，单文件）
2. skills/frm-display-dev/SKILL.md（技能文档）
3. 同步备份

确认继续吗？
```

---

## 阶段 3-5 的概览（远期，不在本轮范围）

| 阶段 | 内容 | 状态 |
|---|---|---|
| 阶段 3 | frm-pm 技能 | 未启动 |
| 阶段 4 | frm-qa 技能 | 未启动 |
| 阶段 5 | 端到端真实需求验证 | 未启动 |

阶段 2 完成后，你可以选择直接投产 frm-display-dev（数据层 + PM 用现有 fr-* 技能），或继续阶段 3-5。
