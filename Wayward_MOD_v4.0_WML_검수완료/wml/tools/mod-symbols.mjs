// Mod symbols from the command line (the MCP server has the same: symbol_add with mod, symbols_check, symbols_request).
//   node tools/mod-symbols.mjs --mod <id> --add "addFeeling=we,moveWife|heroineMoveTo=pt" [--doc "…"] [--optional]
//        add or update symbols: the name for this game version + a recipe checked on every built game;
//        "name|alias=raw" also gives the same binding other names (aliases)
//   node tools/mod-symbols.mjs --mod <id> --check        every symbol of the mod against the built games
//   node tools/mod-symbols.mjs --mod <id> --port         after a game update: record the new names the recipes find
//   node tools/mod-symbols.mjs --mod <id> --remove name[,name]
//   node tools/mod-symbols.mjs --mod <id> --request [file.md]   a request to move symbols into the shared table
// Works on wml/mods/<id>/mod.js (the WML.define({ symbols: { … } }) block). Build the game first
// (tools/build.mjs, and --lang ko for the Korean build) so the recipes are checked on what players run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { args } from './lib.mjs';
import { currentBuilds, sharedSymbols, addModSymbols, checkModSymbols, portModSymbols, requestDoc, readModSymbols, writeModSymbols } from './symbols-lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const wmlDir = path.resolve(here, '..');
const a = args();
if (!a.mod || !(a.add || a.check || a.port || a.remove || a.request)) {
  console.error('usage: --mod <id> (--add "name=raw,…" [--doc …] [--optional] | --check | --port | --remove name | --request [file.md])');
  process.exit(2);
}
const file = path.join(wmlDir, 'mods', a.mod, 'mod.js');
if (!fs.existsSync(file)) { console.error(`${file} not found`); process.exit(1); }
let src = fs.readFileSync(file, 'utf8');
if (/이 파일은 tools\/[\w-]+\.mjs 로 만들었어요/.test(src.slice(0, 1500))) console.error('! this is a generated port: put symbols in its port files, or they are lost on the next regeneration');
const ctx = { ...currentBuilds(path.join(wmlDir, '..')) };
ctx.shared = sharedSymbols(wmlDir, ctx.game);
const show = rows => { for (const r of rows) console.log(`${r.ok ? 'ok ' : 'NO '} ${String(r.name).padEnd(28)} ${r.raw ? String(r.raw).padEnd(6) : ''} ${r.note || (r.notes || []).join(' · ')}`); };
console.error(`game ${ctx.game}, builds: ${ctx.builds.map(b => b.label).join(', ')}`);

if (a.add) {
  const items = String(a.add).split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const [names, raw] = s.split('=').map(x => x && x.trim());
    const [name, ...aliases] = (names || '').split('|').map(x => x.trim()).filter(Boolean);
    return { name, raw, aliases, doc: typeof a.doc === 'string' ? a.doc : undefined, optional: a.optional ? true : undefined };
  });
  const r = addModSymbols(src, items, ctx);
  src = r.src; show(r.report);
}
if (a.remove) {
  const sym = readModSymbols(src);
  for (const n of String(a.remove).split(',').map(s => s.trim())) { if (sym[n]) { delete sym[n]; console.log(`removed ${n}`); } else console.log(`no symbol ${n}`); }
  src = writeModSymbols(src, sym);
}
if (a.port) { const r = portModSymbols(src, ctx); src = r.src; show(r.report); }
if (a.add || a.remove || a.port) fs.writeFileSync(file, src);
if (a.check) { const rows = checkModSymbols(src, ctx); show(rows); if (rows.some(r => !r.ok && !r.optional)) process.exitCode = 1; }
if (a.request) {
  const doc = requestDoc(a.mod, src, ctx);
  if (typeof a.request === 'string') { fs.writeFileSync(path.resolve(a.request), doc); console.log(`written ${a.request}`); } else console.log(doc);
}
