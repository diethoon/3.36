// Shared helpers for the Wayward Mod Loader tools.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import * as acorn from 'acorn';

export const MODULE_TAG = '<script type="module" crossorigin>';

/**
 * Read a Wayward build and split out the game module script.
 * An English WML build (Wayward_WML.html) is turned back into the exact vanilla file first,
 * so the original HTML does not have to be kept around.
 */
export function readGame(file) {
  let html = fs.readFileSync(file, 'utf8');
  let version = null;
  if (html.includes('/* WML_BRIDGE_BEGIN')) ({ html, version } = unwrapWml(html, file));
  const tagAt = html.indexOf(MODULE_TAG);
  if (tagAt < 0) throw new Error(`${file}: game module script not found`);
  const start = tagAt + MODULE_TAG.length;
  const end = html.indexOf('</script>', start);
  return { file, html, tagAt, start, end, module: inlinePackedData(html.slice(start, end)), version: version || detectVersion(file, html) };
}

/**
 * Some translated builds keep their big tables gzipped in one base64 blob that is unpacked while the page
 * loads (`const __koPackedData04=await(async()=>{…atob("…")…})(); const koXData=__koPackedData04.koXData;`).
 * Put every table back as a plain JSON initializer so the tools can read it like an unpacked build.
 */
export function inlinePackedData(module) {
  const m = /const (__\w*[Pp]acked\w*)=await\(async\(\)=>\{try\{[^]*?atob\("([A-Za-z0-9+/=]+)"\)[^]*?\}\)\(\);/.exec(module);
  if (!m) return module;
  const data = JSON.parse(zlib.gunzipSync(Buffer.from(m[2], 'base64')).toString('utf8'));
  return module.replace(m[0], () => `const ${m[1]}={};`)
    .replace(new RegExp(`const (\\w+)=${m[1]}\\.\\1;`, 'g'), (all, name) => (name in data ? `const ${name}=${JSON.stringify(data[name])};` : all));
}

export const LOADER_MARK = '<!-- Wayward Mod Loader -->';

/** Undo what build.mjs added (loader <script> lines + bridge). Only untranslated builds can be undone. */
export function unwrapWml(html, file = 'build') {
  const head = html.match(/\/\* WML_BRIDGE_BEGIN (\S+)(?: lang=(\S+))? \*\//);
  if (!head) throw new Error(`${file}: WML bridge marker is damaged`);
  if (head[2] !== 'en') throw new Error(`${file}: this WML build is translated (or too old to tell); use Wayward_WML.html (English) or the vanilla file`);
  const b = html.indexOf(head[0]);
  const e = html.indexOf('/* WML_BRIDGE_END */', b);
  const open = 'const __wmlRender=()=>{', close = '};\n(globalThis.__WML__';
  const rs = html.indexOf(open, b), re = html.indexOf(close, rs);
  if (e < 0 || rs < 0 || re < 0 || re > e) throw new Error(`${file}: WML bridge is damaged`);
  let out = html.slice(0, b) + html.slice(rs + open.length, re) + html.slice(e + '/* WML_BRIDGE_END */'.length);
  const l = out.indexOf(LOADER_MARK), m = out.indexOf(MODULE_TAG);
  if (l >= 0 && l < m) out = out.slice(0, l) + out.slice(m);
  return { html: out, version: head[1] };
}

/** Game version: from the file name (wayward-YYYY-MM-DD.html) or the newest date string in the build. */
export function detectVersion(file, html) {
  const fromName = path.basename(file).match(/(\d{4}-\d{2}-\d{2})/);
  if (fromName) return fromName[1];
  const dates = [...html.matchAll(/"(20\d\d-\d\d-\d\d)"/g)].map(m => m[1]).sort();
  return dates.length ? dates[dates.length - 1] : 'unknown';
}

export function parseModule(src) {
  return acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
}

function patternNames(p, out) {
  if (!p) return out;
  if (p.type === 'Identifier') out.push(p.name);
  else if (p.type === 'ObjectPattern') p.properties.forEach(q => patternNames(q.type === 'RestElement' ? q.argument : q.value, out));
  else if (p.type === 'ArrayPattern') p.elements.forEach(q => patternNames(q && q.type === 'RestElement' ? q.argument : q, out));
  else if (p.type === 'AssignmentPattern') patternNames(p.left, out);
  else if (p.type === 'RestElement') patternNames(p.argument, out);
  return out;
}

/**
 * Top-level declarations of the module.
 * kind: function | class | let | var | const. `start/end` cover the declaration (or declarator) source.
 */
export function topLevel(ast) {
  const decls = [];
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration' && node.id) {
      decls.push({ name: node.id.name, kind: 'function', start: node.start, end: node.end, node });
    } else if (node.type === 'ClassDeclaration' && node.id) {
      decls.push({ name: node.id.name, kind: 'class', start: node.start, end: node.end, node });
    } else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        for (const name of patternNames(d.id, [])) {
          decls.push({ name, kind: node.kind, start: d.start, end: d.end, node: d, init: d.init });
        }
      }
    }
  }
  return decls;
}

/**
 * Structural fingerprint of a source range: identifiers that are module-level names become G,
 * other identifiers L, string/template text S (unless keepStrings), property names and keywords stay.
 * Minifier renames and translation edits both disappear, so the same function in two builds matches.
 */
export function skeleton(src, topNames, { keepStrings = false } = {}) {
  const out = [];
  let prev = null;
  try {
    for (const tok of acorn.tokenizer(src, { ecmaVersion: 'latest', sourceType: 'module' })) {
      const t = tok.type.label;
      let v;
      if (t === 'name') {
        if (prev === '.' || prev === '?.') v = '.' + tok.value;
        else v = topNames.has(tok.value) ? 'G' : 'L';
      } else if (t === 'string' || t === 'template') v = keepStrings ? JSON.stringify(tok.value) : 'S';
      else if (t === 'num') v = String(tok.value);
      else if (t === 'regexp') v = 'R';
      else v = tok.type.keyword || t;
      out.push(v);
      prev = t === 'name' ? 'name' : (tok.type.label === '?.' ? '?.' : t);
    }
  } catch {
    return null;
  }
  return out;
}

/** Jaccard similarity of token 4-grams (cheap fuzzy match for changed functions). */
export function similarity(a, b) {
  const grams = arr => {
    const s = new Set();
    for (let i = 0; i + 4 <= arr.length; i++) s.add(arr.slice(i, i + 4).join('\u0001'));
    return s;
  };
  const A = grams(a), B = grams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

export function writeJsonJs(file, globalCall, data) {
  // file:// pages cannot fetch JSON, so data ships as a script that hands it to the loader
  fs.writeFileSync(file, `/* generated by wml tools — do not edit by hand */\n${globalCall}(${JSON.stringify(data, null, 1)});\n`);
}

export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}
