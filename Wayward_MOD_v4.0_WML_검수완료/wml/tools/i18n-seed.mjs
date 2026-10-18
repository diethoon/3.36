// Seed a language pack from an existing translated build.
//   node tools/i18n-seed.mjs --en ../wayward-2026-10-04.html --tr ../Wayward_MOD_v3.41.html --lang ko
//   --out <folder>: write the pack there instead of wml/i18n/<lang> (to read another translation as a
//   reference without touching ours, e.g. for tools/i18n-voice.mjs --ref)
// The translated build may come from a different minifier run (other short names), so declarations
// are matched by structure (strings ignored), then the literals inside each matched pair are aligned.
// The translation patch's runtime tables (English source -> forms) are absorbed as well.
// Only text is taken — code that exists only in the translated build (cheats, extras) is never copied.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as walk from 'acorn-walk';
import { readGame, parseModule, topLevel, skeleton, similarity, args } from './lib.mjs';
import { collectTexts, codeValues, units, stringPlaces, placeholders, fnv, STRICT_CODE_PROPS } from './i18n-lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const a = args();
if (!a.en || !a.tr || !a.lang) { console.error('usage: --en english.html --tr translated.html --lang ko'); process.exit(2); }
const SCRIPT = { ko: /[가-힣]/, ja: /[぀-ヿ]/, zh: /[一-鿿]/ }[a.lang] || /[^\x00-\x7f]/;
const isTr = s => SCRIPT.test(s);
const t0 = Date.now();
const log = m => console.error(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

const en = readGame(a.en), tr = readGame(a.tr);
const enAst = parseModule(en.module), trAst = parseModule(tr.module);
const enDecls = topLevel(enAst), trDecls = topLevel(trAst).filter(d => !/^(ko|u\d+_|mod\d+|__wml)/.test(d.name));
const enTop = new Set(enDecls.map(d => d.name)), trTop = new Set(topLevel(trAst).map(d => d.name));
log(`parsed: en ${enDecls.length} decls, tr ${trDecls.length} decls`);

const enUnits = units(enAst, en.module);
const enTexts = collectTexts(enAst, en.module, enUnits);
const lidByStart = new Map(stringPlaces(enAst, enUnits).filter(p => !STRICT_CODE_PROPS.has(p.prop)).map(p => [p.start, p.lid]));
const guarded = codeValues(enAst);
const textByStart = new Map(enTexts.map(t => [t.start, t]));

// literals (strings + whole templates) per declaration, in source order
function literalsByDecl(ast, src, decls) {
  const out = decls.map(() => []);
  const starts = decls.map(d => d.start);
  const find = pos => { let lo = 0, hi = decls.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (starts[m] <= pos) { r = m; lo = m + 1; } else hi = m - 1; } return r >= 0 && pos < decls[r].end ? r : -1; };
  walk.full(ast, n => {
    let lit = null;
    if (n.type === 'Literal' && typeof n.value === 'string') lit = { start: n.start, kind: 'string', value: n.value };
    else if (n.type === 'TemplateLiteral') {
      const quasis = n.quasis.map(q => q.value.cooked ?? q.value.raw);
      lit = { start: n.start, end: n.end, kind: 'template', value: quasis.join('\u0000'), quasis, exprs: n.expressions.map(e => src.slice(e.start, e.end)) };
    }
    if (!lit) return;
    const i = find(n.start);
    if (i >= 0) out[i].push(lit);
  });
  for (const l of out) l.sort((x, y) => x.start - y.start);
  return out;
}
const enLits = literalsByDecl(enAst, en.module, enDecls);
const trLits = literalsByDecl(trAst, tr.module, trDecls);
const enHasText = enLits.map(ls => ls.length > 0);
log('literals collected');

// --- 1. match declarations by structure -------------------------------------------------------
const skel = (src, d, top) => skeleton(src.slice(d.start, d.end), top) || [];
const enSk = enDecls.map(d => skel(en.module, d, enTop));
const trSk = trDecls.map(d => skel(tr.module, d, trTop));
const hashOf = sk => fnv(sk.join(' '));
const enH = enSk.map(hashOf), trH = trSk.map(hashOf);
const trByHash = new Map();
trH.forEach((h, j) => { const l = trByHash.get(h) || []; l.push(j); trByHash.set(h, l); });
const enCount = new Map(); enH.forEach(h => enCount.set(h, (enCount.get(h) || 0) + 1));

