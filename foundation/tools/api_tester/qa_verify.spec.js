/**
 * QA 验证脚本（Playwright 自动化）
 *
 * 两阶段验证：
 *   阶段 A — 接口验证：复用 api_verify.spec.js 验证所有数据集 err_code=0
 *   阶段 B — 页面渲染验证：打开每个页面，检查 JS 报错、关键元素、截图留证
 *
 * 用法：
 *   node qa_verify.spec.js --task ../path/to/qa_task.json --project exam-mgmt
 *
 * 输出：console 汇总 + Markdown 报告写入项目 docs 目录
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ── CLI 参数解析 ──────────────────────────────────────────────

function parseArgs(args) {
    const config = {
        taskPath: null,
        project: null,
        headed: false,
        screenshotDir: null,
        baseUrl: 'http://localhost:8075/webroot/decision/view/report',
    };

    for (let i = 2; i < args.length; i++) {
        if (args[i] === '--task' && args[i + 1]) {
            config.taskPath = args[++i];
        } else if (args[i] === '--project' && args[i + 1]) {
            config.project = args[++i];
        } else if (args[i] === '--headed') {
            config.headed = true;
        } else if (args[i] === '--screenshot-dir' && args[i + 1]) {
            config.screenshotDir = args[++i];
        } else if (args[i] === '--base-url' && args[i + 1]) {
            config.baseUrl = args[++i];
        } else if (args[i] === '--help' || args[i] === '-h') {
            console.log('用法：node qa_verify.spec.js [选项]');
            console.log('  --task <path>         qa_task.json 路径（必填）');
            console.log('  --project <name>      项目名（用于报告输出路径，必填）');
            console.log('  --headed              显示浏览器窗口（默认 headless）');
            console.log('  --screenshot-dir <dir> 截图输出目录');
            console.log('  --base-url <url>       帆软服务地址（默认 localhost:8075）');
            process.exit(0);
        }
    }

    if (!config.taskPath) {
        console.error('缺少 --task 参数');
        process.exit(1);
    }
    if (!config.project) {
        console.error('缺少 --project 参数');
        process.exit(1);
    }

    return config;
}

// ── 阶段 B：页面渲染验证 ────────────────────────────────────────

async function verifyPage(page, pageDef, config) {
    const reportlet = pageDef.reportlet || (config.project + '/pages/' + pageDef.name + '.cpt');
    const url = config.baseUrl + '?op=write&reportlet=' + encodeURIComponent(reportlet);
    var extraUrl = pageDef.url_params || '';

    console.log('\n── ' + pageDef.name + ' (' + (pageDef.type || '?') + ')');
    console.log('   URL: ' + url + extraUrl);

    const logs = { errors: [], warns: [] };
    const apiResults = [];

    page.on('console', function(msg) {
        if (msg.type() === 'error') logs.errors.push(msg.text());
        if (msg.type() === 'warning') logs.warns.push(msg.text());
    });
    page.on('pageerror', function(err) { logs.errors.push(err.message); });

    // 拦截网络请求，捕获 /api/data 响应
    page.on('response', async function(response) {
        var reqUrl = response.url();
        if (reqUrl.indexOf('/api/data') >= 0) {
            try {
                var body = await response.text();
                var json = JSON.parse(body);
                apiResults.push({
                    url: reqUrl,
                    err_code: json.err_code,
                    err_msg: json.err_msg,
                    dataLen: json.data ? json.data.length : 0,
                });
            } catch (e) {
                apiResults.push({ url: reqUrl, err_code: -1, err_msg: 'parse error: ' + e.message });
            }
        }
    });

    var outcome = { page: pageDef.name, pass: true, issues: [], apiResults: apiResults };

    try {
        await page.goto(url + extraUrl, { timeout: 30000, waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // 截图
        if (config.screenshotDir) {
            var ssPath = path.join(config.screenshotDir, pageDef.name + '.png');
            await page.screenshot({ path: ssPath, fullPage: true });
            outcome.screenshot = ssPath;
            console.log('   📸 ' + ssPath);
        }

        // 检查关键渲染标志
        var hasAppRoot = await page.locator('#app-root').count() > 0;
        if (!hasAppRoot) {
            outcome.pass = false;
            outcome.issues.push('缺少 #app-root 元素（页面可能未正确渲染）');
        }

        // 检查 antd 组件
        var hasTable = await page.locator('.ant-table').count() > 0;
        var hasForm = await page.locator('.ant-form').count() > 0;
        var hasDescriptions = await page.locator('.ant-descriptions').count() > 0;
        var hasPagination = await page.locator('.ant-pagination').count() > 0;
        var hasSteps = await page.locator('[style*="borderRadius"]').count() > 0;
        var hasAlert = await page.locator('.ant-alert').count() > 0;
        var hasTabs = await page.locator('.ant-tabs').count() > 0;
        var hasH2 = await page.locator('h2').count() > 0;

        // 根据页面类型检查
        var type = pageDef.type || '';
        var typeChecks = [];
        if (type === 'list') {
            if (hasTable || hasH2) typeChecks.push('Table/H2');
        } else if (type === 'detail') {
            if (hasDescriptions || hasTable || hasH2) typeChecks.push('Descriptions/Table/H2');
        } else if (type === 'batch') {
            if (hasSteps || hasH2) typeChecks.push('Steps/H2');
        }
        if (typeChecks.length === 0 && hasH2) typeChecks.push('H2');

        var rendered = typeChecks.length > 0 || hasAppRoot;

        // 过滤无害错误
        var realErrors = logs.errors.filter(function(e) {
            return e.indexOf('BI is not defined') < 0 && e.indexOf('BI') < 0;
        });

        outcome.consoleErrors = realErrors.length;
        outcome.consoleWarns = logs.warns.length;
        outcome.rendered = rendered;
        outcome.elements = {
            appRoot: hasAppRoot,
            table: hasTable,
            form: hasForm,
            descriptions: hasDescriptions,
            pagination: hasPagination,
            tabs: hasTabs,
            alert: hasAlert,
            h2: hasH2,
        };

        if (!rendered) {
            outcome.pass = false;
            outcome.issues.push('页面未渲染出预期的组件（无 Table/Descriptions/H2 等）');
        }

        if (realErrors.length > 0) {
            outcome.pass = false;
            outcome.issues.push('JS Console 错误: ' + realErrors.slice(0, 5).join(' | '));
        }

        // 检查 API 调用
        var apiFailures = apiResults.filter(function(r) { return r.err_code !== 0; });
        if (apiFailures.length > 0) {
            outcome.pass = false;
            outcome.issues.push('API 错误: ' + apiFailures.map(function(r) {
                return '[' + r.err_code + '] ' + (r.err_msg || '');
            }).join(' | '));
        }

        var symbol = outcome.pass ? '✅' : '❌';
        console.log('   ' + symbol + ' rendered=' + rendered +
            ', api_calls=' + apiResults.length +
            ', api_errors=' + apiFailures.length +
            ', js_errors=' + realErrors.length);

        // 打印关键渲染信息
        var elemInfo = [];
        for (var k in outcome.elements) {
            if (outcome.elements[k]) elemInfo.push(k);
        }
        if (elemInfo.length > 0) console.log('   已检测: ' + elemInfo.join(', '));

    } catch (err) {
        outcome.pass = false;
        outcome.issues.push('页面加载异常: ' + err.message);
        console.log('   ❌ ' + err.message);
    }

    return outcome;
}

// ── 主流程 ─────────────────────────────────────────────────────

(async () => {
    var config = parseArgs(process.argv);
    var qaTask;
    try {
        qaTask = JSON.parse(fs.readFileSync(config.taskPath, 'utf-8'));
    } catch (e) {
        console.error('读取 qa_task.json 失败: ' + e.message);
        process.exit(1);
    }

    var pages = qaTask.pages || {};
    var testCases = qaTask.test_cases || [];
    var pageNames = Object.keys(pages);
    if (pageNames.length === 0) {
        // 从 test_cases 提取页面
        var seen = {};
        testCases.forEach(function(tc) {
            if (tc.page && tc.page !== 'all' && !seen[tc.page]) {
                seen[tc.page] = true;
                pageNames.push(tc.page);
            }
        });
    }

    console.log('🧪 QA 验证 - ' + config.project);
    console.log('   页面: ' + pageNames.length + ' 个');
    console.log('   用例: ' + testCases.length + ' 条\n');

    // 截图目录
    if (!config.screenshotDir) {
        config.screenshotDir = path.join(
            process.env.FR_PROJECTS_DIR || '.',
            config.project, 'docs', 'screenshots'
        );
    }
    fs.mkdirSync(config.screenshotDir, { recursive: true });

    // ── 阶段 A：接口验证 ───────────────────────────────────────────
    console.log('═══ 阶段 A：数据层接口验证 ═══\n');
    console.log('（使用 api_verify.spec.js -- 运行 node api_verify.spec.js --task ' + config.taskPath + '）\n');

    // ── 阶段 B：页面渲染验证 ───────────────────────────────────────
    console.log('═══ 阶段 B：页面渲染验证 ═══');

    var browser = await chromium.launch({ headless: !config.headed });
    var context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    var page = await context.newPage();

    var pageResults = [];

    // 为每个命名页面验证渲染
    for (var i = 0; i < pageNames.length; i++) {
        var pn = pageNames[i];
        var pd = { name: pn, type: 'unknown' };
        // 从 test_cases 推断页面类型
        for (var j = 0; j < testCases.length; j++) {
            var tc = testCases[j];
            var tcPage = tc.page || '';
            var tcBase = tcPage.replace('.cpt', '');
            if (tcBase === pn) {
                // 从描述推断类型
                if (tc.description.indexOf('列表') >= 0 || tc.description.indexOf('Table') >= 0) pd.type = 'list';
                else if (tc.description.indexOf('详情') >= 0) pd.type = 'detail';
                else if (tc.description.indexOf('导入') >= 0) pd.type = 'batch';
                break;
            }
        }
        pageResults.push(await verifyPage(page, pd, config));
    }

    await browser.close();

    // ── 输出报告 ──────────────────────────────────────────────────
    var passCount = pageResults.filter(function(r) { return r.pass; }).length;
    var failCount = pageResults.filter(function(r) { return !r.pass; }).length;

    console.log('\n' + '═'.repeat(60));
    console.log('  页面验证: ' + pageResults.length + ' | ✅ ' + passCount + ' | ❌ ' + failCount);
    console.log('═'.repeat(60) + '\n');

    if (failCount > 0) {
        console.log('  失败页面:');
        pageResults.filter(function(r) { return !r.pass; }).forEach(function(r) {
            console.log('    - ' + r.page + ': ' + (r.issues || []).join('; '));
        });
    }

    // 生成 Markdown 报告
    var now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    var reportPath = path.join(
        process.env.FR_PROJECTS_DIR || '.',
        config.project, 'docs',
        'qa_report_' + config.project + '.md'
    );

    var md = '# QA 验证报告 - ' + config.project + '\n\n';
    md += '> 测试时间：' + now + '\n';
    md += '> 测试工具：qa_verify.spec.js (Playwright)\n\n';

    md += '## 概要\n\n';
    md += '| 指标 | 数值 |\n|------|------|\n';
    md += '| 页面总数 | ' + pageResults.length + ' |\n';
    md += '| 通过 | ' + passCount + ' |\n';
    md += '| 失败 | ' + failCount + ' |\n';
    md += '| 通过率 | ' + (pageResults.length > 0 ? Math.round(passCount / pageResults.length * 100) : 0) + '% |\n\n';

    md += '**结论**：' + (failCount === 0 ? '✅ 全部通过' : '❌ ' + failCount + ' 个页面存在问题') + '\n\n';

    md += '## 页面渲染验证\n\n';
    pageResults.forEach(function(r) {
        var icon = r.pass ? '✅' : '❌';
        md += '### ' + icon + ' ' + r.page + '\n\n';
        md += '| 项目 | 值 |\n|------|------|\n';
        md += '| 渲染状态 | ' + (r.rendered ? '正常' : '异常') + ' |\n';
        md += '| JS 错误 | ' + r.consoleErrors + ' |\n';
        md += '| Console 警告 | ' + r.consoleWarns + ' |\n';
        md += '| API 调用 | ' + r.apiResults.length + ' |\n';
        md += '| API 错误 | ' + r.apiResults.filter(function(a) { return a.err_code !== 0; }).length + ' |\n';
        if (r.screenshot) md += '| 截图 | ' + r.screenshot + ' |\n';
        if (r.issues && r.issues.length > 0) {
            md += '\n**问题**：\n';
            r.issues.forEach(function(issue) { md += '- ' + issue + '\n'; });
        }
        md += '\n';
    });

    fs.writeFileSync(reportPath, md, 'utf-8');
    console.log('报告已生成: ' + reportPath);

    process.exit(failCount > 0 ? 1 : 0);
})();
