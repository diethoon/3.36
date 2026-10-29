'use strict';
const http = require('node:http');
const fs = require('node:fs');
const { chromium } = require('playwright');

const filePath = 'Wayward_MOD_v4.0_WML_검수완료/Wayward_WML_ko.html';
const html = fs.readFileSync(filePath);
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/index.html')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': html.length, 'cache-control': 'no-store' });
    res.end(html);
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

(async () => {
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(4173, '127.0.0.1', resolve);
    });
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error && error.message || error).slice(0, 400)));
    const response = await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6500);
    const runtime = await page.evaluate(() => ({
      readyState: document.readyState,
      title: document.title,
      gameBundleLoaded: [...document.scripts].some(s => !s.src && /function WOe|__WAYWARD_IMAGE_PACKS__/.test(s.textContent || '')),
      globalSymbols: {
        WOe: typeof window.WOe,
        qD: typeof window.qD,
        m312ImageChanged: typeof window.m312ImageChanged,
        WAYWARD_IMAGE_PACKS: typeof window.__WAYWARD_IMAGE_PACKS__,
        WF_OUTFIT_PACKS: typeof window.__WF_OUTFIT_PACKS__
      },
      packRegistry: Array.isArray(window.__WAYWARD_IMAGE_PACKS__)
        ? { type: 'array', length: window.__WAYWARD_IMAGE_PACKS__.length }
        : { type: typeof window.__WAYWARD_IMAGE_PACKS__, keys: window.__WAYWARD_IMAGE_PACKS__ && typeof window.__WAYWARD_IMAGE_PACKS__ === 'object' ? Object.keys(window.__WAYWARD_IMAGE_PACKS__).slice(0, 10) : [] },
      outfitRegistry: window.__WF_OUTFIT_PACKS__ && typeof window.__WF_OUTFIT_PACKS__ === 'object'
        ? Object.keys(window.__WF_OUTFIT_PACKS__).length : null,
      scriptCount: document.scripts.length,
      imgCount: document.images.length,
      imgSources: [...document.images].slice(0, 12).map(img => ({ src: img.getAttribute('src'), currentSrc: img.currentSrc, complete: img.complete, naturalWidth: img.naturalWidth })),
      bodyTextStart: (document.body && document.body.innerText || '').slice(0, 800)
    }));
    const summary = {
      target: filePath,
      httpStatus: response && response.status(),
      runtime,
      pageErrors: pageErrors.slice(0, 20),
      pageErrorCount: pageErrors.length
    };
    fs.mkdirSync('forensic-output', { recursive: true });
    fs.writeFileSync('forensic-output/browser-runtime.json', JSON.stringify(summary, null, 2) + '\n');
    console.log('BROWSER_HTTP_STATUS ' + summary.httpStatus);
    console.log('BROWSER_READY_STATE ' + runtime.readyState);
    console.log('BROWSER_GLOBALS ' + JSON.stringify(runtime.globalSymbols));
    console.log('BROWSER_NATIVE_PACKS ' + JSON.stringify(runtime.packRegistry));
    console.log('BROWSER_OUTFIT_PACKS ' + JSON.stringify(runtime.outfitRegistry));
    console.log('BROWSER_SCRIPTS ' + runtime.scriptCount + ' IMAGES ' + runtime.imgCount);
    console.log('BROWSER_PAGE_ERRORS ' + pageErrors.length);
    if (summary.httpStatus !== 200) process.exitCode = 2;
  } catch (error) {
    console.error('BROWSER_SMOKE_ERROR ' + String(error && error.stack || error));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})();
