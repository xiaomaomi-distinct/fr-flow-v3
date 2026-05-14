/*
  API Tester - 数据层接口测试工具

  用法：
    1. display_writer.py --jsx api_tester.jsx --output api_tester.cpt
    2. 部署到 $FR_REPORTLETS/api/
    3. 浏览器访问验证数据层接口

  功能：
    - 测试 /api/data 和 /api/report 所有接口
    - 动态参数输入（name / value / type）
    - 格式化 JSON 返回 + 三层错误检测
*/

/* ===== PREAMBLE（固定段，勿删勿改） ===== */
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

var appRoot = document.createElement('div');
appRoot.id = 'app-root';
document.body.insertBefore(appRoot, document.body.firstChild);

/* ===== DEVELOPER ZONE ===== */

const { Input, Button, Select, Space, Tag, Card, Divider } = antd;

function App() {
    const [apiType, setApiType] = React.useState('data');
    const [reportPath, setReportPath] = React.useState('');
    const [dataName, setDataName] = React.useState('');
    const [pUrl, setPUrl] = React.useState('');
    const [pBody, setPBody] = React.useState('{}');
    const [params, setParams] = React.useState([
        { name: 'p_page', value: '1', type: 'String' },
        { name: 'p_pagesize', value: '10', type: 'String' }
    ]);
    const [loading, setLoading] = React.useState(false);
    const [result, setResult] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [requestTime, setRequestTime] = React.useState(null);

    function handleApiTypeChange(type) {
        setApiType(type);
        setResult(null);
        setError(null);
        setRequestTime(null);
    }

    function addParam() {
        setParams([...params, { name: '', value: '', type: 'String' }]);
    }

    function removeParam(index) {
        setParams(params.filter(function(_, i) { return i !== index; }));
    }

    function updateParam(index, field, value) {
        var newParams = [...params];
        newParams[index][field] = value;
        setParams(newParams);
    }

    function sendRequest() {
        setLoading(true);
        setResult(null);
        setError(null);
        setRequestTime(null);

        var startTime = Date.now();
        var requestData;

        if (apiType === 'data') {
            var filteredParams = params.filter(function(p) {
                return p.name && p.name.trim() !== '';
            });

            requestData = {
                report_path: reportPath,
                datasource_name: dataName,
                page_number: -1,
                page_size: -1,
                parameters: filteredParams.map(function(p) {
                    return { name: p.name, type: p.type, value: p.value };
                })
            };
        } else {
            requestData = {
                report_path: 'api/api_agent.cpt',
                start_page: 1,
                end_page: 1,
                parameters: [
                    { name: 'p_url', type: 'String', value: pUrl },
                    { name: 'p_body', type: 'String', value: pBody }
                ]
            };
        }

        $.ajax({
            url: PATH.apiBase + '/api/' + apiType,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(requestData),
            success: function(res) {
                setRequestTime(Date.now() - startTime);
                if (typeof res === 'string') {
                    try { res = JSON.parse(res); }
                    catch (e) {
                        setError('响应解析失败: ' + e.message);
                        setLoading(false);
                        return;
                    }
                }
                setResult(res);
                setLoading(false);
            },
            error: function(xhr, status, err) {
                setRequestTime(Date.now() - startTime);
                setError('网络错误: ' + status + ' - ' + err);
                setLoading(false);
            }
        });
    }

    function formatJson(obj) {
        try { return JSON.stringify(obj, null, 2); }
        catch (e) { return String(obj); }
    }

    function getErrorMessage(res) {
        if (!res || typeof res !== 'object' || Object.keys(res).length === 0) {
            return '接口返回空响应，请检查 CPT 路径和数据集名称是否正确';
        }
        if (res.err_code !== 0) {
            return '帆软层错误 [err_code=' + res.err_code + ']: ' + (res.err_msg || '未知错误');
        }
        if (res.data && res.data[0]) {
            var a1 = res.data[0].A1 || res.data[0].a1;
            if (a1) {
                if (typeof a1 === 'string') {
                    try {
                        var parsed = JSON.parse(a1);
                        if (parsed.error) return '代理层错误: ' + parsed.error;
                        if (parsed.success === false) return '业务层错误: ' + (parsed.message || JSON.stringify(parsed));
                    } catch (e) {
                        if (a1.toLowerCase().includes('error')) return '代理层错误: ' + a1;
                    }
                }
            }
        }
        return null;
    }

    var errMsg = result ? getErrorMessage(result) : null;

    return (
        <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '4px' }}>API Tester</h1>
                <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>数据层接口测试工具 — 验证 /api/data 和 /api/report</p>
            </div>

            <Card style={{ marginBottom: '24px' }}>
                <Space style={{ marginBottom: '24px' }}>
                    <Button
                        type={apiType === 'data' ? 'primary' : 'default'}
                        onClick={function() { handleApiTypeChange('data'); }}
                    >
                        /api/data
                    </Button>
                    <Button
                        type={apiType === 'report' ? 'primary' : 'default'}
                        onClick={function() { handleApiTypeChange('report'); }}
                    >
                        /api/report
                    </Button>
                </Space>

                {apiType === 'data' && (
                    <div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}>CPT 路径</label>
                            <Input
                                placeholder="如: jiangcheng/borrow/data/borrow_data.cpt"
                                value={reportPath}
                                onChange={function(e) { setReportPath(e.target.value); }}
                                style={{ maxWidth: '500px' }}
                            />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}>数据集名称</label>
                            <Input
                                placeholder="如: equipment_qry"
                                value={dataName}
                                onChange={function(e) { setDataName(e.target.value); }}
                                style={{ width: '220px' }}
                            />
                        </div>
                    </div>
                )}

                {apiType === 'report' && (
                    <div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}>目标 URL</label>
                            <Input
                                placeholder="https://api.example.com/endpoint"
                                value={pUrl}
                                onChange={function(e) { setPUrl(e.target.value); }}
                                style={{ maxWidth: '500px' }}
                            />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}>请求体 (JSON)</label>
                            <Input.TextArea
                                placeholder='{"key": "value"}'
                                value={pBody}
                                onChange={function(e) { setPBody(e.target.value); }}
                                rows={4}
                                style={{ maxWidth: '500px' }}
                            />
                        </div>
                    </div>
                )}

                {apiType === 'data' && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontWeight: 500, fontSize: '13px' }}>自定义参数</span>
                            <Button size="small" onClick={addParam}>+ 添加参数</Button>
                        </div>
                        {params.map(function(param, index) {
                            return (
                                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                    <Input
                                        placeholder="参数名"
                                        value={param.name}
                                        onChange={function(e) { updateParam(index, 'name', e.target.value); }}
                                        style={{ width: '150px' }}
                                    />
                                    <Input
                                        placeholder="参数值"
                                        value={param.value}
                                        onChange={function(e) { updateParam(index, 'value', e.target.value); }}
                                        style={{ width: '200px' }}
                                    />
                                    <Select
                                        value={param.type}
                                        onChange={function(v) { updateParam(index, 'type', v); }}
                                        style={{ width: '100px' }}
                                        options={[
                                            { value: 'String', label: 'String' },
                                            { value: 'Integer', label: 'Integer' },
                                            { value: 'Double', label: 'Double' }
                                        ]}
                                    />
                                    <Button
                                        danger
                                        size="small"
                                        onClick={function() { removeParam(index); }}
                                    >
                                        删除
                                    </Button>
                                </div>
                            );
                        })}
                        {params.length === 0 && (
                            <p style={{ color: '#999', fontSize: '12px', margin: 0 }}>参数已全部移除，点击"+ 添加参数"重新添加</p>
                        )}
                    </div>
                )}

                <div style={{ marginTop: '24px' }}>
                    <Button
                        type="primary"
                        size="large"
                        onClick={sendRequest}
                        loading={loading}
                    >
                        {loading ? '发送中...' : '发送请求'}
                    </Button>
                </div>
            </Card>

            {(result || error || requestTime != null) && (
                <Card
                    title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>返回结果</span>
                            {requestTime != null && (
                                <Tag color="default">{requestTime}ms</Tag>
                            )}
                        </div>
                    }
                >
                    {error && (
                        <div style={{
                            padding: '12px 16px', background: '#fff2f0', border: '1px solid #ffccc7',
                            borderRadius: '6px', marginBottom: '16px', color: '#ff4d4f'
                        }}>
                            {error}
                        </div>
                    )}

                    {errMsg && !error && (
                        <div style={{
                            padding: '12px 16px', background: '#fff2f0', border: '1px solid #ffccc7',
                            borderRadius: '6px', marginBottom: '16px', color: '#ff4d4f'
                        }}>
                            {errMsg}
                        </div>
                    )}

                    {result && !errMsg && (
                        <pre style={{
                            background: '#f7f7f7', padding: '16px', borderRadius: '6px',
                            overflow: 'auto', maxHeight: '500px', fontSize: '12px',
                            lineHeight: '1.6', margin: 0
                        }}>
                            {formatJson(result)}
                        </pre>
                    )}
                </Card>
            )}
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('app-root')).render(<App />);
