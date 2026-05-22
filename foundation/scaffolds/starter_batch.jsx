/*
  批量导入页脚手架（type: "batch"）

  布局约定（参考 jiangcheng/borrow/equipment_batch.cpt 成熟设计）：
    ┌────────────────────────────────────────────┐
    │  XX批量导入                                  │
    │  ①选择文件 ─→ ②数据预览 ─→ ③写入校验 ─→ ④完成 │  ← 自定义步骤条
    │                                            │
    │  Step 0: 拖拽上传区 + 格式说明                │
    │  Step 1: 预览表格（前100行）                  │
    │  Step 2: 进度条（分批写入+校验）               │
    │  Step 3: 统计卡片（通过/失败）+ 错误明细表格    │
    │                                            │
    │  底部操作栏按 step 切换                       │
    └────────────────────────────────────────────┘

  数据流：
    upload → parseExcel(SheetJS) → writeToTemp(分批) → validateImport → show result → commit

  开发者填空区：
    1. 模块名
    2. 数据层 CPT 文件名
    3. 字段映射（Excel 列 → DB 字段）
    4. 数据集名称（batch_insert / validate / commit / errors / stats）
*/

var PATH = {
    currentDir: (function() {
        var name = FR.remoteEvaluate("=reportName");
        return name.substring(0, name.lastIndexOf('/') + 1);
    })(),
    apiBase: (function() {
        var servletURL = FR.remoteEvaluate("=servletURL");
        var parts = servletURL.split('/');
        return '/' + parts[1] + '/' + parts[2];
    })(),
    getDataTemplate: function(filename) {
        return this.currentDir.replace('/pages/', '/data/') + filename;
    },
    getTemplatePath: function(filename) {
        return this.currentDir + filename;
    }
};

var hideStyle = document.createElement('style');
hideStyle.innerHTML =
    '.fr-report{position:absolute!important;left:-9999px!important;visibility:hidden!important}' +
    '.content-container,.fr-content,.reportPane{height:0!important;overflow:hidden!important;pointer-events:none!important}' +
    'body>.textbox-container,body>#textboxContainer,body>.widget-container{display:none!important}';
document.head.appendChild(hideStyle);
document.body.setAttribute('style',
    'margin:0;padding:0;min-height:100vh;box-sizing:border-box;overflow-y:auto;');

/* ===== DEVELOPER ZONE ===== */

var appRoot = document.createElement('div');
appRoot.id = 'app-root';
document.body.insertBefore(appRoot, document.body.firstChild);

var zhCN = {
    locale: 'zh-cn',
    Pagination: { items_per_page: '条/页', jump_to: '跳至', jump_to_confirm: '确定', page: '页',
        prev_page: '上一页', next_page: '下一页' },
    Table: { emptyText: '暂无数据' },
    Modal: { okText: '确定', cancelText: '取消' },
    Popconfirm: { okText: '确定', cancelText: '取消' },
    Empty: { description: '暂无数据' }
};

