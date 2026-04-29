const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = __dirname;
const PORT = 4178;
const PAGES = ['index.html', 'features.html', 'about.html', 'faq.html', 'roadmap.html', 'support.html', 'contact.html', '404.html'];
const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
];

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(ROOT, decodeURIComponent(urlPath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); return res.end('404'); }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

(async () => {
    await new Promise(r => server.listen(PORT, '127.0.0.1', r));
    console.log(`Server listening on http://127.0.0.1:${PORT}`);

    const outDir = path.join(OUT_DIR, 'screenshots');
    fs.mkdirSync(outDir, { recursive: true });

    const browser = await chromium.launch();
    const report = [];

    for (const vp of VIEWPORTS) {
        const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });

        for (const pg of PAGES) {
            const page = await ctx.newPage();
            const consoleMsgs = [];
            const pageErrors = [];
            const failedReqs = [];
            page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push(`[${m.type()}] ${m.text()}`); });
            page.on('pageerror', e => pageErrors.push(e.message));
            page.on('requestfailed', r => failedReqs.push(`${r.url()} - ${r.failure()?.errorText}`));

            const url = `http://127.0.0.1:${PORT}/${pg}`;
            try {
                await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
            } catch (e) {
                report.push({ page: pg, viewport: vp.name, error: `goto failed: ${e.message}` });
                await page.close();
                continue;
            }

            await page.waitForTimeout(800);

            const layout = await page.evaluate(() => {
                const docW = document.documentElement.scrollWidth;
                const winW = window.innerWidth;
                const horizontalScroll = docW > winW;

                // Find elements wider than viewport (overflow culprits)
                const overflowing = [];
                document.querySelectorAll('body *').forEach(el => {
                    const r = el.getBoundingClientRect();
                    if (r.right > winW + 1 && r.width < winW * 3) {
                        const tag = el.tagName.toLowerCase();
                        const cls = (el.className && typeof el.className === 'string') ? el.className.slice(0, 60) : '';
                        overflowing.push({ tag, cls, right: Math.round(r.right), width: Math.round(r.width) });
                    }
                });

                // Find elements with hidden content (text overflow)
                const clipped = [];
                document.querySelectorAll('h1, h2, h3, p, a, button, span').forEach(el => {
                    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
                        const style = getComputedStyle(el);
                        if (style.overflow === 'hidden' || style.textOverflow === 'ellipsis') {
                            // intentional, skip
                        } else if (el.scrollWidth - el.clientWidth > 5) {
                            clipped.push({ tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 40) });
                        }
                    }
                });

                // Check for missing/broken images
                const brokenImgs = [];
                document.querySelectorAll('img').forEach(img => {
                    if (!img.complete || img.naturalWidth === 0) {
                        brokenImgs.push(img.src);
                    }
                });

                // Check for empty interactive targets
                const emptyButtons = [];
                document.querySelectorAll('a, button').forEach(el => {
                    const txt = (el.textContent || '').trim();
                    const hasIcon = el.querySelector('svg, img');
                    const hasAriaLabel = el.getAttribute('aria-label');
                    if (!txt && !hasIcon && !hasAriaLabel) {
                        emptyButtons.push(el.outerHTML.slice(0, 100));
                    }
                });

                return {
                    docW, winW, horizontalScroll,
                    overflowing: overflowing.slice(0, 10),
                    clipped: clipped.slice(0, 10),
                    brokenImgs,
                    emptyButtons: emptyButtons.slice(0, 5),
                    bodyHeight: document.body.scrollHeight,
                };
            });

            const screenshotPath = path.join(outDir, `${pg.replace('.html', '')}-${vp.name}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });

            report.push({
                page: pg, viewport: vp.name,
                consoleMsgs, pageErrors, failedReqs,
                layout,
                screenshot: path.relative(ROOT, screenshotPath),
            });

            await page.close();
        }
        await ctx.close();
    }

    await browser.close();
    server.close();

    const reportPath = path.join(OUT_DIR, 'check-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Print summary
    console.log('\n=== SUMMARY ===\n');
    for (const r of report) {
        const issues = [];
        if (r.error) issues.push(`ERROR: ${r.error}`);
        if (r.pageErrors?.length) issues.push(`${r.pageErrors.length} JS errors`);
        if (r.failedReqs?.length) issues.push(`${r.failedReqs.length} failed requests`);
        if (r.consoleMsgs?.length) issues.push(`${r.consoleMsgs.length} console msgs`);
        if (r.layout?.horizontalScroll) issues.push(`horizontal scroll (${r.layout.docW} > ${r.layout.winW})`);
        if (r.layout?.overflowing?.length) issues.push(`${r.layout.overflowing.length} overflow elems`);
        if (r.layout?.clipped?.length) issues.push(`${r.layout.clipped.length} clipped text`);
        if (r.layout?.brokenImgs?.length) issues.push(`${r.layout.brokenImgs.length} broken imgs`);
        if (r.layout?.emptyButtons?.length) issues.push(`${r.layout.emptyButtons.length} empty buttons`);
        const tag = issues.length ? `⚠ ${issues.join(', ')}` : '✓ clean';
        console.log(`${r.page.padEnd(15)} ${r.viewport.padEnd(8)} ${tag}`);
    }
    console.log(`\nReport: ${reportPath}`);
    console.log(`Screenshots: ${outDir}`);
})();
