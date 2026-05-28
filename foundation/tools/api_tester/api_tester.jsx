/*
  API Tester - 数据层接口测试工具

  功能：
    - 加载 dev_task.json 一键填充数据集（粘贴 JSON → 下拉选择 → 自动填入所有字段）
    - 手动测试 /api/data 和 /api/report
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

var { Input, Button, Select, Space, Tag, Card, Divider, Collapse, message } = antd;

function App() {
    var [apiType, setApiType] = React.useState('data');
    var [reportPath, setReportPath] = React.useState('');
    var [dataName, setDataName] = React.useState('');
    var [pUrl, setPUrl] = React.useState('');
    var [pBody, setPBody] = React.useState('{}');
    var [params, setParams] = React.useState([
        { name: 'p_page', value: '1', type: 'String' },
        { name: 'p_pagesize', value: '10', type: 'String' }
    ]);
    var [loading, setLoading] = React.useState(false);
    var [result, setResult] = React.useState(null);
    var [error, setError] = React.useState(null);
    var [requestTime, setRequestTime] = React.useState(null);

    // ── 加载 dev_task.json ───────────────────────────────────
    var [taskJson, setTaskJson] = React.useState('');
    var [datasets, setDatasets] = React.useState([]);
    var [selectedDs, setSelectedDs] = React.useState(undefined);
    var [taskLoaded, setTaskLoaded] = React.useState(false);
    var [taskError, setTaskError] = React.useState('');

    function handleLoadTask() {
        setTaskError('');
        if (!taskJson.trim()) { setTaskError('请粘贴 dev_task.json 内容'); return; }
        var task;
        try { task = JSON.parse(taskJson); }
        catch (e) { setTaskError('JSON 解析失败: ' + e.message); return; }
        var dsList = (task.database && task.database.datasets) || task.datasets || [];
        if (dsList.length === 0) { setTaskError('未找到 datasets 数组（检查 JSON 结构是否为 dev_task.json）'); return; }
        setDatasets(dsList);
        setTaskLoaded(true);
        message.success('已加载 ' + dsList.length + ' 个数据集');
        // 自动填入 CPT 路径
        if (task.data_cpt && !reportPath) {
            // data_cpt 如 "data/exam_mgmt_data.cpt" → 前面拼 project
            var cptPath = task.data_cpt;
            if (task.project) {
                cptPath = task.project + '/' + cptPath;
            }
            setReportPath(cptPath);
        }
    }

    function handleSelectDataset(name) {
        setSelectedDs(name);
        var ds = datasets.find(function(d) { return d.name === name; });
        if (!ds) return;

        setDataName(ds.name);
        // 自动填参数：有 default 用 default，空值用合理测试值
        var filledParams = (ds.params || []).map(function(p) {
            var v = p.default || '';
            if (!v && v !== '0') {
                if (p.name.toLowerCase().indexOf('json') >= 0) v = '[]';
                else if (p.type === 'Integer' || p.type === 'integer') v = '1';
                else if (p.type === 'Double' || p.type === 'double') v = '0.00';
                else v = 'test_' + p.name;
            }
            return { name: p.name, value: v, type: p.type || 'String' };
        });
        setParams(filledParams);
        setResult(null);
        setError(null);
        setRequestTime(null);
    }

    function handleApiTypeChange(type) {
        setApiType(type);
        setResult(null);
        setError(null);
        setRequestTime(null);
    }

    function addParam() {
        setParams(params.concat([{ name: '', value: '', type: 'String' }]));
    }

    function removeParam(index) {
        setParams(params.filter(function(_, i) { return i !== index; }));
    }

    function updateParam(index, field, value) {
        var newParams = params.slice();
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
                        if (a1.toLowerCase().indexOf('error') >= 0) return '代理层错误: ' + a1;
                    }
                }
            }
        }
        return null;
    }

    var errMsg = result ? getErrorMessage(result) : null;
    var dsOptions = datasets.map(function(ds) { return { value: ds.name, label: ds.name + ' (' + (ds.type || '?') + ')' }; });

    return (
        <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '4px' }}>API Tester</h1>
                <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>数据层接口测试工具 — 验证 /api/data 和 /api/report</p>
            </div>

            {/* ═══ 加载 dev_task.json ═══ */}
            <Card size="small" style={{ marginBottom: '16px', background: '#f6f8fa' }}>
                <Collapse ghost items={[{
                    key: 'task',
                    label: React.createElement('span', { style: { fontWeight: 500, fontSize: 14 } },
                        '📋 从 dev_task.json 加载' + (taskLoaded ? ' （已加载 ' + datasets.length + ' 个数据集）' : '')),
                    children: React.createElement('div', null,
                        React.createElement('p', { style: { color: '#666', fontSize: 12, marginTop: 0, marginBottom: 8 } },
                            '粘贴 dev_task.json 完整内容，点击加载后可通过下拉菜单一键选择数据集，自动填入所有参数'),
                        React.createElement(Input.TextArea, {
                            rows: 4,
                            placeholder: '粘贴 dev_task.json 内容...',
                            value: taskJson,
                            onChange: function(e) { setTaskJson(e.target.value); },
                            style: { fontFamily: 'monospace', fontSize: 11, marginBottom: 8 }
                        }),
                        taskError && React.createElement('div', {
                            style: { color: '#ff4d4f', fontSize: 12, marginBottom: 8 }
                        }, taskError),
                        React.createElement('div', { style: { display: 'flex', gap: 8 } },
                            React.createElement(Button, {
                                type: 'primary', size: 'small',
                                onClick: handleLoadTask
                            }, '加载'),
                            taskLoaded && React.createElement(Button, {
                                size: 'small',
                                onClick: function() {
                                    setTaskJson(''); setDatasets([]); setSelectedDs(undefined);
                                    setTaskLoaded(false); setTaskError('');
                                }
                            }, '清除')
                        ),
                        taskLoaded && React.createElement('div', { style: { marginTop: 12 } },
                            React.createElement('div', { style: { fontSize: 12, color: '#666', marginBottom: 4 } }, '选择数据集：'),
                            React.createElement(Select, {
                                placeholder: '选择数据集自动填入参数',
                                style: { width: '100%' },
                                showSearch: true,
                                value: selectedDs,
                                onChange: handleSelectDataset,
                                options: dsOptions,
                                filterOption: function(input, option) {
                                    return (option.label || '').toLowerCase().indexOf(input.toLowerCase()) >= 0;
                                }
                            })
                        )
                    )
                }]} />
            </Card>

            {/* ═══ 请求配置 ═══ */}
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

            {/* ═══ 返回结果 ═══ */}
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

ReactDOM.createRoot(document.getElementById('app-root')).render(React.createElement(App));
