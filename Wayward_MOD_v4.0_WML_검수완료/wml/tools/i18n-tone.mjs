// Story-line colors for a translated build (development tool).
//   node tools/i18n-tone.mjs [--lang ko] [--game <English build or original html>] [--out <file>]
// The game colors each story line by testing its ENGLISH text with a set of regexes (sex, intimate, flirt, rude,
// gold, kind, menial, system, thought; anything else is "neutral"). A build translated at build time hands the
// translated text to those tests, so every line comes out "neutral" (the plain light color).
// This tool runs the game's own tests on the English source of every translated line (strings.json + custom.json,
// and the patron speech-level variants of voice.json) and writes the table the ko-log-colors mod reads:
//   fixed: { translated line: tone }                 lines without tokens
//   rules: [[translated template, tone], …]          lines with tokens the game fills in ({p}, {w}, {0}, {gold} …)
// A "neutral" entry is kept only where it stops a shorter template from coloring that line by mistake.
// Output: wml/mods/ko-log-colors/files/tones-<game>.js (window.WML_KO_TONES).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as walk from 'acorn-walk';
import { readGame, parseModule, args } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const WML = path.resolve(here, '..');
const GAME_DIR = path.resolve(WML, '..');
const a = args();
const lang = a.lang || 'ko';

// ---- the English game: the original if it is here, else the English build (it embeds the original)
const originals = fs.readdirSync(GAME_DIR).filter(f => /^wayward-\d{4}-\d{2}-\d{2}\.html$/.test(f)).sort();
const gameFile = a.game ? path.resolve(a.game) : originals.length ? path.join(GAME_DIR, originals.pop()) : path.join(GAME_DIR, 'Wayward_WML.html');
const game = readGame(gameFile);
const src = game.module;

// ---- the tone tests: an object { sex: /…/i, intimate: /…/i, …, thought: /…/i }
let testsName = null, tests = null;
walk.simple(parseModule(src), {
  VariableDeclarator(n) {
    if (tests || !n.init || n.init.type !== 'ObjectExpression' || n.id.type !== 'Identifier') return;
    const props = n.init.properties.filter(p => p.type === 'Property' && p.value && p.value.regex);
    const keys = props.map(p => p.key.name || p.key.value);
    if (!keys.includes('sex') || !keys.includes('thought') || props.length < 6) return;
    testsName = n.id.name;
    tests = Object.fromEntries(props.map(p => [p.key.name || p.key.value, new RegExp(p.value.regex.pattern, p.value.regex.flags.replace('g', ''))]));
  },
});
if (!tests) throw new Error(`${gameFile}: 이야기 줄 색을 정하는 정규식 묶음을 찾지 못했어요`);
// the order the game tries them in: X.sex.test(e)?"sex":X.intimate.test(e)?"intimate":…:"neutral"
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const chainAt = src.indexOf(`${testsName}.sex.test(`);
const chainEnd = src.indexOf('"neutral"', chainAt);
const order = [...new Set([...src.slice(chainAt, chainEnd).matchAll(new RegExp(`${esc(testsName)}\\.(\\w+)\\.test\\(`, 'g'))].map(m => m[1]))];
if (chainAt < 0 || chainEnd < 0 || order.length < 6) throw new Error('색 정하는 순서를 찾지 못했어요');
const classify = text => { for (const k of order) if (tests[k].test(text)) return k; return 'neutral'; };

// ---- translated lines
const langDir = path.join(WML, 'i18n', lang);
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const pack = readJson(path.join(langDir, 'strings.json'));
const custom = fs.existsSync(path.join(langDir, 'custom.json')) ? readJson(path.join(langDir, 'custom.json')) : {};
const table = { ...pack.strings, ...(custom.strings || {}) };
const forms = new Map();                                    // translated line → Set of English sources
const addForm = (ko, en) => { if (typeof ko !== 'string' || !ko) return; if (!forms.has(ko)) forms.set(ko, new Set()); forms.get(ko).add(en); };
const byKorean = new Map();
for (const [en, ko] of Object.entries(table)) { if (typeof ko !== 'string') continue; addForm(ko, en); if (!byKorean.has(ko)) byKorean.set(ko, en); }
// patron speech levels: every variant is the same line as its base
let voiceForms = 0;
const voiceFile = path.join(langDir, 'voice.json');
if (fs.existsSync(voiceFile)) {
  for (const e of Object.values(readJson(voiceFile).entries || {})) {
    const en = e && byKorean.get(e.b);
    if (!en) continue;
    for (const v of e.v || []) { addForm(v, en); voiceForms++; }
  }
}