const match = new Array(enDecls.length).fill(-1);
let exact = 0;
enH.forEach((h, i) => { const l = trByHash.get(h); if (l && l.length === 1 && enCount.get(h) === 1) { match[i] = l[0]; exact++; } });
// keep only anchors that agree with bundle order (longest increasing run of tr positions)
{
  const idx = match.map((j, i) => [i, j]).filter(([, j]) => j >= 0);
  const tails = [], prev = new Array(idx.length).fill(-1), tailIdx = [];
  idx.forEach(([, j], k) => {
    let lo = 0, hi = tails.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (tails[m] < j) lo = m + 1; else hi = m; }
    tails[lo] = j; tailIdx[lo] = k; prev[k] = lo > 0 ? tailIdx[lo - 1] : -1;
  });
  const keep = new Set();
  for (let k = tailIdx[tails.length - 1]; k >= 0; k = prev[k]) keep.add(k);
  idx.forEach(([i], k) => { if (!keep.has(k)) { match[i] = -1; exact--; } });
}
log(`exact structural matches: ${exact}`);

// repeated shapes (same skeleton more than once): pair them in order between anchors
const usedTr = new Set(match.filter(j => j >= 0));
const anchorsBefore = i => { for (let k = i - 1; k >= 0; k--) if (match[k] >= 0) return match[k]; return -1; };
const anchorsAfter = i => { for (let k = i + 1; k < match.length; k++) if (match[k] >= 0) return match[k]; return trDecls.length; };
let ordered = 0, fuzzy = 0;
for (let i = 0; i < enDecls.length; i++) {
  if (match[i] >= 0 || !enHasText[i]) continue;
  const lo = anchorsBefore(i), hi = anchorsAfter(i);
  const same = (trByHash.get(enH[i]) || []).filter(j => j > lo && j < hi && !usedTr.has(j));
  if (same.length) { match[i] = same[0]; usedTr.add(same[0]); ordered++; continue; }
  // changed declaration: best similar one inside the window
  let best = -1, bestS = 0.45;
  const lenE = enSk[i].length;
  for (let j = lo + 1; j < hi && j - lo < 600; j++) {
    if (usedTr.has(j)) continue;
    const lenT = trSk[j].length;
    if (!lenT || lenT < lenE * 0.5 || lenT > lenE * 2.2) continue;
    if (trDecls[j].kind === 'function' !== (enDecls[i].kind === 'function')) continue;
    const s = similarity(enSk[i], trSk[j]);
    if (s > bestS) { bestS = s; best = j; }
  }
  if (best >= 0) { match[i] = best; usedTr.add(best); fuzzy++; }
}
log(`ordered repeats: ${ordered}, similar: ${fuzzy}`);

// --- 2. align literals inside matched pairs ----------------------------------------------------
const sig = l => l.kind + ':' + l.value;
const noise = l => l.kind === 'string' && /^\d+:\d+$/.test(l.value); // translation-patch voice ids
const exprSk = s => (skeleton(s, enTop) || []).join(' ');
const exprSkTr = s => (skeleton(s, trTop) || []).join(' ');

function trKeyFor(enItem, t) {
  if (enItem.kind === 'string' || enItem.exprs.length === 0) return t.kind === 'string' ? t.value : (t.exprs.length === 0 ? t.quasis[0] : null);
  if (t.kind !== 'template') return null;
  const enS = enItem.exprs.map(exprSk), used = new Set();
  let key = '';
  for (let i = 0; i < t.quasis.length; i++) {
    if (/\{\d+\}/.test(t.quasis[i])) return null;
    key += t.quasis[i];
    if (i >= t.exprs.length) continue;
    const s = exprSkTr(t.exprs[i]);
    let idx = !used.has(i) && enS[i] === s ? i : enS.findIndex((e, k) => !used.has(k) && e === s);
    if (idx < 0 && t.exprs.length === enItem.exprs.length && !used.has(i)) idx = i;
    if (idx < 0) return null;
    used.add(idx);
    key += `{${idx}}`;
  }
  return used.size === enItem.exprs.length || placeholders(key).length ? key : null;
}

