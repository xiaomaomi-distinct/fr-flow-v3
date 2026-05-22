/**
 * 数据层 API 验证脚本（Playwright 自动化）
 *
 * 用法：
 *   node api_verify.spec.js \
 *     --cpt "fr_dev_demo/data/demo_data.cpt" \
 *     --dataset '{"name":"book_qry","type":"list","params":[{"name":"p_page","value":"1","type":"String"},{"name":"p_pagesize","value":"5","type":"String"}]}' \
 *     --dataset '{"name":"book_total","type":"stat","params":[]}'
 *
 * 或通过 dev_task.json 自动提取：
 *   node api_verify.spec.js --task ../path/to/dev_task.json
 *
 * 成功 exit 0（全部通过），失败 exit 1（任一未通过）。
 */

const { chromium } = require('playwright');

// ── CLI 参数解析 ──────────────────────────────────────────────

function parseArgs(args) {
    const config = {
        apiTesterUrl: 'http://localhost:8075/webroot/decision/view/report?op=write&reportlet=api/api_tester.cpt',
        dataCptPath: null,
        datasets: [],
        taskPath: null,
    };

    for (let i = 2; i < args.length; i++) {
        if (args[i] === '--cpt' && args[i + 1]) {
            config.dataCptPath = args[++i];
        } else if (args[i] === '--dataset' && args[i + 1]) {
            try {
                config.datasets.push(JSON.parse(args[++i]));
            } catch (e) {
                console.error(`⚠ 跳过无效 JSON 的 --dataset: ${e.message}`);
            }
        } else if (args[i] === '--task' && args[i + 1]) {
            config.taskPath = args[++i];
        } else if (args[i] === '--tester-url' && args[i + 1]) {
            config.apiTesterUrl = args[++i];
        } else if (args[i] === '--help' || args[i] === '-h') {
            console.log('用法：node api_verify.spec.js [选项]');
            console.log('  --cpt <path>      数据层 CPT 路径（如 fr_dev_demo/data/demo_data.cpt）');
            console.log('  --dataset <json>  数据集定义（可重复）');
            console.log('  --task <path>     从 dev_task.json 自动提取 datasets');
            console.log('  --tester-url <url> api_tester 页面地址（可选）');
            process.exit(0);
        }
    }

    // 从 dev_task.json 提取
    if (config.taskPath) {
        try {
            const fs = require('fs');
            const task = JSON.parse(fs.readFileSync(config.taskPath, 'utf-8'));
            config.datasets = (task.database?.datasets || []).map(function(ds) {
                return {
                    name: ds.name,
                    type: ds.type,
                    params: (ds.params || []).map(function(p) {
                        return {
                            name: p.name,
                            value: p.default || '',
                            type: p.type || 'String'
                        };
                    }),
                };
            });

            // 为写入类提供合理测试参数
            config.datasets.forEach(function(ds) {
                if (ds.type === 'insert' || ds.type === 'update' || ds.type === 'delete') {
                    ds.params.forEach(function(p) {
                        if (!p.value && p.value !== '0') {
                            if (p.type === 'Integer') p.value = '1';
                            else if (p.type === 'Double') p.value = '0.00';
                            else p.value = 'test_' + p.name;
                        }
                    });
                }
            });

            console.log(`  ℹ 从 task 提取了 ${config.datasets.length} 个数据集`);
        } catch (e) {
            console.error(`❌ 读取 task 失败: ${e.message}`);
            process.exit(1);
        }
    }

    if (!config.dataCptPath) {
        console.error('❌ 缺少 --cpt 参数，指定数据层 CPT 路径');
        process.exit(1);
    }
    if (config.datasets.length === 0) {
        console.error('❌ 缺少数据集定义。使用 --dataset 或 --task');
        process.exit(1);
    }

    return config;
}

// ── 单个数据集测试 ────────────────────────────────────────────

async function testDataset(page, dataset, config) {
    const dsName = dataset.name;
    console.log(`\n── ${dsName} (${dataset.type})`);

    try {
        await page.goto(config.apiTesterUrl);
        await page.waitForSelector('#app-root', { timeout: 10000 });
        await page.waitForTimeout(500);

        // 填写 CPT 路径 + 数据集名称
        const textboxes = page.getByRole('textbox');
        await textboxes.first().fill(config.dataCptPath);
        await textboxes.nth(1).fill(dsName);

        // 清除默认参数
        const delButtons = page.getByRole('button', { name: /删除/ });
        const delCount = await delButtons.count();
        for (let i = 0; i < delCount; i++) {
            await delButtons.first().click();
            await page.waitForTimeout(100);
        }

        // 添加参数
        for (let i = 0; i < dataset.params.length; i++) {
            const p = dataset.params[i];
            await page.getByRole('button', { name: '+ 添加参数' }).click();
            await page.waitForTimeout(100);

            const names = page.getByRole('textbox', { name: '参数名' });
            const values = page.getByRole('textbox', { name: '参数值' });
            await names.nth(i).fill(p.name);
            await values.nth(i).fill(p.value);
        }

        // 发送
        await page.getByRole('button', { name: '发送请求' }).click();
        await page.waitForTimeout(2000);

        // 解析结果
        const outcome = await page.evaluate(() => {
            const errDiv = document.querySelector('[style*="fff2f0"]');
            const pre = document.querySelector('pre');
            const tag = document.querySelector('.ant-tag');

            if (pre) {
                try {
                    const json = JSON.parse(pre.textContent);
                    if (json.err_code === 0) {
                        return {
                            pass: true,
                            detail: `err_code=0, ${json.data ? json.data.length : 0} 条`,
                            ms: tag ? tag.textContent : null
                        };
                    }
                    return { pass: false, detail: `err_code=${json.err_code}, msg=${json.err_msg || ''}` };
                } catch (e) {
                    return { pass: false, detail: 'JSON解析失败: ' + e.message };
                }
            }
            if (errDiv) {
                return { pass: false, detail: errDiv.textContent.substring(0, 100) };
            }
            return { pass: false, detail: '未找到响应' };
        });

        const icon = outcome.pass ? '✅' : '❌';
        console.log(`  ${icon} ${outcome.detail}${outcome.ms ? ' (' + outcome.ms + ')' : ''}`);
        return { dataset: dsName, ...outcome };

    } catch (err) {
        console.log(`  ❌ 脚本异常: ${err.message}`);
        return { dataset: dsName, pass: false, detail: err.message };
    }
}

// ── 主流程 ─────────────────────────────────────────────────────

(async () => {
    const config = parseArgs(process.argv);

    console.log(`\n🔬 API 数据层验证`);
    console.log(`   CPT: ${config.dataCptPath}`);
    console.log(`   待验证: ${config.datasets.length} 个数据集\n`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const results = [];
    for (const ds of config.datasets) {
        results.push(await testDataset(page, ds, config));
    }
    await browser.close();

    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  总计 ${results.length}  |  ✅ ${passed}  |  ❌ ${failed}`);
    console.log(`${'═'.repeat(50)}\n`);

    if (failed > 0) {
        console.log('  失败清单:');
        results.filter(r => !r.pass).forEach(function(r) {
            console.log(`    - ${r.dataset}: ${r.detail}`);
        });
    }
    process.exit(failed > 0 ? 1 : 0);
})();
