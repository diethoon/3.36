// Import patron speech levels from a translated build into a language pack (wml/i18n/<lang>/voice.json).
//   node tools/i18n-voice.mjs --en ../wayward-2026-10-04.html --tr <translated.html> --ref <folder> --lang ko [--adopt]
//   --ref: the same translated build read by tools/i18n-seed.mjs --out <folder> (its English -> text table)
//
// Some translated builds give patron lines four speech levels (plain 반말 / polite 존댓말 / hage 하게체 /
// hao 하오체) and pick one by who is talking. They wrap the places that print those lines:
//   koSay(id, text, state, who)            one line with its own set of variants
//   koVoiceText(expr, state, who, group)   a line picked from a table: every variant set of the group is tried
//   koVoiceResult(obj, state, who, group)  the same for obj.text / obj.logText / obj.narration
// Such a build is the vanilla file edited in place, so every wrapped place is found again in the English build
// (same top-level declaration, same code) and stored by a place id the build can find on its own:
//   say sites by the text's ctx (see collectTexts), text/result sites by unit hash + expression source + occurrence.
// tools/i18n-apply.mjs wraps the same places around our translated text; wml/i18n/<lang>/runtime.js picks the variant.
// A variant only replaces a line that is exactly its base text, so --adopt gives those lines the reference
// wording in our pack (strings.json, or custom.json where we have our own fix for that text).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as walk from 'acorn-walk';
import { readGame, parseModule, topLevel, args } from './lib.mjs';
import { collectTexts, units, placeholders } from './i18n-lib.mjs';
import { softenParticles } from './i18n-apply.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const a = args();
if (!a.en || !a.tr || !a.ref || !a.lang) { console.error('usage: --en english.html --tr translated.html --ref <i18n-seed --out folder> --lang ko [--adopt]'); process.exit(2); }
const langDir = path.join(here, '..', 'i18n', a.lang);
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const ref = readJson(path.join(path.resolve(a.ref), 'strings.json'));
const packFile = path.join(langDir, 'strings.json'), customFile = path.join(langDir, 'custom.json');
const pack = readJson(packFile), custom = fs.existsSync(customFile) ? readJson(customFile) : {};
custom.strings ||= {};

const en = readGame(a.en), tr = readGame(a.tr);
const enAst = parseModule(en.module), trAst = parseModule(tr.module);
const enU = units(enAst, en.module);
const enItems = collectTexts(enAst, en.module, enU);
const enDecls = new Map();
for (const d of topLevel(enAst)) if (!enDecls.has(d.name)) enDecls.set(d.name, d);
const trDecls = topLevel(trAst);
const trDeclAt = pos => trDecls.find(d => d.start <= pos && pos < d.end) || null;
const trSrc = n => tr.module.slice(n.start, n.end);

// ---- the variant table and how a speaker gets a speech level
const dataDecl = trDecls.find(d => /^koVoiceData\d+$/.test(d.name) && d.init);
if (!dataDecl) { console.error('no koVoiceData table in the translated build'); process.exit(1); }
const data = JSON.parse(tr.module.slice(dataDecl.init.start, dataDecl.init.end));
const profDecl = trDecls.find(d => /^koProfile\d+$/.test(d.name));
const profSrc = profDecl ? tr.module.slice(profDecl.start, profDecl.end) : '';
const pairs = s => Object.fromEntries([...String(s || '').matchAll(/(\w+)\s*:\s*'(\w+)'/g)].map(m => [m[1], m[2]]));
const namedProfiles = pairs((/namedProfiles\s*=\s*\{([^}]*)\}/.exec(profSrc) || [])[1]);
const typeProfiles = pairs((/return\s*\(\{([^}]*)\}\)\[type\]/.exec(profSrc) || [])[1]);
const collectorProfile = (/isCollector[^;]*?return\s*'(\w+)'/.exec(profSrc) || [])[1] || null;
const fallbackProfile = (/\?\s*'(\w+)'\s*:\s*null\)/.exec(profSrc) || [])[1] || null;

// our wording of a text (custom.json wins), at one place (contexts) or in general
const ourText = k => (typeof custom.strings[k] === 'string' && custom.strings[k]) ? custom.strings[k] : pack.strings[k];
const ourAt = it => {
  for (const c of [custom.contexts, pack.contexts]) if (c && Object.prototype.hasOwnProperty.call(c, it.ctx)) return c[it.ctx];
  return ourText(it.key);
};
const refAt = it => (ref.contexts && Object.prototype.hasOwnProperty.call(ref.contexts, it.ctx) ? ref.contexts[it.ctx] : ref.strings[it.key]);

