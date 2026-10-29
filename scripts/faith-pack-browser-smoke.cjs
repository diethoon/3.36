'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve('Wayward_MOD_v4.0_WML_검수완료');
const htmlPath = path.join(root, 'Wayward_WML_ko.html');
const zipPath = path.resolve('forensic-output/wfil-test-pack.zip');
const talentName = 'faith_forensic_probe__test';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png'
};
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
  catch (_) { res.writeHead(400); res.end('bad path'); return; }
  if (pathname === '/') pathname = '/Wayward_WML_ko.html';
  const file = path.resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {
      'content-type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': 'no-store'
    });
    fs.createReadStream(file).pipe(res);
  });
});

(async () => {
  let browser;
  try {
    if (!fs.existsSync(htmlPath)) throw new Error('Exact WML HTML missing: ' + htmlPath);
    if (!fs.existsSync(zipPath)) throw new Error('Synthetic Faith ZIP missing: ' + zipPath);
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(4173, '127.0.0.1', resolve);
    });
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const pageErrors = [];
    const failedResponses = [];
    page.on('pageerror', error => pageErrors.push(String(error && error.message || error).slice(0, 500)));
    page.on('response', response => {
      if (response.status() >= 500) failedResponses.push({ status: response.status(), url: response.url().slice(0, 300) });
    });
    await page.route('https://art.sintention.com/images/wfil-zip/**', route => route.fulfill({ status: 404, body: 'expected virtual path before ZIP observer patches it' }));
    const response = await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => globalThis.__WF_FORENSIC_READY__ === true, { timeout: 45000 });
    const bindings = await page.evaluate(() => globalThis.__WF_FORENSIC_PROBE__.bindings());
    await page.getByRole('button', { name: 'Faith 이미지팩 로더' }).first().click({ timeout: 15000 });
    await page.locator('.wfil-wrap').waitFor({ state: 'visible', timeout: 15000 });
    const input = page.locator('input[aria-label="이미지팩 ZIP 파일 선택"]');
    await input.setInputFiles(zipPath);
    await page.waitForFunction(() => {
      const s = document.querySelector('.wfil-wrap [role="status"]');
      return !!s && (s.textContent.includes('ZIP 이미지팩 1개를 등록했습니다') || s.textContent.includes('ZIP 등록 실패:'));
    }, { timeout: 30000 });
    const importStatus = await page.locator('.wfil-wrap [role="status"]').innerText();
    const manifest = await page.evaluate(async name => globalThis.__WF_FORENSIC_PROBE__.entry(name), talentName);
    const rendered = await page.evaluate(async name => globalThis.__WF_FORENSIC_PROBE__.render(name), talentName);
    const summary = {
      target: htmlPath,
      branchFixture: 'faith-image-rootcause-forensics-20261029',
      httpStatus: response && response.status(),
      bindings,
      importStatus,
      manifest,
      rendered,
      pageErrors: pageErrors.slice(0, 20),
      pageErrorCount: pageErrors.length,
      serverErrors: failedResponses.slice(0, 20)
    };
    fs.writeFileSync('forensic-output/browser-runtime.json', JSON.stringify(summary, null, 2) + '\n');
    console.log('BROWSER_HTTP_STATUS ' + summary.httpStatus);
    console.log('WML_ENGINE_BINDINGS ' + JSON.stringify(bindings));
    console.log('ZIP_IMPORT_STATUS ' + importStatus);
    console.log('ZIP_MANIFEST_ENTRY ' + JSON.stringify(manifest));
    console.log('ZIP_IMAGE_OUTPUT ' + JSON.stringify(rendered));
    console.log('BROWSER_PAGE_ERRORS ' + pageErrors.length);
    console.log('BROWSER_SERVER_5XX ' + failedResponses.length);
    if (summary.httpStatus !== 200 ||
        !importStatus.includes('ZIP 이미지팩 1개를 등록했습니다') ||
        !manifest.found ||
        !rendered.rendered ||
        !String(rendered.currentSrc || '').startsWith('blob:')) {
      process.exitCode = 2;
    }
  } catch (error) {
    console.error('BROWSER_SMOKE_ERROR ' + String(error && error.stack || error));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})();
