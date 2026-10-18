// Port an add-on that comes with a mod-manager manifest (bridge.manifest.json: find/replace patches on the
// game's own code) into a WML mod — without patching the game.
//   node tools/port-manifest.mjs --dir <addon folder> --id prompt-manager --name "프롬프트 관리자" [--desc …]
//        [--version x] [--requires a,b] [--after a,b] [--conflicts a,b] [--role r] [--fixes f.json] [--post f.js]
//        [--game ../Wayward_WML.html]
//
// How it works: the patches are applied to a copy of the game module here, and the tool works out which
// top-level declarations that changed. The mod then carries the patched source of those declarations only, and
// at load time compiles each one with the game's bindings in scope (api.engine through a `with` proxy, so other
// mods' hooks stay visible) and installs it with api.hook(name, { replace }). Code the patches add at module
// level becomes a new binding in that scope, or a statement run once during setup.
// Everything is tied to one game build: the mod warns and does nothing on another build (port it again).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import { readGame, parseModule, args } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const wmlDir = path.resolve(here, '..');
const a = args();
if (!a.dir || !a.id || !a.name) {
  console.error('usage: --dir <addon folder> --id id --name "이름" [--desc …] [--version x] [--requires a,b] [--fixes f.json] [--post f.js]');
  process.exit(2);
}
const list = v => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);
const dir = path.resolve(a.dir);
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'bridge.manifest.json'), 'utf8'));
const entryFile = path.join(dir, manifest.entry);
const original = fs.readFileSync(entryFile, 'utf8').replace(/^﻿/, '');
let addon = original;
const fixes = a.fixes ? JSON.parse(fs.readFileSync(path.resolve(a.fixes), 'utf8')) : [];
for (const [from, to, all] of fixes) {
  const n = addon.split(from).length - 1;
  if (all === 'all' ? n < 1 : n !== 1) throw new Error(`fix must match ${all === 'all' ? 'at least' : 'exactly'} once (found ${n}): ${from.slice(0, 60)}`);
  addon = all === 'all' ? addon.split(from).join(to) : addon.replace(from, () => to);
}
acorn.parse(addon, { ecmaVersion: 'latest', sourceType: 'script' });

// ---- the game build the patches are matched against
const gameFile = a.game ? path.resolve(a.game) : path.join(wmlDir, '..', 'Wayward_WML.html');
const g = readGame(gameFile);
const mod = g.module;
const ast = parseModule(mod);

// ---- pick each patch's variant: the one whose find text is in this build exactly once
const edits = [];
for (const [i, p] of (manifest.patches || []).entries()) {
  const want = p.count == null ? 1 : p.count;
  const hits = (p.oneOf || [p]).map((v, j) => ({ j, v, n: mod.split(v.find).length - 1 })).filter(c => c.n === want);
  if (!hits.length) throw new Error(`patch ${i} (${p.label}): no variant fits this build — the add-on does not support ${g.version}`);
  if (new Set(hits.map(c => c.v.replace)).size > 1) throw new Error(`patch ${i} (${p.label}): variants ${hits.map(c => c.j).join(',')} fit but replace differently`);
  const { v } = hits[0];
  let at = -1;
  for (let k = 0; k < want; k++) { at = mod.indexOf(v.find, at + 1); edits.push({ i, label: p.label, start: at, end: at + v.find.length, text: v.replace }); }
}
edits.sort((x, y) => x.start - y.start);
for (let i = 1; i < edits.length; i++) if (edits[i].start < edits[i - 1].end) throw new Error(`patches ${edits[i - 1].i} and ${edits[i].i} overlap`);