// names the profile rules look for: the English name and our translation of it
const nameForms = n => [...new Set([n, ourText(n)].filter(v => typeof v === 'string' && v))];
const namedNames = {};
walk.full(enAst, n => {
  if (n.type !== 'ObjectExpression') return;
  const prop = k => n.properties.find(p => p.type === 'Property' && !p.computed && (p.key.name || p.key.value) === k);
  const id = prop('id'), name = prop('name');
  if (id && name && id.value.type === 'Literal' && name.value.type === 'Literal' && namedProfiles[id.value.value] && !namedNames[id.value.value]) namedNames[id.value.value] = name.value.value;
});
const rules = {
  collector: collectorProfile ? { profile: collectorProfile, names: nameForms('The Collector') } : null,
  named: Object.fromEntries(Object.entries(namedProfiles).map(([id, p]) => [id, { profile: p, names: namedNames[id] ? nameForms(namedNames[id]) : [] }])),
  types: typeProfiles,
  fallback: fallbackProfile,
};

// entries in our key format: ⟦0⟧ -> {0}; particles after a slot softened the way the build does it
const toKey = s => String(s).replace(/⟦(\d+)⟧/g, '{$1}');
const soft = s => softenParticles(toKey(s));
const entries = {};
for (const [id, e] of Object.entries(data.entries)) {
  entries[id] = { g: e.group, b: soft(e.base), v: e.variants.map(soft), ...(e.prefix ? { p: 1 } : {}) };
}

