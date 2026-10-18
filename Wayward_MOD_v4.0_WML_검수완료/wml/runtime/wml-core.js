/* Wayward Mod Loader (WML) runtime — classic script, loaded before the game module.
 *
 *  wml/mods/mods.js       WML.enable([...ids])           which mods exist, default order ("id:off" = listed but off)
 *  wml/mods/<id>/mod.js   WML.define({ id, setup(api) }) one file per mod
 *  wml/symbols/<ver>.js   WML.symbols({...})             semantic name -> minified name for this game build
 *
 * The game module (built by tools/build.mjs) ends with a bridge that hands its top-level bindings to
 * WML.boot(); mods run their setup() there, before the first render.
 * Player choices (on/off, load order) live in localStorage and are edited in the manager window.
 * In the WML Player app (Android) the page also gets window.WMLHost: saving files, the back button, and the
 * saves/settings file that came inside a game bundle (imported here before the game starts).
 */
(function () {
  'use strict';
  if (window.WML) return;

  const VERSION = '0.7.0';
  const MOD_ROOT = 'wml/mods/';
  const LS_TOGGLES = 'wml.toggles';      // { id: true|false } — player's on/off choices
  const LS_ORDER = 'wml.order';          // [ids] — player's load order
  const LS_OLD_DISABLED = 'wml.disabled';
  const LS_FOLDERS = 'wml.folders';      // [ids] — folders in wml/mods registered without mods.js (dropped on the game once)
  const LS_PKGSYMS = 'wml.pkgsyms';      // { id: { game: { name: raw } } } — symbol tables that came inside a mod's package
  const defs = new Map();          // id -> definition
  const scriptLoads = [];          // promises for mod <script> tags
  const state = { listed: [], fromList: [], defaultOff: [], missing: [], order: [], loaded: [], failed: [], warnings: [], orderNotes: [], roleOverlaps: [], symbols: null, game: null, booted: false };
  const probing = new Map();       // id -> its definition, while wml/mods/<id>/ is being checked (define() only records it)
  const hooks = new Map();         // minified name -> { orig, before[], around[], after[], replace }
  let engine = null;
  let bootSnapshot = null;         // on/off + order the running session was started with

  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
  const lsDel = k => { try { localStorage.removeItem(k); } catch { /* private mode */ } };
  const warn = (msg, mod) => { state.warnings.push({ mod, msg }); console.warn('[WML]' + (mod ? ` [${mod}]` : ''), msg); };

  // ---------------------------------------------------------------- where the game runs
  // 'player': the WML Player app on a phone (window.WMLHost); 'browser': a desktop or phone browser
  const HOST = (() => { try { return window.WMLHost && typeof window.WMLHost.version === 'function' ? window.WMLHost : null; } catch { return null; } })();
  const host = Object.freeze({
    kind: HOST ? 'player' : 'browser',
    app: HOST ? String(HOST.version()) : '',
    platform: HOST || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '') ? 'mobile' : 'pc',
  });
  const PLATFORM_LABEL = { pc: 'PC', mobile: '폰' };

  // ---------------------------------------------------------------- packed saves
  // The save-compress mod stores big save slots LZ-packed ("wwlz1…", LZ-String UTF-16 form, MIT). The loader
  // always unpacks them on read, so the saves still load when that mod is switched off, deleted, or cannot start
  // after a game update. Code that needs the stored text as it is uses WML.rawGetItem.
  const WWLZ = 'wwlz1';
  const rawGetItem = Storage.prototype.getItem;
  const rawSetItem = Storage.prototype.setItem;      // imports write the stored text as it is (no mod packs it again)
  const unpacked = new Map();                  // key -> [packed text, plain text]
  function wwlzDecode(stored) {
    if (typeof stored !== 'string' || stored.lastIndexOf(WWLZ, 0) !== 0) return null;
    const c = stored.slice(6);
    if (c === '') return null;
    const f = String.fromCharCode, length = c.length, reset = 16384, at = i => c.charCodeAt(i) - 32;
    const dict = [0, 1, 2], out = [], data = { val: at(0), position: reset, index: 1 };
    let enlargeIn = 4, dictSize = 4, numBits = 3, entry = '', w, cc;
    const rd = n => {
      let bits = 0, power = 1;
      const max = Math.pow(2, n);
      while (power !== max) {
        const b = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) { data.position = reset; data.val = at(data.index++); }
        bits |= (b > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      return bits;
    };
    switch (rd(2)) { case 0: cc = f(rd(8)); break; case 1: cc = f(rd(16)); break; default: return ''; }
    dict[3] = cc; w = cc; out.push(cc);
    for (;;) {
      if (data.index > length) return '';
      cc = rd(numBits);
      switch (cc) {
        case 0: dict[dictSize++] = f(rd(8)); cc = dictSize - 1; enlargeIn--; break;
        case 1: dict[dictSize++] = f(rd(16)); cc = dictSize - 1; enlargeIn--; break;
        case 2: return out.join('');
      }
      if (enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
      if (dict[cc]) entry = dict[cc];
      else if (cc === dictSize) entry = w + w.charAt(0);
      else return null;
      out.push(entry);
      dict[dictSize++] = w + entry.charAt(0); enlargeIn--; w = entry;
      if (enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
    }
  }
  try {
    Storage.prototype.getItem = function getItem(k) {
      const v = rawGetItem.call(this, k);
      if (typeof v !== 'string' || v.charCodeAt(0) !== 2 || v.lastIndexOf(WWLZ, 0) !== 0) return v;
      const hit = unpacked.get(k);
      if (hit && hit[0] === v) return hit[1];
      const plain = wwlzDecode(v);
      if (plain == null) return v;                // not ours after all: hand it over unchanged
      unpacked.set(k, [v, plain]);
      return plain;
    };
  } catch { /* storage API locked down: packed saves need the mod */ }

  // ---------------------------------------------------------------- registry & loading
  function define(def) {
    if (def && probing.has(def.id)) { probing.set(def.id, def); return; }    // only checking that wml/mods/<id>/ exists
    if (!def || typeof def.id !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/.test(def.id)) throw new Error('WML.define: id must be lower-case [a-z0-9._-]');
    if (typeof def.setup !== 'function') throw new Error(`WML.define(${def.id}): setup(api) is required`);
    if (defs.has(def.id)) warn(`defined twice; keeping the first`, def.id);
    else defs.set(def.id, { requires: [], loadAfter: [], loadBefore: [], conflicts: [], ...def,
      roles: [].concat(def.role || def.roles || []).filter(r => typeof r === 'string' && r),
      platforms: [].concat(def.platform || def.platforms || []).filter(p => p === 'pc' || p === 'mobile') });
  }

  /**
   * mods.js: list every mod (default order). "id:off" keeps it listed but switched off by default.
   * The folders are what counts: a listed mod whose folder is gone is skipped quietly (delete the folder = the
   * mod is gone), and folders registered by dropping them on the game load without a mods.js line.
   */
  function enable(list) {
    state.listed = []; state.defaultOff = [];
    for (const raw of list || []) {
      if (typeof raw !== 'string') continue;
      const [id, flag] = raw.split(':');
      if (!id || state.listed.includes(id)) continue;
      state.listed.push(id);
      if (flag === 'off') state.defaultOff.push(id);
    }
    state.fromList = state.listed.slice();
    for (const id of lsGet(LS_FOLDERS, [])) if (/^[a-z0-9][a-z0-9._-]*$/.test(id) && !state.listed.includes(id)) state.listed.push(id);
    // every listed mod's file is read (it only registers itself); setup() runs for switched-on mods only.
    // A mod installed in the browser (dropped from outside wml/mods) wins over a folder with the same id.
    const fromBrowser = installedIds();
    for (const id of state.listed) {
      if (fromBrowser.includes(id)) continue;
      scriptLoads.push(new Promise(resolve => {
        const s = document.createElement('script');
        s.src = `${MOD_ROOT}${id}/mod.js`;
        s.async = false;
        s.onload = () => resolve();
        s.onerror = () => { state.missing.push(id); resolve(); };   // no folder: not installed
        document.head.appendChild(s);
      }));
    }
    scriptLoads.push(loadInstalled());
  }

  function symbols(table) { state.symbols = table; }

  // ---------------------------------------------------------------- mods installed in the browser
  // A browser cannot look inside folders, so mods in wml/mods need the mods.js list. Mods dropped on the
  // manager window (folder, zip or mod.js) are stored in IndexedDB instead and need no list at all.
  const IDB_NAME = 'wml', IDB_STORE = 'mods', LS_INSTALLED = 'wml.installed';
  const installed = new Map();                       // id -> record { id, name, version, files: { path: text|Blob } }
  const installedIds = () => lsGet(LS_INSTALLED, []);
  const TEXT_FILE = /\.(m?js|json|css|txt|md|csv|svg)$/i;
  const ID_RULE = /^[a-z0-9][a-z0-9._-]*$/;

  function idb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('이 브라우저는 IndexedDB를 쓸 수 없어요')); return; }
      const r = indexedDB.open(IDB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function idbRun(mode, fn) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, mode), q = fn(tx.objectStore(IDB_STORE));
      tx.oncomplete = () => resolve(q && q.result);
      tx.onerror = () => reject(tx.error);
    });
  }
  /** run code as a classic script (named for stack traces) */
  function runScript(code, name) {
    const s = document.createElement('script');
    s.textContent = `${code}\n//# sourceURL=${name}`;
    document.head.appendChild(s);
    s.remove();
  }

  let installedLoad = null;
  let stateImport = null;                            // mods coming in with a saves/settings file are written first
  function loadInstalled() {
    if (installedLoad) return installedLoad;
    installedLoad = Promise.resolve(stateImport).catch(() => {})
      .then(() => (installedIds().length ? idbRun('readonly', st => st.getAll()) : [])).then(records => {
      for (const r of records || []) {
        installed.set(r.id, r);
        if (!state.listed.includes(r.id)) state.listed.push(r.id);
        const code = r.files && r.files['mod.js'];
        if (typeof code !== 'string') { state.failed.push({ id: r.id, error: '설치된 모드에 mod.js가 없어요' }); continue; }
        try { runScript(code, `wml-installed/${r.id}/mod.js`); } catch (e) { state.failed.push({ id: r.id, error: String(e && e.message || e) }); }
      }
      const have = (records || []).map(r => r.id);
      if (installedIds().some(id => !have.includes(id))) lsSet(LS_INSTALLED, have);   // storage was cleared: forget stale ids
    }).catch(e => warn(`브라우저에 설치한 모드를 읽지 못했어요: ${e.message}`));
    return installedLoad;
  }

  // ---- reading what was dropped / picked: entries { path, blob }
  async function unzip(file) {
    const buf = await file.arrayBuffer(), u8 = new Uint8Array(buf), dv = new DataView(buf);
    let end = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; }
    if (end < 0) throw new Error(`${file.name}: zip 파일이 아니에요`);
    const count = dv.getUint16(end + 10, true);
    let p = dv.getUint32(end + 16, true);
    const out = [];
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error(`${file.name}: zip 목록이 깨졌어요`);
      const flags = dv.getUint16(p + 8, true), method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true), local = dv.getUint32(p + 42, true);
      const raw = u8.subarray(p + 46, p + 46 + nameLen);
      let name;
      try { name = new TextDecoder('utf-8', { fatal: !(flags & 0x800) }).decode(raw); } catch { name = new TextDecoder('euc-kr').decode(raw); }
      p += 46 + nameLen + extraLen + commentLen;
      if (name.endsWith('/')) continue;
      const at = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      const data = u8.subarray(at, at + size);
      let blob;
      if (method === 0) blob = new Blob([data]);
      else if (method === 8) blob = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
      else throw new Error(`${file.name}: 지원하지 않는 압축 방식이에요 (${method})`);
      out.push({ path: name.replace(/\\/g, '/'), blob });
    }
    return out;
  }
  /**
   * dropped items, including whole folders. Everything is taken inside the drop event (the items vanish afterwards).
   * A game opened as a file (file://) may not read inside dropped folders (the browser refuses with an
   * EncodingError), but plain files always work through getAsFile(). An unreadable folder comes back as
   * { dir: name } and is matched against wml/mods by its name.
   */
  function entriesFromDrop(dt) {
    const picked = [...(dt.items || [])].filter(it => it.kind === 'file')
      .map(it => ({ entry: it.webkitGetAsEntry && it.webkitGetAsEntry(), file: it.getAsFile() }));
    if (!picked.length) return Promise.resolve([...(dt.files || [])].map(f => ({ path: f.name, blob: f })));
    const fileOf = entry => new Promise((res, rej) => entry.file(res, rej));
    const visit = async (entry, prefix, out) => {
      if (entry.isFile) out.push({ path: prefix + entry.name, blob: await fileOf(entry) });
      else if (entry.isDirectory) {
        const reader = entry.createReader();
        for (let batch = await new Promise((res, rej) => reader.readEntries(res, rej)); batch.length; batch = await new Promise((res, rej) => reader.readEntries(res, rej))) {
          for (const e of batch) await visit(e, `${prefix}${entry.name}/`, out);
        }
      }
    };
    return (async () => {
      let out = [];
      for (const { entry, file } of picked) {
        if (!entry || !entry.isDirectory) {
          const blob = file || (entry && await fileOf(entry));
          if (blob) out.push({ path: blob.name, blob });
          continue;
        }
        const inside = [];
        try { await visit(entry, '', inside); out = out.concat(inside); }
        catch { out.push({ dir: entry.name }); }     // only the folder's name is known
      }
      return out;
    })();
  }

  /**
   * Wife add-ons made for the old mod manager — what character add-on generators write: a plain script that pushes a
   * wife into window.__WAYWARD_WIFE_ADDONS__ — have no WML.define. Each one found among the dropped files becomes a
   * mod of its own (wife-<shortname>/mod.js) that runs the file unchanged after the compatibility layer (addon-compat)
   * and registers the wife, the way the ported new-wife mods do. The generator's start-up portrait request is sent only
   * while the game's image server can draw, never to the default address on a hunch (as in newwife-miyabi's port fix).
   */
  async function wrapWifeAddons(entries) {
    const out = [];
    const modDirs = entries.filter(e => /(^|\/)mod\.js$/.test(e.path)).map(e => e.path.slice(0, -'mod.js'.length));
    for (const e of entries) {
      if (!/\.js$/i.test(e.path) || /(^|\/)mods?\.js$/i.test(e.path) || modDirs.some(b => e.path.startsWith(b))) continue;
      let code;
      try { code = await e.blob.text(); } catch { continue; }
      if (code.includes('WML.define') || !code.includes('__WAYWARD_WIFE_ADDONS__')) continue;
      const pick = key => { const m = code.match(new RegExp(`(?<![\\w$])["']?${key}["']?\\s*:\\s*(["'])((?:(?!\\1).)+)\\1`)); return m ? m[2] : ''; };
      const file = e.path.replace(/^.*\//, '');
      const short = (pick('shortname') || pick('id') || file.replace(/\.js$/i, '')).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
      const id = `wife-${short || 'addon'}`.slice(0, 60);
      const name = pick('name') || short;
      const body = code.replace(
        /const base = \(found \|\| \(prefs\.imageBackendMode === 'custom' && prefs\.imageBackendUrl\s*\?\s*prefs\.imageBackendUrl : 'http:\/\/127\.0\.0\.1:8189'\)\)\.replace\(\/\\\/\+\$\/, ''\);/,
        () => "if (!found || !(api.imageBackend?.()?.comfyui) || globalThis.__WW_STUDIO_OFFLINE_ONLY__ === true) return;\n    const base = found.replace(/\\/+$/, '');");
      const src = [
        `// ${name} — 옛 모드 매니저용 아내 애드온(${file})을 WML 모드 관리자가 감쌌어요. 원본 코드는 아래에서 그대로 실행돼요.`,
        'WML.define({',
        `  id: ${JSON.stringify(id)},`,
        `  name: ${JSON.stringify(`새 아내: ${name}`)},`,
        "  version: '1.0.0',",
        "  game: '>=2026-10-04',",
        `  description: ${JSON.stringify(`아내 애드온 파일(${file})을 그대로 실행해서 아내 선택지에 ${name}을(를) 더해요. 캐릭터 애드온 생성기 같은 도구로 만든 파일을 모드 관리자가 WML 모드로 감싼 거예요.`)},`,
        "  requires: ['addon-compat'],",
        '  setup(__wmlApi) {',
        body,
        ';globalThis.__WML_LEGACY__.registerWives();',
        '  },',
        '});',
        '',
      ].join('\n');
      out.push({ path: `${e.path.replace(/[^/]*$/, '')}${id}/mod.js`, blob: new Blob([src], { type: 'text/javascript' }) });
    }
    return out;
  }

  /**
   * Install mods from files (File objects or { path, blob }): zip archives are opened, every folder that holds
   * a mod.js with WML.define becomes one mod — and so does each old-manager wife add-on (wrapWifeAddons).
   * Returns [{ id, name, version, files, replaced }].
   */
  async function install(items) {
    let entries = [];
    const dirs = [];                                                // dropped folders whose files could not be read
    for (const it of items) {
      if (it.dir) { dirs.push(it.dir); continue; }
      const blob = it.blob || it, path = it.path || blob.webkitRelativePath || blob.name || 'mod.js';
      // each zip gets its own folder in the merged list: two zips that both hold mod.js at their root
      // (one mod per zip, the usual shape) would otherwise land on the same path and only one would install
      if (/\.zip$/i.test(path)) { const home = path.replace(/\.zip$/i, '') + '/'; entries = entries.concat((await unzip(blob)).map(e => ({ ...e, path: home + e.path }))); }
      else entries.push({ path: path.replace(/\\/g, '/'), blob });
    }
    entries = entries.concat(await wrapWifeAddons(entries));
    const bases = entries.filter(e => /(^|\/)mod\.js$/.test(e.path)).map(e => e.path.slice(0, -'mod.js'.length));
    if (!bases.length && !dirs.length) throw new Error('mod.js 가 들어 있는 모드를 찾지 못했어요');
    // a package may carry a symbol table it was made with (symbols/<game>.json): its names become the own names of
    // the mods in that package, so the shared table stays ours and other mods never see them
    const pkgTables = {};
    for (const e of entries.filter(x => /(^|\/)symbols\/\d{4}-\d{2}-\d{2}\.json$/.test(x.path))) {
      try {
        const t = JSON.parse(await e.blob.text()), game = t.game || e.path.match(/(\d{4}-\d{2}-\d{2})\.json$/)[1];
        const map = {};
        const ours = game === state.game && state.symbols && state.symbols.game === game ? state.symbols.symbols || {} : {};
        for (const [n, v] of Object.entries(t.symbols || {})) if (v && typeof v.name === 'string' && !(ours[n] && ours[n].name === v.name)) map[n] = v.name;
        if (Object.keys(map).length) pkgTables[game] = map;
      } catch { /* not a symbol table */ }
    }
    const rememberPkgSymbols = id => {
      const all = lsGet(LS_PKGSYMS, {});
      if (Object.keys(pkgTables).length) all[id] = pkgTables; else delete all[id];
      lsSet(LS_PKGSYMS, all);
    };
    // a mod pack carries its own mods.js: follow its order and its "id:off" defaults
    const listEntry = entries.find(e => /(^|\/)mods\.js$/.test(e.path));
    const packList = listEntry ? [...(await listEntry.blob.text()).matchAll(/^\s*"([^":]+)(:off)?"/gm)].map(m => ({ id: m[1], off: !!m[2] })) : [];
    const done = [];
    // already a folder in wml/mods? then only remember its name — the folder stays the source of truth
    // (delete the folder and the mod is gone); no copy goes into the browser
    const keepFolder = async (id, name, version, listed, folderVersion) => {
      if (!state.fromList.includes(id)) lsSet(LS_FOLDERS, [...new Set([...lsGet(LS_FOLDERS, []), id])]);
      const hadCopy = installedIds().includes(id);
      if (hadCopy) await removeCopy(id);
      const t = toggles(); t[id] = !(listed && listed.off); lsSet(LS_TOGGLES, t);
      // the folder stays the source of truth — but say so when what was dropped is a different version of it,
      // or the player thinks they updated the mod and nothing changed
      const stale = version && folderVersion && version !== folderVersion
        ? `폴더에 이미 있는 모드예요. 폴더 것(${folderVersion})을 그대로 써요 — 넣으신 ${version} 로 바꾸려면 wml\\mods\\${id} 폴더를 새 파일로 덮어쓰세요.`
        : '';
      return { id, name, version: folderVersion || version, mode: 'folder', replaced: hadCopy, on: t[id], note: stale };
    };
    for (const base of bases) {
      const code = await entries.find(e => e.path === `${base}mod.js`).blob.text();
      const at = code.indexOf('WML.define');
      if (at < 0) continue;                                         // not a WML mod (e.g. an old add-on)
      const field = k => { const m = code.slice(at).match(new RegExp(`\\b${k}\\s*:\\s*(['"\`])(.*?)\\1`)); return m ? m[2] : ''; };
      const id = field('id') || base.replace(/\/$/, '').split('/').pop();
      if (!ID_RULE.test(id)) throw new Error(`모드 id "${id}" 가 규칙(소문자·숫자·.-_)에 맞지 않아요`);
      const listed = packList.find(l => l.id === id);
      rememberPkgSymbols(id);
      const folder = await probeFolder(id);
      if (folder) {
        done.push(await keepFolder(id, field('name') || id, field('version'), listed, folder.version));
        continue;
      }
      // this mod's files: everything under its folder, except folders of other mods inside it
      const inner = bases.filter(b => b !== base && b.startsWith(base));
      const files = {};
      let size = 0;
      for (const e of entries) {
        if (!e.path.startsWith(base) || inner.some(b => e.path.startsWith(b))) continue;
        const rel = e.path.slice(base.length);
        files[rel] = TEXT_FILE.test(rel) ? await e.blob.text() : e.blob;
        size += e.blob.size;
      }
      const replaced = installedIds().includes(id);
      await idbRun('readwrite', st => st.put({ id, name: field('name') || id, version: field('version'), files, size, installedAt: Date.now() }));
      lsSet(LS_INSTALLED, [...new Set([...installedIds(), id])]);
      const t = toggles(); t[id] = !(listed && listed.off); lsSet(LS_TOGGLES, t);   // a mod you just added is on, unless its pack says off
      done.push({ id, name: field('name') || id, version: field('version'), mode: 'browser', files: Object.keys(files).length, size, replaced, on: t[id] });
    }
    // a folder known only by its name (game opened as a file): it counts if wml/mods/<name>/ is there
    const unread = [];
    for (const name of dirs) {
      const def = ID_RULE.test(name) && await probeFolder(name);
      if (def) done.push(await keepFolder(name, def.name || name, def.version || '', packList.find(l => l.id === name), def.version || ''));
      else unread.push(name);
    }
    if (unread.length) {
      const msg = `"${unread.join('", "')}" 폴더 안을 브라우저가 읽지 못했어요. 파일로 연 게임은 끌어다 놓은 폴더 안을 볼 수 없어서, wml\\mods 안에 있는 모드 폴더만 이름으로 등록돼요. 다른 곳의 모드는 zip 그대로 끌어다 놓거나 [폴더 고르기]로 골라 주세요.`;
      if (!done.length) throw new Error(msg);
      done.skipped = msg;
    }
    if (!done.length) throw new Error('WML 모드(WML.define)를 찾지 못했어요. 아내 애드온(캐릭터 애드온 생성기로 만든 .js)은 그대로 넣으면 되지만, 그 밖의 옛 애드온은 먼저 WML 모드로 옮겨야 해요.');
    if (packList.length) {
      const ids = packList.map(l => l.id).filter(id => done.some(d => d.id === id));
      lsSet(LS_ORDER, [...lsGet(LS_ORDER, []).filter(id => !ids.includes(id)), ...ids]);
    }
    return done;
  }

  /** does wml/mods/<id>/mod.js exist? (loads it once with its define() only recorded) → its definition, or false */
  function probeFolder(id) {
    return new Promise(resolve => {
      probing.set(id, null);
      const s = document.createElement('script');
      const done = ok => { const def = probing.get(id); probing.delete(id); s.remove(); resolve(ok && (def || {})); };
      s.onload = () => done(true);
      s.onerror = () => done(false);
      s.src = `${MOD_ROOT}${id}/mod.js`;
      document.head.appendChild(s);
    });
  }
  async function removeCopy(id) {
    await idbRun('readwrite', st => st.delete(id));
    lsSet(LS_INSTALLED, installedIds().filter(x => x !== id));
  }

  /**
   * Delete a mod from the browser: an installed copy is removed from storage, a registered folder is forgotten,
   * and the mod's leftovers in web storage go too (on/off, order, its settings, window positions).
   * Files on disk cannot be touched from a browser: a folder in wml/mods has to be deleted by hand.
   */
  async function uninstall(id) {
    if (installedIds().includes(id)) await removeCopy(id);
    lsSet(LS_FOLDERS, lsGet(LS_FOLDERS, []).filter(x => x !== id));
    const t = toggles(); delete t[id]; lsSet(LS_TOGGLES, t);       // back to the default of a same-named folder mod
    lsSet(LS_ORDER, lsGet(LS_ORDER, []).filter(x => x !== id));
    lsDel(`wml.mod.${id}`);
    const pkg = lsGet(LS_PKGSYMS, {});
    if (pkg[id]) { delete pkg[id]; lsSet(LS_PKGSYMS, pkg); }
    try { for (const k of Object.keys(localStorage)) if (k.startsWith(`wml.win.${id}:`)) localStorage.removeItem(k); } catch { /* storage off */ }
    return { removed: id };
  }

  // player choices ------------------------------------------------------------------------------
  function toggles() {
    let t = lsGet(LS_TOGGLES, null);
    if (!t) {                                   // carry over the old "disabled" list once
      t = {};
      for (const id of lsGet(LS_OLD_DISABLED, [])) t[id] = false;
      if (Object.keys(t).length) { lsSet(LS_TOGGLES, t); lsDel(LS_OLD_DISABLED); }
    }
    return t;
  }
  const isOn = (id, t = toggles()) => (Object.prototype.hasOwnProperty.call(t, id) ? !!t[id] : !state.defaultOff.includes(id));
  /** listed mods in the player's order (new mods keep their mods.js position at the end) */
  function playerOrder() {
    const saved = lsGet(LS_ORDER, []).filter(id => state.listed.includes(id));
    return [...saved, ...state.listed.filter(id => !saved.includes(id))];
  }

  // dependency order: requires/loadAfter go first, loadBefore after; notes say what was moved
  function sortMods(ids, notes = []) {
    const want = new Set(ids), order = [], mark = new Map(), pos = new Map(ids.map((id, i) => [id, i]));
    const visit = (id, by) => {
      if (mark.get(id) === 2) return;
      if (mark.get(id) === 1) { notes.push({ id, msg: '서로 먼저 와야 한다고 적혀 있어서(순환) 목록 순서대로 둬요' }); return; }
      mark.set(id, 1);
      const d = defs.get(id);
      const before = [...d.requires, ...d.loadAfter, ...ids.filter(o => defs.get(o).loadBefore.includes(id))];
      for (const dep of before) {
        if (!want.has(dep)) continue;
        if (mark.get(dep) !== 2 && pos.get(dep) > pos.get(id)) notes.push({ id, msg: `${nameOf(dep)}이(가) 먼저 로드돼야 해서 그 뒤로 옮겼어요` });
        visit(dep, id);
      }
      mark.set(id, 2);
      order.push(id);
    };
    ids.forEach(id => visit(id));
    return order;
  }
  const nameOf = id => (defs.get(id) && defs.get(id).name) || id;
  // roles: mods that do the same job may run together (players choose), but the manager says so
  const ROLE_LABELS = {
    'hotkeys': '단축키', 'hall-staff': '홀 직원', 'custom-guests': '사용자 손님', 'image-variants': '장면별 그림 수',
    'character-look': '아내 외형 태그', 'scene-prompt': '장면·의상 태그', 'aftermath-look': '정사 후 모습', 'cheat-editor': '수치 편집',
    'stats': '통계', 'theme': '화면 테마', 'music': '배경음악', 'save-format': '세이브 저장 방식',
  };
  const roleLabel = r => ROLE_LABELS[r] || r;
  /** other mods in ids that share a role with id: [{ role, ids }] */
  function roleMates(id, ids) {
    const d = defs.get(id);
    if (!d || !d.roles.length) return [];
    return d.roles.map(role => ({ role, ids: ids.filter(o => o !== id && defs.has(o) && defs.get(o).roles.includes(role)) })).filter(x => x.ids.length);
  }

  // ---------------------------------------------------------------- symbols & hooks
  function resolve(name) {
    const sym = state.symbols && state.symbols.symbols && state.symbols.symbols[name];
    if (sym) return sym.name;
    if (engine && Object.prototype.hasOwnProperty.call(engine, name)) return name;  // raw minified name
    throw new Error(`의미 이름 "${name}"을(를) 이 게임(${state.game})의 공용 표에서 찾지 못했어요. 모드 로더를 최신으로 올려 보고, 그래도 안 되면 모드 제작자에게 알려 주세요 (모드 안 symbols 블록에 넣으면 공용 표 없이도 돼요). [unknown symbol "${name}" for game ${state.game}]`);
  }

  function getHook(raw) {
    let h = hooks.get(raw);
    if (h) return h;
    const orig = engine[raw];
    if (typeof orig !== 'function') throw new Error(`${raw} is not a function`);
    h = { raw, orig, before: [], around: [], after: [], replace: null };
    const dispatcher = function (...args) { return runHook(h, this, args); };
    dispatcher.__wmlOriginal = orig;
    try { engine[raw] = dispatcher; } catch { throw new Error(`${raw} is a const and cannot be hooked`); }
    if (engine[raw] !== dispatcher) throw new Error(`${raw} could not be replaced`);
    hooks.set(raw, h);
    return h;
  }

  function runHook(h, self, args) {
    for (const b of h.before) {
      try {
        const r = b.fn.call(self, args);
        if (r && r.cancel) return r.value;     // before(args) => ({ cancel:true, value })
        if (Array.isArray(r)) args = r;        // or return replacement args
      } catch (e) { reportHookError(b, e); }
    }
    let call = (...a) => (h.replace ? h.replace.fn : h.orig).apply(self, a);
    for (const w of h.around) {
      const next = call;
      call = (...a) => { try { return w.fn.call(self, next, ...a); } catch (e) { reportHookError(w, e); return next(...a); } };
    }
    let result = call(...args);
    for (const af of h.after) {
      try { const r = af.fn.call(self, result, args); if (r !== undefined) result = r; } catch (e) { reportHookError(af, e); }
    }
    return result;
  }

  function reportHookError(entry, e) {
    if (entry.errors++ < 3) console.error(`[WML] hook ${entry.where} from ${entry.owner} threw`, e);
    if (entry.errors === 3) warn(`hook ${entry.where} keeps throwing; further errors hidden`, entry.owner);
  }

  // hooks run in load order: a mod loaded later wraps around the earlier ones
  const loadIndex = owner => { const i = state.order.indexOf(owner); return i < 0 ? 1e6 : i; };
  function addHook(owner, name, spec, raw = resolve(name)) {
    const h = getHook(raw);
    const added = [];
    const prio = (spec && spec.priority) || 0;
    const push = (list, fn, kind) => {
      const entry = { fn, owner, prio, where: `${kind}:${name}`, errors: 0 };
      list.push(entry);
      list.sort((x, y) => (y.prio - x.prio) || (loadIndex(x.owner) - loadIndex(y.owner)));
      added.push([list, entry]);
    };
    if (spec.before) push(h.before, spec.before, 'before');
    if (spec.around) push(h.around, spec.around, 'around');
    if (spec.after) push(h.after, spec.after, 'after');
    if (spec.replace) {
      if (h.replace) throw new Error(`replace conflict on ${name}: ${h.replace.owner} vs ${owner}`);
      h.replace = { fn: spec.replace, owner };
    }
    return () => { for (const [list, e] of added) { const i = list.indexOf(e); if (i >= 0) list.splice(i, 1); } if (h.replace && h.replace.owner === owner) h.replace = null; };
  }

  // ---------------------------------------------------------------- mod symbols
  // WML.define({ symbols: { name: { raw: { "<game>": "<minified>" }, find: <recipe>, aliases, optional, doc } } })
  // gives a mod its own names. The name recorded for this game wins; otherwise the recipe finds the binding
  // again, with the same rules as tools/symbols-lib.mjs matchRecipe (keep the two in step):
  //   functions: all/any features + like pattern on fn.toString(); len = size sanity; refs = sub-recipes
  //   for what a tiny function calls; "@name@" in a pattern = that binding's minified name
  //   other bindings: decl = regex over the game module text (group 1 = the name); value = a plain value
  const LS_SYMCACHE = 'wml.symcache';
  const modSyms = new Map();              // mod id -> { name: raw } for this game
  const provided = new Map();             // mod id -> what it shared with api.provide (a parent mod's API)
  let symCtx = null;                      // engine snapshot for recipes, taken before any mod ran
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const symHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  function modSymbolFeature(feat) {
    if (feat[0] === '#') return new RegExp(`(?<![\\w$.])${reEsc(feat.slice(1))}(?![\\w$])`);
    if (feat[0] === '.') return new RegExp(`${reEsc(feat)}(?![\\w$])`);
    if (feat.endsWith(':')) return new RegExp(`(?<![\\w$.])${reEsc(feat)}`);
    return new RegExp(reEsc(feat));
  }
  function symContext() {
    if (symCtx) return symCtx;
    const fns = new Map(), values = new Map();
    for (const k of Object.keys(engine)) {
      let v;
      try { v = engine[k]; } catch { continue; }                 // not initialised yet
      if (typeof v === 'function') {
        const h = hooks.get(k);
        try { fns.set(k, Function.prototype.toString.call(h ? h.orig : v)); } catch { /* not readable */ }
      } else if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') values.set(k, v);
    }
    const script = document.querySelector('script[type="module"]');
    symCtx = { fns, values, module: (script && script.textContent) || '' };
    return symCtx;
  }
  /** minified names a recipe finds (names: semantic name -> minified, for "@name@") */
  function modSymbolMatch(recipe, ctx, names) {
    if (recipe.refs) {
      names = Object.assign({}, names);
      for (const k of Object.keys(recipe.refs)) { const m = modSymbolMatch(recipe.refs[k], ctx, names); if (m.length !== 1) return []; names[k] = m[0]; }
    }
    let missing = false;
    const bind = p => p.replace(/@([A-Za-z_$][\w$]*)@/g, (m, n) => (names[n] ? reEsc(names[n]) : ((missing = true), m)));
    if (recipe.decl) {
      const src = bind(recipe.decl);
      if (missing || !ctx.module) return [];
      const out = new Set(), rx = new RegExp(src, 'g');
      for (let m = rx.exec(ctx.module); m; m = rx.exec(ctx.module)) { if (Object.prototype.hasOwnProperty.call(engine, m[1])) out.add(m[1]); if (!m[0].length) rx.lastIndex++; }
      return [...out];
    }
    if ('value' in recipe) return [...ctx.values].filter(([, v]) => v === recipe.value).map(([k]) => k);
    const like = recipe.like ? bind(recipe.like) : null;
    if (missing) return [];
    const tests = (recipe.all || []).map(modSymbolFeature);
    const re = like ? new RegExp(`^(?:${like})$`) : null;
    const near = (src, k) => !recipe.len || (src.length >= recipe.len / k && src.length <= recipe.len * k);
    const out = [];
    for (const [k, src] of ctx.fns) if (near(src, 4) && tests.every(t => t.test(src)) && (!re || re.test(src))) out.push(k);
    if (out.length < 2 || !recipe.any || !recipe.any.length) return out;
    const extra = recipe.any.map(modSymbolFeature);
    const scored = out.filter(k => near(ctx.fns.get(k), 2)).map(k => [k, extra.filter(t => t.test(ctx.fns.get(k))).length]).sort((a, b) => b[1] - a[1]);
    return scored.length && scored[0][1] * 2 >= extra.length && (scored.length === 1 || scored[0][1] > scored[1][1]) ? [scored[0][0]] : out;
  }
  /** resolve the own names of every mod about to start; mod id -> [missing names] for mods that cannot start */
  function resolveModSymbols(ids) {
    const old = lsGet(LS_SYMCACHE, null);
    const cache = old && old.game === state.game && old.map ? old.map : {};
    const used = {};
    let found = false;
    const shared = {};
    for (const [k, v] of Object.entries((state.symbols && state.symbols.symbols) || {})) shared[k] = v.name;
    const pending = [], failed = new Map();
    const pkg = lsGet(LS_PKGSYMS, {});
    for (const id of ids) {
      const def = defs.get(id);
      // names from the table that came with the mod's package: only where they differ from the shared table
      const fromPkg = pkg[id] && pkg[id][state.game];
      if (fromPkg) {
        const map = {};
        for (const [n, raw] of Object.entries(fromPkg)) if (shared[n] !== raw && Object.prototype.hasOwnProperty.call(engine, raw)) map[n] = raw;
        if (Object.keys(map).length) modSyms.set(id, map);
      }
      if (!def || !def.symbols || typeof def.symbols !== 'object') continue;
      const map = modSyms.get(id) || {};
      modSyms.set(id, map);
      for (const [name, e] of Object.entries(def.symbols)) pending.push({ id, name, e: e || {}, map });
    }
    // two passes: a recipe may name another of the mod's own symbols
    for (let pass = 0; pass < 2; pass++) {
      for (const p of pending) {
        if (p.done) continue;
        const known = p.e.raw && p.e.raw[state.game];
        let raw = null, why = '';
        if (known && Object.prototype.hasOwnProperty.call(engine, known)) raw = known;
        else if (p.e.find) {
          const key = `${p.id}|${p.name}|${symHash(JSON.stringify(p.e.find))}`;
          if (cache[key] && Object.prototype.hasOwnProperty.call(engine, cache[key])) raw = cache[key];
          else {
            const hits = modSymbolMatch(p.e.find, symContext(), Object.assign({}, shared, p.map));
            if (hits.length === 1) { raw = hits[0]; found = true; } else why = hits.length ? `후보 ${hits.length}개` : '찾지 못함';
          }
          if (raw) used[key] = raw;
        } else why = known ? `${known}이(가) 이 게임에 없음` : '이 게임의 이름도 찾는 기준도 없음';
        if (raw) {
          p.done = true;
          p.map[p.name] = raw;
          for (const a of p.e.aliases || []) p.map[a] = raw;
        } else if (pass === 1) {
          p.done = true;
          if (p.e.optional) warn(`모드 전용 의미 이름 ${p.name}을(를) 찾지 못했어요 (${why}). 그 이름을 쓰는 기능은 빠져요`, p.id);
          else { if (!failed.has(p.id)) failed.set(p.id, []); failed.get(p.id).push(`${p.name} (${why})`); }
        }
      }
    }
    if (found || Object.keys(used).length !== Object.keys(cache).length) lsSet(LS_SYMCACHE, { game: state.game, map: used });
    symCtx = null;                        // the snapshot is only needed while resolving
    return failed;
  }

  // ---------------------------------------------------------------- per-mod API
  const alertKinds = new Map();
  const actions = new Map();
  const dock = [];
  const settingsPanels = new Map();   // mod id -> render(body, win)

  function makeApi(def) {
    const id = def.id;
    // names: this mod's own symbols first, then the shared table, then raw minified names
    const own = modSyms.get(id) || {};
    const declared = def.symbols && typeof def.symbols === 'object' ? def.symbols : {};
    const isOwnName = n => Object.prototype.hasOwnProperty.call(declared, n) || Object.values(declared).some(e => e && Array.isArray(e.aliases) && e.aliases.includes(n));
    const res = name => {
      if (Object.prototype.hasOwnProperty.call(own, name)) return own[name];
      if (isOwnName(name)) throw new Error(`모드 전용 의미 이름 "${name}"을(를) 이 게임(${state.game})에서 찾지 못했어요`);
      return resolve(name);
    };
    const fn = name => engine[res(name)];
    const store = () => fn('store');
    const api = {
      id,
      wml: VERSION,
      game: state.game,
      /** raw engine bindings (minified names) — prefer sym()/fn() */
      engine,
      sym: res,
      /** current value of an engine binding, by semantic or raw name */
      fn,
      /** share an object (a parent mod's API) with the mods that list this one in requires → they call api.use('<this id>') */
      provide: obj => { provided.set(id, obj); return obj; },
      /** what another mod shared with api.provide; list that mod in requires so it is set up first */
      use: other => {
        if (!provided.has(other)) throw new Error(`"${other}" 모드가 내준 기능이 없어요. 그 모드를 켜고, 이 모드의 requires에 "${other}"를 넣으세요`);
        return provided.get(other);
      },
      /** a value kept out of the 옮기기·백업 file (API keys, tokens): browser storage wml.secret.<id> */
      secret: {
        get: () => { try { return localStorage.getItem(`wml.secret.${id}`) || ''; } catch { return ''; } },
        set: value => { try { if (value) localStorage.setItem(`wml.secret.${id}`, String(value)); else localStorage.removeItem(`wml.secret.${id}`); } catch { /* storage off */ } },
      },
      has: name => { try { res(name); return true; } catch { return false; } },
      hook: (name, spec) => addHook(id, name, spec, res(name)),

      store: {
        get: () => store().getState(),
        game: () => store().getState().state,
        set: updater => store().setState(updater),
        /** update the game state with (state) => state */
        update: f => store().setState(s => ({ ...s, state: f(s.state) })),
        dispatch: action => store().getState().dispatch(action),
        subscribe: listener => store().subscribe(listener),
      },

      /** this mod's own saved data, kept at state.mods[id] (travels with saves) */
      data: {
        get: () => ((store().getState().state || {}).mods || {})[id],
        set: valueOrFn => api.store.update(s => {
          const mods = { ...(s.mods || {}) };
          mods[id] = typeof valueOrFn === 'function' ? valueOrFn(mods[id]) : valueOrFn;
          return { ...s, mods };
        }),
      },

      /** this mod's own browser settings (not in saves): api.settings.get(defaults) / set(obj) */
      settings: {
        get: (defaults = {}) => ({ ...defaults, ...lsGet(`wml.mod.${id}`, {}) }),
        set: obj => lsSet(`wml.mod.${id}`, { ...lsGet(`wml.mod.${id}`, {}), ...obj }),
      },

      log: text => api.store.update(s => fn('log')(s, String(text))),

      events: {
        /** resolver: (state, choiceId) => state */
        onAlert: (kind, resolver) => {
          const k = kind.includes(':') ? kind : `${id}:${kind}`;
          alertKinds.set(k, id);
          fn('registerAlert')(k, resolver);
          return k;
        },
        /** queue an alert with choices; shows when nothing else is pending */
        alert: (s, { kind, title, body, choices }) => {
          const k = kind.includes(':') ? kind : `${id}:${kind}`;
          const a = { id: `${k}:${s.slot}:${Math.random().toString(36).slice(2, 7)}`, kind: k, severity: 'critical', pause: true, slot: s.slot, title, body, choices };
          return fn('drainAlerts')(fn('queueAlert')(s, a));
        },
      },

      actions: {
        /** handler: (state, action) => state; dispatch with api.store.dispatch({ type }). info: { label } (shown by other mods, e.g. hotkey makers) */
        register: (type, handler, info = {}) => {
          if (actions.has(type)) throw new Error(`action ${type} already registered by ${actions.get(type).owner}`);
          actions.set(type, { owner: id, handler, label: info && typeof info.label === 'string' ? info.label : '' });
        },
        /** the actions mods registered: [{ type, owner, label }] */
        list: () => [...actions].map(([type, a]) => ({ type, owner: a.owner, label: a.label })),
        /**
         * fn({ type, owner, label, action }) after every dispatched action (payload = the same action object) — a mod's (owner = its id) or the game's
         * (owner 'game'). E.g. "do it once, I'll bind a key to it". Returns an unsubscribe.
         */
        observe: fn => {
          const o = { owner: id, fn };
          actionObservers.push(o);
          return () => { const i = actionObservers.indexOf(o); if (i >= 0) actionObservers.splice(i, 1); };
        },
      },

      ui: {
        /**
         * a button in the WML dock — the one bar every mod button shares, so put yours here instead of
         * pinning your own to a corner. Returns { remove(), update({ label, title }) }.
         */
        addButton: ({ label, title, onClick }) => {
          const entry = { owner: id, label, title, onClick };
          dock.push(entry);
          renderDock();
          return {
            remove: () => { const i = dock.indexOf(entry); if (i >= 0) { dock.splice(i, 1); renderDock(); } },
            update: patch => { Object.assign(entry, patch); renderDock(); },
          };
        },
        /**
         * take a button this mod already made (or another mod's, with care) into the dock, element and all:
         * its own click handler keeps working. Returns a function that puts it back where it was.
         */
        adopt: (node, info) => dockAdopt(id, node, info),
        /**
         * a movable, resizable window; render(body, win) fills it. Opening the same id again brings it to the front.
         * returns { el, body, close(), focus(), setTitle(text), refresh() }
         */
        window: opts => openWindow({ ...opts, id: `${id}:${opts.id || 'main'}`, owner: id }),
        /** settings shown from the ⚙ button of this mod in the manager: render(body, win) */
        settings: render => { settingsPanels.set(id, render); },
        /** helpers for building windows */
        h: el,
        button: uiButton,
      },

      warn: msg => warn(msg, id),

      /** where the game runs: { kind: 'player'|'browser', app: player version, platform: 'pc'|'mobile' } */
      host,
      /**
       * the phone's back button (WML Player): fn() returns true when it handled it (closed this mod's panel…).
       * Newest first; then WML closes its top window; otherwise the player shows its menu. Returns an unsubscribe.
       */
      onBack: fn => { const h = { owner: id, fn }; backHandlers.push(h); return () => { const i = backHandlers.indexOf(h); if (i >= 0) backHandlers.splice(i, 1); }; },
      /** save a file for the player: a download in a browser, Download/WML on the phone. data: string | Blob | ArrayBuffer */
      saveFile: (name, data, type) => saveFile(name, data, type),

      /** load a classic script from this mod's folder (await it in an async setup): api.loadScript('files/a.js') */
      loadScript: file => {
        const rec = installed.get(id);
        if (rec) {                                   // installed in the browser: the file is in storage
          const v = rec.files[file];
          if (v == null) return Promise.reject(new Error(`could not load ${file} (not in the installed mod ${id})`));
          return (typeof v === 'string' ? Promise.resolve(v) : v.text()).then(code => runScript(code, `wml-installed/${id}/${file}`));
        }
        return new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = `${MOD_ROOT}${id}/${file}`;
          s.async = false;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error(`could not load ${s.src}`));
          document.head.appendChild(s);
        });
      },
      /** URL of a file in this mod's folder (images, data) — works for folder mods and browser-installed mods */
      fileUrl: file => {
        const rec = installed.get(id);
        if (!rec) return `${MOD_ROOT}${id}/${file}`;
        const v = rec.files[file];
        if (v == null) return null;
        rec.urls = rec.urls || {};
        return rec.urls[file] || (rec.urls[file] = URL.createObjectURL(typeof v === 'string' ? new Blob([v]) : v));
      },
      /** true when this mod was installed by dropping it on the manager (not from wml/mods) */
      installed: installed.has(id),

      /** language of this build ('en', 'ko', …) and a picker for mod text: api.t({ en: 'Hi', ko: '안녕' }) */
      lang: (window.WML_I18N && window.WML_I18N.lang) || 'en',
      t: texts => (typeof texts === 'string' ? texts : texts[api.lang] ?? texts.en ?? Object.values(texts)[0]),
    };
    return api;
  }

  // custom actions: wrap the store's dispatch once (and tell observers what was dispatched)
  const actionObservers = [];          // { owner, fn } from api.actions.observe
  function installActionRouter() {
    const st = engine[resolve('store')];
    const original = st.getState().dispatch;
    const routed = action => {
      const a = action && actions.get(action.type);
      let out;
      if (!a) out = original(action);
      else st.setState(s => ({ ...s, state: a.handler(s.state, action) }));
      if (actionObservers.length && action && typeof action.type === 'string') {
        const seen = { type: action.type, owner: a ? a.owner : 'game', label: a ? a.label : '', action, payload: action };
        for (const o of actionObservers.slice()) { try { o.fn(seen); } catch (e) { console.error(`[WML] ${o.owner} actions.observe`, e); } }
      }
      return out;
    };
    st.setState({ dispatch: routed });
  }

  // ---------------------------------------------------------------- boot
  async function boot({ game, engine: eng, render }) {
    engine = eng;
    state.game = game;
    if (!state.symbols || state.symbols.game !== game) warn(`no symbol table for ${game}; mods can only use raw names`);
    await Promise.race([Promise.all([...scriptLoads, loadInstalled()]), new Promise(r => setTimeout(r, 15000))]);
    // folders that are gone: not part of this session; registered ones are forgotten for good
    if (state.missing.length) {
      state.listed = state.listed.filter(id => !state.missing.includes(id));
      const reg = lsGet(LS_FOLDERS, []);
      if (reg.some(id => state.missing.includes(id))) lsSet(LS_FOLDERS, reg.filter(id => !state.missing.includes(id)));
    }

    const t = toggles();
    const listedOrder = playerOrder();
    bootSnapshot = { order: listedOrder.slice(), on: Object.fromEntries(state.listed.map(id => [id, isOn(id, t)])) };
    for (const id of state.listed) if (!defs.has(id) && !state.failed.some(f => f.id === id)) state.failed.push({ id, error: 'mod.js가 WML.define을 부르지 않았어요' });
    const ids = listedOrder.filter(id => isOn(id, t) && defs.has(id));
    const ok = ids.filter(id => {
      const d = defs.get(id);
      const missing = d.requires.filter(r => !ids.includes(r));
      if (missing.length) { state.failed.push({ id, error: `필요한 모드가 꺼져 있거나 없어요: ${missing.map(nameOf).join(', ')}` }); return false; }
      const clash = d.conflicts.filter(c => ids.includes(c));
      // both sides stop, so the game never runs half-patched; the message says what to do about it
      if (clash.length) { state.failed.push({ id, error: `같이 켤 수 없는 모드예요: ${clash.map(nameOf).join(', ')} — 게임의 같은 곳을 통째로 바꾸는 모드들이에요. 하나를 끄고 "새로고침해서 적용"을 누르세요 (지금은 양쪽 다 안 켜졌어요).` }); return false; }
      if (d.game && !gameMatches(d.game, game)) warn(`게임 ${d.game}용인데 지금 게임은 ${game}이에요`, id);
      return true;
    });
    state.order = sortMods(ok, state.orderNotes);
    const elsewhere = state.order.filter(id => defs.get(id).platforms.length && !defs.get(id).platforms.includes(host.platform));
    if (elsewhere.length) warn(`${PLATFORM_LABEL[host.platform]}에서는 쓸모가 없을 수 있는 모드가 켜져 있어요: ${elsewhere.map(id => `${nameOf(id)}(${defs.get(id).platforms.map(p => PLATFORM_LABEL[p]).join('·')} 전용)`).join(', ')}`);
    for (const id of state.order) {
      for (const { role, ids } of roleMates(id, state.order)) {
        if (state.roleOverlaps.some(o => o.role === role)) continue;
        const all = state.order.filter(o => defs.get(o).roles.includes(role));
        state.roleOverlaps.push({ role, ids: all });
        warn(`같은 일(${roleLabel(role)})을 하는 모드가 함께 켜져 있어요: ${all.map(nameOf).join(', ')}. 같은 곳을 바꿔서 서로 엇갈릴 수 있으니 하나만 켜는 걸 권해요.`);
      }
    }
    // mods' own symbols: all resolved before any mod runs (and before any mod changes an engine binding)
    let symFailed = new Map();
    try { symFailed = resolveModSymbols(state.order); } catch (e) { warn('모드 전용 의미 이름을 찾지 못했어요: ' + e.message); }
    try { installActionRouter(); } catch (e) { warn('custom actions unavailable: ' + e.message); }
    for (const id of state.order) {
      if (symFailed.has(id)) {
        state.failed.push({ id, error: `이 게임(${game})에서 모드 전용 의미 이름을 찾지 못했어요: ${symFailed.get(id).join(', ')}. 게임이 업데이트됐다면 이 모드의 새 버전이 필요해요.` });
        continue;
      }
      try { await defs.get(id).setup(makeApi(defs.get(id))); state.loaded.push(id); }
      catch (e) { state.failed.push({ id, error: String(e && e.message || e) }); console.error(`[WML] ${id} setup failed`, e); }
    }
    state.booted = true;
    render();
    renderDock();
    installDropTarget();
    console.info(`[WML ${VERSION}] game ${game}: ${state.loaded.length} mod(s) loaded`, state.loaded, state.failed.length ? state.failed : '');
  }

  function gameMatches(spec, game) {
    return String(spec).split(/\s+/).every(part => {
      const m = part.match(/^(>=|<=|>|<|=)?(\d{4}-\d{2}-\d{2})$/);
      if (!m) return true;
      const op = m[1] || '=', v = m[2];
      return op === '>=' ? game >= v : op === '<=' ? game <= v : op === '>' ? game > v : op === '<' ? game < v : game === v;
    });
  }

  // ---------------------------------------------------------------- UI: styles, helpers, windows
  const CSS = `
.wml-ui{font:13px/1.45 system-ui,-apple-system,"Malgun Gothic",sans-serif;color:#e7e5e4}
.wml-ui *{box-sizing:border-box}
.wml-dock{position:fixed;left:8px;bottom:8px;z-index:2147483050;display:flex;align-items:flex-end;gap:4px;max-width:calc(100vw - 16px)}
.wml-dock-bar{display:flex;align-items:stretch;gap:4px;padding:3px;border-radius:9px;background:#1c1917d9;border:1px solid #57534e;box-shadow:0 2px 10px #0007}
.wml-dock-grip{flex:0 0 auto;width:13px;border-radius:5px;border:0;padding:0;cursor:move;touch-action:none;background:repeating-linear-gradient(#78716c 0 2px,transparent 2px 5px) center/5px 100% no-repeat}
.wml-dock-grip:hover{background-color:#44403c}
.wml-dock-items{display:grid;gap:4px;justify-items:stretch}
.wml-dock-items>*{min-width:0}
.wml-dock-fold{flex:0 0 auto;align-self:stretch;padding:0 5px;border-radius:5px;border:0;background:none;color:#a8a29e;cursor:pointer;font:inherit;line-height:1}
.wml-dock-fold:hover{background:#44403c;color:#fff}
.wml-dock-tab{padding:3px 9px;border-radius:9px;border:1px solid #57534e;background:#1c1917d9;color:#e7e5e4;cursor:pointer;font:inherit;box-shadow:0 2px 10px #0007}
.wml-dock-tab:hover{background:#292524}
.wml-dock-adopted{display:flex;align-items:center}
.wml-dock-adopted>*{position:static!important;inset:auto!important;margin:0!important;z-index:auto!important;float:none!important;transform:none!important}
[data-wml-stowed]{display:none!important}
.wml-btn{padding:4px 10px;border-radius:6px;border:1px solid #57534e;background:#292524;color:#e7e5e4;cursor:pointer;font:inherit;line-height:1.3}
.wml-btn:hover{background:#3f3a36}.wml-btn:disabled{opacity:.4;cursor:default}
.wml-btn.wml-primary{background:#b45309;border-color:#d97706;color:#fff}.wml-btn.wml-primary:hover{background:#c2410c}
.wml-btn.wml-icon{padding:2px 7px;min-width:28px}
.wml-dock .wml-btn{opacity:.85;background:#1c1917;border-color:#78716c}
.wml-win{position:fixed;z-index:2147483100;display:flex;flex-direction:column;background:#1c1917;border:1px solid #57534e;border-radius:10px;box-shadow:0 14px 44px #000c;min-width:280px;min-height:160px;resize:both;overflow:hidden}
.wml-win-title{display:flex;align-items:center;gap:8px;padding:7px 8px 7px 12px;background:#292524;border-bottom:1px solid #44403c;cursor:move;user-select:none;touch-action:none}
.wml-win-title b{flex:1;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wml-win-close{background:none;border:0;color:#a8a29e;font-size:17px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:4px}
.wml-win-close:hover{background:#44403c;color:#fff}
.wml-win-body{flex:1;overflow:auto;padding:10px 12px}
.wml-win-foot{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 12px;border-top:1px solid #44403c;background:#1c1917}
.wml-muted{color:#a8a29e}.wml-small{font-size:12px}
.wml-note{color:#fcd34d;font-size:12px}
.wml-grid{width:100%;border-collapse:collapse}
.wml-grid th{position:sticky;top:-10px;background:#1c1917;text-align:left;font-weight:600;color:#a8a29e;font-size:12px;padding:6px;border-bottom:1px solid #44403c;white-space:nowrap}
.wml-grid td{padding:7px 6px;border-bottom:1px solid #292524;vertical-align:top}
.wml-grid tr.wml-off td.wml-fade{opacity:.5}
.wml-grid tr.wml-drop td{box-shadow:inset 0 2px 0 #d97706}
.wml-grid tr.wml-dragging{opacity:.4}
.wml-grid tr.wml-new td{background:#2a2310}
.wml-handle{cursor:grab;color:#78716c;user-select:none;font-size:15px;line-height:1}
.wml-chip{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;white-space:nowrap}
.wml-chip-on{background:#14532d;color:#bbf7d0}.wml-chip-off{background:#292524;color:#a8a29e;border:1px solid #44403c}
.wml-chip-err{background:#7f1d1d;color:#fecaca}.wml-chip-warn{background:#78350f;color:#fde68a}
.wml-name{font-weight:600}.wml-id{color:#78716c;font-size:11px;margin-left:6px}
.wml-acts{display:flex;gap:4px;justify-content:flex-end}
.wml-section{margin-top:12px}
.wml-section h4{margin:0 0 4px;font-size:12px;color:#a8a29e;font-weight:600}
.wml-add{border:1px dashed #78716c;border-radius:8px;padding:8px 10px;margin:0 0 10px;background:#1c1917}
.wml-win.wml-dropping{outline:3px dashed #d97706;outline-offset:-3px}.wml-win.wml-dropping .wml-add{border-color:#d97706;background:#292018}
.wml-chip-inst{background:#1e3a5f;color:#bfdbfe;margin-left:6px}
.wml-btn.wml-danger{border-color:#7f1d1d;color:#fecaca}.wml-btn.wml-danger:hover{background:#7f1d1d;color:#fff}
.wml-confirm-shade{position:absolute;inset:0;z-index:5;background:#0c0a09cc;display:flex;align-items:center;justify-content:center;padding:16px}
.wml-confirm{max-width:440px;width:100%;background:#1c1917;border:1px solid #7f1d1d;border-radius:10px;padding:14px 16px;box-shadow:0 10px 30px #000c}
.wml-confirm-title{font-weight:600;font-size:14px;color:#fde68a}
.wml-meter{display:flex;height:10px;margin-top:4px;border-radius:999px;background:#292524;border:1px solid #44403c;overflow:hidden}
.wml-meter>i{display:block;height:100%}
.wml-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;vertical-align:middle}
.wml-store-row{display:flex;justify-content:space-between;gap:12px;padding:2px 0 2px 12px;border-bottom:1px solid #292524}
.wml-ui input[type=checkbox]{width:16px;height:16px;accent-color:#d97706;cursor:pointer}
@media (max-width:640px){.wml-win{left:2vw!important;top:3vh!important;width:96vw!important;height:90vh!important;resize:none}.wml-col-ver,.wml-col-num{display:none}}
`;
  function ensureStyle() {
    if (document.getElementById('wml-style')) return;
    const s = document.createElement('style');
    s.id = 'wml-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /** tiny DOM helper: el('div', {class, style, title, onclick…}, children…) */
  function el(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k in e && k !== 'list') e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : String(c));
    return e;
  }
  function uiButton(label, onClick, opts = {}) {
    return el('button', { class: 'wml-btn' + (opts.primary ? ' wml-primary' : '') + (opts.icon ? ' wml-icon' : '') + (opts.danger ? ' wml-danger' : ''), title: opts.title, disabled: opts.disabled, type: 'button', onclick: onClick }, label);
  }

  /** a yes/no question shown inside a WML window; resolves true for the confirm button */
  const openQuestions = [];             // cancel functions, newest last (the back button answers "no")
  function askConfirm(win, { title, lines = [], ok = '확인', cancel = '취소' }) {
    return new Promise(resolve => {
      const shade = el('div', { class: 'wml-confirm-shade' });
      const finish = v => { const i = openQuestions.indexOf(no); if (i >= 0) openQuestions.splice(i, 1); shade.remove(); resolve(v); };
      const no = () => finish(false);
      openQuestions.push(no);
      const yes = uiButton(ok, () => finish(true), { danger: true });
      const box = el('div', { class: 'wml-confirm', role: 'alertdialog' },
        el('div', { class: 'wml-confirm-title' }, title),
        ...lines.map(l => el('div', { class: 'wml-small', style: 'margin-top:6px;color:#d6d3d1' }, l)),
        el('div', { style: 'display:flex;gap:6px;justify-content:flex-end;margin-top:14px' }, uiButton(cancel, () => finish(false)), yes));
      shade.addEventListener('pointerdown', e => { if (e.target === shade) finish(false); });
      shade.addEventListener('keydown', e => { if (e.key === 'Escape') finish(false); });
      shade.append(box);
      win.el.append(shade);
      yes.focus();
    });
  }

  const windows = new Map();     // id -> handle
  // above WAYWORKS' workspace (2147483000) so WML windows are not buried, below its menus and notices (2147483551+)
  const Z_WIN = 2147483100, Z_WIN_MAX = 2147483400;
  let zTop = Z_WIN;
  function openWindow({ id, title, width = 520, height = 420, render, onClose, owner }) {
    ensureStyle();
    const existing = windows.get(id);
    if (existing) { existing.focus(); return existing; }
    const saved = lsGet(`wml.win.${id}`, null);
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(saved ? saved.w : width, vw - 16), h = Math.min(saved ? saved.h : height, vh - 16);
    const x = Math.max(8, Math.min(saved ? saved.x : (vw - w) / 2, vw - w - 8));
    const y = Math.max(8, Math.min(saved ? saved.y : Math.max(24, (vh - h) / 3), vh - 60));
    const titleEl = el('b', null, title || id);
    const body = el('div', { class: 'wml-win-body' });
    const win = el('div', { class: 'wml-ui wml-win', 'data-wml-ui': true, role: 'region', 'aria-label': title || id,
      style: `left:${x}px;top:${y}px;width:${w}px;height:${h}px` });
    const close = () => { win.remove(); windows.delete(id); ro && ro.disconnect(); if (onClose) try { onClose(); } catch (e) { console.error(e); } };
    const bar = el('div', { class: 'wml-win-title' }, titleEl, el('button', { class: 'wml-win-close', title: '닫기', type: 'button', onclick: close }, '✕'));
    win.append(bar, body);
    const save = () => lsSet(`wml.win.${id}`, { x: win.offsetLeft, y: win.offsetTop, w: win.offsetWidth, h: win.offsetHeight });
    const focus = () => { zTop = Math.min(zTop + 1, Z_WIN_MAX); win.style.zIndex = String(zTop); };
    win.addEventListener('pointerdown', focus);
    // drag by the title bar (mouse and touch)
    bar.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      const sx = e.clientX - win.offsetLeft, sy = e.clientY - win.offsetTop;
      bar.setPointerCapture(e.pointerId);
      const move = m => {
        win.style.left = Math.max(-win.offsetWidth + 80, Math.min(m.clientX - sx, window.innerWidth - 80)) + 'px';
        win.style.top = Math.max(0, Math.min(m.clientY - sy, window.innerHeight - 40)) + 'px';
      };
      const up = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); save(); };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
    });
    let ro = null;
    if (window.ResizeObserver) { let tmr; ro = new ResizeObserver(() => { clearTimeout(tmr); tmr = setTimeout(save, 300); }); ro.observe(win); }
    const handle = {
      el: win, body, owner, close, focus,
      setTitle: t => { titleEl.textContent = t; },
      refresh: () => { body.textContent = ''; try { render && render(body, handle); } catch (e) { body.append(el('div', { class: 'wml-note' }, `창을 그리다 오류가 났어요: ${e.message}`)); console.error(e); } },
    };
    windows.set(id, handle);
    document.body.appendChild(win);
    focus();
    handle.refresh();
    return handle;
  }

  // ---------------------------------------------------------------- dock (the WML button bar)
  // One bar for every mod button, so the screen keeps one place for them: drag it by the grip, fold it away
  // (only a small tab is left), and it lays the buttons out in lines of `perLine` (5 by default) — a sixth
  // button starts another line. A mod's own floating button can be taken in with api.ui.adopt(el).
  const DOCK_KEY = 'wml.dock';
  let dockEl = null, dockBar = null, dockItems = null, dockTab = null, dockFold = null, dockOpt = null;
  const dockOpts = () => (dockOpt || (dockOpt = { open: true, perLine: 5, x: null, y: null, ...lsGet(DOCK_KEY, {}) }));
  const saveDock = () => lsSet(DOCK_KEY, dockOpts());
  function dockSet(patch) { Object.assign(dockOpts(), patch); saveDock(); renderDock(); }

  function dockPlace() {
    const o = dockOpts();
    dockEl.dataset.wmlMoved = o.x == null ? '' : '1';
    if (o.x == null) { dockEl.style.left = ''; dockEl.style.top = ''; dockEl.style.bottom = ''; return; }
    const r = dockEl.getBoundingClientRect();
    dockEl.style.left = `${Math.max(0, Math.min(o.x, window.innerWidth - Math.max(44, r.width)))}px`;
    dockEl.style.top = `${Math.max(0, Math.min(o.y, window.innerHeight - Math.max(26, r.height)))}px`;
    dockEl.style.bottom = 'auto';
  }
  function dockDrag(e) {
    if (e.button > 0) return;
    const r = dockEl.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    e.target.setPointerCapture(e.pointerId);
    e.preventDefault();
    const move = m => {
      const box = dockEl.getBoundingClientRect();
      dockOpts().x = Math.max(0, Math.min(m.clientX - sx, window.innerWidth - box.width));
      dockOpts().y = Math.max(0, Math.min(m.clientY - sy, window.innerHeight - box.height));
      dockPlace();
    };
    const up = () => { e.target.removeEventListener('pointermove', move); e.target.removeEventListener('pointerup', up); saveDock(); };
    e.target.addEventListener('pointermove', move);
    e.target.addEventListener('pointerup', up);
  }

  function renderDock() {
    if (!state.booted || !document.body) return;
    ensureStyle();
    const o = dockOpts();
    if (!dockEl) {
      dockEl = el('div', { id: 'wml-dock', class: 'wml-ui wml-dock', 'data-wml-ui': true });
      dockItems = el('div', { class: 'wml-dock-items' });
      dockFold = el('button', { class: 'wml-dock-fold', type: 'button', title: '버튼 줄 접기 (옆으로 밀기)', onclick: () => dockSet({ open: false }) }, '‹');
      dockBar = el('div', { class: 'wml-dock-bar' },
        el('button', { class: 'wml-dock-grip', type: 'button', title: '끌어서 옮기기', 'aria-label': 'WML 버튼 줄 옮기기', onpointerdown: dockDrag }),
        dockItems, dockFold);
      dockTab = el('button', { class: 'wml-dock-tab', type: 'button', onclick: () => dockSet({ open: true }) }, 'WML ›');
      dockEl.append(dockBar, dockTab);
      document.body.appendChild(dockEl);
      window.addEventListener('resize', () => { if (dockEl) dockPlace(); });
    }
    const failed = state.failed.length;
    dockBar.style.display = o.open ? '' : 'none';
    dockTab.style.display = o.open ? 'none' : '';
    dockTab.textContent = `WML ${state.loaded.length}${failed ? ` ⚠${failed}` : ''} ›`;
    dockTab.title = 'WML 버튼 줄 펴기';
    dockItems.textContent = '';
    const items = [{ label: `WML ${state.loaded.length}${failed ? ` · ⚠${failed}` : ''}`, title: 'WML 모드 관리자', onClick: toggleManager }, ...dock];
    const cols = Math.max(1, Math.min(12, Number(o.perLine) || 5));
    dockItems.style.gridTemplateColumns = `repeat(${Math.min(cols, items.length)}, auto)`;
    for (const d of items) {
      if (d.node) { dockItems.append(d.node); continue; }                   // a mod's own button, taken in as it is
      dockItems.append(uiButton(d.label, () => { try { d.onClick(); } catch (e) { console.error(`[WML] ${d.owner} button`, e); } }, { title: d.title || d.owner }));
    }
    dockPlace();
  }

  /**
   * Take a mod's own floating button into the dock. Two ways, both undone by the function they return:
   *  - move (the default): the element itself goes into the bar. For a button a mod built with plain DOM.
   *  - { proxy: true }: the element is hidden where it is and the bar gets a button that clicks it. For one the
   *    game drew (inside #root, React): moving such a node out breaks the next render.
   */
  function dockAdopt(owner, node, info = {}) {
    if (!node || !node.nodeType) throw new Error('붙일 요소(element)가 아니에요');
    if (dock.some(d => d.el === node)) return () => {};
    const label = info.label || (node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24) || node.title || owner;
    const title = info.title || `${label} (${owner})`;
    let entry, undo;
    if (info.proxy) {
      node.setAttribute('data-wml-stowed', '');
      entry = { owner, el: node, proxy: true, label, title, onClick: () => node.click() };
      undo = () => node.removeAttribute('data-wml-stowed');
    } else {
      const home = { parent: node.parentNode, next: node.nextSibling, style: node.getAttribute('style') };
      const wrap = el('span', { class: 'wml-dock-adopted' });
      wrap.append(node);
      entry = { owner, el: node, node: wrap, label, title };
      undo = () => {
        if (!wrap.contains(node)) { wrap.remove(); return; }         // its mod took the button away itself
        if (home.style == null) node.removeAttribute('style'); else node.setAttribute('style', home.style);
        if (home.parent && home.parent.isConnected) home.parent.insertBefore(node, home.next && home.next.isConnected ? home.next : null);
        else wrap.replaceWith(node);
        wrap.remove();
      };
    }
    dock.push(entry);
    renderDock();
    return () => {
      const i = dock.indexOf(entry);
      if (i < 0) return;
      dock.splice(i, 1);
      try { undo(); } catch (e) { console.error(`[WML] ${owner} 버튼 되돌리기`, e); }
      renderDock();
    };
  }

  // ---------------------------------------------------------------- manager window
  function toggleManager() {
    const w = windows.get('wml:manager');
    if (w) w.close(); else openManager();
  }

  function openManager() {
    return openWindow({ id: 'wml:manager', title: `WML 모드 관리자 · v${VERSION}`, width: 760, height: 560, render: renderManager });
  }

  // ---- adding mods by drag & drop or file picker (installs into the browser)
  const sessionChanges = [];            // installs / removals made since the page loaded (need a reload)
  const justAdded = new Set();          // ids installed or registered since the page loaded: marked in the list
  let managerQuery = '';                // the manager's search box (kept across refreshes)
  let installError = '';
  async function installAndReport(getItems) {
    installError = '';
    try {
      const items = await getItems();
      const res = await install(items);
      for (const r of res) justAdded.add(r.id);
      const kind = r => (r.mode === 'folder' ? '폴더 등록' : r.replaced ? '브라우저 설치(바꿈)' : '브라우저 설치');
      if (res.length > 4) {
        const folder = res.filter(r => r.mode === 'folder').length, browser = res.length - folder;
        sessionChanges.push(`모드 ${res.length}개 (${[folder && `폴더 등록 ${folder}`, browser && `브라우저 설치 ${browser}`].filter(Boolean).join(', ')} · 켜짐 ${res.filter(r => r.on).length}, 기본 꺼짐 ${res.filter(r => !r.on).length})`);
      } else for (const r of res) sessionChanges.push(`${kind(r)}: ${r.name}${r.version ? ` v${r.version}` : ''} (${r.id})`);
      const notes = res.map(r => r.note).filter(Boolean);
      if (notes.length) installError = notes.join(' ');          // shown in the manager as a notice, not an error
      if (res.skipped) installError = res.skipped;
    } catch (e) { installError = String(e && e.message || e); }
    const w = windows.get('wml:manager') || openManager();
    w.refresh();
  }
  const hasFiles = e => !!e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
  /** dropping files anywhere on the page opens the manager and installs them (unless something else took the drop) */
  function installDropTarget() {
    if (document.documentElement.dataset.wmlDrop) return;
    document.documentElement.dataset.wmlDrop = '1';
    document.addEventListener('dragover', e => {
      if (!hasFiles(e) || e.defaultPrevented) return;
      e.preventDefault();
      const w = windows.get('wml:manager') || openManager();
      w.el.classList.add('wml-dropping');
    });
    document.addEventListener('dragleave', e => {
      if (e.relatedTarget) return;            // still inside the page
      const w = windows.get('wml:manager');
      if (w) w.el.classList.remove('wml-dropping');
    });
    document.addEventListener('drop', e => {
      if (!hasFiles(e) || e.defaultPrevented) return;
      e.preventDefault();
      const w = windows.get('wml:manager');
      if (w) w.el.classList.remove('wml-dropping');
      const dt = e.dataTransfer;
      const pending = entriesFromDrop(dt);    // must start inside the event: the dropped items vanish afterwards
      installAndReport(() => pending);
    });
  }
  /** "삭제" on a row: what it can do depends on where the mod lives (a browser cannot delete files on disk) */
  function deleteButton(id, win) {
    return uiButton('삭제', async () => {
      const name = nameOf(id);
      const copy = installedIds().includes(id);
      const registered = !copy && lsGet(LS_FOLDERS, []).includes(id);
      const leftovers = '남은 설정(켜짐 상태·순서·모드 설정·창 위치)도 같이 지워요.';
      const folderNote = `컴퓨터의 wml\\mods\\${id} 폴더는 브라우저가 지울 수 없어요. 완전히 없애려면 그 폴더를 지워 주세요.`;
      const ask = copy
        ? { lines: ['브라우저 저장소에 넣어 둔 이 모드를 지워요. ' + leftovers, '되돌릴 수 없어요. 다시 쓰려면 모드 파일을 다시 넣어야 해요.'], ok: '삭제' }
        : registered
          ? { lines: ['모드 목록에서 빼요. ' + leftovers, folderNote], ok: '삭제' }
          : { lines: ['목록 파일(mods.js)에 들어 있는 폴더 모드예요. 지금은 이 모드를 끄고 ' + leftovers, folderNote + ' (폴더를 지우면 목록에 남아 있어도 저절로 사라져요)'], ok: '끄고 설정 지우기' };
      if (!await askConfirm(win, { title: `"${name}" 모드를 정말 삭제할까요?`, ...ask })) return;
      try {
        await uninstall(id);
        if (!copy && !registered) { const t = toggles(); t[id] = false; lsSet(LS_TOGGLES, t); }   // a mods.js folder mod: keep it off
        sessionChanges.push(copy ? `삭제: ${name} (${id})` : registered ? `목록에서 뺌: ${name} (${id}) — 폴더는 직접 지워 주세요` : `끄고 설정 지움: ${name} (${id}) — 폴더를 지우면 완전히 사라져요`);
      } catch (e) { installError = String(e && e.message || e); }
      win.refresh();
    }, { title: '이 모드를 지워요 (지우기 전에 한 번 더 물어봐요)', danger: true });
  }

  function installBox() {
    const fileIn = el('input', { type: 'file', accept: '.zip,.js', multiple: true, style: 'display:none' });
    const dirIn = el('input', { type: 'file', style: 'display:none' });
    dirIn.webkitdirectory = true;
    fileIn.onchange = () => { const f = [...fileIn.files]; fileIn.value = ''; if (f.length) installAndReport(async () => f); };
    dirIn.onchange = () => { const f = [...dirIn.files]; dirIn.value = ''; if (f.length) installAndReport(async () => f); };
    // the phone app has no folders to drop or pick: mods come in as zip (or mod.js) files
    const hint = host.kind === 'player'
      ? ' — 모드 zip(또는 mod.js)을 고르면 이 폰에 설치돼요(모드팩 zip도 통째로 돼요). 줄 끝의 삭제 버튼으로 지워요. 게임 묶음에 들어 있던 모드는 PC에서 묶음을 다시 만들어 바꿔요.'
      : ' — 모드 폴더를 wml\\mods 에 넣은 뒤 그 폴더를 이 창에 끌어다 놓으면 목록에 등록돼요(폴더를 지우면 사라져요). wml\\mods 밖의 모드는 zip 그대로 끌어다 놓거나 아래 버튼으로 고르면 브라우저에 설치돼요(줄 끝의 삭제 버튼으로 지워요).';
    return el('div', { class: 'wml-add' },
      el('div', null, el('b', null, '모드 추가'), el('span', { class: 'wml-muted' }, hint)),
      el('div', { style: 'display:flex;gap:6px;margin-top:6px;flex-wrap:wrap' },
        uiButton(host.kind === 'player' ? '모드 파일 고르기 (zip·js)' : '파일 고르기 (zip·js)', () => fileIn.click()),
        host.kind === 'player' ? null : uiButton('폴더 고르기', () => dirIn.click())),
      ...sessionChanges.map(s => el('div', { class: 'wml-note' }, `✓ ${s} — 새로고침하면 적용돼요`)),
      installError ? el('div', { class: 'wml-small', style: 'color:#fca5a5;margin-top:4px' }, `설치 실패: ${installError}`) : null,
      fileIn, dirIn);
  }

  function statusOf(id, on) {
    const fail = state.failed.find(f => f.id === id);
    if (!defs.has(id)) return { cls: 'err', text: '파일 오류', tip: fail ? fail.error : '' };
    if (fail) return { cls: 'err', text: '오류', tip: fail.error };
    if (state.loaded.includes(id)) {
      if (!on) return { cls: 'warn', text: '새로고침하면 꺼짐', tip: '끄기는 새로고침하면 적용돼요' };
      const d = defs.get(id);
      if (d.game && !gameMatches(d.game, state.game)) return { cls: 'warn', text: '버전 확인', tip: `게임 ${d.game}용 (지금 ${state.game})` };
      return { cls: 'on', text: '작동 중', tip: '' };
    }
    return on ? { cls: 'warn', text: '새로고침 필요', tip: '켜기는 새로고침하면 적용돼요' } : { cls: 'off', text: '꺼짐', tip: '' };
  }

  // ---- how full the browser storage is. Game saves live in localStorage: about 5 MB per site, and every
  // html file opened by double-click (file://) shares that one space. Mods dropped on the game go to IndexedDB.
  const LS_QUOTA = 5 * 1024 * 1024;        // characters (keys + values): the limit in Chrome, Edge and Firefox
  const STORE_KINDS = [
    { key: 'save', label: '세이브', color: '#d97706', test: k => /^tavern-(game|slot-|auto-d|save)/.test(k) },
    { key: 'log', label: '플레이 기록', color: '#0ea5e9', test: k => k === 'tavern-play-log' },
    { key: 'game', label: '게임 설정', color: '#a8a29e', test: k => /^(tavern-|elena-image-|wayward-custom-wives|wayward-image-backend)/.test(k) },
    { key: 'other', label: '모드·기타', color: '#818cf8', test: () => true },
  ];
  function storageUsage() {
    const items = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i), v = rawGetItem.call(localStorage, k) || '';
        items.push({ key: k, size: k.length + v.length, kind: STORE_KINDS.find(s => s.test(k)).key });
      }
    } catch { return null; }               // storage blocked (private mode etc.)
    const used = items.reduce((n, it) => n + it.size, 0);
    const byKind = Object.fromEntries(STORE_KINDS.map(s => [s.key, items.filter(it => it.kind === s.key).reduce((n, it) => n + it.size, 0)]));
    return { used, quota: LS_QUOTA, percent: Math.min(100, used / LS_QUOTA * 100), byKind, items: items.sort((a, b) => b.size - a.size) };
  }
  const sizeText = n => (n >= 1048576 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);
  const percentText = p => (p > 0 && p < 1 ? '1% 미만' : `${Math.round(p)}%`);
  const storageColor = p => (p >= 95 ? '#fca5a5' : p >= 80 ? '#fcd34d' : '#a8a29e');
  function storageName(k) {
    let m;
    if (k === 'tavern-game') return '현재 게임';
    if ((m = k.match(/^tavern-slot-(\d+)$/))) return `저장 칸 ${Number(m[1]) + 1}`;
    if ((m = k.match(/^tavern-auto-d(\d+)$/))) return `${m[1]}일차 시작 자동저장`;
    if (k === 'tavern-play-log') return '플레이 기록';
    if (k === 'tavern-settings') return '게임 설정';
    if (k.startsWith('elena-image-')) return '게임 그림 기록';
    if (k.startsWith('wayward-custom-wives')) return '직접 만든 아내';
    if (k.startsWith('wayward-image-backend')) return '그림 서버 설정';
    if ((m = k.match(/^wml\.mod\.(.+)$/))) return `${nameOf(m[1])} 모드 설정`;
    if ((m = k.match(/^wml\.win\.([^:]+)/))) return m[1] === 'wml' ? 'WML 창 위치' : `${nameOf(m[1])} 창 위치`;
    if (k.startsWith('wml.')) return 'WML 설정';
    const owner = storageOwner(k);
    return owner ? `${nameOf(owner)} 모드 데이터` : k;
  }
  /** best guess of the mod a key belongs to: a mod id inside the key ("wayward-brothel-v3" → brothel) */
  function storageOwner(k) {
    if (/^(tavern-|elena-image-)/.test(k)) return null;
    const flat = s => s.toLowerCase().replace(/[-_.]/g, '');
    const hits = state.listed.filter(id => new RegExp(`(^|[-_.])${id.replace(/\./g, '\\.')}([-_.]|$)`).test(k) || (id.length >= 5 && flat(k).includes(flat(id))));
    return hits.sort((a, b) => b.length - a.length)[0] || null;
  }
  /** the WML button bar: where it sits, how many buttons fit on a line, folded or not */
  function dockSection() {
    const o = dockOpts();
    const box = el('div', { class: 'wml-section' }, el('h4', null, '버튼 줄 (WML 버튼 모음)'));
    const count = el('input', { type: 'number', min: '1', max: '12', value: String(o.perLine), style: 'width:56px' });
    count.onchange = () => dockSet({ perLine: Math.max(1, Math.min(12, Number(count.value) || 5)) });
    box.append(
      el('div', { class: 'wml-small wml-muted' }, '모드 버튼을 한 줄에 모아 둬요. 왼쪽 손잡이를 끌면 옮겨지고, ‹ 를 누르면 옆으로 밀려 작은 "WML ›" 만 남아요.'),
      el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px' },
        el('label', null, '한 줄에 ', count, ' 개 (넘으면 윗줄이 하나 더 생겨요)'),
        uiButton(o.open ? '접기' : '펴기', () => dockSet({ open: !dockOpts().open })),
        uiButton('제자리로', () => dockSet({ x: null, y: null }), { title: '왼쪽 아래 기본 자리로 되돌려요' })),
      el('div', { class: 'wml-small wml-muted', style: 'margin-top:4px' },
        `지금 버튼 ${dock.length + 1}개` + (dock.some(d => d.el) ? ` (그중 다른 모드에서 가져온 버튼 ${dock.filter(d => d.el).length}개)` : '')),
    );
    return box;
  }

  let storageOpen = false;                 // the "무엇이 큰지" list stays open across refreshes
  function storageSection() {
    const box = el('div', { class: 'wml-section' }, el('h4', null, '저장 공간'));
    const u = storageUsage();
    if (!u) {
      box.append(el('div', { class: 'wml-small wml-muted' }, '브라우저 저장소를 읽을 수 없어요 (사생활 보호 창이거나 막혀 있어요).'));
      return box;
    }
    const kinds = STORE_KINDS.filter(s => u.byKind[s.key]);
    box.append(...[
      el('div', { class: 'wml-small', style: `color:${storageColor(u.percent)}` },
        `로컬 스토리지 ${sizeText(u.used)} / 약 5MB 사용 중 (${percentText(u.percent)})`),
      el('div', { class: 'wml-meter', title: `${u.used.toLocaleString()}자 / ${u.quota.toLocaleString()}자` },
        ...kinds.map(s => el('i', { style: `width:${(u.byKind[s.key] / u.quota * 100).toFixed(2)}%;background:${s.color}`, title: `${s.label} ${sizeText(u.byKind[s.key])}` }))),
      el('div', { class: 'wml-small wml-muted', style: 'display:flex;flex-wrap:wrap;gap:2px 12px;margin-top:4px' },
        ...kinds.map(s => el('span', null, el('span', { class: 'wml-dot', style: `background:${s.color}` }), `${s.label} ${sizeText(u.byKind[s.key])}`))),
      u.percent >= 80 ? el('div', { class: 'wml-small', style: `color:${storageColor(u.percent)};margin-top:4px` },
        '거의 찼어요. 꽉 차면 저장이 실패해요. 게임의 오래된 저장 칸을 지우거나 JSON으로 내보내 두세요.') : null,
      el('details', { class: 'wml-small', style: 'margin-top:4px', open: storageOpen, ontoggle: e => { storageOpen = e.target.open; } },
        el('summary', { class: 'wml-muted', style: 'cursor:pointer' }, '무엇이 큰지 보기'),
        ...u.items.slice(0, 10).map(it => el('div', { class: 'wml-store-row' },
          el('span', { title: it.key }, el('span', { class: 'wml-dot', style: `background:${STORE_KINDS.find(s => s.key === it.kind).color}` }), storageName(it.key)),
          el('span', { class: 'wml-muted' }, sizeText(it.size))))),
      el('div', { class: 'wml-small wml-muted', style: 'margin-top:4px' },
        '게임 세이브와 모드 설정이 여기에 저장돼요.' + (location.protocol === 'file:' ? ' 더블클릭으로 연 다른 html 게임(다른 판 포함)도 이 공간을 같이 써요.' : '')),
    ].filter(Boolean));
    // mods dropped on the game live in IndexedDB, which has a much larger limit
    const n = installedIds().length;
    const idbText = (used, gb) => (n
      ? `브라우저에 설치한 모드 ${n}개는 따로 브라우저 데이터베이스에 있어요${used ? `: ${used} 사용` : ''}${gb ? ` · 한도 약 ${gb}GB (넉넉해요)` : ''}.`
      : `끌어다 놓아 설치하는 모드는 따로 브라우저 데이터베이스에 들어가요${gb ? ` (한도 약 ${gb}GB, 넉넉해요)` : ''}.`);
    const idb = el('div', { class: 'wml-small wml-muted' }, idbText());
    box.append(idb);
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(e => {
        idb.textContent = idbText(e.usage ? sizeText(e.usage) : '', e.quota ? Math.max(1, Math.round(e.quota / 1073741824)) : 0);
      }).catch(() => {});
    }
    return box;
  }

  function renderManager(body, win) {
    const t = toggles();
    let order = playerOrder();
    const pending = () => {
      const now = playerOrder(), tt = toggles();
      return !bootSnapshot || sessionChanges.length > 0 || now.join('|') !== bootSnapshot.order.join('|') || state.listed.some(id => isOn(id, tt) !== bootSnapshot.on[id]);
    };

    body.append(el('div', { class: 'wml-small wml-muted' },
      `게임 ${state.game || '?'} · 심볼 표 ${state.symbols ? state.symbols.game : '없음'} · 언어 ${(window.WML_I18N && window.WML_I18N.lang) || 'en'} · `,
      `작동 중 ${state.loaded.length} / 목록 ${state.listed.length}`, host.kind === 'player' ? ` · WML 플레이어 v${host.app}` : ''));
    body.append(el('div', { class: 'wml-small wml-muted', style: 'margin:4px 0 8px' },
      '위에서부터 차례로 로드돼요. 끌어서(⠿) 또는 ↑↓로 순서를 바꾸고, 체크로 켜고 꺼요. 바꾼 내용은 새로고침하면 적용돼요.'));
    const usage = storageUsage();
    if (usage && usage.percent >= 80) body.append(el('div', { class: 'wml-small', style: `color:${storageColor(usage.percent)};margin:0 0 8px` },
      `⚠ 저장 공간을 ${percentText(usage.percent)} 쓰고 있어요. 아래 "저장 공간"에서 무엇이 큰지 볼 수 있어요.`));
    body.append(installBox());

    const preview = [];
    sortMods(order.filter(id => isOn(id) && defs.has(id)), preview);

    // search: filters the rows in place (no redraw, so typing keeps its focus)
    const rowText = new Map();            // row -> lower-case name, id and description
    const applySearch = () => {
      const q = managerQuery.trim().toLowerCase();
      let shown = 0;
      for (const [row, text] of rowText) { const hit = !q || text.includes(q); row.style.display = hit ? '' : 'none'; if (hit) shown++; }
      searchNote.textContent = q ? (shown ? `${shown}개 찾음` : '찾는 모드가 없어요') : '';
    };
    const searchNote = el('span', { class: 'wml-small wml-muted' });
    const searchBox = el('input', { type: 'search', value: managerQuery, placeholder: '모드 찾기 (이름·id·설명)', 'aria-label': '모드 찾기',
      style: 'flex:1;min-width:160px;max-width:320px;background:#0c0a09;color:#e7e5e4;border:1px solid #57534e;border-radius:6px;padding:4px 8px;font:inherit',
      oninput: () => { managerQuery = searchBox.value; applySearch(); } });
    body.append(el('div', { style: 'display:flex;gap:8px;align-items:center;margin:0 0 6px;flex-wrap:wrap' }, searchBox, searchNote,
      justAdded.size ? el('span', { class: 'wml-small', style: 'color:#fde68a' }, `방금 넣은 모드 ${justAdded.size}개는 노란 줄로 보여요`) : null));

    const table = el('table', { class: 'wml-grid' });
    table.append(el('thead', null, el('tr', null,
      el('th', null, ''), el('th', { class: 'wml-col-num' }, '#'), el('th', null, '사용'), el('th', null, '모드'),
      el('th', { class: 'wml-col-ver' }, '버전'), el('th', null, '상태'), el('th', { style: 'text-align:right' }, ''))));
    const tbody = el('tbody');
    table.append(tbody);

    let dragId = null;
    const move = (id, to) => {
      const from = order.indexOf(id);
      if (from < 0 || to < 0 || to >= order.length || from === to) return;
      order.splice(from, 1); order.splice(to, 0, id);
      lsSet(LS_ORDER, order);
      win.refresh();
    };

    order.forEach((id, i) => {
      const d = defs.get(id);
      const on = isOn(id, t);
      const st = statusOf(id, on);
      const deps = d ? [
        d.requires.length && `필요: ${d.requires.map(nameOf).join(', ')}`,
        d.loadAfter.length && `다음에 로드: ${d.loadAfter.map(nameOf).join(', ')}`,
        d.loadBefore.length && `먼저 로드: ${d.loadBefore.map(nameOf).join(', ')}`,
        d.conflicts.length && `충돌: ${d.conflicts.map(nameOf).join(', ')}`,
        d.roles.length && `역할: ${d.roles.map(roleLabel).join(', ')}`,
        d.game && `게임 ${d.game}`,
      ].filter(Boolean).join(' · ') : '';
      const notes = preview.filter(n => n.id === id).map(n => n.msg);
      if (on) for (const { role, ids } of roleMates(id, order.filter(o => isOn(o, t)))) notes.push(`같은 일(${roleLabel(role)})을 하는 ${ids.map(nameOf).join(', ')}도 켜져 있어요 — 하나만 켜는 걸 권해요`);
      const cb = el('input', { type: 'checkbox', checked: on, disabled: !d, title: on ? '끄기' : '켜기',
        onchange: () => { const tt = toggles(); tt[id] = cb.checked; lsSet(LS_TOGGLES, tt); win.refresh(); } });
      const row = el('tr', { class: (on ? '' : 'wml-off') + (justAdded.has(id) ? ' wml-new' : ''), draggable: true, 'data-id': id },
        el('td', { class: 'wml-handle', title: '끌어서 순서 바꾸기' }, '⠿'),
        el('td', { class: 'wml-col-num wml-muted wml-fade' }, String(i + 1)),
        el('td', null, cb),
        el('td', { class: 'wml-fade' },
          el('div', null, el('span', { class: 'wml-name' }, (d && d.name) || id), el('span', { class: 'wml-id' }, id),
            justAdded.has(id) ? el('span', { class: 'wml-chip wml-chip-warn', style: 'margin-left:6px', title: '이번에 넣은 모드예요. 새로고침하면 적용돼요.' }, '방금 넣음') : null,
            installedIds().includes(id) ? el('span', { class: 'wml-chip wml-chip-inst', title: '브라우저에 설치한 모드예요 (wml 폴더에 없어도 돼요). 삭제 버튼으로 지워요.' }, '설치본') : null,
            lsGet(LS_FOLDERS, []).includes(id) && !installedIds().includes(id) ? el('span', { class: 'wml-chip wml-chip-inst', title: 'mods.js 없이 등록한 폴더 모드예요. wml\\mods 에서 폴더를 지우면 사라져요.' }, '폴더 등록') : null,
            d && d.platforms.length ? el('span', { class: `wml-chip ${d.platforms.includes(host.platform) ? 'wml-chip-inst' : 'wml-chip-warn'}`, style: 'margin-left:6px',
              title: d.platforms.includes(host.platform) ? '' : `${PLATFORM_LABEL[host.platform]}에서는 쓸모가 없을 수 있어요 (예: 키보드 단축키)` }, `${d.platforms.map(p => PLATFORM_LABEL[p]).join('·')} 전용`) : null),
          d && d.description ? el('div', { class: 'wml-small wml-muted' }, d.description) : null,
          deps ? el('div', { class: 'wml-small', style: 'color:#93c5fd' }, deps) : null,
          ...notes.map(n => el('div', { class: 'wml-note' }, '↳ ' + n)),
          st.tip && st.cls === 'err' ? el('div', { class: 'wml-small', style: 'color:#fca5a5' }, st.tip) : null),
        el('td', { class: 'wml-col-ver wml-muted wml-small wml-fade' }, d && d.version ? 'v' + d.version : ''),
        el('td', null, el('span', { class: `wml-chip wml-chip-${st.cls}`, title: st.tip }, st.text)),
        el('td', null, el('div', { class: 'wml-acts' },
          uiButton('↑', () => move(id, i - 1), { icon: true, title: '위로', disabled: i === 0 }),
          uiButton('↓', () => move(id, i + 1), { icon: true, title: '아래로', disabled: i === order.length - 1 }),
          settingsPanels.has(id) ? uiButton('⚙', () => openSettings(id), { icon: true, title: '설정' }) : null,
          d || installedIds().includes(id) ? deleteButton(id, win) : null)));
      row.addEventListener('dragstart', e => { dragId = id; row.classList.add('wml-dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', id); } catch { /* old browsers */ } });
      row.addEventListener('dragend', () => { row.classList.remove('wml-dragging'); dragId = null; });
      row.addEventListener('dragover', e => { if (!dragId || dragId === id) return; e.preventDefault(); row.classList.add('wml-drop'); });
      row.addEventListener('dragleave', () => row.classList.remove('wml-drop'));
      row.addEventListener('drop', e => { if (!dragId) return; e.preventDefault(); row.classList.remove('wml-drop'); if (dragId !== id) move(dragId, order.indexOf(id)); });
      rowText.set(row, `${(d && d.name) || ''} ${id} ${(d && d.description) || ''}`.toLowerCase());
      tbody.append(row);
    });
    if (!order.length) tbody.append(el('tr', null, el('td', { colspan: 7, class: 'wml-muted' }, 'mods.js에 모드가 없어요.')));
    body.append(table);
    applySearch();
    // the first mod added this session comes into view (it is usually at the end of a long list)
    const firstNew = tbody.querySelector('tr.wml-new');
    if (firstNew && !managerQuery) setTimeout(() => { try { firstNew.scrollIntoView({ block: 'nearest' }); } catch { /* old browsers */ } }, 0);
    const gone = state.missing.filter(id => state.fromList.includes(id));
    if (gone.length) body.append(el('div', { class: 'wml-small wml-muted', style: 'margin-top:6px' },
      `mods.js 목록에는 있지만 폴더가 없어서 건너뛴 모드 ${gone.length}개: ${gone.join(', ')} — 지운 모드면 그대로 두면 돼요 (목록까지 정리하려면 wml\\mods\\모드목록_자동갱신.cmd)`));
    body.append(dockSection());
    body.append(storageSection());
    body.append(transferSection(win));

    // problems of this session
    const probs = [
      ...state.failed.map(f => `${nameOf(f.id)}: ${f.error}`),
      ...state.warnings.map(w => `${w.mod ? nameOf(w.mod) + ': ' : ''}${w.msg}`),
    ];
    if (probs.length) {
      body.append(el('div', { class: 'wml-section' }, el('h4', null, `알림 ${probs.length}`),
        ...probs.slice(-12).map(p => el('div', { class: 'wml-small', style: 'color:#fcd34d' }, '• ' + p))));
    }

    // footer
    const isPending = pending();
    const foot = el('div', { class: 'wml-win-foot' },
      uiButton('기본값으로', () => { lsDel(LS_ORDER); lsDel(LS_TOGGLES); win.refresh(); }, { title: 'mods.js에 적힌 순서와 켜짐 상태로 되돌려요' }),
      uiButton('모두 켜기', () => { const tt = {}; state.listed.forEach(i => { tt[i] = true; }); lsSet(LS_TOGGLES, tt); win.refresh(); }),
      uiButton('모두 끄기', () => { const tt = {}; state.listed.forEach(i => { tt[i] = false; }); lsSet(LS_TOGGLES, tt); win.refresh(); }),
      host.kind === 'player' ? null : uiButton('mods.js로 복사', () => copyModsJs(foot), { title: '지금 순서와 켜짐 상태를 mods.js 내용으로 복사해요 (배포용)' }),
      HOST && typeof HOST.menu === 'function' ? uiButton('플레이어 메뉴', () => HOST.menu(), { title: '게임 묶음·그림 묶음 가져오기와 플레이어 설정' }) : null,
      el('span', { style: 'flex:1' }),
      isPending ? el('span', { class: 'wml-note' }, '바뀐 설정이 있어요') : null,
      uiButton('새로고침해서 적용', () => location.reload(), { primary: true, disabled: !isPending }));
    const old = win.el.querySelector('.wml-win-foot');
    if (old) old.remove();
    win.el.append(foot);
  }

  function copyModsJs(where) {
    const tt = toggles();
    const lines = playerOrder().map(id => `  "${id}${isOn(id, tt) ? '' : ':off'}",${defs.get(id) && defs.get(id).name ? `   // ${defs.get(id).name}` : ''}`);
    const text = `// 켤 모드를 순서대로 적어요. "id:off" 는 목록에는 있지만 기본으로 꺼져 있어요.\n// 게임 안 왼쪽 아래 "WML" 버튼(모드 관리자)에서도 켜고 끄고 순서를 바꿀 수 있어요.\nWML.enable([\n${lines.join('\n')}\n]);\n`;
    const done = ok => { const n = el('span', { class: 'wml-note' }, ok ? '복사했어요' : '복사가 막혀 있어요'); where.prepend(n); setTimeout(() => n.remove(), 2000); };
    try { navigator.clipboard.writeText(text).then(() => done(true), () => done(false)); } catch { done(false); }
  }

  function openSettings(id) {
    const render = settingsPanels.get(id);
    if (!render) return;
    openWindow({ id: `${id}:settings`, title: `${nameOf(id)} 설정`, width: 460, height: 420, owner: id, render });
  }

  // ---------------------------------------------------------------- saving files & the back button (phone app)
  const backHandlers = [];               // { owner, fn } from api.onBack, newest last
  /** the phone's back button: answer an open question, let a mod close its panel, close the top WML window */
  function back() {
    if (openQuestions.length) { openQuestions[openQuestions.length - 1](); return true; }
    for (let i = backHandlers.length - 1; i >= 0; i--) {
      try { if (backHandlers[i].fn() === true) return true; } catch (e) { console.error(`[WML] ${backHandlers[i].owner} back`, e); }
    }
    let top = null;
    for (const w of windows.values()) if (!top || Number(w.el.style.zIndex) > Number(top.el.style.zIndex)) top = w;
    if (top) { top.close(); return true; }
    return false;
  }

  const blobToBase64 = blob => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const s = String(r.result); resolve(s.slice(s.indexOf(',') + 1)); };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  const base64ToBlob = (b64, type) => {
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: type || '' });
  };
  /** a download in a browser; Download/WML in the phone app */
  async function saveFile(name, data, type = '') {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'application/octet-stream' });
    if (HOST && typeof HOST.saveFile === 'function') {
      const err = HOST.saveFile(String(name), blob.type || type || '', await blobToBase64(blob));
      if (err) throw new Error(err);
      return true;
    }
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: String(name), style: 'display:none' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  }
  // A page in the phone app cannot download. Links that save a blob:/data: URL (export buttons of mods and of the
  // game) go to Download/WML instead. Blobs are remembered when their URL is made: pages often revoke it right
  // after the click, before the file could be read.
  if (HOST && typeof HOST.saveFile === 'function') {
    try {
      const blobs = new Map();
      const made = URL.createObjectURL, revoked = URL.revokeObjectURL;
      URL.createObjectURL = function createObjectURL(obj) { const u = made.call(URL, obj); if (obj instanceof Blob) blobs.set(u, obj); return u; };
      URL.revokeObjectURL = function revokeObjectURL(u) { revoked.call(URL, u); setTimeout(() => blobs.delete(u), 60000); };
      const wants = a => !!a && typeof a.hasAttribute === 'function' && a.hasAttribute('download') && /^(blob|data):/i.test(a.href || '');
      const viaHost = a => {
        const name = a.getAttribute('download') || 'download';
        const known = blobs.get(a.href);
        (known ? Promise.resolve(known) : fetch(a.href).then(r => r.blob()))
          .then(b => saveFile(name, b)).catch(e => console.warn('[WML] could not save', name, e));
      };
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () { if (wants(this)) { viaHost(this); return undefined; } return click.call(this); };
      document.addEventListener('click', e => {
        const a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
        if (wants(a)) { e.preventDefault(); viaHost(a); }
      }, true);
    } catch (e) { console.warn('[WML] download bridge', e); }
  }

  // ---------------------------------------------------------------- moving saves & settings (PC ↔ phone, backups)
  // One JSON file: the localStorage keys as stored (packed saves stay packed) + mods installed in the browser.
  const STATE_FORMAT = 'wml-state';
  const STATE_SKIP = /^wml\.(symcache$|win\.|installed$|i18n\.|dev$|secret\.)/;     // caches, window positions, debug data, secrets (api.secret)
  const STATE_PARTS = [
    { key: 'saves', label: '세이브·플레이 기록', test: k => /^tavern-(game$|slot-|auto-d|save|play-log$)/.test(k) },
    { key: 'game', label: '게임 설정', test: k => /^(tavern-|elena-image-|wayward-custom-wives|wayward-image-backend)/.test(k) },
    { key: 'mods', label: '모드 켜기·끄기·순서·설정', test: k => k.startsWith('wml.') || !!storageOwner(k) },
    { key: 'other', label: '그 밖의 저장 값', test: () => true },
  ];
  const statePart = k => STATE_PARTS.find(p => p.test(k)).key;
  function storageKeys() {
    const out = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k != null && !STATE_SKIP.test(k)) out.push(k); } } catch { /* storage off */ }
    return out;
  }
  function stateSummary() {
    const parts = Object.fromEntries(STATE_PARTS.map(p => [p.key, { keys: 0, size: 0 }]));
    for (const k of storageKeys()) { const p = parts[statePart(k)]; p.keys++; p.size += k.length + (rawGetItem.call(localStorage, k) || '').length; }
    return { parts, installed: installedIds().length };
  }
  /** want: { saves, game, mods, other, installed } — false leaves that kind out */
  async function exportState(want = {}) {
    const take = key => want[key] !== false;
    const storage = {};
    for (const k of storageKeys()) if (take(statePart(k))) storage[k] = rawGetItem.call(localStorage, k);
    const mods = [];
    if (take('installed') && installedIds().length) {
      for (const r of (await idbRun('readonly', st => st.getAll())) || []) {
        const files = {};
        for (const [p, v] of Object.entries(r.files || {})) files[p] = typeof v === 'string' ? v : { b64: await blobToBase64(v), type: v.type || '' };
        mods.push({ id: r.id, name: r.name, version: r.version, size: r.size, installedAt: r.installedAt, files });
      }
    }
    return { format: STATE_FORMAT, version: 1, wml: VERSION, game: state.game, lang: (window.WML_I18N && window.WML_I18N.lang) || 'en',
      created: new Date().toISOString(), from: host.platform, storage, installed: mods };
  }
  function checkState(obj) {
    if (!obj || obj.format !== STATE_FORMAT || !obj.storage || typeof obj.storage !== 'object') throw new Error('WML 세이브·설정 파일(wml-state)이 아니에요');
    return obj;
  }
  /**
   * Write a saves/settings file into this browser. Same keys are overwritten, other keys stay. Settings go first,
   * then saves (the play log last), so a full storage loses the least. → { written, failed: [keys], mods, done }
   */
  function importState(obj, want = {}) {
    checkState(obj);
    const take = key => want[key] !== false;
    const order = ['mods', 'game', 'saves', 'other'];
    const keys = Object.keys(obj.storage).filter(k => !STATE_SKIP.test(k) && take(statePart(k)) && typeof obj.storage[k] === 'string')
      .sort((a, b) => order.indexOf(statePart(a)) - order.indexOf(statePart(b)) || (a === 'tavern-play-log') - (b === 'tavern-play-log'));
    let written = 0;
    const failed = [];
    for (const k of keys) {
      try { rawSetItem.call(localStorage, k, obj.storage[k]); unpacked.delete(k); written++; } catch { failed.push(k); }
    }
    const mods = take('installed') && Array.isArray(obj.installed) ? obj.installed.filter(r => r && ID_RULE.test(r.id || '')) : [];
    let done = Promise.resolve();
    if (mods.length) {
      lsSet(LS_INSTALLED, [...new Set([...installedIds(), ...mods.map(r => r.id)])]);
      done = idbRun('readwrite', st => {
        for (const r of mods) {
          const files = {};
          for (const [p, v] of Object.entries(r.files || {})) files[p] = typeof v === 'string' ? v : v && typeof v.b64 === 'string' ? base64ToBlob(v.b64, v.type) : '';
          st.put({ id: r.id, name: r.name || r.id, version: r.version || '', files, size: r.size || 0, installedAt: r.installedAt || Date.now() });
        }
      });
    }
    return { written, failed, mods: mods.length, done };
  }

  let transferNote = null;                // the last export/import result, shown in the manager
  const transferWant = { saves: true, game: true, mods: true, other: true, installed: true };
  function transferSection(win) {
    const box = el('div', { class: 'wml-section' }, el('h4', null, '옮기기·백업 (세이브·설정 파일)'));
    box.append(el('div', { class: 'wml-small wml-muted' }, host.kind === 'player'
      ? '세이브와 모드 설정을 파일 하나로 내보내요(다운로드/WML 폴더). PC에서 내보낸 파일을 가져올 수도 있어요. 앱을 지우면 폰의 세이브도 지워지니, 지우기 전에 꼭 내보내 두세요.'
      : '세이브와 모드 설정을 파일 하나로 내보내서 다른 PC나 폰(WML 플레이어)에서 가져와요. 모바일로_묶기.cmd 는 다운로드 폴더의 이 파일을 게임 묶음에 같이 넣어 줘요.'));
    let sum = null;
    try { sum = stateSummary(); } catch { /* storage off */ }
    if (!sum) return box;
    const rows = [
      ...STATE_PARTS.map(p => ({ key: p.key, label: p.label, n: sum.parts[p.key].keys, info: `${sum.parts[p.key].keys}개 · ${sizeText(sum.parts[p.key].size)}` })),
      { key: 'installed', label: '브라우저에 설치한 모드', n: sum.installed, info: `${sum.installed}개` },
    ];
    const list = el('div', { style: 'display:flex;flex-wrap:wrap;gap:2px 14px;margin:6px 0' });
    for (const r of rows) {
      const cb = el('input', { type: 'checkbox', checked: transferWant[r.key] && r.n > 0, disabled: !r.n, onchange: () => { transferWant[r.key] = cb.checked; } });
      list.append(el('label', { class: 'wml-small', style: `display:flex;gap:6px;align-items:center;cursor:pointer${r.n ? '' : ';opacity:.5'}` }, cb, `${r.label} (${r.n ? r.info : '없음'})`));
    }
    box.append(list);
    const pick = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    pick.onchange = async () => {
      const f = pick.files && pick.files[0];
      pick.value = '';
      if (!f) return;
      let obj;
      try { obj = checkState(JSON.parse(await f.text())); } catch (e) { transferNote = { ok: false, text: `가져오지 못했어요: ${e.message}` }; win.refresh(); return; }
      const count = part => Object.keys(obj.storage).filter(k => !STATE_SKIP.test(k) && statePart(k) === part).length;
      const slots = Object.keys(obj.storage).filter(k => /^tavern-(game$|slot-|auto-d)/.test(k)).length;
      const lines = [
        `${f.name}${obj.created ? ` · ${new Date(obj.created).toLocaleString()}` : ''}${PLATFORM_LABEL[obj.from] ? ` · ${PLATFORM_LABEL[obj.from]}에서 내보냄` : ''}`,
        `세이브 ${slots}개 · 설정 ${count('game') + count('mods')}개 · 그 밖 ${count('other')}개 · 설치한 모드 ${(obj.installed || []).length}개`,
        '이 기기에 있는 같은 저장 칸과 설정은 덮어써요. 위에서 끈 종류는 가져오지 않아요. 끝나면 새로고침해요.',
      ];
      if (obj.game && state.game && obj.game !== state.game) lines.push(`다른 게임 버전(${obj.game})에서 내보낸 파일이에요. 세이브는 대개 그대로 쓸 수 있어요.`);
      if (!await askConfirm(win, { title: '세이브·설정을 가져올까요?', lines, ok: '가져오기' })) return;
      try {
        const r = importState(obj, transferWant);
        await r.done;
        transferNote = { ok: !r.failed.length, text: `가져왔어요: 저장 값 ${r.written}개${r.mods ? `, 모드 ${r.mods}개` : ''}.`
          + (r.failed.length ? ` 저장 공간이 모자라 ${r.failed.length}개는 못 넣었어요: ${r.failed.slice(0, 5).map(storageName).join(', ')}.` : '') + ' 새로고침하면 적용돼요.' };
        sessionChanges.push('세이브·설정 가져옴');
      } catch (e) { transferNote = { ok: false, text: `가져오지 못했어요: ${e.message}` }; }
      win.refresh();
    };
    const exportNow = async () => {
      try {
        const data = await exportState(transferWant);
        const d = new Date(), p2 = n => String(n).padStart(2, '0');
        const name = `wml-state-${state.game || 'game'}-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}.json`;
        await saveFile(name, JSON.stringify(data), 'application/json');
        transferNote = { ok: true, text: `내보냈어요: ${name} (${host.kind === 'player' ? '다운로드/WML 폴더' : '다운로드 폴더'}) · 저장 값 ${Object.keys(data.storage).length}개${data.installed.length ? `, 모드 ${data.installed.length}개` : ''}` };
      } catch (e) { transferNote = { ok: false, text: `내보내지 못했어요: ${e.message}` }; }
      win.refresh();
    };
    box.append(el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' },
      uiButton('내보내기', exportNow, { title: '고른 종류를 파일 하나로 저장해요' }),
      uiButton('가져오기…', () => pick.click(), { title: '내보낸 파일(wml-state-….json)을 골라요' }), pick));
    if (transferNote) box.append(el('div', { class: 'wml-small', style: `margin-top:4px;color:${transferNote.ok ? '#86efac' : '#fca5a5'}` }, transferNote.text));
    return box;
  }

  /** console access for mod authors: localStorage.setItem('wml.dev','true') then WML.dev() */
  function dev() {
    if (!lsGet('wml.dev', false)) throw new Error("WML.dev(): run localStorage.setItem('wml.dev','true') and reload first");
    if (!engine) throw new Error('WML.dev(): game not booted yet');
    return Object.freeze({ ...makeApi({ id: 'dev' }), hooks });
  }

  // A game bundle may carry a saves/settings file the player app was told to bring in. It goes in now, before
  // mods.js and the game read anything (installed mods: before the installed copies are loaded).
  if (HOST && typeof HOST.takePendingState === 'function') {
    try {
      const text = HOST.takePendingState();
      if (text) {
        const r = importState(JSON.parse(text));
        stateImport = r.done;
        transferNote = { ok: !r.failed.length, text: `게임 묶음에 들어 있던 세이브·설정을 가져왔어요: 저장 값 ${r.written}개${r.mods ? `, 모드 ${r.mods}개` : ''}.`
          + (r.failed.length ? ` 저장 공간이 모자라 ${r.failed.length}개는 못 넣었어요.` : '') };
        console.info('[WML]', transferNote.text);
      }
    } catch (e) { warn(`게임 묶음에 들어 있던 세이브·설정을 가져오지 못했어요: ${e.message}`); }
  }

  window.WML = Object.freeze({
    VERSION, define, enable, symbols, boot, dev,
    /** the stored text of a localStorage key as it is (getItem unpacks packed saves) */
    rawGetItem: k => rawGetItem.call(localStorage, k),
    openManager, window: openWindow,
    /** what a mod shared with api.provide (for the console and plain scripts) */
    use: id => provided.get(id),
    /** where the game runs: { kind: 'player'|'browser', app, platform: 'pc'|'mobile' } */
    host,
    /** the phone's back button (WML Player calls it): true when something was closed */
    back,
    /** save a file: a download in a browser, Download/WML in the phone app */
    saveFile: (name, data, type) => saveFile(name, data, type),
    /** saves + settings (+ installed mods) as one object; want: { saves, game, mods, other, installed } (false = leave out) */
    exportState: want => exportState(want),
    /** write such an object into this browser → { written, failed, mods, done (Promise) }; reload afterwards */
    importState: (obj, want) => importState(obj, want),
    status: () => ({ ...JSON.parse(JSON.stringify(state)), host, installed: installedIds(), modSymbols: Object.fromEntries(modSyms), roles: Object.fromEntries([...defs].filter(([, d]) => d.roles.length).map(([id, d]) => [id, d.roles])) }),
    /** install mods from File objects or { path, blob } (zip, folder files, mod.js); takes effect after a reload */
    install: items => install(items),
    uninstall: id => uninstall(id),
    installed: () => installedIds(),
    /** localStorage use: { used, quota, percent, byKind, items (biggest first) } — sizes in characters */
    storage: () => { const u = storageUsage(); return u && { ...u, items: u.items.slice(0, 20) }; },
  });
  window.__WML__ = window.WML;
})();
