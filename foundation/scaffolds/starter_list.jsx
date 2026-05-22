/*
  列表页脚手架（type: "list"）

  布局约定：
    ┌──────────────────────────────────────────┐
    │  页面标题                                 │
    │  [搜索框] [筛选1▼] [筛选2▼] [搜索][重置]   │ ← toolbar-left
    │                               [+ 新增]    │ ← toolbar-right
    │  ┌────────────────────────────────────┐  │
    │  │ Table 表格                          │  │
    │  └────────────────────────────────────┘  │
    │  分页                                     │
    └──────────────────────────────────────────┘

  开发者填空区（搜索 "TODO" 定位）：
    1. 页面标题
    2. 数据层 CPT 文件名
    3. 筛选字段（Input/Select）
    4. 表格 columns 定义
    5. 新增/编辑弹窗 URL
    6. API 调用（datasource_name + parameters）
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
        prev_page: '上一页', next_page: '下一页', prev_5: '向前 5 页', next_5: '向后 5 页',
        prev_3: '向前 3 页', next_3: '向后 3 页', page_size: '页码' },
    Table: { filterTitle: '筛选', filterConfirm: '确定', filterReset: '重置', selectAll: '全选',
        selectInvert: '反选', sortTitle: '排序', expand: '展开行', collapse: '折叠行', emptyText: '暂无数据' },
    Modal: { okText: '确定', cancelText: '取消', justOkText: '知道了' },
    Popconfirm: { okText: '确定', cancelText: '取消' },
    Form: { optional: '（可选）', defaultValidateMessages: {
        default: '字段验证错误 ${label}', required: '请输入 ${label}',
        enum: '${label} 必须是其中一个', whitespace: '不能输入空格' } },
    Empty: { description: '暂无数据' }
};

// 图标：从 help/lib/antd/icons/ 同步加载并缓存，内联渲染
// iconBase 由 PATH.apiBase 动态计算，适配不同部署环境（webroot / wuhan 等）
// 添加新图标只需在 names 数组里加名字，831 个 SVG 文件随时可用
var iconBase = PATH.apiBase.replace('/decision', '/help/lib/antd/icons');
var iconCache = {};
(function() {
    var names = ['search', 'plus', 'reload', 'edit', 'delete', 'close', 'check', 'filter', 'export', 'download', 'setting', 'user'];
    names.forEach(function(name) {
        $.ajax({
            url: iconBase + '/outlined/' + name + '.svg',
            type: 'GET', async: false, dataType: 'text',
            success: function(svg) { iconCache[name] = svg; },
            error: function() { iconCache[name] = null; }
        });
    });
})();

function icon(name) {
    var key = name.replace('/outlined/', '').replace('.svg', '');
    var svg = iconCache[key];
    if (!svg) return null;
    svg = svg.replace('<svg ', '<svg fill="currentColor" width="1em" height="1em" ');
    return React.createElement('span', {
        style: { display: 'inline-flex', alignItems: 'center', lineHeight: 1 },
        dangerouslySetInnerHTML: { __html: svg }
    });
}

function App() {
    var { Table, Button, Input, Select, Space, Tag, Modal, message } = antd;

    // ── 状态 ──────────────────────────────────────────
    var [data, setData] = React.useState([]);
    var [loading, setLoading] = React.useState(false);
    var [total, setTotal] = React.useState(0);
    var [current, setCurrent] = React.useState(1);
    var [pageSize, setPageSize] = React.useState(10);

    // ── TODO: 筛选字段（按需增减） ─────────────────────
    var [keyword, setKeyword] = React.useState('');

    // ── 弹窗 ──────────────────────────────────────────
    var [modalVisible, setModalVisible] = React.useState(false);
    var [formUrl, setFormUrl] = React.useState('');

    // ── TODO: 数据层 CPT 文件名 ────────────────────────
    var DATA_CPT = 'demo_data.cpt';

    // ── TODO: 查询列表（修改 datasource_name + parameters） ──
    function fetchList(page, size) {
        setLoading(true);
        var p = page || current;
        var s = size || pageSize;
        $.ajax({
            url: PATH.apiBase + '/api/data',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                report_path: PATH.getDataTemplate(DATA_CPT),
                datasource_name: 'xxx_qry',
                page_number: -1,
                page_size: -1,
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

    // ── TODO: 查询总数（修改 datasource_name + parameters） ──
    function fetchTotal() {
        $.ajax({
            url: PATH.apiBase + '/api/data',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                report_path: PATH.getDataTemplate(DATA_CPT),
                datasource_name: 'xxx_total',
                page_number: -1,
                page_size: -1,
                parameters: [
                    { name: 'p_keyword', type: 'String', value: keyword }
                ]
            }),
            success: function(res) {
                if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }
                if (res.err_code === 0 && res.data && res.data.length > 0) {
                    setTotal(parseInt(res.data[0].total, 10) || 0);
                }
            }
        });
    }

    // ── 初始化 ──────────────────────────────────────────
    React.useEffect(function() { fetchList(); fetchTotal(); }, []);

    // ── 搜索/重置 ──────────────────────────────────────
    function handleSearch() { setCurrent(1); fetchList(1, pageSize); fetchTotal(); }
    function handleReset() {
        setKeyword('');
        setCurrent(1);
        var oldKeyword = keyword;
        // 重置搜索字段后触发查询
        setTimeout(function() { fetchList(1, pageSize, ''); fetchTotal(); }, 0);
    }
    function handlePageChange(page, size) { setCurrent(page); setPageSize(size); fetchList(page, size); }

    // ── 新增/编辑弹窗 ──────────────────────────────────
    function openForm(record) {
        var url = PATH.apiBase + '/view/report?viewlet=' +
                  PATH.getTemplatePath('xxx_form.cpt') + '&op=write'; // TODO: 表单文件名
        if (record && record.id) url += '&id=' + record.id;
        setFormUrl(url);
        setModalVisible(true);
    }

    // ── TODO: 删除 ─────────────────────────────────────
    function handleDelete(record) {
        Modal.confirm({
            title: '确认删除',
            content: '删除后无法恢复，确定要删除吗？',
            okText: '确认', cancelText: '取消',
            okButtonProps: { danger: true },
            onOk: function() {
                $.ajax({
                    url: PATH.apiBase + '/api/data',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        report_path: PATH.getDataTemplate(DATA_CPT),
                        datasource_name: 'xxx_delete',
                        page_number: -1, page_size: -1,
                        parameters: [{ name: 'p_id', type: 'Integer', value: record.id }]
                    }),
                    success: function(res) {
                        if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }
                        if (res.err_code !== 0) { message.error(res.err_msg || '删除失败'); return; }
                        message.success('删除成功');
                        handlePageChange(1, pageSize);
                    },
                    error: function(xhr, status, error) { message.error('网络错误：' + error); }
                });
            }
        });
    }

    // ── 监听 iframe 消息 ────────────────────────────────
    React.useEffect(function() {
        function handler(e) {
            if (e.data && e.data.type === 'fr_form_saved') {
                setModalVisible(false); setFormUrl(''); handlePageChange(1, pageSize);
            }
            if (e.data && e.data.type === 'fr_iframe_resize') {
                var iframe = document.getElementById('modalFrame');
                if (iframe) iframe.style.height = Math.max(400, e.data.height + 40) + 'px';
            }
        }
        window.addEventListener('message', handler);
        return function() { window.removeEventListener('message', handler); };
    }, [pageSize]);

    // ── TODO: 表格列定义 ────────────────────────────────
    var columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
        // { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
        // { title: '状态', dataIndex: 'status', key: 'status', width: 80,
        //   render: function(v) { return <Tag color={v === '启用' ? 'success' : 'default'}>{v}</Tag>; } },
        { title: '操作', key: 'action', width: 150,
          render: function(_, record) {
              return <Space>
                  <Button size="small" type="link" onClick={function() { openForm(record); }}>编辑</Button>
                  <Button size="small" type="link" danger onClick={function() { handleDelete(record); }}>删除</Button>
              </Space>;
          }
        }
    ];

    // ── 渲染 ────────────────────────────────────────────
    return (
        <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
                <h2 style={{ marginTop: 0, marginBottom: 16 }}>{/* TODO: 页面标题 */}列表页</h2>

                {/* 工具栏：筛选区(左) + 操作按钮(右) */}
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <Space wrap>
                        <Input placeholder="搜索" style={{ width: 200 }} value={keyword}
                            onChange={function(e) { setKeyword(e.target.value); }}
                            onPressEnter={handleSearch} allowClear
                            prefix={icon('/outlined/search.svg')} />
                        {/* TODO: 更多筛选 Select，格式：
                        <Select placeholder="分类筛选" style={{ width: 140 }} allowClear value={category||undefined}
                            onChange={function(v){setCategory(v||'');}} options={categoryOptions} />
                        */}
                        <Button type="primary" icon={icon('/outlined/search.svg')} onClick={handleSearch}>搜索</Button>
                        <Button icon={icon('/outlined/reload.svg')} onClick={handleReset}>重置</Button>
                    </Space>
                    <Space>
                        <Button type="primary" icon={icon('/outlined/plus.svg')}
                            onClick={function() { openForm(null); }}>新增</Button>
                    </Space>
                </div>

                {/* 表格 */}
                <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
                    size="middle" scroll={{ x: 800 }}
                    pagination={{
                        current: current, pageSize: pageSize, total: total,
                        showSizeChanger: true, showQuickJumper: true,
                        showTotal: function(t) { return '共 ' + t + ' 条'; },
                        onChange: handlePageChange
                    }} />

                {/* 表单弹窗（iframe） */}
                {modalVisible && (
                    <Modal title={null} open={true} footer={null} width={600}
                        destroyOnClose onCancel={function() { setModalVisible(false); setFormUrl(''); }}
                        styles={{ body: { padding: 0 } }}>
                        <iframe id="modalFrame" src={formUrl}
                            style={{ width: '100%', height: '500px', minHeight: '400px', border: 'none', transition: 'height 0.2s' }} />
                    </Modal>
                )}
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('app-root')).render(
    React.createElement(antd.ConfigProvider, { locale: zhCN },
        React.createElement(App)
    )
);
