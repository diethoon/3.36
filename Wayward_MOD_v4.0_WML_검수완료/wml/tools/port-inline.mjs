// Port code that was pasted *inside* an old game module (it uses the game's minified names directly)
// into a WML mod: every free name that is a game binding is mapped to the current build and read/written
// through the WML engine (api.engine), so hooks and other mods still see the same functions.
//   node tools/port-inline.mjs --src code.js --old old-game.html --id h-status --name "H Status" [--desc …]
//        [--map-overrides overrides.json] [--fixes fixes.json] [--prelude file.js] [--post file.js] [--requires a,b] [--report]
// --old is the game build the code was written for (e.g. the 9-30 Korean build); the current build is
// Wayward_WML.html (English WML build = the vanilla game). Output: mods/<id>/mod.js and port/<id>.names.json.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { analyze } from 'eslint-scope';
import { args } from './lib.mjs';
import { indexBuild, nameMapper } from './names-lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const wmlDir = path.resolve(here, '..');
const a = args();
if (!a.src || !a.old || !a.id || !a.name) {
  console.error('usage: --src code.js --old old-game.html --id id --name "이름" [--desc …] [--map-overrides f.json] [--prelude f.js] [--post f.js] [--requires a,b]');
  process.exit(2);
}
const list = v => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);
const readMaybe = f => (f ? fs.readFileSync(path.resolve(f), 'utf8') : '');
const original = readMaybe(a.src).replace(/^﻿/, '');
// --fixes: JSON file [["exact text", "replacement"], …] applied to the source first (each must match once; a third item "all" replaces every match)
let src = original;
for (const [from, to, all] of (a.fixes ? JSON.parse(readMaybe(a.fixes)) : [])) {
  const n = src.split(from).length - 1;
  if (all === 'all' ? n < 1 : n !== 1) throw new Error(`fix must match ${all === 'all' ? 'at least' : 'exactly'} once (found ${n}): ${from.slice(0, 60)}`);
  src = all === 'all' ? src.split(from).join(to) : src.replace(from, () => to);
}
const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', ranges: true });
const scopes = analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });

console.error('reading game builds…');
const oldIx = indexBuild(path.resolve(a.old));
const newIx = indexBuild(a.cur ? path.resolve(a.cur) : path.join(wmlDir, '..', 'Wayward_WML.html'));

// free references that name a binding of the old game module
const refs = scopes.globalScope.through.filter(r => oldIx.names.has(r.identifier.name));
const used = [...new Set(refs.map(r => r.identifier.name))].sort();
const overrides = a['map-overrides'] ? JSON.parse(readMaybe(a['map-overrides'])) : {};
const rows = nameMapper(oldIx, newIx, overrides).resolve(used);
const map = Object.fromEntries(rows.filter(r => r.name).map(r => [r.old, r.name]));

// shorthand properties ({ re }) need "re: …" when rewritten
const shorthand = new Set();
// --live-props: object properties whose value is just a game name ({ g: g }) become getters, so they always
// return the current function (after other mods hooked or replaced it), not the one at setup time
const liveProps = new Map();   // identifier start -> Property node
walk.full(ast, n => {
  if (n.type !== 'Property' || n.value.type !== 'Identifier' || n.kind !== 'init' || n.method || n.computed) return;
  if (n.shorthand) shorthand.add(n.value.start);
  if (a['live-props']) liveProps.set(n.value.start, n);
});

const exprFor = old => {
  const cur = map[old];
  // "local:name" in the overrides = a stand-in defined by the prelude (for helpers the current game does not have)
  return cur && cur.startsWith('local:') ? cur.slice(6) : cur && /^[A-Za-z_$][\w$]*$/.test(cur) ? `__E.${cur}` : `__E[${JSON.stringify(cur || `__missing:${old}`)}]`;
};
const edits = [];
let liveCount = 0;
for (const r of refs) {
  const id = r.identifier, old = id.name, expr = exprFor(old);
  const prop = liveProps.get(id.start);
  if (prop && !(map[old] || '').startsWith('local:')) {
    const keySrc = src.slice(prop.key.start, prop.key.end);
    edits.push({ start: prop.start, end: prop.end, text: `get ${keySrc}() { return ${expr}; }` });
    liveCount++;
    continue;
  }
  edits.push({ start: id.start, end: id.end, text: shorthand.has(id.start) ? `${old}: ${expr}` : expr });
}
edits.sort((x, y) => y.start - x.start);
let out = src;
for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);

const missing = rows.filter(r => !r.name).map(r => r.old);
const unsure = rows.filter(r => r.name && r.score < 0.9);
const md5 = crypto.createHash('md5').update(original).digest('hex');
const meta = {
  id: a.id, name: a.name, version: a.version || '1.0.0', game: a.game || '>=2026-10-04',
  description: a.desc || '', requires: list(a.requires), loadAfter: list(a.after), conflicts: list(a.conflicts),
  // --role a,b: what job the mod does; the loader warns when two mods with the same role are on
  ...(a.role ? { role: list(a.role) } : {}),
};
const prelude = readMaybe(a.prelude), post = readMaybe(a.post);
const indent = s => s.trim().split('\n').map(l => '    ' + l).join('\n');
const mod = `// ${a.name} — WML 포팅판
// 원본: ${path.basename(a.src)} (md5 ${md5}) — 옛 게임 코드 안에 끼워 넣던 방식의 모드.${a.fixes ? `
// 원본에서 고친 곳: ${path.basename(a.fixes)}` : ''}
// 게임 이름 ${used.length}개를 지금 게임에 맞춰 바꿨어요 (${path.basename(a.old)} -> 현재). 대응표: port/${a.id}.names.json
${missing.length ? `// 지금 게임에 없는 이름 ${missing.length}개: ${missing.join(', ')} (쓰는 곳은 typeof 확인이 있거나 보정 코드가 대신해요)\n` : ''}// 이 파일은 tools/port-inline.mjs 로 만들었어요. 원본을 고치려면 원본을 고친 뒤 다시 만드세요.
WML.define({
${Object.entries(meta).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join('\n')}

  ${a.async ? 'async ' : ''}setup(__wmlApi) {
    const api = __wmlApi, __E = __wmlApi.engine;
${prelude ? `    // ---- 현재 게임에 맞춘 보정 (앞) ----\n${indent(prelude)}\n` : ''}    // ---- 원본 (게임 이름만 바꿈) ----
${out}
${post ? `    // ---- 현재 게임에 맞춘 보정 (뒤) ----\n${indent(post)}\n` : ''}  },
});
`;
acorn.parse(mod, { ecmaVersion: 'latest', sourceType: 'script' });
fs.mkdirSync(path.join(wmlDir, 'mods', a.id), { recursive: true });
fs.writeFileSync(path.join(wmlDir, 'mods', a.id, 'mod.js'), mod);
fs.mkdirSync(path.join(wmlDir, 'port'), { recursive: true });
fs.writeFileSync(path.join(wmlDir, 'port', `${a.id}.names.json`), JSON.stringify({ from: oldIx.g.version, to: newIx.g.version, rows }, null, 1));
console.log(JSON.stringify({ id: a.id, gameNames: used.length, mapped: Object.keys(map).length, liveProps: liveCount, unsure: unsure.length, missing, sizeKB: Math.round(mod.length / 1024) }, null, 1));
if (a.report) for (const r of [...unsure, ...rows.filter(x => !x.name)]) console.log(`${r.name ? 'CHECK' : 'MISS '} ${r.old} -> ${r.name || r.status} ${r.how || ''} ${r.score ?? ''}\n   old: ${r.oldHead}\n   new: ${r.newHead}`);