// LCS on literal values (code literals and untranslated text stay identical and act as anchors)
function align(A, B) {
  const n = A.length, m = B.length;
  if (n * m > 25e6) return null;
  const sa = A.map(sig), sb = B.map(sig);
  const dp = new Uint16Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i * (m + 1) + j] = sa[i] === sb[j] ? dp[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(dp[(i + 1) * (m + 1) + j], dp[i * (m + 1) + j + 1]);
  const pairs = []; // [i, j] equal anchors
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (sa[i] === sb[j]) { pairs.push([i, j]); i++; j++; }
    else if (dp[(i + 1) * (m + 1) + j] >= dp[i * (m + 1) + j + 1]) i++; else j++;
  }
  return pairs;
}

const votes = new Map();   // enKey -> Map(translated -> count)
const ctxPairs = [];       // { ctx, key, value|null }
let pairedLits = 0, keptEnglish = 0, gapsSkipped = 0, declsUsed = 0, extraPlaces = 0;
const extra = {};
const vote = (key, val) => { const m = votes.get(key) || new Map(); m.set(val, (m.get(val) || 0) + 1); votes.set(key, m); };

for (let i = 0; i < enDecls.length; i++) {
  const j = match[i];
  if (j < 0 || !enHasText[i]) continue;
  declsUsed++;
  const A = enLits[i], B = trLits[j].filter(l => !noise(l));
  const pairs = align(A, B);
  if (!pairs) { gapsSkipped++; continue; }
  const bounds = [[-1, -1], ...pairs, [A.length, B.length]];
  for (let k = 0; k + 1 < bounds.length; k++) {
    const [ai, bj] = bounds[k], [ai2, bj2] = bounds[k + 1];
    if (ai >= 0 && ai < A.length) {                 // identical literal: text kept as English here
      const t = textByStart.get(A[ai].start);
      if (t) { ctxPairs.push({ ctx: t.ctx, key: t.key, value: null }); keptEnglish++; }
    }
    const ga = A.slice(ai + 1, ai2), gb = B.slice(bj + 1, bj2);
    if (!ga.length) continue;
    if (ga.length !== gb.length) { gapsSkipped++; continue; }
    ga.forEach((e, q) => {
      const t = textByStart.get(e.start), b = gb[q];
      if (!t) {                                       // id-looking word the reference still translated here
        if (e.kind === 'string' && b.kind === 'string' && isTr(b.value) && lidByStart.has(e.start)) { extra[lidByStart.get(e.start)] = b.value; extraPlaces++; }
        return;
      }
      if (!isTr(b.value) && !(b.kind === 'string' && b.value === '')) return;  // '' = folded into a neighbour
      const val = trKeyFor(t, b);
      if (val == null) return;
      vote(t.key, val);
      ctxPairs.push({ ctx: t.ctx, key: t.key, value: val });
      pairedLits++;
    });
  }
}
log(`paired ${pairedLits} literals in ${declsUsed} declarations`);

// --- 3. runtime tables of the translation patch -------------------------------------------------
const strings = {}, plain = {}, contexts = {};
for (const [key, m] of votes) strings[key] = [...m].sort((x, y) => y[1] - x[1])[0][0];
let fromTables = 0;
const toKey = s => String(s).replace(/⟦(\d+)⟧/g, '{$1}');
for (const d of topLevel(trAst)) {
  if (!/^ko[A-Z]\w*Data\d+$/.test(d.name) || !d.init) continue;
  let data;
  try { data = JSON.parse(tr.module.slice(d.init.start, d.init.end)); } catch { continue; }
  const rows = [];
  if (Array.isArray(data)) rows.push(...data);
  else for (const v of Object.values(data)) if (Array.isArray(v)) rows.push(...v);
  for (const r of rows) {
    if (!r || typeof r.source !== 'string') continue;
    const forms = (Array.isArray(r.forms) ? r.forms : [r.translation]).filter(f => typeof f === 'string' && isTr(f));
    if (!forms.length) continue;
    const key = toKey(r.source);
    if (!strings[key]) { strings[key] = toKey(forms[0]); fromTables++; }
    if (forms[1] && forms[1] !== forms[0]) plain[key] = toKey(forms[1]);
  }
}

