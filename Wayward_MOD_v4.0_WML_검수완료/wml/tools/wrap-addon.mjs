// Wrap an old addon file (mod-manager style, uses globalThis.__WAYWARD_ADDON_API__) as a WML mod.
//   node tools/wrap-addon.mjs --src <addon.js> --id delivery --name "배달 부업" [--desc "…"] [--version 1.0.0]
//                             [--requires addon-compat,pregnancy] [--after a,b] [--conflicts x] [--role job] [--prelude file.js]
// The addon's code runs unchanged inside setup(), after the compatibility layer has built the bridge.
// --prelude: extra code put in front of the addon (fixes for the current game build).
// --post:    extra code put after the addon (e.g. register what a preload addon declared).
// --standalone: the addon does not use the bridge (no addon-compat requirement).
// --fixes:   JSON file [["exact text", "replacement"], …] applied to the addon source (each must match once; a third item "all" replaces every match).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import { args } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const a = args();
if (!a.src || !a.id || !a.name) { console.error('usage: --src addon.js --id id --name "이름" [--desc …] [--requires a,b]'); process.exit(2); }
let src = fs.readFileSync(path.resolve(a.src), 'utf8').replace(/^﻿/, '');
const original = src;
const fixes = a.fixes ? JSON.parse(fs.readFileSync(path.resolve(a.fixes), 'utf8')) : [];
for (const [from, to, all] of fixes) {
  const n = src.split(from).length - 1;
  if (all === 'all' ? n < 1 : n !== 1) throw new Error(`fix must match ${all === 'all' ? 'at least' : 'exactly'} once (found ${n}): ${from.slice(0, 60)}`);
  src = all === 'all' ? src.split(from).join(to) : src.replace(from, () => to);
}
acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script' });           // must be a plain script
const list = v => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);
const requires = [...new Set([...(a.standalone ? [] : ['addon-compat']), ...list(a.requires)])];
const prelude = a.prelude ? fs.readFileSync(path.resolve(a.prelude), 'utf8') : '';
const post = a.post ? (fs.existsSync(path.resolve(a.post)) ? fs.readFileSync(path.resolve(a.post), 'utf8') : String(a.post)) : '';
const md5 = crypto.createHash('md5').update(original).digest('hex');
const meta = {
  id: a.id, name: a.name, version: a.version || '1.0.0', game: a.game || '>=2026-10-04',
  description: a.desc || '', requires, loadAfter: list(a.after), conflicts: list(a.conflicts),
  // --role a,b: what job the mod does; the loader warns when two mods with the same role are on
  ...(a.role ? { role: list(a.role) } : {}),
};
const out = `// ${a.name} — WML 포팅판
// 원본: ${path.basename(a.src)} (md5 ${md5}), 9-30 한글판 모드 매니저용 애드온.${fixes.length ? `
// 원본에서 고친 곳 ${fixes.length}군데: ${path.basename(a.fixes)}` : ''}
// 원본 코드는 아래 setup() 안에서 그대로 실행돼요.${a.standalone ? '' : ' 게임 함수 연결은 addon-compat 모드가 해 줘요.'}
// 이 파일은 tools/wrap-addon.mjs 로 만들었어요. 원본을 고치려면 원본을 고친 뒤 다시 만드세요.
WML.define({
${Object.entries(meta).map(([k, v]) => `  ${k}: ${JSON.stringify(v)},`).join('\n')}

  setup(api) {
${prelude ? `    // ---- 현재 게임에 맞춘 보정 ----\n${prelude.trim().split('\n').map(l => '    ' + l).join('\n')}\n` : ''}    // ---- 원본 애드온 ----
${src}
${post ? `    // ---- 원본 뒤에 붙인 코드 ----\n${post.trim().split('\n').map(l => '    ' + l).join('\n')}\n` : ''}  },
});
`;
acorn.parse(out, { ecmaVersion: 'latest', sourceType: 'script' });
const dir = path.join(here, '..', 'mods', a.id);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'mod.js'), out);
console.log(`${a.id}: ${path.relative(path.join(here, '..'), path.join(dir, 'mod.js'))} (${(out.length / 1024).toFixed(1)} KB, requires ${requires.join(', ') || '-'})`);
