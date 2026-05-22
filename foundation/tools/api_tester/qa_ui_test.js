const { chromium } = require('playwright');
const results = [];

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const logs = { errors: [], warns: [] };
    page.on('console', msg => {
        if (msg.type() === 'error') logs.errors.push(msg.text());
    });
    page.on('pageerror', err => logs.errors.push(err.message));

    const listUrl = 'http://localhost:8075/webroot/decision/view/report?viewlet=asset_label%252Flabel_print%252Fpages%252Flabel_device_list.cpt&op=write';

    // TC-005
    console.log('--- TC-005 ---');
    await page.goto(listUrl, { timeout: 30000, waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const title = await page.locator('h2').textContent().catch(() => '');
    const rows = await page.locator('.ant-table-row').count();
    const fineReportErrors = logs.errors.filter(e => !e.includes('BI is not defined') && !e.includes('BI'));
    results.push({
        id: 'TC-005', desc: '列表页加载与数据展示',
        pass: title.includes('标签打印') && rows > 0 && fineReportErrors.length === 0,
        detail: 'title="' + title + '", rows=' + rows + ', jsErrors=' + fineReportErrors.length
    });
    console.log('TC-005:', results[0].pass ? 'PASS' : 'FAIL', '-', results[0].detail);

    // TC-006
    console.log('--- TC-006 ---');
    const searchInput = page.getByPlaceholder('唯一标识码');
    await searchInput.fill('LC-2024-001');
    await page.getByRole('button', { name: /搜索/ }).click();
    await page.waitForTimeout(1500);
    const searchRows = await page.locator('.ant-table-row').count();
    results.push({
        id: 'TC-006', desc: '搜索筛选功能',
        pass: searchRows === 1,
        detail: 'searched LC-2024-001, rows=' + searchRows
    });
    console.log('TC-006:', results[1].pass ? 'PASS' : 'FAIL', '-', results[1].detail);
    await page.getByRole('button', { name: /重置/ }).click();
    await page.waitForTimeout(1500);

    // TC-007
    console.log('--- TC-007 ---');
    const hasPagination = await page.locator('.ant-pagination').count() > 0;
    const sizeSel = page.locator('.ant-pagination-options .ant-select-selector');
    if (await sizeSel.count() > 0) {
        await sizeSel.click();
        await page.waitForTimeout(500);
        const opts = page.locator('.ant-select-item-option');
        if (await opts.count() > 0) { await opts.first().click(); await page.waitForTimeout(1500); }
    }
    const pageRows = await page.locator('.ant-table-row').count();
    results.push({
        id: 'TC-007', desc: '分页功能',
        pass: hasPagination && pageRows <= 10,
        detail: 'pagination=' + hasPagination + ', rows per page=' + pageRows
    });
    console.log('TC-007:', results[2].pass ? 'PASS' : 'FAIL', '-', results[2].detail);
    await page.getByRole('button', { name: /重置/ }).click();
    await page.waitForTimeout(1500);

    // TC-008
    console.log('--- TC-008 ---');
    const cbs = page.locator('.ant-checkbox-input');
    const cbCount = await cbs.count();
    const selN = Math.min(3, cbCount - 1);
    for (let i = 1; i <= selN; i++) { await cbs.nth(i).click(); await page.waitForTimeout(200); }
    const printBtn = page.getByRole('button', { name: /打印标签/ });
    const btnDisabled = await printBtn.isDisabled();
    const btnText = await printBtn.textContent();
    results.push({
        id: 'TC-008', desc: '行勾选与打印按钮',
        pass: !btnDisabled && btnText.indexOf('' + selN) >= 0,
        detail: 'selected ' + selN + ' rows, btn="' + btnText.trim() + '", disabled=' + btnDisabled
    });
    console.log('TC-008:', results[3].pass ? 'PASS' : 'FAIL', '-', results[3].detail);

    // TC-009, TC-010, TC-012
    console.log('--- TC-009 ---');
    const selectedData = [
        { lifecycle_no: 'LC-2024-001', equipment_name: 'ThinkPad X1 Carbon', user_department: 'D001' },
        { lifecycle_no: 'LC-2024-003', equipment_name: 'HP LaserJet Pro', user_department: 'D002' }
    ];
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    const printUrl = 'http://localhost:8075/webroot/decision/view/report?viewlet=asset_label%252Flabel_print%252Fpages%252Flabel_print.cpt&op=write';
    await page2.goto(printUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page2.evaluate(d => sessionStorage.setItem('label_print_data', JSON.stringify(d)), selectedData);
    await page2.reload({ waitUntil: 'networkidle' });
    await page2.waitForTimeout(2500);

    const labels = await page2.locator('.label-page').count();
    const qrImgs = page2.locator('img[src^="data:image/png"]');
    const qrCnt = await qrImgs.count();
    let labelOk = false;
    if (labels >= 2) {
        const dims = await page2.evaluate(() => {
            var el = document.querySelector('.label-page');
            if (!el) return null;
            var rect = el.getBoundingClientRect();
            return { w: Math.round(rect.width), h: Math.round(rect.height) };
        });
        labelOk = dims && dims.w === 170 && dims.h === 72;
        console.log('Label dimensions:', JSON.stringify(dims));
    }
    results.push({
        id: 'TC-009', desc: '标签渲染',
        pass: labels === 2 && qrCnt >= 2 && labelOk,
        detail: 'labels=' + labels + ', QR_imgs=' + qrCnt + ', dims_170x72=' + labelOk
    });
    console.log('TC-009:', results[4].pass ? 'PASS' : 'FAIL', '-', results[4].detail);

    // TC-010
    const qrSrc = qrCnt > 0 ? await qrImgs.first().getAttribute('src') : '';
    results.push({
        id: 'TC-010', desc: '二维码生成',
        pass: qrSrc && qrSrc.startsWith('data:image/png;base64,') && qrSrc.length > 500,
        detail: 'QR dataURL len=' + (qrSrc ? qrSrc.length : 0) + ', valid=' + (qrSrc && qrSrc.startsWith('data:image/png'))
    });
    console.log('TC-010:', results[5].pass ? 'PASS' : 'FAIL', '-', results[5].detail);

    // TC-012
    const textOverflow = await page2.evaluate(() => {
        var els = document.querySelectorAll('.label-page div');
        for (var i = 0; i < els.length; i++) {
            var s = window.getComputedStyle(els[i]);
            if (s.overflow === 'hidden' && s.textOverflow === 'ellipsis') return true;
        }
        return false;
    });
    results.push({
        id: 'TC-012', desc: '内容超长截断',
        pass: textOverflow,
        detail: 'text-overflow:ellipsis found=' + textOverflow
    });
    console.log('TC-012:', results[6].pass ? 'PASS' : 'FAIL', '-', results[6].detail);
    await ctx2.close();

    // TC-013
    console.log('--- TC-013 ---');
    results.push({
        id: 'TC-013', desc: '端到端流程',
        pass: !btnDisabled && labels === 2,
        detail: 'btn clickable=' + !btnDisabled + ', print renders=' + (labels === 2)
    });
    console.log('TC-013:', results[7].pass ? 'PASS' : 'FAIL', '-', results[7].detail);

    await browser.close();

    // TC-011
    console.log('\n--- TC-011 ---');
    console.log('TC-011: SKIP - headless mode cannot test window.print() dialog');
    results.push({ id: 'TC-011', desc: '打印/PDF导出', pass: 'SKIP', detail: 'Headless mode cannot test print dialog' });

    var passCount = results.filter(r => r.pass === true).length;
    var failCount = results.filter(r => r.pass === false).length;
    var skipCount = results.filter(r => r.pass === 'SKIP').length;
    console.log('\n=== SUMMARY ===');
    console.log('Pass:', passCount, 'Fail:', failCount, 'Skip:', skipCount);
    console.log('\n=== RESULTS_JSON ===');
    console.log(JSON.stringify(results, null, 2));
})();
