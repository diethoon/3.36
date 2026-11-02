// Ids the game prints straight onto the screen (emotion, task, order, stage, outfit …).
//   node tools/i18n-ids.mjs --lang ko [--game ../Wayward_WML.html]
// Lists every id of those kinds found in the game and whether the language pack can show it
// translated (display table: auto {id,name} pairs + strings.json "labels" + custom.json display/words).
// Missing ones go to i18n/<lang>/todo-ids-<version>.json as {"id": ""}; fill in and copy into custom.json "display".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as walk from 'acorn-walk';
import { readGame, parseModule, args } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const a = args();
const lang = a.lang || 'ko';
const langDir = path.join(here, '..', 'i18n', lang);
const gameFile = a.game ? path.resolve(a.game) : (() => {
  const dir = path.join(here, '..', '..');
  const v = fs.readdirSync(dir).filter(f => /^wayward-\d{4}-\d{2}-\d{2}\.html$/.test(f)).sort().pop();
  return path.join(dir, v || 'Wayward_WML.html');
})();
const g = readGame(gameFile);
const ast = parseModule(g.module);

// properties whose id value is printed (directly or with "_" -> " ")
const SHOWN = ['emotion', 'currentTask', 'order', 'stage', 'serviceId', 'outfit', 'task', 'mood', 'drive', 'need', 'feeling'];
const ids = new Map();   // id -> Set(kind)
const add = (kind, v) => { if (typeof v === 'string' && /^[a-z][a-z_]{2,}$/.test(v)) { (ids.get(v) || ids.set(v, new Set()).get(v)).add(kind); } };
const lit = n => n && n.type === 'Literal' && typeof n.value === 'string';
walk.full(ast, n => {
  if (n.type === 'Property' && !n.computed) {
    const k = n.key.name || n.key.value;
    if (SHOWN.includes(k) && lit(n.value)) add(k, n.value.value);
  } else if (n.type === 'BinaryExpression' && /^[!=]==?$/.test(n.operator)) {
    const m = e => e.type === 'MemberExpression' && !e.computed && SHOWN.includes(e.property.name);
    if (m(n.left) && lit(n.right)) add(n.left.property.name, n.right.value);
    if (m(n.right) && lit(n.left)) add(n.right.property.name, n.left.value);
  }
});
// emotion ids also live as keys of the emotion weight table ({ecstasy:1.2, …, devotion:.2})
walk.full(ast, n => {
  if (n.type !== 'ObjectExpression' || n.properties.length < 10) return;
  const keys = n.properties.filter(p => p.type === 'Property' && !p.computed).map(p => p.key.name || p.key.value);
  if (keys.includes('devotion') && keys.includes('shame') && keys.includes('ecstasy')) keys.forEach(k => add('emotion', k));
});

const pack = JSON.parse(fs.readFileSync(path.join(langDir, 'strings.json'), 'utf8'));
const custom = fs.existsSync(path.join(langDir, 'custom.json')) ? JSON.parse(fs.readFileSync(path.join(langDir, 'custom.json'), 'utf8')) : {};
global.window = {};
const dispFile = path.join(langDir, 'display.js');
if (fs.existsSync(dispFile)) new Function(fs.readFileSync(dispFile, 'utf8'))();
const display = window.WML_I18N_DISPLAY || {}, words = window.WML_I18N_WORDS || {};
const has = id => display[id] || display[id.replace(/_/g, ' ')] || words[id];

const missing = {}, rows = [];
for (const [id, kinds] of [...ids].sort()) {
  const ok = has(id);
  rows.push(`${ok ? 'ok  ' : 'MISS'} ${[...kinds].join(',').padEnd(18)} ${id}${ok ? ' -> ' + ok : ''}`);
  if (!ok) missing[id] = '';
}
if (a.verbose) console.log(rows.join('\n'));
const out = path.join(langDir, `todo-ids-${g.version}.json`);
fs.writeFileSync(out, JSON.stringify(missing, null, 1));
console.log(JSON.stringify({ ids: ids.size, translated: ids.size - Object.keys(missing).length, missing: Object.keys(missing).length, todo: path.basename(out) }, null, 1));
