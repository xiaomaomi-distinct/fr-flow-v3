/**
 * 数据层 API 验证脚本（Playwright - 已录制验证）
 *
 * 用法：
 *   1. 从 dev_task.json 提取 datasets 信息，填入下方 DATASETS 数组
 *   2. node api_verify.spec.js
 *
 * 验证流程：
 *   打开 api_tester → 清除默认分页参数 → 按 dataset 逐条添加参数 → 发送 → 检查 err_code
 */

const { chromium } = require('playwright');

const CONFIG = {
    apiTesterUrl: 'http://localhost:18080/webroot/decision/view/report?op=write&reportlet=api/api_tester.cpt',
    dataCptPath: 'employee/data/employee_data.cpt',
    datasets: [
        { name: 'employee_qry',   type: 'list',   params: [{ name: 'p_page', value: '1', type: 'String' }, { name: 'p_pagesize', value: '10', type: 'String' }] },
        { name: 'employee_total', type: 'stat',   params: [] },
        { name: 'dict_dept',      type: 'dict',   params: [] },
        { name: 'employee_by_id', type: 'detail', params: [{ name: 'p_id', value: '1', type: 'Integer' }] },
        // 写入类，按需启用
        // { name: 'insert_employee', type: 'insert', params: [{ name: 'p_name', value: 'test', type: 'String' }] },
    ],
};

async function testDataset(page, dataset) {
    const dsName = dataset.name;
    console.log(`\n── ${dsName} (${dataset.type})`);

    try {
        // 1. 打开 api_tester
        await page.goto(CONFIG.apiTesterUrl);
        await page.waitForSelector('#app-root', { timeout: 10000 });
        await page.waitForTimeout(500);

        // 2. 填写 CPT 路径 + 数据集名称
        await page.getByRole('textbox').first().fill(CONFIG.dataCptPath);
        await page.getByRole('textbox').nth(1).fill(dsName);

        // 3. 清除默认参数（p_page / p_pagesize）
        const delButtons = page.getByRole('button', { name: /删除/ });
        const delCount = await delButtons.count();
        for (let i = 0; i < delCount; i++) {
            await delButtons.first().click();
            await page.waitForTimeout(100);
        }

        // 4. 按 dataset 添加参数
        for (let i = 0; i < dataset.params.length; i++) {
            const p = dataset.params[i];
            await page.getByRole('button', { name: '+ 添加参数' }).click();
            await page.waitForTimeout(100);

            const names = page.getByRole('textbox', { name: '参数名' });
            const values = page.getByRole('textbox', { name: '参数值' });
            await names.nth(i).fill(p.name);
            await values.nth(i).fill(p.value);
        }

        // 5. 发送
        await page.getByRole('button', { name: '发送请求' }).click();
        await page.waitForTimeout(2000);

        // 6. 解析结果
        const outcome = await page.evaluate(() => {
            const errDiv = document.querySelector('[style*="fff2f0"]');
            const pre = document.querySelector('pre');
            const tag = document.querySelector('.ant-tag');

            if (pre) {
                try {
                    const json = JSON.parse(pre.textContent);
                    if (json.err_code === 0) {
                        return { pass: true, detail: `err_code=0, ${json.data ? json.data.length : 0} 条`, ms: tag ? tag.textContent : null };
                    }
                    return { pass: false, detail: `err_code=${json.err_code}, msg=${json.err_msg || ''}` };
                } catch (e) {
                    return { pass: false, detail: 'JSON解析失败: ' + e.message };
                }
            }
            if (errDiv) {
                return { pass: false, detail: errDiv.textContent.substring(0, 100) };
            }
            return { pass: false, detail: '未找到响应（pre/errDiv 均不存在）' };
        });

        const icon = outcome.pass ? '✅' : '❌';
        console.log(`  ${icon} ${outcome.detail}${outcome.ms ? ' (' + outcome.ms + ')' : ''}`);
        return { dataset: dsName, ...outcome };

    } catch (err) {
        console.log(`  ❌ 脚本异常: ${err.message}`);
        return { dataset: dsName, pass: false, detail: err.message };
    }
}

(async () => {
    console.log(`\n🔬 API 数据层验证`);
    console.log(`   CPT: ${CONFIG.dataCptPath}`);
    console.log(`   待验证: ${CONFIG.datasets.length} 个数据集\n`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const results = [];
    for (const ds of CONFIG.datasets) {
        results.push(await testDataset(page, ds));
    }
    await browser.close();

    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  总计 ${results.length}  |  ✅ ${passed}  |  ❌ ${failed}`);
    console.log(`${'═'.repeat(50)}\n`);

    if (failed > 0) {
        console.log('  失败清单:');
        results.filter(r => !r.pass).forEach(r => console.log(`    - ${r.dataset}: ${r.detail}`));
    }
    process.exit(failed > 0 ? 1 : 0);
})();