// final-consonant table for names that stay in English (Korean particles depend on how a name ends)
// the translation patch's id -> name tables ({emotion:{devotion:"헌신"}, task:{…}, order:{…}}):
// the game prints these ids on screen as they are, so they become on-screen labels
let labels = null;
{
  const at = tr.module.search(/\{"[a-z]+":\{"[a-z_]+":"[^"]*"[^{}]*\},"[a-z]+":\{/);
  for (let from = at; from >= 0 && !labels; from = tr.module.slice(from + 1).search(/\{"[a-z]+":\{"[a-z_]+":"/) + from + 1) {
    let depth = 0, e = from, q = null;
    for (; e < tr.module.length; e++) {
      const c = tr.module[e];
      if (q) { if (c === '\\') e++; else if (c === q) q = null; continue; }
      if (c === '"') q = c; else if (c === '{') depth++; else if (c === '}' && --depth === 0) break;
    }
    try {
      const obj = JSON.parse(tr.module.slice(from, e + 1));
      if (obj.emotion && Object.values(obj).every(v => v && typeof v === 'object')) labels = obj;
    } catch {}
    if (from > tr.module.length - 10) break;
  }
}

let finals = null;
{
  const m = /\bkoNameTails\d+\s*=\s*(\{[^{}]*\})/.exec(tr.module);
  if (m) try { finals = JSON.parse(m[1]); } catch {}
}

// per-place entries: where a place disagrees with the default, and every translated place of a
// value the code also relies on (those are only translated where the reference translation did)
let guardedPlaces = 0;
for (const p of ctxPairs) {
  const def = strings[p.key];
  if (p.value === null) continue;   // left English there by the reference: usually an oversight; real code values are guarded instead
  else if (p.value !== def || guarded.has(p.key)) { contexts[p.ctx] = p.value; if (guarded.has(p.key)) guardedPlaces++; }
}
const badPh = Object.entries(strings).filter(([k, v]) => placeholders(v).some(n => !placeholders(k).includes(n)));
for (const [k] of badPh) delete strings[k];

// --- 4. report -----------------------------------------------------------------------------------
const enKeys = new Map();
for (const t of enTexts) enKeys.set(t.key, (enKeys.get(t.key) || 0) + 1);
const keptSet = new Set(ctxPairs.filter(p => p.value === null).map(p => p.key));
const keep = [...enKeys.keys()].filter(k => !strings[k] && keptSet.has(k)).sort();
const missing = [...enKeys.keys()].filter(k => !strings[k] && !keptSet.has(k));
const guardedKeys = [...enKeys.keys()].filter(k => strings[k] && guarded.has(k));
const outDir = a.out ? path.resolve(a.out) : path.join(here, '..', 'i18n', a.lang);
fs.mkdirSync(outDir, { recursive: true });
const pack = {
  lang: a.lang,
  game: en.version,
  seededFrom: path.basename(a.tr),
  note: 'strings: English -> translation ({0},{1} = the original ${…} parts, may be reordered; {p}/{w} are game tokens, keep them). contexts: per-place overrides (null = keep English there). extra: id-looking words translated at one exact place. plain: alternative plain-speech forms. keep: left in English by the reference translation.',
  strings, contexts, extra, plain, keep, labels,
};
fs.writeFileSync(path.join(outDir, 'strings.json'), JSON.stringify(pack, null, 1));
if (finals) {
  // name -> final consonant index (0 none, 8 ㄹ, other = has one); read by the language runtime
  fs.writeFileSync(path.join(outDir, 'finals.js'), `/* generated by tools/i18n-seed.mjs — add names freely */\nwindow.WML_I18N_FINALS=${JSON.stringify(finals, null, 0)};\n`);
}
console.log(JSON.stringify({
  englishTextItems: enTexts.length, uniqueEnglishTexts: enKeys.size,
  exactDecls: exact, orderedDecls: ordered, similarDecls: fuzzy, declarationsUsed: declsUsed,
  pairedInPlace: pairedLits, keptEnglishInPlace: keptEnglish, gapsSkipped, addedFromTables: fromTables,
  translatedUnique: Object.keys(strings).length, contextOverrides: Object.keys(contexts).length, plainForms: Object.keys(plain).length,
  keptEnglish: keep.length, guardedKeys: guardedKeys.length, guardedPlaces, nameFinals: finals ? Object.keys(finals).length : 0, extraPlaces, labelGroups: labels ? Object.keys(labels).length : 0,
  untranslatedUnique: missing.length, coverage: `${Math.round((1 - (missing.length + keep.length) / enKeys.size) * 1000) / 10}%`, droppedBadPlaceholders: badPh.length,
}, null, 1));
