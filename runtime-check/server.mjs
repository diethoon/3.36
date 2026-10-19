import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import chromiumBinary from '@sparticuz/chromium';
import { chromium as playwrightChromium } from 'playwright-core';

const ROOT = path.resolve(process.cwd());
const PORT = Number(process.env.PORT || 10000);
const GAME_REL = 'Wayward_MOD_v4.0_WML_검수완료/Wayward_WML_ko.html';
const GAME_FILE = path.join(ROOT, GAME_REL);
const FIXTURE_DIR = path.join(ROOT, 'runtime-check/fixture/WifeAddon_ibuki');
const logs = [];
let latestScreenshot = null;
let result = {
  service: 'Wayward WML 4.0 / Ibuki runtime verification',
  state: 'starting',
  baseBranch: 'wml',
  fixtureSourceCommit: 'aa6519270d2708f76d7cac05164aff935220838d',
  fixtureHashes: {
    'mod.js': '13f484c8208d493e56764a3cbe8f5aed2845b3ea',
    'Addon_Newwife_ibuki.js': '771fd785ef9d17b25e228553aae719ba0fa327e7',
    'bridge.manifest.json': '5cbc40d33efe32e3ed5f7e7fee58988659e9978d'
  }
};
function log(kind, message, data) {
  const row = { at: new Date().toISOString(), kind:kind, message:String(message).slice(0,1000) };
  if (data !== undefined) row.data = data;
  logs.push(row);
  if (logs.length > 250) logs.shift();
  console.log('[IBUKI-RUNTIME] ' + JSON.stringify(row));
}
function json(res, status, value) {
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  res.end(JSON.stringify(value, null, 2));
}
const mime = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.svg':'image/svg+xml',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp',
  '.woff':'font/woff','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'
};
const server = http.createServer((req,res) => {
  const u = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'));
  const remoteAddress = req.socket.remoteAddress || '';
  const localRequest = remoteAddress === '127.0.0.1' || remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1';
  // Never expose the game HTML or test artifacts through the public Render URL.
  if (!localRequest && u.pathname !== '/' && u.pathname !== '/healthz') { res.writeHead(404); return res.end('Not found'); }
  if (u.pathname === '/healthz') return json(res,200,{ok:true,service:'ibuki-wml-runtime-check',state:result.state});
  if (u.pathname === '/result') return json(res,200,result);
  if (u.pathname === '/logs') return json(res,200,logs);
  if (u.pathname === '/screenshot.png') {
    if (!latestScreenshot) { res.writeHead(404); return res.end('No screenshot yet'); }
    res.writeHead(200,{'content-type':'image/png','cache-control':'no-store'});
    return res.end(latestScreenshot);
  }
  if (u.pathname === '/') return json(res,200,{service:result.service,state:result.state,endpoints:['/healthz','/result','/logs','/screenshot.png']});
  let pathname;
  try { pathname = decodeURIComponent(u.pathname); } catch { res.writeHead(400); return res.end('Bad path'); }
  const file = path.resolve(ROOT, '.' + pathname);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file,(err,st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200,{'content-type':mime[path.extname(file).toLowerCase()] || 'application/octet-stream','cache-control':'no-store'});
    fs.createReadStream(file).pipe(res);
  });
});
function summarize(v,depth) {
  depth = depth || 0;
  if (v == null || ['string','number','boolean'].includes(typeof v)) return v;
  if (typeof v === 'function') return '[Function]';
  if (depth > 3) return Array.isArray(v) ? '[Array]' : '[Object]';
  if (Array.isArray(v)) return v.slice(0,300).map(x=>summarize(x,depth+1));
  try { return Object.fromEntries(Object.entries(v).slice(0,300).map(([k,x])=>[k,summarize(x,depth+1)])); }
  catch { return String(v); }
}
function nameHits(v) {
  const hits = [], seen = new Set();
  function walk(x,p,d) {
    if (d > 6 || x == null) return;
    if (typeof x === 'string') {
      if (/ibuki|이부키/i.test(x) && hits.length < 80) hits.push({path:p,value:x.slice(0,150)});
      return;
    }
    if (typeof x !== 'object' || seen.has(x)) return;
    seen.add(x);
    const entries = Array.isArray(x) ? x.slice(0,400).map((v,i)=>[String(i),v]) : Object.entries(x).slice(0,400);
    for (const [k,v2] of entries) {
      if (/ibuki|이부키/i.test(k) && hits.length < 80) hits.push({path:p+'.'+k,value:typeof v2==='string'?v2.slice(0,150):'['+typeof v2+']'});
      walk(v2,p+'.'+k,d+1);
    }
  }
  walk(v,'$',0);
  return hits;
}
async function runTest() {
  result = Object.assign({},result,{state:'running',startedAt:new Date().toISOString()});
  log('INFO','Starting headless Chromium test',{
    node:process.version,port:PORT,gameFile:GAME_REL,
    gameBytes:fs.existsSync(GAME_FILE)?fs.statSync(GAME_FILE).size:null
  });
  let browser;
  try {
    if (!fs.existsSync(GAME_FILE)) throw new Error('Game HTML missing: '+GAME_FILE);
    const fixture = {};
    for (const name of ['mod.js','Addon_Newwife_ibuki.js','bridge.manifest.json']) {
      const fp = path.join(FIXTURE_DIR,name);
      if (!fs.existsSync(fp)) throw new Error('Addon fixture missing: '+fp);
      fixture[name] = fs.readFileSync(fp,'utf8');
    }
    chromiumBinary.setGraphicsMode = false;
    browser = await playwrightChromium.launch({headless:true,args:chromiumBinary.args,executablePath:await chromiumBinary.executablePath()});
    const context = await browser.newContext({viewport:{width:1440,height:960},locale:'ko-KR'});
    const blockedRequests = [];
    await context.route('**/api/image/generate**',async route=>{
      blockedRequests.push({url:route.request().url(),reason:'generation endpoint blocked for registration-only test'});
      await route.fulfill({status:503,contentType:'application/json',body:'{"error":"blocked by runtime test"}'});
    });
    await context.route('http://127.0.0.1:8189/**',async route=>{
      blockedRequests.push({url:route.request().url(),reason:'no local image backend in this test'});
      await route.abort();
    });
    const page = await context.newPage();
    const pageErrors=[], consoleErrors=[];
    page.on('pageerror',e=>{if(pageErrors.length<50)pageErrors.push(String(e).slice(0,800));});
    page.on('console',msg=>{if(msg.type()==='error'&&consoleErrors.length<50)consoleErrors.push(msg.text().slice(0,800));});
    const gameURL = 'http://127.0.0.1:'+PORT+'/'+GAME_REL.split('/').map(encodeURIComponent).join('/');
    const response = await page.goto(gameURL,{waitUntil:'commit',timeout:90000});
    log('INFO','Game navigation committed',{url:gameURL,httpStatus:response?response.status():null});
    await page.waitForFunction(()=>!!window.WML&&typeof window.WML.install==='function',null,{timeout:120000});
    log('INFO','WML install API ready after script evaluation');
    await page.waitForTimeout(2500);
    const ageGateAccepted = await page.evaluate(() => {
      const els = [...document.querySelectorAll('button,[role="button"],input[type="button"],a,[onclick]')];
      const yes = els.find(el => !!el.getClientRects().length && (el.innerText || el.value || '').trim() === '예');
      if (yes) { yes.click(); return true; }
      return false;
    });
    if (ageGateAccepted) {
      log('INFO','Accepted age-gate prompt only in disposable test browser to reach the wife-selection UI');
      await page.waitForTimeout(1800);
    }
    const baseline = await page.evaluate(()=>({
      title:document.title,
      bodyText:(document.body&&document.body.innerText||'').slice(0,1800),
      buttons:[...document.querySelectorAll('button,[role="button"],input[type="button"],a')].filter(e=>e.getClientRects().length).slice(0,60).map(e=>(e.innerText||e.value||e.getAttribute('aria-label')||'').trim().slice(0,100)).filter(Boolean),
      wmlAvailable:!!window.WML,
      legacyKeys:Object.keys(window.__WML_LEGACY__||{})
    }));
    latestScreenshot = await page.screenshot({fullPage:false}).catch(()=>null);
    log('INFO','Baseline snapshot',baseline);
    const installResult = await page.evaluate(async files=>{
      const b=(s,type)=>new Blob([s],{type:type});
      return await window.WML.install([
        {path:'WifeAddon_ibuki/mod.js',blob:b(files['mod.js'],'text/javascript')},
        {path:'WifeAddon_ibuki/Addon_Newwife_ibuki.js',blob:b(files['Addon_Newwife_ibuki.js'],'text/javascript')},
        {path:'WifeAddon_ibuki/bridge.manifest.json',blob:b(files['bridge.manifest.json'],'application/json')}
      ]);
    },fixture);
    log('INFO','WML.install returned',summarize(installResult,0));
    const reloadResponse = await page.reload({waitUntil:'commit',timeout:90000});
    log('INFO','Post-install reload committed',{httpStatus:reloadResponse?reloadResponse.status():null});
    await page.waitForFunction(()=>!!window.WML&&typeof window.WML.status==='function',null,{timeout:120000});
    const ageGateAfterReload = await page.evaluate(() => {
      const els = [...document.querySelectorAll('button,[role="button"],input[type="button"],a,[onclick]')];
      const yes = els.find(el => !!el.getClientRects().length && (el.innerText || el.value || '').trim() === '예');
      if (yes) { yes.click(); return true; }
      return false;
    });
    if (ageGateAfterReload) log('INFO','Dismissed age gate after reload in disposable browser profile');
    await page.waitForTimeout(5000);
    const afterInstall = await page.evaluate(()=>{
      const summarize = (v,depth) => {
        depth = depth || 0;
        if (v == null || ['string','number','boolean'].includes(typeof v)) return v;
        if (typeof v === 'function') return '[Function]';
        if (depth > 3) return Array.isArray(v) ? '[Array]' : '[Object]';
        if (Array.isArray(v)) return v.slice(0,300).map(x=>summarize(x,depth+1));
        try { return Object.fromEntries(Object.entries(v).slice(0,300).map(([k,x])=>[k,summarize(x,depth+1)])); }
        catch { return String(v); }
      };
      const nameHits = value => {
        const hits = [], seen = new WeakSet();
        const walk = (x,p,d) => {
          if (d > 6 || x == null) return;
          if (typeof x === 'string') { if (/ibuki|이부키/i.test(x) && hits.length < 80) hits.push({path:p,value:x.slice(0,150)}); return; }
          if (typeof x !== 'object' || seen.has(x)) return;
          seen.add(x);
          const entries = Array.isArray(x) ? x.slice(0,400).map((v,i)=>[String(i),v]) : Object.entries(x).slice(0,400);
          for (const [k,v2] of entries) {
            if (/ibuki|이부키/i.test(k) && hits.length < 80) hits.push({path:p+'.'+k,value:typeof v2==='string'?v2.slice(0,150):'['+typeof v2+']'});
            walk(v2,p+'.'+k,d+1);
          }
        };
        walk(value,String.fromCharCode(36),0);
        return hits;
      };
      const status=window.WML&&window.WML.status?window.WML.status():null;
      const legacy=window.__WML_LEGACY__;
      const reg={};
      for(const key of ['Zl','dd','cPe']){try{reg[key]=legacy&&legacy.get?legacy.get(key):null;}catch(e){reg[key]='[get failed: '+String(e)+']';}}
      const aa=window.__WAYWARD_WIFE_ADDONS__;
      const addonArray=Array.isArray(aa)?aa.map(w=>({id:w&&w.id||null,name:w&&w.name||null,shortname:w&&w.shortname||null,basedOn:w&&w.basedOn||null})):null;
      const visible=el=>!!el&&!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
      const body=document.body&&document.body.innerText||'';
      const textMatches=[...document.querySelectorAll('body *')].filter(el=>visible(el)&&el.children.length===0&&/이부키|ibuki/i.test(el.textContent||'')).slice(0,60).map(el=>({
        tag:el.tagName,text:(el.textContent||'').trim().slice(0,100),id:el.id||'',
        className:typeof el.className==='string'?el.className.slice(0,140):'',
        parent:el.parentElement?{tag:el.parentElement.tagName,id:el.parentElement.id||'',className:typeof el.parentElement.className==='string'?el.parentElement.className.slice(0,140):''}:null
      }));
      const selects=[...document.querySelectorAll('select')].filter(visible).map(s=>({id:s.id||'',name:s.name||'',options:[...s.options].map(o=>o.textContent.trim()).slice(0,200)}));
      return {
        title:document.title,href:location.href,status:summarize(status,0),
        installed:window.WML&&window.WML.installed?window.WML.installed():null,
        addonArray,legacyMethods:Object.keys(legacy||{}).filter(k=>typeof legacy[k]==='function'),
        registrySummary:Object.fromEntries(Object.entries(reg).map(([k,v])=>[k,summarize(v,0)])),
        registryHits:nameHits(reg),addonArrayHits:nameHits(addonArray),
        textHasIbuki:/이부키|ibuki/i.test(body),bodyTextStart:body.slice(0,2200),
        textMatches,selects,labels:[...document.querySelectorAll('label')].filter(visible).map(l=>l.innerText.trim()).filter(Boolean).slice(0,80),
        visibleButtons:[...document.querySelectorAll('button,[role="button"],input[type="button"],a')].filter(visible).slice(0,80).map(e=>(e.innerText||e.value||e.getAttribute('aria-label')||'').trim().slice(0,110)).filter(Boolean)
      };
    });
    latestScreenshot = await page.screenshot({fullPage:false}).catch(()=>latestScreenshot);
    log('INFO','Post-install snapshot',afterInstall);
    const uiTrail=[];
    for(let step=0;step<10;step++){
      const snap=await page.evaluate(()=>{
        const body=document.body&&document.body.innerText||'';
        const opts=[...document.querySelectorAll('select option')].map(o=>(o.textContent||'').trim()).filter(Boolean);
        return {textContains:/이부키|ibuki/i.test(body),selectContains:opts.some(x=>/이부키|ibuki/i.test(x)),bodyStart:body.slice(0,1200)};
      });
      if(snap.textContains||snap.selectContains){uiTrail.push({step,found:true,snapshot:snap});break;}
      const clicked=await page.evaluate(()=>{
        const nodes=[...document.querySelectorAll('button,[role="button"],input[type="button"],a,[onclick]')];
        const candidates=nodes.map((el,index)=>({el,index,text:(el.innerText||el.value||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,100),visible:!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'})).filter(x=>x.visible&&x.text&&x.text.length<100);
        const patterns=[/아내\s*(선택|목록)/i,/캐릭터\s*선택/i,/인물\s*선택/i,/새\s*게임/i,/새로\s*시작/i,/처음부터/i,/게임\s*시작/i,/시작하기/i];
        let target=null;
        for(const pat of patterns){target=candidates.find(x=>pat.test(x.text));if(target)break;}
        if(!target)return null;
        candidates[target.index].el.click();
        return {text:target.text,index:target.index};
      });
      if(!clicked){uiTrail.push({step,noStartControl:true,snapshot:snap});break;}
      uiTrail.push({step,clicked});
      await page.waitForTimeout(900);
      latestScreenshot=await page.screenshot({fullPage:false}).catch(()=>latestScreenshot);
    }
    const finalUI=await page.evaluate(()=>{
      const body=document.body&&document.body.innerText||'';
      const visible=el=>!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
      const options=[...document.querySelectorAll('select option')].map(o=>(o.textContent||'').trim()).filter(Boolean);
      const leafMatches=[...document.querySelectorAll('body *')].filter(el=>visible(el)&&el.children.length===0&&/이부키|ibuki/i.test(el.textContent||'')).slice(0,80).map(el=>({tag:el.tagName,text:(el.textContent||'').trim().slice(0,100),id:el.id||'',className:typeof el.className==='string'?el.className.slice(0,160):''}));
      return {bodyHasIbuki:/이부키|ibuki/i.test(body),optionHasIbuki:options.some(x=>/이부키|ibuki/i.test(x)),optionTexts:options.slice(0,160),leafMatches,bodyTextStart:body.slice(0,2500)};
    });
    const regBlob=JSON.stringify(afterInstall.registrySummary||{});
    const wifeInRuntimeRegistry=/이부키|ibuki_addon|shortname.{0,30}ibuki/i.test(regBlob)||(afterInstall.registryHits||[]).some(x=>/이부키|ibuki/i.test(JSON.stringify(x)));
    const installedList=Array.isArray(afterInstall.installed)?afterInstall.installed:[];
    const installedOk=installedList.some(x=>(typeof x==='string'?x:(x&& (x.id||x.modId)||'')).toLowerCase()==='wifeaddon_ibuki')
      ||installedList.some(x=>/wifeaddon_ibuki|ibuki/i.test(JSON.stringify(x)));
    const status=afterInstall.status||{};
    const hasModuleFailure=(status.failed||[]).some(x=>/wifeaddon_ibuki|ibuki/i.test(JSON.stringify(x)));
    const wifeVisible=finalUI.optionHasIbuki||finalUI.leafMatches.some(x=>/이부키|ibuki/i.test(x.text))||finalUI.bodyHasIbuki;
    result=Object.assign({},result,{
      state:'complete',finishedAt:new Date().toISOString(),
      verdict:installedOk&&!hasModuleFailure&&wifeInRuntimeRegistry&&wifeVisible?'PASS':
        installedOk&&!hasModuleFailure&&wifeInRuntimeRegistry?'REGISTRY_PASS_UI_NOT_CONFIRMED':'FAIL',
      game:{relativePath:GAME_REL,bytes:fs.statSync(GAME_FILE).size,httpStatus:response?response.status():null},
      installResult:summarize(installResult,0),installedOk,hasModuleFailure,wifeInRuntimeRegistry,wifeVisible,
      postInstall:afterInstall,uiTrail,finalUI,blockedRequests,pageErrors,consoleErrors,
      testNotes:[
        'Fresh isolated headless Chromium browser profile.',
        'Installed all three original addon package files through window.WML.install(), the same API called by the WML manager.',
        'Reloaded the game and inspected WML module status, the legacy wife registry and the visible UI.',
        'Image-generation requests were blocked; no image generation was performed.'
      ]
    });
    log('RESULT',result.verdict,{installedOk,hasModuleFailure,wifeInRuntimeRegistry,wifeVisible,blockedRequests:blockedRequests.length,pageErrors:pageErrors.slice(0,15),consoleErrors:consoleErrors.slice(0,15)});
  } catch(e) {
    result=Object.assign({},result,{state:'error',finishedAt:new Date().toISOString(),verdict:'HARNESS_ERROR',error:String(e&&e.stack||e).slice(0,4000)});
    log('ERROR','Runtime test harness failed',result.error);
  } finally {
    if(browser) await browser.close().catch(()=>{});
  }
}
server.listen(PORT,'0.0.0.0',()=>{
  log('INFO','HTTP server listening',{port:PORT});
  log('INFO','Public asset access disabled; no game or test execution starts automatically.');
});