// ---- tone of an English source: tokens filled with a name, or a number where the token is an amount
const TOKEN = /\{[A-Za-z0-9]+\}|%[a-z]\b/g;
const AMOUNT = new Set(['gold', 'price', 'cost', 'refund', 'days', 'n', 'age', 'portions', 'count', 'amount', 'tip', 'rent', 'debt']);
const fill = (en, numbers) => en.replace(TOKEN, t => {
  const k = t.replace(/[{}%]/g, '');
  if (/^\d+$/.test(k)) return numbers ? '12' : 'Tomas';
  return AMOUNT.has(k) ? '12' : 'Tomas';
});
function toneOf(en) {
  const x = classify(fill(en, false)), y = /\{\d+\}/.test(en) ? classify(fill(en, true)) : x;
  if (x === y) return x;
  if (x === 'neutral') return y;
  if (y === 'neutral') return x;
  return null;                                              // the tests disagree: leave the line alone
}

// ---- entries
const fixed = {}, templates = [];
let ambiguous = 0;
for (const [ko, ens] of forms) {
  const tones = new Set([...ens].map(toneOf));
  const tone = tones.size === 1 ? [...tones][0] : null;
  if (tone === null) { ambiguous++; }
  if (TOKEN.test(ko)) {
    TOKEN.lastIndex = 0;
    const parts = ko.split(TOKEN);
    const literal = parts.join('');
    if (literal.replace(/[\s"'.,!?…·:;()\-—“”‘’]/g, '').length < 4) continue;   // "{0}: {1}" — too little to match on
    templates.push({ ko, tone, parts, len: literal.length, re: new RegExp(`^${parts.map(esc).join('([\\s\\S]+?)')}$`) });
  } else {
    fixed[ko] = tone;
  }
  TOKEN.lastIndex = 0;
}
// the runtime picks the most specific matching template (longest literal text); same length, different tones → none
templates.sort((p, q) => q.len - p.len);
const colored = templates.filter(t => t.tone !== 'neutral');
const sampleOf = ko => ko.replace(TOKEN, 'Tomas');
function resolve(text, list) {
  let best = -1;
  const tones = new Set();
  for (const r of list) {
    if (r.len < best) break;
    if (!r.re.test(text)) continue;
    if (r.len > best) { tones.clear(); best = r.len; }
    tones.add(r.tone);
  }
  return tones.size === 1 ? [...tones][0] : tones.size ? null : undefined;
}
// keep a neutral (or undecided) entry only where a colored template would otherwise claim it
const keptRules = templates.filter(t => t.tone && t.tone !== 'neutral');
let blockers = 0;
for (const t of templates) {
  if (t.tone && t.tone !== 'neutral') continue;
  const hit = resolve(sampleOf(t.ko), colored.filter(c => c.len <= t.len));
  if (hit) { keptRules.push(t); blockers++; }
}
const keptFixed = {};
for (const [ko, tone] of Object.entries(fixed)) {
  if (tone && tone !== 'neutral') { keptFixed[ko] = tone; continue; }
  if (resolve(ko, colored)) { keptFixed[ko] = tone || 'neutral'; blockers++; }
}
keptRules.sort((p, q) => q.len - p.len);

// ---- check: every colored line comes back with its own color
let selfOk = 0, selfBad = 0;
for (const t of templates.filter(x => x.tone && x.tone !== 'neutral')) {
  const r = resolve(sampleOf(t.ko), keptRules);
  if (r === t.tone) selfOk++; else selfBad++;
}

// ---- write
const out = path.resolve(a.out || path.join(WML, 'mods', 'ko-log-colors', 'files', `tones-${game.version}.js`));
fs.mkdirSync(path.dirname(out), { recursive: true });
const data = {
  game: game.version, lang, order,
  fixed: keptFixed,
  rules: keptRules.map(r => [r.ko, r.tone || 'neutral']),
};
fs.writeFileSync(out, `/* 이야기 줄 색 표 — tools/i18n-tone.mjs 로 만들었어요 (${lang}, 게임 ${game.version}). 손으로 고치지 마세요. */\n`
  + `window.WML_KO_TONES = window.WML_KO_TONES || {};\nwindow.WML_KO_TONES[${JSON.stringify(game.version)}] = ${JSON.stringify(data)};\n`);
const count = obj => Object.values(obj).reduce((m, v) => { m[v] = (m[v] || 0) + 1; return m; }, {});
console.log(JSON.stringify({
  game: game.version, from: path.basename(gameFile), order,
  lines: forms.size, voiceForms, ambiguous,
  fixed: { kept: Object.keys(keptFixed).length, tones: count(keptFixed) },
  rules: { kept: keptRules.length, tones: count(Object.fromEntries(keptRules.map((r, i) => [i, r.tone || 'neutral']))) },
  blockers, selfCheck: { ok: selfOk, differs: selfBad },
  out, size: `${(fs.statSync(out).size / 1024).toFixed(0)}KB`,
}, null, 1));
