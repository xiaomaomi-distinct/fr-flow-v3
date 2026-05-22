/*
  选择器页脚手架（type: "selector"）

  布局约定：
    ┌──────────────────────────────────────┐
    │  选择XX                          [✕] │
    ├──────────────────────────────────────┤
    │  [搜索框........] [分类▼] [搜索]      │  ← 紧凑筛选栏
    │                                      │
    │  ┌────────────────────────────────┐  │
    │  │ ☐│编号  │名称   │型号          │  │  ← Table + rowSelection
    │  │ ☐│EQ001 │笔记本 │ThinkPad      │  │
    │  └────────────────────────────────┘  │
    │  共 N 条  [<] [1] [2] [>]           │
    │                                      │
    │  已选：笔记本、显示器         [确定]  │  ← 底部固定栏
    └──────────────────────────────────────┘

  通信：确定后 postMessage({type:'fr_selector_selected', data:[...]}) → 父页面接收

  开发者填空区：
    1. 标题
    2. 数据层 CPT 文件名 + 列表/搜索数据集名
    3. 表格列定义
    4. 单选/多选模式
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
    Empty: { description: '暂无数据' }
};

function App() {
    var { Table, Button, Input, Select, Space, Tag, message } = antd;

    // ── TODO: 模块名称 ──────────────────────────────────
    var MODULE_NAME = '记录';
    // ── TODO: 数据层 CPT 文件名 ───────────────────────────
    var DATA_CPT = 'demo_data.cpt';
    // ── TODO: 单选还是多选 ────────────────────────────────
    var SELECT_MODE = 'multiple'; // 'single' | 'multiple'

    // ── 状态 ──────────────────────────────────────────
    var [data, setData] = React.useState([]);
    var [loading, setLoading] = React.useState(false);
    var [total, setTotal] = React.useState(0);
    var [current, setCurrent] = React.useState(1);
    var [pageSize, setPageSize] = React.useState(10);
    var [keyword, setKeyword] = React.useState('');
    var [selectedRowKeys, setSelectedRowKeys] = React.useState([]);
    var [selectedRows, setSelectedRows] = React.useState([]);

    // ── TODO: 查询列表（修改 datasource_name + parameters）──
    function fetchList(page, size) {
        setLoading(true);
        var p = page || current;
        var s = size || pageSize;
        $.ajax({
            url: PATH.apiBase + '/api/data',
            type: 'POST', contentType: 'application/json',
            data: JSON.stringify({
                report_path: PATH.getDataTemplate(DATA_CPT),
                datasource_name: 'xxx_qry', // TODO
                page_number: -1, page_size: -1,
                parameters: [
                    { name: 'p_page', type: 'Integer', value: p },
                    { name: 'p_pagesize', type: 'Integer', value: s },
                    { name: 'p_keyword', type: 'String', value: keyword }
                ]
            }),
            success: function(res) {
                if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }
                if (res.err_code !== 0) { message.error(res.err_msg || '查询失败'); return; }
                setData(res.data || []);
            },
            error: function(xhr, status, error) { message.error('网络错误：' + error); },
            complete: function() { setLoading(false); }
        });
    }

    function fetchTotal() {
        $.ajax({
            url: PATH.apiBase + '/api/data',
            type: 'POST', contentType: 'application/json',
            data: JSON.stringify({
                report_path: PATH.getDataTemplate(DATA_CPT),
                datasource_name: 'xxx_total', // TODO
                page_number: -1, page_size: -1,
                parameters: [{ name: 'p_keyword', type: 'String', value: keyword }]
            }),
            success: function(res) {
                if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }
                if (res.err_code === 0 && res.data && res.data.length > 0) {
                    setTotal(parseInt(res.data[0].total, 10) || 0);
                }
            }
        });
    }

    React.useEffect(function() { fetchList(); fetchTotal(); }, []);

    function handleSearch() { setCurrent(1); fetchList(1, pageSize); fetchTotal(); }
    function handlePageChange(page, size) { setCurrent(page); setPageSize(size); fetchList(page, size); }

    // ── 选择 ──────────────────────────────────────────
    function handleSelect(keys, rows) {
        setSelectedRowKeys(keys);
        setSelectedRows(rows);
    }

    // ── 确定并传回父页面 ───────────────────────────────
    function handleConfirm() {
        if (selectedRows.length === 0) { message.warning('请至少选择一项'); return; }
        try {
            if (window.parent !== window) {
                window.parent.postMessage({
                    type: 'fr_selector_selected',
                    data: selectedRows
                }, '*');
            }
        } catch(e) {}
    }

    function handleClose() {
        try {
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'fr_selector_closed' }, '*');
            }
        } catch(e) {}
    }

    // ── iframe 高度通知 ──────────────────────────────────
    function notifyHeight() {
        try {
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'fr_iframe_resize', height: document.body.scrollHeight }, '*');
            }
        } catch(e) {}
    }
    React.useEffect(function() { notifyHeight(); });

    // ── TODO: 表格列定义 ────────────────────────────────
    var columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
        // { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
        // { title: '分类', dataIndex: 'category', key: 'category', width: 100 },
    ];

    return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* 标题栏 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>{'选择' + MODULE_NAME}</h3>
                <Button type="text" onClick={handleClose} style={{ fontSize: 18, padding: '0 4px' }}>✕</Button>
            </div>

            {/* 搜索栏（紧凑） */}
            <div style={{ marginBottom: 12 }}>
                <Space wrap>
                    <Input placeholder="搜索" style={{ width: 200 }} value={keyword}
                        onChange={function(e) { setKeyword(e.target.value); }}
                        onPressEnter={handleSearch} allowClear />
                    <Button type="primary" onClick={handleSearch}>搜索</Button>
                </Space>
            </div>

            {/* 表格（撑满剩余空间） */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                <Table
                    rowSelection={{
                        type: SELECT_MODE === 'single' ? 'radio' : 'checkbox',
                        selectedRowKeys: selectedRowKeys,
                        onChange: handleSelect
                    }}
                    columns={columns} dataSource={data} rowKey="id"
                    loading={loading} size="small"
                    scroll={{ y: 300 }}
                    pagination={{
                        current: current, pageSize: pageSize, total: total,
                        showSizeChanger: true, size: 'small',
                        showTotal: function(t) { return '共 ' + t + ' 条'; },
                        onChange: handlePageChange
                    }}
                />
            </div>

            {/* 底部固定栏：已选摘要 + 确定按钮 */}
            <div style={{
                marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <span style={{ color: '#666', fontSize: 13 }}>
                    已选：{selectedRows.length > 0
                        ? selectedRows.map(function(r) { return r.name || r.id; }).join('、')
                        : '无'}
                </span>
                <Space>
                    <Button onClick={handleClose}>取消</Button>
                    <Button type="primary" onClick={handleConfirm}
                        disabled={selectedRows.length === 0}>确定</Button>
                </Space>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('app-root')).render(
    React.createElement(antd.ConfigProvider, { locale: zhCN },
        React.createElement(App)
    )
);