// ---- wrapped places
const SAY = /^koSay\d+$/, TEXT = /^koVoiceText\d+$/, RESULT = /^koVoiceResult\d+$/;
const isWrap = (n, re) => n && n.type === 'CallExpression' && n.callee.type === 'Identifier' && re.test(n.callee.name);
const litKey = n => {
  if (n.type === 'Literal' && typeof n.value === 'string') return n.value;
  if (n.type === 'TemplateLiteral') { let k = ''; n.quasis.forEach((q, i) => { k += q.value.cooked ?? q.value.raw; if (i < n.expressions.length) k += `{${i}}`; }); return k; }
  return null;
};
const norm = s => String(s || '').replace(/\((이|가|은|는|을|를|와|과|으|아|야)\)/g, '').replace(/[\s.,!?…"'“”‘’·~\-—–:;()]/g, '');
// boundary-safe occurrences of an expression's source inside [from, to)
const occurrences = (text, src, from, to) => {
  const out = [];
  for (let i = text.indexOf(src, from); i >= 0 && i + src.length <= to; i = text.indexOf(src, i + 1)) {
    if (/[\w$.]/.test(text[i - 1] || '') || /[\w$]/.test(text[i + src.length] || '')) continue;
    out.push(i);
  }
  return out;
};

const sites = [], unmatched = [];
const sayOrder = new Map();   // decl + text -> how many say sites with that text came before (duplicates in one declaration)
walk.fullAncestor(trAst, (node, _st, anc) => {
  if (!isWrap(node, SAY) && !isWrap(node, TEXT) && !isWrap(node, RESULT)) return;
  const decl = trDeclAt(node.start);
  if (!decl || /^ko/.test(decl.name)) return;                    // the patch's own helpers
  const parent = anc[anc.length - 2];
  if ((isWrap(parent, TEXT) || isWrap(parent, RESULT)) && parent.arguments[0] === node) return;   // inner link of a chain
  const enDecl = enDecls.get(decl.name);
  if (!enDecl) { unmatched.push({ why: 'declaration not in the English build', decl: decl.name }); return; }

  if (isWrap(node, SAY)) {
    const [idArg, lit, stArg, whoArg] = node.arguments;
    const id = idArg && idArg.value, key = lit && litKey(lit);
    if (!entries[id] || key == null) { unmatched.push({ why: 'say: unknown entry or not a text', decl: decl.name, id }); return; }
    const inDecl = enItems.filter(it => it.start >= enDecl.start && it.end <= enDecl.end);
    let cands = inDecl.filter(it => refAt(it) === key);
    if (!cands.length) cands = inDecl.filter(it => norm(refAt(it)) === norm(key));
    const seen = `${decl.name}\u0000${key}`, nth = sayOrder.get(seen) || 0;
    sayOrder.set(seen, nth + 1);
    const it = cands[Math.min(nth, cands.length - 1)];
    if (!it) { unmatched.push({ why: 'say: English text not found', decl: decl.name, id, text: key.slice(0, 60) }); return; }
    sites.push({ k: 'say', ctx: it.ctx, key: it.key, e: id, s: trSrc(stArg), w: trSrc(whoArg) });
    return;
  }

  const kind = isWrap(node, RESULT) ? 'result' : 'text';
  const groups = [];
  let inner = node;
  while (isWrap(inner, TEXT) || isWrap(inner, RESULT)) { groups.unshift(inner.arguments[3] && inner.arguments[3].value); inner = inner.arguments[0]; }
  const src = trSrc(inner);
  let hasText = false;
  walk.full(inner, n => { if ((n.type === 'Literal' && /[가-힣]/.test(String(n.value))) || (n.type === 'TemplateLiteral' && n.quasis.some(q => /[가-힣]/.test(q.value.raw)))) hasText = true; });
  if (hasText || /\bko[A-Z]\w*\d+\s*\(/.test(src)) { unmatched.push({ why: `${kind}: wrapped expression holds translated code`, decl: decl.name, src: src.slice(0, 60) }); return; }
  const trOcc = occurrences(tr.module, src, decl.start, decl.end);
  const enOcc = occurrences(en.module, src, enDecl.start, enDecl.end);
  const nth = trOcc.indexOf(inner.start);
  const at = enOcc.length === trOcc.length ? enOcc[nth] : enOcc.length === 1 ? enOcc[0] : undefined;
  if (at === undefined) { unmatched.push({ why: `${kind}: expression not found once in the English declaration`, decl: decl.name, src: src.slice(0, 60), en: enOcc.length, tr: trOcc.length }); return; }
  const unit = enU.list.find(u => u.start <= at && at < u.end);
  const n = occurrences(en.module, src, unit.start, unit.end).indexOf(at);
  sites.push({ k: kind, u: unit.hash, src, n, g: groups, s: trSrc(node.arguments[1]), w: trSrc(node.arguments[2]) });
});

// ---- our wording vs. each variant set's base text
const mismatch = [];
const adopt = (where, value) => {
  if (placeholders(value).sort().join() !== placeholders(where.key).sort().join()) return 'placeholders differ';
  if (where.ctx && [custom.contexts, pack.contexts].some(c => c && Object.prototype.hasOwnProperty.call(c, where.ctx))) { (custom.contexts ||= {})[where.ctx] = value; return 'custom.json contexts'; }
  if (typeof custom.strings[where.key] === 'string' && custom.strings[where.key]) { custom.strings[where.key] = value; return 'custom.json (replaced our fix)'; }
  pack.strings[where.key] = value;
  return 'strings.json';
};
const enByCtx = new Map(enItems.map(it => [it.ctx, it]));
for (const s of sites.filter(s => s.k === 'say')) {
  const it = enByCtx.get(s.ctx), base = toKey(data.entries[s.e].base);
  const ours = ourAt(it);
  if (typeof ours === 'string' && soft(ours) === entries[s.e].b) continue;
  mismatch.push({ kind: 'say', key: it.key, ctx: it.ctx, ours, base });
}
// table lines: find the English text whose reference wording is the base
const refByValue = new Map();
for (const [k, v] of Object.entries(ref.strings)) if (typeof v === 'string') { if (!refByValue.has(v)) refByValue.set(v, []); refByValue.get(v).push(k); }
const usedGroups = new Set(sites.filter(s => s.k !== 'say').flatMap(s => s.g));
let tableLines = 0, tableUnmapped = 0;
for (const e of Object.values(data.entries)) {
  if (!usedGroups.has(e.group)) continue;
  const base = toKey(e.base), keys = refByValue.get(base);
  if (!keys) { tableUnmapped++; continue; }
  for (const key of keys) {
    tableLines++;
    const ours = ourText(key);
    if (typeof ours === 'string' && soft(ours) === soft(base)) continue;
    mismatch.push({ kind: 'table', key, ours, base });
  }
}
const adopted = {};
if (a.adopt) for (const m of mismatch) { const r = adopt(m, m.base); adopted[r] = (adopted[r] || 0) + 1; m.adopted = r; }

const out = {
  lang: a.lang, game: en.version, source: path.basename(a.tr),
  note: 'Patron speech levels. profiles: the variant order. rules: who speaks how (collector, named patrons by id and name, patron types, fallback). entries: base text and its variants ({0}… = the game\'s ${…} parts, {p}/%p = game tokens). sites: wrapped places of the English build — say: one entry at a text (ctx); text/result: entries of the groups tried on an expression (unit hash + source + occurrence). Generated by tools/i18n-voice.mjs.',
  profiles: data.profiles, rules, entries, sites,
};
fs.writeFileSync(path.join(langDir, 'voice.json'), JSON.stringify(out, null, 1));
if (a.adopt) {
  pack.updates = [...(pack.updates || []), { date: new Date().toISOString().slice(0, 10), from: path.basename(a.tr), voiceLines: mismatch.filter(m => m.adopted === 'strings.json').length, note: 'base texts of the speech-level variants (tools/i18n-voice.mjs --adopt)' }];
  fs.writeFileSync(packFile, JSON.stringify(pack, null, 1));
  fs.writeFileSync(customFile, JSON.stringify(custom, null, 1));
}
console.log(JSON.stringify({
  entries: Object.keys(entries).length, profiles: data.profiles, rules,
  sites: { say: sites.filter(s => s.k === 'say').length, text: sites.filter(s => s.k === 'text').length, result: sites.filter(s => s.k === 'result').length },
  unmatched, tableLines, tableUnmapped,
  mismatch: mismatch.length, adopted: a.adopt ? adopted : '(run with --adopt to take the reference wording)',
  mismatchSample: mismatch.slice(0, 6).map(m => ({ kind: m.kind, ours: String(m.ours).slice(0, 70), base: m.base.slice(0, 70) })),
}, null, 1));
