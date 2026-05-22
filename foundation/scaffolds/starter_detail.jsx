/*
  详情页脚手架（type: "detail"）

  布局约定：
    ┌──────────────────────────────────────────┐
    │  记录详情                      [返回列表]  │
    ├──────────────────────────────────────────┤
    │  ┌────────────────────────────────────┐  │
    │  │  书名     《三体》                   │  │  ← Descriptions bordered, 2列
    │  │  作者     刘慈欣                    │  │
    │  │  ISBN     9787536692930            │  │
    │  │  状态     ● 在库                    │  │
    │  │  创建时间 2026-05-14 14:21:49      │  │
    │  └────────────────────────────────────┘  │
    │               [编辑]  [返回]              │  ← 底部操作按钮居中
    └──────────────────────────────────────────┘

  通信：从 URL ?id=N 获取记录 ID，调用单条查询接口

  开发者填空区：
    1. 模块名
    2. 数据层 CPT 文件名 + 单条查询数据集名
    3. Descriptions.Item 字段列表
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
    Table: { emptyText: '暂无数据' },
    Modal: { okText: '确定', cancelText: '取消', justOkText: '知道了' },
    Empty: { description: '暂无数据' }
};

function App() {
    var { Descriptions, Button, Space, Tag, Spin, message } = antd;
    var [record, setRecord] = React.useState(null);
    var [loading, setLoading] = React.useState(true);

    // ── TODO: 模块名称 + 返回页面 ────────────────────────
    var MODULE_NAME = '记录';
    var LIST_PAGE = 'xxx_list.cpt'; // 列表页文件名，用于返回链接

    // ── TODO: 数据层 ────────────────────────────────────
    var DATA_CPT = 'demo_data.cpt';

    // ── 从 URL 获取 ID 并加载数据 ─────────────────────────
    React.useEffect(function() {
        var params = new URLSearchParams(window.location.search);
        var id = params.get('id');
        if (!id) { message.error('缺少记录 ID'); return; }
        $.ajax({
            url: PATH.apiBase + '/api/data',
            type: 'POST', contentType: 'application/json',
            data: JSON.stringify({
                report_path: PATH.getDataTemplate(DATA_CPT),
                datasource_name: 'xxx_by_id', // TODO: 单条查询数据集名
                page_number: -1, page_size: -1,
                parameters: [{ name: 'p_id', type: 'Integer', value: parseInt(id, 10) }]
            }),
            success: function(res) {
                if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }
                if (res.err_code !== 0) { message.error(res.err_msg || '查询失败'); return; }
                if (res.data && res.data.length > 0) { setRecord(res.data[0]); }
            },
            error: function(xhr, status, error) { message.error('网络错误：' + error); },
            complete: function() { setLoading(false); }
        });
    }, []);

    // ── 跳转 ────────────────────────────────────────────
    function goBack() {
        var url = PATH.apiBase + '/view/report?viewlet=' +
                  PATH.getTemplatePath(LIST_PAGE) + '&op=write';
        window.location.href = url;
    }
    function goEdit() {
        if (!record) return;
        var url = PATH.apiBase + '/view/report?viewlet=' +
                  PATH.getTemplatePath('xxx_form.cpt') + '&op=write&id=' + record.id; // TODO: 编辑表单文件名
        window.location.href = url;
    }

    return (
        <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: 800 }}>
                {/* 标题栏 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ margin: 0 }}>{MODULE_NAME}详情</h2>
                    <Button onClick={goBack}>返回列表</Button>
                </div>

                <Spin spinning={loading}>
                    {record ? (
                        <div>
                            {/* TODO: Descriptions 字段 */}
                            <Descriptions bordered column={2} size="middle">
                                <Descriptions.Item label="ID">{record.id}</Descriptions.Item>
                                <Descriptions.Item label="名称">{record.name || '-'}</Descriptions.Item>
                                <Descriptions.Item label="状态">
                                    <Tag color={record.status === '启用' ? 'success' : 'default'}>
                                        {record.status || '-'}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="创建时间">{record.created_at || '-'}</Descriptions.Item>
                            </Descriptions>

                            {/* 底部操作按钮（居中） */}
                            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 8 }}>
                                <Button type="primary" onClick={goEdit}>编辑</Button>
                                <Button onClick={goBack}>返回</Button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>未找到记录</div>
                    )}
                </Spin>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('app-root')).render(
    React.createElement(antd.ConfigProvider, { locale: zhCN },
        React.createElement(App)
    )
);
