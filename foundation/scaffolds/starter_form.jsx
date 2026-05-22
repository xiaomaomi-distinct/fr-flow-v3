/*
  表单页脚手架（type: "form"）

  布局约定：
    ┌──────────────────────────────────┐
    │  新增XXX / 编辑XXX            [✕]│
    ├──────────────────────────────────┤
    │  书名 *   [__________________]   │
    │  作者 *   [__________________]   │
    │  分类     [__________________]   │  ← Form.Item, label在上, 短字段可Row+Col并排
    │  价格  [¥___]  状态  [▼_____]   │
    │  ──────────────────────────────  │
    │            [取消]  [保存]        │  ← 底部右对齐
    └──────────────────────────────────┘

  通信：保存后 postMessage({type:'fr_form_saved'}) → 父页面关闭弹窗刷新
        加载后 postMessage({type:'fr_iframe_resize',height:...}) → 父页面调整iframe高度

  开发者填空区：
    1. 模块名（标题用）
    2. 数据层 CPT 文件名
    3. 表单字段（Form.Item）
    4. 新增/更新 datasource_name 和 parameters
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
    Modal: { okText: '确定', cancelText: '取消', justOkText: '知道了' },
    Popconfirm: { okText: '确定', cancelText: '取消' },
    Form: { optional: '（可选）', defaultValidateMessages: {
        default: '字段验证错误 ${label}', required: '请输入 ${label}',
        enum: '${label} 必须是其中一个', whitespace: '不能输入空格' } }
};

function App() {
    var { Form, Input, InputNumber, Select, Button, Space, Row, Col, Spin, message } = antd;
    var [form] = Form.useForm();
    var [saving, setSaving] = React.useState(false);
    var [loading, setLoading] = React.useState(false);
    var [editId, setEditId] = React.useState(null);

    // ── TODO: 模块名称 ──────────────────────────────────
    var MODULE_NAME = '记录';
    // ── TODO: 数据层 CPT 文件名 ───────────────────────────
    var DATA_CPT = 'demo_data.cpt';

    // ── 编辑回填 ────────────────────────────────────────
    React.useEffect(function() {
        var params = new URLSearchParams(window.location.search);
        var id = params.get('id');
        if (id) {
            setEditId(id);
            setLoading(true);
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
                    if (res.data && res.data.length > 0) {
                        var d = res.data[0];
                        // TODO: 回填字段映射
                        form.setFieldsValue({
                            name: d.name || '',
                            status: d.status || ''
                        });
                    }
                },
                error: function(xhr, status, error) { message.error('网络错误：' + error); },
                complete: function() { setLoading(false); setTimeout(notifyHeight, 100); }
            });
        } else {
            // 新增：设置默认值
            form.setFieldsValue({ status: '启用' });
            setTimeout(notifyHeight, 100);
        }
    }, []);

    // ── iframe 高度通知 ──────────────────────────────────
    function notifyHeight() {
        try {
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'fr_iframe_resize', height: document.body.scrollHeight }, '*');
            }
        } catch(e) {}
    }
    React.useEffect(function() { notifyHeight(); });

    function notifyParentSaved() {
        try {
            if (window.parent !== window) { window.parent.postMessage({ type: 'fr_form_saved' }, '*'); }
        } catch(e) {}
    }

    // ── TODO: 保存（修改 datasource_name + parameters 映射） ──
    function handleSave() {
        form.validateFields().then(function(values) {
            setSaving(true);
            var dsName = editId ? 'xxx_update' : 'xxx_insert'; // TODO
            var params = [
                { name: 'p_name', type: 'String', value: values.name || '' },
                { name: 'p_status', type: 'String', value: values.status || '' }
            ];
            if (editId) { params.unshift({ name: 'p_id', type: 'Integer', value: parseInt(editId, 10) }); }

            $.ajax({
                url: PATH.apiBase + '/api/data',
                type: 'POST', contentType: 'application/json',
                data: JSON.stringify({
                    report_path: PATH.getDataTemplate(DATA_CPT),
                    datasource_name: dsName,
                    page_number: -1, page_size: -1,
                    parameters: params
                }),
                success: function(res) {
                    if (typeof res === 'string') { try { res = JSON.parse(res); } catch(e) {} }
                    if (res.err_code !== 0) { message.error(res.err_msg || '操作失败'); return; }
                    message.success(editId ? '更新成功' : '新增成功');
                    setTimeout(function() { notifyParentSaved(); }, 400);
                },
                error: function(xhr, status, error) { message.error('网络错误：' + error); },
                complete: function() { setSaving(false); }
            });
        }).catch(function() {});
    }

    // ── 渲染 ────────────────────────────────────────────
    return (
        <div style={{ padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>
                {editId ? '编辑' + MODULE_NAME : '新增' + MODULE_NAME}
            </h3>
            <Spin spinning={loading}>
                <Form form={form} layout="vertical" autoComplete="off">
                    {/* TODO: 表单字段 */}
                    <Form.Item name="name" label="名称"
                        rules={[{ required: true, message: '请输入名称' }]}>
                        <Input placeholder="请输入" />
                    </Form.Item>
                    <Form.Item name="status" label="状态"
                        rules={[{ required: true, message: '请选择状态' }]}>
                        <Select placeholder="请选择" options={[
                            { value: '启用', label: '启用' },
                            { value: '禁用', label: '禁用' }
                        ]} />
                    </Form.Item>

                    {/* 按钮区（底部右对齐） */}
                    <Form.Item style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <Button onClick={function() { notifyParentSaved(); }}>取消</Button>
                            <Button type="primary" onClick={handleSave} loading={saving}>保存</Button>
                        </div>
                    </Form.Item>
                </Form>
            </Spin>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('app-root')).render(
    React.createElement(antd.ConfigProvider, { locale: zhCN },
        React.createElement(App)
    )
);
