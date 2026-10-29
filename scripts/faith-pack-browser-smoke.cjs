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
    const consoleErrors = [];
    const requestFailures = [];
    page.on('pageerror', error => pageErrors.push(String(error && error.message || error).slice(0, 500)));
    page.on('console', message => {
      if (message.type() === 'error' || message.type() === 'warning') consoleErrors.push({ type: message.type(), text: message.text().slice(0, 500) });
    });
    page.on('requestfailed', request => requestFailures.push({ url: request.url().slice(0, 300), error: request.failure() && request.failure().errorText }));
    page.on('response', response => {
      if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url().slice(0, 300) });
    });
    await page.route('https://art.sintention.com/images/wfil-zip/**', route => route.fulfill({ status: 404, body: 'expected virtual path before ZIP observer patches it' }));
    const response = await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => globalThis.__WF_FORENSIC_READY__ === true, { timeout: 45000 });
    const bindings = await page.evaluate(() => globalThis.__WF_FORENSIC_PROBE__.bindings());
    const bootState = await page.evaluate(() => ({
      WML: typeof globalThis.WML,
      wmlGlobal: typeof globalThis.__WML__,
      wmlCoreLoaded: [...document.scripts].some(s => (s.src || '').includes('wml-core.js')),
      symbolsLoaded: [...document.scripts].some(s => (s.src || '').includes('symbols/')),
      bodyText: (document.body && document.body.innerText || '').slice(0, 1500),
      buttons: [...document.querySelectorAll('button')].map(b => ({ text: (b.innerText || b.textContent || '').trim().slice(0, 90), title: b.title, aria: b.getAttribute('aria-label') })).slice(0, 60),
      dock: !!document.querySelector('#wml-dock'),
      rootText: (document.querySelector('#wml-dock') && document.querySelector('#wml-dock').innerText || '').slice(0, 500),
      probe: globalThis.__WF_FORENSIC_READY__ === true,
      lsKeys: Object.keys(localStorage).filter(k => /wml|faith/i.test(k)).slice(0, 60)
    }));
    try {
      const candidates = [...page.locator('button').all ? [] : []];
      const byText = page.locator('button').filter({ hasText: 'Faith 이미지팩 로더' }).first();
      if (await byText.count()) await byText.click({ timeout: 5000 });
      else throw new Error('No button with matching text');
    } catch (e) {
      const diagnostic = { bootState, bindings, pageErrors, consoleErrors: consoleErrors.slice(0, 30), requestFailures: requestFailures.slice(0, 30), failedResponses: failedResponses.slice(0, 30), clickError: String(e && e.message || e) };
      fs.mkdirSync('forensic-output', { recursive: true });
      fs.writeFileSync('forensic-output/pre-import-diagnostic.json', JSON.stringify(diagnostic, null, 2) + '\n');
      console.log('PRE_IMPORT_DIAGNOSTICS ' + JSON.stringify(diagnostic));
      throw new Error('WML dock button not available; see pre-import-diagnostic.json');
    }
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
      consoleErrors: consoleErrors.slice(0, 30),
      requestFailures: requestFailures.slice(0, 30),
      serverErrors: failedResponses.slice(0, 30)
    };
    fs.writeFileSync('forensic-output/browser-runtime.json', JSON.stringify(summary, null, 2) + '\n');
    console.log('BROWSER_HTTP_STATUS ' + summary.httpStatus);
    console.log('WML_ENGINE_BINDINGS ' + JSON.stringify(bindings));
    console.log('ZIP_IMPORT_STATUS ' + importStatus);
    console.log('ZIP_MANIFEST_ENTRY ' + JSON.stringify(manifest));
    console.log('ZIP_IMAGE_OUTPUT ' + JSON.stringify(rendered));
    console.log('BROWSER_PAGE_ERRORS ' + pageErrors.length);
    console.log('BROWSER_CONSOLE_ERRORS ' + JSON.stringify(consoleErrors.slice(0, 20)));
    console.log('BROWSER_REQUEST_FAILURES ' + JSON.stringify(requestFailures.slice(0, 20)));
    console.log('BROWSER_HTTP_ERRORS ' + JSON.stringify(failedResponses.slice(0, 20)));
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
