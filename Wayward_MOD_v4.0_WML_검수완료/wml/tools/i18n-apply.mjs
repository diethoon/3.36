// Translation layer: swap English text literals of the game module for a language pack's text.
//   pack:   wml/i18n/<lang>/strings.json   (seeded / maintained table)
//           wml/i18n/<lang>/custom.json    (hand fixes and additions; wins over strings.json; never generated)
//   output: wml/i18n/<lang>/todo-<game version>.json — English texts of this build with no translation yet,
//           as {"English": ""}. Fill in and move entries into custom.json.
import fs from 'node:fs';
import path from 'node:path';
import * as walk from 'acorn-walk';
import { parseModule } from './lib.mjs';
import { collectTexts, codeValues, units, stringPlaces, buildTemplate, placeholders, DISPLAY_PROPS, fnv, STRICT_CODE_PROPS } from './i18n-lib.mjs';

const readJson = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const HUGE = 8000;
// "{1}으로 " / "{w}는 " in a translation: the word in the slot changes while playing, so a fixed particle
// is right only by luck. Turn it into the both-forms marker the language runtime resolves on screen.
const PARTICLE_FORM = { '으로': '(으)로', '로': '(으)로', '이': '이(가)', '가': '이(가)', '은': '은(는)', '는': '은(는)', '을': '을(를)', '를': '을(를)', '과': '와(과)', '와': '와(과)' };
const FIXED_PARTICLE = /(\{\w+\}|%[pwr])(으로|로|이|가|은|는|을|를|과|와)(?=[\s.,!?"'…)\]—:;]|$)/g;
let particlesFixed = 0;
export function softenParticles(text) {
  return typeof text === 'string' ? text.replace(FIXED_PARTICLE, (m, slot, p) => { particlesFixed++; return slot + PARTICLE_FORM[p]; }) : text;
}

// Code a translation needs changed: i18n/<lang>/code.json { fixes: [{ id, why, find, to, expect }] }.
// find is the game's code text with @1, @2 … standing for names (identifiers); to may use them and @0 (all of find).
// A fix that finds another number of places than expect is reported and left out, never applied halfway: a new game
// build may have moved that code, and the translated build then simply goes without the fix.
export function applyCodeFixes(module, langDir) {
  const file = path.join(langDir, 'code.json');
  const stats = [];
  if (!fs.existsSync(file)) return { module, stats };
  const { fixes = [] } = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const fx of fixes) {
    const order = [];
    const pattern = fx.find.split(/(@\d)/).map(part => {
      if (/^@\d$/.test(part)) { order.push(part[1]); return '([\\w$.]+)'; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    const re = new RegExp(pattern, 'g');
    const found = [...module.matchAll(re)].length;
    const ok = found > 0 && (fx.expect == null || found === fx.expect);
    stats.push({ id: fx.id, found, applied: ok });
    if (!ok) { console.warn(`! i18n code fix ${fx.id}: found ${found} place(s), expected ${fx.expect ?? 'some'} — left out`); continue; }
    module = module.replace(re, (...m) => fx.to.replace(/@(\d)/g, (_, d) => (d === '0' ? m[0] : m[order.indexOf(d) + 1])));
  }
  return { module, stats };
}

export function applyTranslation(module, langDir, opts = {}) {
  const pack = readJson(path.join(langDir, 'strings.json'));
  if (!pack) throw new Error(`${langDir}/strings.json not found — seed it with tools/i18n-seed.mjs or write one`);
  const custom = readJson(path.join(langDir, 'custom.json')) || {};
  const strings = { ...pack.strings };
  for (const [k, v] of Object.entries(custom.strings || {})) if (typeof v === 'string' && v) strings[k] = v;
  const contexts = { ...(pack.contexts || {}), ...(custom.contexts || {}) };
  const extra = { ...(pack.extra || {}), ...(custom.extra || {}) };
  const plain = opts.style === 'plain' ? { ...(pack.plain || {}), ...(custom.plain || {}) } : null;
  const keep = new Set([...(pack.keep || []), ...(custom.keep || [])]);

  const ast = parseModule(module);
  const u = units(ast, module);
  const items = collectTexts(ast, module, u);
  // id-looking words translated at one exact place (pack.extra), added as extra items
  const textStarts = new Set(items.map(it => it.start));
  let extraHits = 0, extraSkippedCode = 0;
  const places = stringPlaces(ast, u);
  const stringPlacesByStart = new Map(places.map(p => [p.start, p.lid]));
  for (const p of places) {
    if (textStarts.has(p.start) || !Object.prototype.hasOwnProperty.call(extra, p.lid)) continue;
    if (STRICT_CODE_PROPS.has(p.prop)) { extraSkippedCode++; continue; }
    items.push({ start: p.start, end: p.end, kind: 'string', key: p.value, extra: extra[p.lid] });
    extraHits++;
  }
  // letter-less templates such as `${h}:${m} ${ampm}` are only touched when custom.json "formats" names them
  const formats = custom.formats || {};
  const formatHits = {};
  if (Object.keys(formats).length) {
    walk.full(ast, n => {
      if (n.type !== 'TemplateLiteral' || textStarts.has(n.start)) return;
      const cooked = n.quasis.map(q => q.value.cooked ?? q.value.raw);
      let key = '';
      cooked.forEach((c, i) => { key += c; if (i < n.expressions.length) key += `{${i}}`; });
      if (!formats[key]) return;
      items.push({ start: n.start, end: n.end, kind: 'template', key, extra: formats[key],
        exprs: n.expressions.map(e => module.slice(e.start, e.end)), exprRanges: n.expressions.map(e => [e.start, e.end]) });
      formatHits[key] = (formatHits[key] || 0) + 1;
    });
  }
  // patron speech levels (voice.json from tools/i18n-voice.mjs): the places that print patron lines are
  // wrapped so the language runtime can show the speaker's variant. say sites: one text (by ctx);
  // text/result sites: an expression found by unit hash + source + occurrence. Positions are only trusted
  // for the game version the sites were read from.
  const voice = readJson(path.join(langDir, 'voice.json'));
  const voiceSay = new Map();
  const voiceStats = { text: 0, result: 0, notFound: 0 };
  if (voice && voice.game === opts.version) {
    const boundary = (at, len) => !/[\w$.]/.test(module[at - 1] || '') && !/[\w$]/.test(module[at + len] || '');
    voice.sites.forEach((s, i) => {
      if (s.k === 'say') { voiceSay.set(s.ctx, i); return; }
      let hits = 0;
      for (const unit of u.list.filter(x => x.hash === s.u)) {
        const occ = [];
        for (let p = module.indexOf(s.src, unit.start); p >= 0 && p + s.src.length <= unit.end; p = module.indexOf(s.src, p + 1)) if (boundary(p, s.src.length)) occ.push(p);
        if (occ[s.n] === undefined) continue;
        items.push({ start: occ[s.n], end: occ[s.n] + s.src.length, kind: 'voice', site: i, who: `${s.s},${s.w}` });
        hits++;
      }
      if (hits) voiceStats[s.k] += hits; else voiceStats.notFound++;
    });
    const sayCtx = new Set(items.filter(it => voiceSay.has(it.ctx)).map(it => it.ctx));
    voiceStats.notFound += [...voiceSay.keys()].filter(c => !sayCtx.has(c)).length;
  } else if (voice) voiceStats.skipped = `voice.json is for ${voice.game}`;
  // a wrapper first when it starts where a text starts (it holds that text)
  items.sort((x, y) => x.start - y.start || y.end - x.end);
  const guarded = codeValues(ast);
  const stats = { texts: 0, translated: 0, keptByPlace: 0, keptCodeValue: 0, missing: 0, badPlaceholder: 0 };
  const missing = new Set();

  particlesFixed = 0;
  function pick(it) { const v = pickRaw(it); return v == null ? v : softenParticles(v); }
  function pickRaw(it) {
    if (it.extra !== undefined) return it.extra;
    if (Object.prototype.hasOwnProperty.call(contexts, it.ctx)) {
      const v = contexts[it.ctx];
      if (v == null) stats.keptByPlace++;
      return v;
    }
    const v = (plain && plain[it.key]) ?? strings[it.key];   // '' is a real translation (folded into a neighbour)
    if (v == null) {
      // whole documents (the changelog) change every release; they stay English unless custom.json has them
      if (it.key.length > HUGE) stats.longDocuments = (stats.longDocuments || 0) + 1;
      else if (!keep.has(it.key)) { missing.add(it.key); stats.missing++; }
      return null;
    }
    // the code compares/looks up this exact text somewhere: only translate it where it is plainly shown text
    if (guarded.has(it.key) && !DISPLAY_PROPS.has(it.prop)) { stats.keptCodeValue++; return null; }
    return v;
  }

  // rewrite [start,end) with every outermost text item inside it replaced (recursing into ${…} parts)
  const lower = pos => { let lo = 0, hi = items.length; while (lo < hi) { const m = (lo + hi) >> 1; if (items[m].start < pos) lo = m + 1; else hi = m; } return lo; };
  function rewrite(start, end, skip) {
    let out = '', pos = start, k = lower(start);
    while (k < items.length && items[k].start < end) {
      const it = items[k];
      if (it === skip) { k++; continue; }                          // the wrapper whose inside this is
      out += module.slice(pos, it.start) + render(it);
      pos = it.end;
      k++;
      while (k < items.length && items[k].start < it.end) k++;   // nested ones were handled by render()
    }
    return out + module.slice(pos, end);
  }
  // patron line wrapper: the runtime may swap the line for the speaker's variant (missing runtime: line as is)
  const voiceCall = (inner, site, who) => `(globalThis.WML_I18N?.voice??(v=>v))(${inner},${site},()=>[${who}])`;
  function render(it) {
    if (it.kind === 'voice') return voiceCall(rewrite(it.start, it.end, it), it.site, it.who);
    const out = renderText(it);
    const site = voiceSay.get(it.ctx);
    if (site === undefined || out === module.slice(it.start, it.end)) return out;   // only translated lines have variants
    voiceStats.wrappedSay = (voiceStats.wrappedSay || 0) + 1;
    return voiceCall(out, site, `${voice.sites[site].s},${voice.sites[site].w}`);
  }
  function renderText(it) {
    const original = () => module.slice(it.start, it.end);
    const tr = pick(it);
    if (it.kind === 'string') {
      if (tr == null || tr === it.key) return original();
      if (placeholders(tr).length) { stats.badPlaceholder++; return original(); }
      stats.translated++;
      return JSON.stringify(tr);
    }
    const exprs = it.exprRanges.map(([s, e]) => rewrite(s, e));
    if (tr != null && tr !== it.key) {
      // English-only grammar parts (a/an, plural s, is/are) have no place in the translation
      let text = tr;
      (it.grammar || []).forEach((g, i) => { if (g) { text = text.split(`{${i}}`).join(''); stats.grammarDropped = (stats.grammarDropped || 0) + 1; } });
      try { const out = buildTemplate(text, exprs); stats.translated++; return out; } catch { stats.badPlaceholder++; }
    }
    // untranslated template: keep it, but its ${…} parts may hold translated texts
    let out = '', pos = it.start;
    it.exprRanges.forEach(([s, e], i) => { out += module.slice(pos, s) + exprs[i]; pos = e; });
    return out + module.slice(pos, it.end);
  }

  stats.texts = items.filter(it => it.kind !== 'voice').length;
  const result = rewrite(0, module.length);
  parseModule(result); // the translated module must still be valid JavaScript
  stats.uniqueMissing = missing.size;
  stats.extraPlaces = extraHits;
  if (extraSkippedCode) stats.extraSkippedCode = extraSkippedCode;
  stats.particlesSoftened = particlesFixed;
  if (Object.keys(formatHits).length) stats.formats = formatHits;   // how many places each format touched
  stats.coverage = `${Math.round((stats.translated / Math.max(1, stats.texts - stats.keptByPlace)) * 1000) / 10}%`;
  // texts the game builds on the fly (never a literal): swapped on screen by the language runtime.
  // Auto part: some screens print a record's id instead of its name ("sex", "lap dance"), so every
  // {id, name|label|title} record whose name has a translation gives id -> translated name
  // (ids claimed by two different names are dropped).
  const auto = {}, clash = new Set();
  const lit = n => n && n.type === 'Literal' && typeof n.value === 'string';
  walk.full(ast, n => {
    if (n.type !== 'ObjectExpression') return;
    let id = null, name = null;
    for (const p of n.properties) {
      if (p.type !== 'Property' || p.computed) continue;
      const k = p.key.name || p.key.value;
      if (k === 'id' && lit(p.value)) id = p.value.value;
      else if ((k === 'name' || k === 'label' || k === 'title') && lit(p.value) && !name) name = p.value;
    }
    if (!id || !name || !/^[a-z][a-z_]*$/.test(id) || id.length < 3) return;
    const ex = stringPlacesByStart.get(name.start);
    const tr = (ex && Object.prototype.hasOwnProperty.call(extra, ex)) ? extra[ex] : strings[name.value];
    if (!tr || tr === name.value) return;
    for (const key of new Set([id, id.replace(/_/g, ' ')])) {
      if (auto[key] !== undefined && auto[key] !== tr) clash.add(key); else auto[key] = tr;
    }
  });
  for (const k of clash) delete auto[k];
  // id -> name tables ("labels": {emotion:{devotion:"헌신"}, task:{…}, …}); earlier groups win a clash
  const LABEL_ORDER = ['emotion', 'task', 'stage', 'outfit', 'order', 'outcome', 'reaction', 'trait', 'pane', 'need', 'category'];
  const labelGroups = { ...(pack.labels || {}) };
  for (const [grp, map] of Object.entries(custom.labels || {})) labelGroups[grp] = { ...(labelGroups[grp] || {}), ...map };
  const fromLabels = {}, labelWords = {};
  const groupNames = [...LABEL_ORDER.filter(g => labelGroups[g]), ...Object.keys(labelGroups).filter(g => !LABEL_ORDER.includes(g))];
  for (const grp of groupNames) {
    for (const [id, name] of Object.entries(labelGroups[grp] || {})) {
      if (!name) continue;
      for (const k of new Set([id, id.replace(/_/g, ' ')])) if (fromLabels[k] === undefined) fromLabels[k] = name;
      // ids printed inside sentences ("devotion이(가) 가시지 않음", "피파 · away"): also swap as words
      if (!['outcome', 'reaction', 'trait', 'pane', 'need'].includes(grp)) for (const k of new Set([id, id.replace(/_/g, ' ')])) if (labelWords[k] === undefined) labelWords[k] = name;
    }
  }
  const display = { ...auto, ...fromLabels, ...(pack.display || {}), ...(custom.display || {}) };
  stats.autoDisplay = Object.keys(auto).length;
  stats.labelDisplay = Object.keys(fromLabels).length;
  for (const k of Object.keys(display)) if (!display[k]) delete display[k];
  // ids the game prints inside translated sentences ("food, beer and wine이(가) 부족해"): whole-word swaps
  // record ids with several words (outfits like peasant_smock) are specific enough to swap inside sentences too
  const autoWords = {};
  for (const [k, v] of Object.entries(auto)) if (/[_ ]/.test(k)) autoWords[k] = v;
  const words = { ...autoWords, ...labelWords, ...(pack.words || {}), ...(custom.words || {}) };
  for (const k of Object.keys(words)) if (!words[k]) delete words[k];
  const patterns = [...(pack.patterns || []), ...(custom.patterns || [])].filter(p => Array.isArray(p) && p.length === 2);
  for (const [re] of patterns) new RegExp(re);   // fail the build on a broken pattern, not the game
  fs.writeFileSync(path.join(langDir, 'display.js'), `/* generated from strings.json + custom.json "display"/"words" — edit those, not this */\nwindow.WML_I18N_DISPLAY=${JSON.stringify(display, null, 0)};\nwindow.WML_I18N_WORDS=${JSON.stringify(words, null, 0)};\nwindow.WML_I18N_PATTERNS=${JSON.stringify(patterns)};\nwindow.WML_I18N_BUILD=${JSON.stringify(fnv(result + JSON.stringify(display) + JSON.stringify(words) + JSON.stringify(patterns)))};\n`);
  if (voice) {
    // speech-level data for the runtime; sites keep the numbering the wrappers use
    const voiceJs = voice.game === opts.version
      ? { profiles: voice.profiles, rules: voice.rules, entries: voice.entries, sites: voice.sites.map(s => (s.k === 'say' ? { k: 'say', e: s.e } : { k: s.k, g: s.g })) }
      : null;
    fs.writeFileSync(path.join(langDir, 'voice.js'), `/* generated from voice.json (tools/i18n-voice.mjs) — edit that, not this */\nwindow.WML_I18N_VOICE=${JSON.stringify(voiceJs)};\n`);
    stats.voice = voiceStats;
  }
  stats.displayEntries = Object.keys(display).length;
  stats.patterns = patterns.length;
  stats.wordEntries = Object.keys(words).length;
  if (opts.version) {
    const todo = Object.fromEntries([...missing].sort().map(k => [k, '']));
    fs.writeFileSync(path.join(langDir, `todo-${opts.version}.json`), JSON.stringify(todo, null, 1));
    stats.todoFile = `todo-${opts.version}.json`;
  }
  return { module: result, stats };
}