// ---- group the edits by the top-level statements they touch
const body = ast.body;
const touched = e => {
  const hit = body.filter(n => n.start < e.end && e.start < n.end);
  if (hit.length) return hit;
  const at = body.find(n => n.start === e.start || n.end === e.end);   // a pure insertion at a boundary
  if (at) return [at];
  throw new Error(`patch ${e.i} (${e.label}) is not inside a top-level statement`);
};
const clusters = [];
for (const e of edits) {
  const nodes = touched(e);
  const last = clusters[clusters.length - 1];
  if (last && body.indexOf(nodes[0]) <= last.lastIndex) { last.edits.push(e); last.lastIndex = Math.max(last.lastIndex, body.indexOf(nodes[nodes.length - 1])); }
  else clusters.push({ firstIndex: body.indexOf(nodes[0]), lastIndex: body.indexOf(nodes[nodes.length - 1]), edits: [e] });
}
// ---- what each cluster looks like after the edits
const names = new Set();
for (const n of body) {
  if ((n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') && n.id) names.add(n.id.name);
  else if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.id.type === 'Identifier') names.add(d.id.name);
}
const pieces = [];     // { kind: 'fn' | 'value' | 'init', name?, src }
const report = [];
for (const c of clusters) {
  const from = body[c.firstIndex].start, to = body[c.lastIndex].end;
  let text = mod.slice(from, to);
  for (const e of [...c.edits].sort((x, y) => y.start - x.start)) text = text.slice(0, e.start - from) + e.text + text.slice(e.end - from);
  let frag;
  try { frag = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module' }); }
  catch (err) { throw new Error(`patched code of ${body.slice(c.firstIndex, c.lastIndex + 1).length} statement(s) does not parse: ${err.message}`); }
  for (const n of frag.body) {
    const src = text.slice(n.start, n.end);
    if ((n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') && n.id) {
      const name = n.id.name;
      if (!names.has(name)) { pieces.push({ kind: 'value', name, src: `(${src})` }); report.push(`+ ${name} (new ${n.type === 'ClassDeclaration' ? 'class' : 'function'})`); continue; }
      if (src === mod.slice(...rangeOf(name))) continue;                       // untouched by the edits
      pieces.push({ kind: 'fn', name, src: `(${src})` });
      report.push(`~ ${name} (${src.length} bytes)`);
    } else if (n.type === 'VariableDeclaration') {
      for (const d of n.declarations) {
        if (d.id.type !== 'Identifier') throw new Error(`patched code declares a pattern (${text.slice(d.start, d.end).slice(0, 40)}…); not supported`);
        const init = d.init ? text.slice(d.init.start, d.init.end) : 'undefined';
        if (names.has(d.id.name)) throw new Error(`patch changes the game value ${d.id.name}; only functions can be replaced`);
        pieces.push({ kind: 'value', name: d.id.name, src: `(${init})` });
        report.push(`+ ${d.id.name} (new ${n.kind})`);
      }
    } else {
      pieces.push({ kind: 'init', src });
      report.push(`! run once: ${src.slice(0, 60).replace(/\s+/g, ' ')}…`);
    }
  }
}
function rangeOf(name) {
  for (const n of body) {
    if ((n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') && n.id && n.id.name === name) return [n.start, n.end];
    if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.id.type === 'Identifier' && d.id.name === name) return [n.start, n.end];
  }
  return [0, 0];
}

// ---- the mod
const md5 = crypto.createHash('md5').update(original).digest('hex');
const meta = {
  id: a.id, name: a.name, version: a.version || manifest.version || '1.0.0', game: a.game_range || `>=${g.version}`,
  description: a.desc || '', requires: list(a.requires), loadAfter: list(a.after), conflicts: list(a.conflicts),
  ...(a.role ? { role: list(a.role) } : {}),
};
const post = a.post ? fs.readFileSync(path.resolve(a.post), 'utf8') : '';
const indent = (s, n = 4) => s.trim().split('\n').map(l => ' '.repeat(n) + l).join('\n');
const out = `// ${a.name} — WML 포팅판 (모드 매니저 매니페스트)
// 원본: ${manifest.entry} ${manifest.version ? `v${manifest.version} ` : ''}(md5 ${md5}), bridge.manifest.json 의 게임 코드 패치 ${edits.length}군데.${fixes.length ? `
// 원본에서 고친 곳 ${fixes.length}군데: ${path.basename(a.fixes)}` : ''}
// 원본 애드온 코드는 setup() 안에서 그대로 실행돼요. 게임 코드는 고치지 않아요: 패치가 바뀌는 게임 함수만
// 고쳐진 모습으로 아래에 담아 두고, 게임 이름들이 보이는 자리에서 다시 만들어 api.hook(…, { replace })로 끼워요.
// 그래서 다른 모드가 같은 함수에 건 훅(before·around·after)도 그대로 작동해요.
// 게임 ${g.version} 전용이에요 (패치 글자가 그 판 코드예요). 다른 판에서는 알리고 아무것도 하지 않아요.
// 이 파일은 tools/port-manifest.mjs 로 만들었어요. 원본이나 매니페스트를 고치려면 그걸 고친 뒤 다시 만드세요.
WML.define({
${Object.entries(meta).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join('\n')}

  setup(api) {
    // ---- 원본 애드온 ----
${addon}
    // ---- 게임 코드 패치 (bridge.manifest.json ${edits.length}군데 → 바뀐 함수 ${pieces.filter(p => p.kind === 'fn').length}개) ----
    {
      const BUILD = ${JSON.stringify(g.version)};
      const PIECES = ${JSON.stringify(pieces, null, 1).split('\n').map((l, i) => (i ? '      ' + l : l)).join('\n')};
      if (api.game !== BUILD) api.warn(\`게임 \${api.game}에 맞는 패치가 없어요 (이 모드는 \${BUILD}용이에요). 창은 열리지만 프롬프트 규칙은 적용되지 않아요. 모드를 새 게임판으로 다시 포팅해야 해요.\`);
      else {
        // the game's own names, as the patched code expects to see them; a hooked function is seen hooked
        const extra = Object.create(null);
        const scope = new Proxy(Object.create(null), {
          has: () => true,
          get: (_t, k) => {
            if (typeof k === 'symbol') return undefined;                      // Symbol.unscopables and friends
            if (k in extra) return extra[k];
            try { if (k in api.engine) return api.engine[k]; } catch (_e) { /* not initialised */ }
            return globalThis[k];
          },
          set: (_t, k, v) => {
            if (k in extra) { extra[k] = v; return true; }
            try { if (k in api.engine) { api.engine[k] = v; return true; } } catch (_e) { /* a const */ }
            globalThis[k] = v;
            return true;
          },
        });
        const build = (src, what) => {
          try { return new Function('__wml', \`with(__wml){return \${src}}\`)(scope); }
          catch (e) { api.warn(\`게임 코드 \${what}를 준비하지 못했어요: \${e.message}\`); return undefined; }
        };
        for (const piece of PIECES) {
          if (piece.kind === 'value') { const v = build(piece.src, piece.name); if (v !== undefined) extra[piece.name] = v; continue; }
          if (piece.kind === 'init') { try { new Function('__wml', \`with(__wml){\${piece.src}}\`)(scope); } catch (e) { api.warn(\`게임 코드 준비 중 오류: \${e.message}\`); } continue; }
          const fn = build(piece.src, piece.name);
          if (typeof fn !== 'function') continue;
          try { api.hook(piece.name, { replace: fn }); }
          catch (e) { api.warn(\`게임 함수 \${piece.name}을(를) 바꾸지 못했어요: \${e.message}\`); }
        }
      }
    }
${post ? `    // ---- 원본 뒤에 붙인 코드 ----\n${indent(post)}\n` : ''}  },
});
`;
acorn.parse(out, { ecmaVersion: 'latest', sourceType: 'script' });
const outDir = path.join(wmlDir, 'mods', a.id);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'mod.js'), out);
console.error(report.join('\n'));
console.log(`${a.id}: mods/${a.id}/mod.js (${(out.length / 1024).toFixed(1)} KB, 패치 ${edits.length}군데, 바꾸는 함수 ${pieces.filter(p => p.kind === 'fn').length}개, 새 이름 ${pieces.filter(p => p.kind === 'value').length}개, 한 번 실행 ${pieces.filter(p => p.kind === 'init').length}개)`);