function App() {
    var { Button, Table, Tag, Spin, message } = antd;

    // ── TODO: 模块名称 + 返回页面 ────────────────────────
    var MODULE_NAME = '记录';
    var LIST_PAGE = 'xxx_list.cpt';

    // ── TODO: 数据层 ────────────────────────────────────
    var DATA_CPT = 'demo_data.cpt';

    // ── 状态机 ──────────────────────────────────────────
    var [step, setStep] = React.useState(0); // 0:选择文件, 1:预览, 2:写入中, 3:结果
    var [file, setFile] = React.useState(null);
    var [previewRows, setPreviewRows] = React.useState([]);
    var [totalRows, setTotalRows] = React.useState(0);
    var [importId, setImportId] = React.useState('');
    var [progress, setProgress] = React.useState(0);
    var [progressText, setProgressText] = React.useState('');
    var [stats, setStats] = React.useState({ valid: 0, error: 0 });
    var [errorRows, setErrorRows] = React.useState([]);

    // ── 步骤条渲染 ──────────────────────────────────────
    var stepNames = ['选择文件', '数据预览', '写入校验', '完成'];

    function renderSteps() {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
                {stepNames.map(function(name, idx) {
                    var isActive = step === idx;
                    var isDone = step > idx;
                    var numStyle = {
                        width: 28, height: 28, borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500,
                        background: isActive ? '#1677ff' : isDone ? '#52c41a' : '#f0f0f0',
                        color: (isActive || isDone) ? '#fff' : '#999'
                    };
                    var textStyle = {
                        fontSize: 14,
                        color: isActive ? 'rgba(0,0,0,.88)' : 'rgba(0,0,0,.45)',
                        fontWeight: isActive ? 500 : 400
                    };
                    return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div key={'num' + idx}><span style={numStyle}>{idx + 1}</span></div>
                            <span style={textStyle}>{name}</span>
                            {idx < stepNames.length - 1 && (
                                <div style={{ width: 40, height: 2, background: isDone ? '#52c41a' : '#e8e8e8' }} />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // ── Step 0: 文件选择 ─────────────────────────────────
    function handleFile(file) {
        if (!file) return;
        // TODO: 解析 Excel（需要加载 SheetJS 库）
        // 参考 equipment_batch.cpt: 使用 FileReader + XLSX.read()
        message.info('文件解析功能：需集成 SheetJS 库加载 Excel');
    }

    function renderStep0() {
        return (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{
                    border: '2px dashed #d9d9d9', borderRadius: 8, padding: '40px 20px',
                    background: '#fafafa', marginBottom: 12
                }}>
                    <p style={{ fontSize: 16, color: '#666', marginBottom: 16 }}>
                        📥 点击或拖拽文件到此处
                    </p>
                    <input type="file" accept=".xlsx,.xls" onChange={function(e) {
                        if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
                    }} />
                </div>
                <p style={{ color: '#999', fontSize: 13 }}>支持 .xlsx .xls 格式，建议单次不超过 1000 行</p>
            </div>
        );
    }

    // ── Step 1: 数据预览 ──────────────────────────────────
    function renderStep1() {
        return (
            <div>
                <p style={{ marginBottom: 12, color: '#666' }}>
                    文件名：{file ? file.name : ''}　共 {totalRows} 行
                </p>
                {/* TODO: 预览表格列定义 */}
                <Table columns={[{ title: '#', dataIndex: '_rowNo', key: '_rowNo', width: 50 }]}
                    dataSource={previewRows.slice(0, 100)} rowKey="_rowNo"
                    size="small" scroll={{ x: 600 }} pagination={false} />
            </div>
        );
    }

    // ── Step 2: 写入校验进度 ──────────────────────────────
    function renderStep2() {
        var pct = Math.round(progress);
        return (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ marginBottom: 16, color: '#666' }}>{progressText || '正在处理...'}</p>
                <div style={{
                    width: '100%', height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden',
                    maxWidth: 400, margin: '0 auto 12px'
                }}>
                    <div style={{ width: pct + '%', height: '100%', background: '#1677ff', borderRadius: 4,
                        transition: 'width 0.3s' }} />
                </div>
                <p style={{ color: '#999', fontSize: 13 }}>{pct}%</p>
            </div>
        );
    }

    // ── Step 3: 校验结果 ──────────────────────────────────
    function renderStep3() {
        return (
            <div>
                {/* 统计卡片 */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center' }}>
                    <div style={{
                        flex: 1, maxWidth: 200, textAlign: 'center', padding: '20px 16px',
                        border: '1px solid #e8e8e8', borderRadius: 8, background: '#f6ffed'
                    }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>{stats.valid}</div>
                        <div style={{ color: '#666', marginTop: 4 }}>✅ 校验通过</div>
                    </div>
                    <div style={{
                        flex: 1, maxWidth: 200, textAlign: 'center', padding: '20px 16px',
                        border: '1px solid #e8e8e8', borderRadius: 8, background: '#fff2f0'
                    }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#ff4d4f' }}>{stats.error}</div>
                        <div style={{ color: '#666', marginTop: 4 }}>❌ 校验失败</div>
                    </div>
                </div>

                {/* 错误明细表格 */}
                {errorRows.length > 0 && (
                    <Table columns={[
                        { title: '#', dataIndex: '_rowNo', key: '_rowNo', width: 50 },
                        // TODO: 错误明细列
                        { title: '错误原因', dataIndex: '_error', key: '_error' }
                    ]} dataSource={errorRows} rowKey="_rowNo" size="small" pagination={false} />
                )}
            </div>
        );
    }

    // ── 主渲染 ──────────────────────────────────────────
    function renderContent() {
        switch (step) {
            case 0: return renderStep0();
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            default: return null;
        }
    }

    // ── 底部操作栏 ──────────────────────────────────────
    function renderFooter() {
        function goBack() {
            window.location.href = PATH.apiBase + '/view/report?viewlet=' +
                PATH.getTemplatePath(LIST_PAGE) + '&op=write';
        }
        switch (step) {
            case 0:
                return <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button onClick={goBack}>取消</Button>
                </div>;
            case 1:
                return <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button onClick={function() { setStep(0); setFile(null); }}>重新选择</Button>
                    <Button type="primary" onClick={function() { setStep(2); /* TODO: doImport() */ }}>
                        开始导入
                    </Button>
                </div>;
            case 2:
                return null; // 进度条自动推进
            case 3:
                return <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button danger onClick={goBack}>放弃导入</Button>
                    {stats.error > 0 && (
                        <Button type="primary" onClick={function() { message.success('已提交'); }}>
                            仅导入正确行（{stats.valid}条）
                        </Button>
                    )}
                    <Button type="primary" onClick={function() { message.success('已提交'); }}>
                        确认导入（{stats.valid}条）
                    </Button>
                </div>;
            default: return null;
        }
    }

    return (
        <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: 900, margin: '0 auto' }}>
                <h2 style={{ marginTop: 0, marginBottom: 32, textAlign: 'center' }}>
                    {MODULE_NAME}批量导入
                </h2>
                {renderSteps()}
                {renderContent()}
                <div style={{ marginTop: 24 }}>{renderFooter()}</div>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('app-root')).render(
    React.createElement(antd.ConfigProvider, { locale: zhCN },
        React.createElement(App)
    )
);
