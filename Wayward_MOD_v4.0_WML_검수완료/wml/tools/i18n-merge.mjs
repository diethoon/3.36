// Merge filled-in translation files into a language pack's custom.json.
//   node tools/i18n-merge.mjs --lang ko i18n/ko/todo-2026-10-04.json [more.json …]
// Each file is {"English": "translation"}. Empty values are skipped (still to do).
// A value equal to its English key means "keep English" and goes to custom.json "keep".
// Placeholders ({0},{1}…) must match the English key; mismatches are reported and skipped.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { args } from './lib.mjs';
import { placeholders } from './i18n-lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const a = args();
if (!a.lang || !a._.length) { console.error('usage: --lang ko file.json [file.json …]'); process.exit(2); }
const file = path.join(here, '..', 'i18n', a.lang, 'custom.json');
const custom = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
custom.strings ||= {};
custom.keep ||= [];
const keep = new Set(custom.keep);
const sameSlots = (k, v) => placeholders(k).sort().join() === placeholders(v).sort().join();
const report = { added: 0, changed: 0, kept: 0, empty: 0, badPlaceholders: [] };

for (const f of a._) {
  const data = JSON.parse(fs.readFileSync(path.resolve(f), 'utf8'));
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('_') || typeof v !== 'string') continue;
    if (v === '') { report.empty++; continue; }
    if (v === k) { if (!keep.has(k)) { keep.add(k); report.kept++; } continue; }
    if (!sameSlots(k, v)) { report.badPlaceholders.push(k.slice(0, 80)); continue; }
    if (custom.strings[k] === undefined) report.added++;
    else if (custom.strings[k] !== v) report.changed++;
    custom.strings[k] = v;
  }
}
custom.keep = [...keep].sort();
fs.writeFileSync(file, JSON.stringify(custom, null, 1) + '\n');
console.log(JSON.stringify(report, null, 1));
