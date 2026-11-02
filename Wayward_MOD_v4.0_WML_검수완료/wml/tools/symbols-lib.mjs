// Mod symbols: semantic names a mod gives game bindings for itself — WML.define({ symbols: { … } }) —
// plus a "recipe" that finds the same binding again in another build (the Korean build, or a newer game
// version where the minified names changed). Shared by tools/mod-symbols.mjs and the MCP server.
//
// Entry: { raw: { "<game>": "<minified name>" }, find: <recipe>, doc, optional, aliases: [names] }
// The loader runs the same tests at boot (wml/runtime/wml-core.js: modSymbolMatch — keep the two in step).
// Recipes never use text shown on screen, so they work the same in translated builds.
//   functions — read the function's own source (fn.toString() in the browser):
//     all:  every feature is in the source. Features: ".prop" (property access), "key:" (object key),
//           "\"id\"" (an id-like string the code compares), "#1.5" (a number).
//     any:  spare features; when "all" leaves several candidates, the one with clearly the most wins.
//     like: the whole source with minified names (and differing text) as wildcards, for small functions.
//     len:  source length; candidates 4x bigger or smaller are never the same function.
//   other bindings (tables, ids, stores):
//     decl:  a regex over the game module text matching "name=<start of the value>", group 1 = the name.
//     value: a plain value (string, number, boolean) that only this top-level constant has.
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import { parseModule, topLevel, MODULE_TAG } from './lib.mjs';

/** the game module of any build (vanilla, Wayward_WML.html, a translated build) without unwrapping */
export function moduleOf(file) {
  return moduleOfHtml(fs.readFileSync(file, 'utf8'), file);
}
export function moduleOfHtml(html, label = 'build') {
  const at = html.indexOf(MODULE_TAG);
  if (at < 0) throw new Error(`${label}: game module script not found`);
  const start = at + MODULE_TAG.length;
  return html.slice(start, html.indexOf('</script>', start));
}

/**
 * What the recipes look at in one build: { module, fns: name -> source as fn.toString() returns it,
 * decls: name -> { kind, src (declarator text "name=…"), value (for a literal constant) } }
 */
export function buildModel(moduleText) {
  const fns = new Map(), decls = new Map();
  for (const d of topLevel(parseModule(moduleText))) {
    if (decls.has(d.name)) continue;
    const init = d.init;
    const isFn = d.kind === 'function' || (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression'));
    if (d.kind === 'function') fns.set(d.name, moduleText.slice(d.node.start, d.node.end));
    else if (isFn) fns.set(d.name, moduleText.slice(init.start, init.end));
    const lit = init && init.type === 'Literal' && ['string', 'number', 'boolean'].includes(typeof init.value) ? { value: init.value } : {};
    decls.set(d.name, { kind: isFn ? 'function' : d.kind, src: d.kind === 'function' ? null : moduleText.slice(d.start, d.end), ...lit });
  }
  return { module: moduleText, fns, decls };
}
/** compatibility: only the functions */
export const functionSources = moduleText => buildModel(moduleText).fns;

const tokens = src => { const out = []; for (const t of acorn.tokenizer(src, { ecmaVersion: 'latest' })) out.push(t); return out; };
const ID_STRING = /^[a-z][A-Za-z0-9_]{2,}$/;
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isKey = (toks, i) => toks[i].type.label === 'name' && toks[i + 1] && toks[i + 1].type.label === ':' && i > 0 && ['{', ','].includes(toks[i - 1].type.label);

/** translation-proof features of one function source */
export function features(src) {
  const f = new Set();
  let toks;
  try { toks = tokens(src); } catch { return f; }
  toks.forEach((t, i) => {
    const lab = t.type.label, prev = i ? toks[i - 1].type.label : null;
    if (lab === 'name' && (prev === '.' || prev === '?.')) f.add('.' + t.value);
    else if (lab === 'string' && ID_STRING.test(t.value)) f.add(JSON.stringify(t.value));
    else if (lab === 'num' && (String(t.value).includes('.') || t.value >= 10)) f.add('#' + src.slice(t.start, t.end));
    // object keys only (a ternary branch "a?b:c" is a minified name); short keys tell little
    if (isKey(toks, i) && t.value.length > 3) f.add(t.value + ':');
  });
  return f;
}

/** the test the loader runs for one feature (same as wml-core.js modSymbolFeature) */
export function featureTest(feat) {
  if (feat.startsWith('#')) return new RegExp(`(?<![\\w$.])${esc(feat.slice(1))}(?![\\w$])`);
  if (feat.startsWith('.')) return new RegExp(`${esc(feat)}(?![\\w$])`);
  if (feat.endsWith(':')) return new RegExp(`(?<![\\w$.])${esc(feat)}`);
  return new RegExp(esc(feat));
}

/**
 * Regex source for code: minified names become wildcards, property names and object keys stay, strings stay
 * when keepStrings (id-like ones only) or become "any string". Stops at the first template or regex literal
 * (returns null when stop is false), and after `limit` tokens.
 */
function tokenPattern(src, { from = 0, keepStrings = true, limit = Infinity, stop = false, refs = null } = {}) {
  let toks;
  try { toks = tokens(src.slice(from)); } catch { return null; }
  let out = '', pos = from, n = 0;
  for (let i = 0; i < toks.length && n < limit; i++, n++) {
    const t = toks[i], lab = t.type.label, start = t.start + from, end = t.end + from;
    if (lab === 'template' || lab === '`' || lab === 'regexp') { if (!stop) return null; return { re: out, complete: false }; }
    out += esc(src.slice(pos, start));
    const text = src.slice(start, end), prev = i ? toks[i - 1].type.label : null;
    // a game binding that has a semantic name: "@name@", put back as that build's minified name when matching
    if (lab === 'name' && refs && refs.has(text) && prev !== '.' && prev !== '?.' && !isKey(toks, i)) out += `@${refs.get(text)}@`;
    else if (lab === 'name' && prev !== '.' && prev !== '?.' && !isKey(toks, i)) out += '[\\w$]+';
    else if (lab === 'string') out += keepStrings && ID_STRING.test(t.value) ? esc(text) : '"(?:[^"\\\\]|\\\\.)*"';
    else out += esc(text);
    pos = end;
  }
  return { re: out, complete: n >= toks.length, pos };
}

/**
 * Regex source matching a whole function's code (small functions only), or null. refs (minified -> semantic
 * name) turns the game bindings it calls into "@name@" so tiny wrappers are told apart by what they call.
 */
export function likePattern(src, { keepStrings = true, maxLength = 3000, refs = null } = {}) {
  if (src.length > maxLength) return null;
  const p = tokenPattern(src, { keepStrings, refs });
  return p ? p.re + esc(src.slice(p.pos)) : null;
}

/** "@name@" in a pattern -> that build's minified name for it; null when one is unknown there */
export function bindRefs(pattern, symRaw) {
  let missing = false;
  const out = pattern.replace(/@([A-Za-z_$][\w$]*)@/g, (m, n) => { const raw = symRaw && symRaw[n]; if (!raw) { missing = true; return m; } return esc(raw); });
  return missing ? null : out;
}
export const refsIn = recipe => [...new Set(Object.values(recipe || {}).filter(v => typeof v === 'string').flatMap(v => [...v.matchAll(/@([A-Za-z_$][\w$]*)@/g)].map(m => m[1])))];

/** top-level bindings a piece of code refers to (not property names / object keys), in order */
function topNamesIn(src, model) {
  let toks;
  try { toks = tokens(src); } catch { return []; }
  const out = [];
  toks.forEach((t, i) => {
    const prev = i ? toks[i - 1].type.label : null;
    if (t.type.label === 'name' && prev !== '.' && prev !== '?.' && !isKey(toks, i) && model.decls.has(t.value) && !out.includes(t.value)) out.push(t.value);
  });
  return out;
}

/** names a recipe may refer to in build b: the shared/own names plus its own sub-recipes ("refs"); null if one is not found */
function namesFor(recipe, b) {
  if (!recipe.refs) return b.symRaw || {};
  const extra = {};
  for (const [k, sub] of Object.entries(recipe.refs)) {
    const m = matchRecipe(sub, b);
    if (m.length !== 1) return null;
    extra[k] = m[0];
  }
  return { ...(b.symRaw || {}), ...extra };
}

/** regex source for "name=<first `limit` tokens of the value>" with the name as group 1 */
function declPattern(declSrc, name, { keepStrings, limit, refs = null }) {
  if (!declSrc.startsWith(name)) return null;
  const p = tokenPattern(declSrc, { from: name.length, keepStrings, limit, stop: true, refs });
  return p && p.re ? `(?<![\\w$.])([\\w$]+)${p.re}` : null;
}
// minified -> semantic name for the bindings a recipe may refer to (never the binding itself)
const refsFor = (models, raw) => (models[0] instanceof Map || !models[0].symRaw ? null
  : new Map(Object.entries(models[0].symRaw).filter(([, r]) => r && r !== raw).map(([n, r]) => [r, n])));

/** names a decl regex captures in a module */
export function declMatches(re, moduleText) {
  const names = new Set(), rx = new RegExp(re, 'g');
  for (let m = rx.exec(moduleText); m; m = rx.exec(moduleText)) { names.add(m[1]); if (m[0].length === 0) rx.lastIndex++; }
  return [...names];
}

/**
 * Names in one build the recipe finds (same rules as the loader). b: a buildModel, or just a Map of
 * function sources for function recipes.
 */
export function matchRecipe(recipe, b) {
  const fns = b instanceof Map ? b : b.fns;
  if (recipe.refs && b instanceof Map) return [];
  const symRaw = b instanceof Map ? null : namesFor(recipe, b);
  if (!(b instanceof Map) && !symRaw) return [];
  if (recipe.decl) {
    const re = bindRefs(recipe.decl, symRaw);
    return b instanceof Map || !re ? [] : declMatches(re, b.module).filter(n => b.decls.has(n));
  }
  if ('value' in recipe) return b instanceof Map ? [] : [...b.decls].filter(([, d]) => 'value' in d && d.value === recipe.value).map(([n]) => n);
  const tests = (recipe.all || []).map(featureTest);
  const likeSrc = recipe.like ? bindRefs(recipe.like, symRaw) : null;
  if (recipe.like && !likeSrc) return [];
  const like = likeSrc ? new RegExp(`^(?:${likeSrc})$`) : null;
  const near = (src, k) => !recipe.len || (src.length >= recipe.len / k && src.length <= recipe.len * k);
  const out = [];
  for (const [name, src] of fns) if (near(src, 4) && tests.every(t => t.test(src)) && (!like || like.test(src))) out.push(name);
  if (out.length < 2 || !recipe.any || !recipe.any.length) return out;
  const extra = recipe.any.map(featureTest);
  const scored = out.filter(n => near(fns.get(n), 2)).map(n => [n, extra.filter(t => t.test(fns.get(n))).length]).sort((x, y) => y[1] - x[1]);
  return scored.length && scored[0][1] * 2 >= extra.length && (scored.length === 1 || scored[0][1] > scored[1][1]) ? [scored[0][0]] : out;
}

const finds = (recipe, models, raw) => models.every(b => { const m = matchRecipe(recipe, b); return m.length === 1 && m[0] === raw; });

function functionRecipe(raw, models, maxFeatures, depth) {
  const fnsList = models.map(b => (b instanceof Map ? b : b.fns));
  const srcs = fnsList.map(f => f.get(raw));
  let feats = [...features(srcs[0])].filter(f => srcs.every(s => featureTest(f).test(s)));
  const df = new Map();
  for (const src of fnsList[0].values()) for (const f of feats) if (featureTest(f).test(src)) df.set(f, (df.get(f) || 0) + 1);
  feats = feats.filter(f => df.get(f)).sort((a, b) => df.get(a) - df.get(b) || b.length - a.length);
  const chosen = [];
  let left = [...fnsList[0].keys()];
  for (const f of feats) {
    if (chosen.length >= maxFeatures || left.length === 1) break;
    const t = featureTest(f);
    const next = left.filter(n => t.test(fnsList[0].get(n)));
    if (next.length < left.length) { chosen.push(f); left = next; }
  }
  let recipe = { all: chosen, len: srcs[0].length };
  if (!finds(recipe, models, raw)) {
    // whole-shape pattern; then the same with the semantic names it calls (models[i].symRaw: name -> minified)
    const refs = refsFor(models, raw);
    tries: for (const withRefs of refs ? [false, true] : [false]) {
      for (const keepStrings of [true, false]) {
        const like = likePattern(srcs[0], { keepStrings, refs: withRefs ? refs : null });
        if (!like) continue;
        const r = { all: chosen.slice(0, 3), like, len: srcs[0].length };
        if (!r.all.length) delete r.all;
        const own = models.map(b => bindRefs(like, b.symRaw));
        if (own.every((p, i) => p && new RegExp(`^(?:${p})$`).test(srcs[i])) && finds(r, models, raw)) { recipe = r; break tries; }
      }
    }
  }
  // tiny wrappers: name what they call by the callee's own recipe ("@__ref0@" + refs.__ref0), two levels deep
  if (!finds(recipe, models, raw) && depth < 2 && !(models[0] instanceof Map)) {
    const named = refsFor(models, raw) || new Map();
    const refMap = new Map(named), subs = {};
    topNamesIn(srcs[0], models[0]).filter(n => n !== raw && !named.has(n)).slice(0, 4).forEach((n, i) => {
      const sub = makeRecipe(n, models, { maxFeatures, depth: depth + 1 });
      if (sub.ok) { subs[`__ref${i}`] = sub.recipe; refMap.set(n, `__ref${i}`); }
    });
    if (Object.keys(subs).length) {
      for (const keepStrings of [true, false]) {
        const like = likePattern(srcs[0], { keepStrings, refs: refMap });
        if (!like) continue;
        const r = { like, len: srcs[0].length, refs: subs };
        if (finds(r, models, raw)) { recipe = r; break; }
      }
    }
  }
  if (recipe.all && !recipe.all.length) delete recipe.all;
  // spare features for a later game version (see "any" above)
  const any = feats.filter(f => !(recipe.all || []).includes(f)).slice(0, 6);
  if (any.length) recipe.any = any;
  return recipe;
}

function bindingRecipe(raw, models) {
  const ds = models.map(b => b.decls.get(raw));
  // a plain constant: its value, if no other top-level constant has it (in every build)
  if ('value' in ds[0] && ds.every(d => 'value' in d && d.value === ds[0].value)) {
    const r = { value: ds[0].value };
    if (finds(r, models, raw)) return r;
  }
  const refs = refsFor(models, raw);
  for (const withRefs of refs ? [false, true] : [false]) {
    for (const keepStrings of [true, false]) {
      for (const limit of [8, 16, 32, 64, 128]) {
        const re = declPattern(ds[0].src, raw, { keepStrings, limit, refs: withRefs ? refs : null });
        if (!re) break;
        if (finds({ decl: re }, models, raw)) return { decl: re };
      }
    }
  }
  return null;
}

/**
 * A recipe for binding `raw`, checked against every build given (buildModel results; a Map of function
 * sources also works for functions). Returns { recipe, ok, kind, found, why }.
 */
export function makeRecipe(raw, models, { maxFeatures = 8, depth = 0 } = {}) {
  const fnsList = models.map(b => (b instanceof Map ? b : b.fns));
  if (fnsList.every(f => f.has(raw))) {
    const recipe = functionRecipe(raw, models, maxFeatures, depth);
    const found = models.map(b => matchRecipe(recipe, b));
    const ok = found.every(m => m.length === 1 && m[0] === raw);
    return { recipe, ok, kind: 'function', found, why: ok ? '' : `the recipe finds ${found.map(m => m.length).join('/')} functions (want exactly ${raw})` };
  }
  if (models.some(b => b instanceof Map || !b.decls.has(raw))) return { ok: false, why: `${raw} is not a top-level binding in every build` };
  const recipe = bindingRecipe(raw, models);
  return recipe ? { recipe, ok: true, kind: models[0].decls.get(raw).kind, found: models.map(() => [raw]), why: '' }
    : { recipe: null, ok: false, kind: models[0].decls.get(raw).kind, why: 'no unique recipe for this value' };
}

/** check one entry against the builds of one game version: raw exists, recipe unique and pointing at raw */
export function checkEntry(name, entry, game, models) {
  const raw = entry.raw && entry.raw[game];
  const has = b => (b instanceof Map ? b.has(raw) : b.decls.has(raw));
  const found = entry.find ? models.map(b => matchRecipe(entry.find, b)) : null;
  const res = { name, raw: raw || null, ok: true, notes: [] };
  if (raw && models.some(b => !has(b))) { res.ok = false; res.notes.push(`${raw} is not in this build`); }
  if (found) {
    const counts = found.map(m => m.length);
    if (counts.some(c => c !== 1)) { res.ok = false; res.notes.push(`recipe finds ${counts.join('/')} bindings`); }
    else if (raw && found.some(m => m[0] !== raw)) { res.ok = false; res.notes.push(`recipe finds ${found[0][0]}, not ${raw}`); }
    else if (!raw) res.notes.push(`found by recipe: ${found[0][0]}`);
  } else if (!raw) { res.ok = false; res.notes.push(`no name for game ${game} and no recipe`); }
  else res.notes.push('no recipe: will not follow a game update');
  return res;
}

// ---- reading and writing the symbols block of a mod.js (WML.define({ …, symbols: { … }, … }))

/** the WML.define object literal of a mod source: { node, prop } */
function defineObject(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true });
  let found = null;
  (function visit(n) {
    if (!n || typeof n !== 'object' || found) return;
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.object.name === 'WML' && (n.callee.property.name || n.callee.property.value) === 'define' && n.arguments[0] && n.arguments[0].type === 'ObjectExpression') { found = n.arguments[0]; return; }
    for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v.type === 'string') visit(v); }
  })(ast);
  if (!found) throw new Error('WML.define({ … }) not found in this mod.js');
  const prop = found.properties.find(p => p.type === 'Property' && !p.computed && (p.key.name || p.key.value) === 'symbols');
  return { node: found, prop };
}

/** the symbols object of a mod.js (plain JSON-like literal) or {} */
export function readModSymbols(src) {
  const { prop } = defineObject(src);
  if (!prop) return {};
  if (prop.value.type !== 'ObjectExpression') throw new Error('symbols must be an object literal');
  // the block is data only: evaluate it without running the mod
  return Function(`"use strict";return (${src.slice(prop.value.start, prop.value.end)});`)();
}

/** mod.js source with its symbols block replaced (or added right after id/name) */
export function writeModSymbols(src, symbols) {
  const { node, prop } = defineObject(src);
  const lineStart = i => src.lastIndexOf('\n', i - 1) + 1;
  const indent = prop ? src.slice(lineStart(prop.start), prop.start).match(/^\s*/)[0] : (src.slice(lineStart(node.properties[0].start), node.properties[0].start).match(/^\s*/)[0] || '  ');
  // one line per symbol: easy to read and to diff
  const entries = Object.entries(symbols).map(([k, v]) => `${indent}  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  const body = entries.length ? `{\n${entries.join(',\n')}\n${indent}}` : '{}';
  if (prop) return src.slice(0, prop.value.start) + body + src.slice(prop.value.end);
  const after = node.properties.find(p => p.type === 'Property' && (p.key.name || p.key.value) === 'name') || node.properties[0];
  let at = after.end;
  if (src[at] === ',') at++;
  return src.slice(0, at) + `\n${indent}// mod symbols (tools/mod-symbols.mjs / MCP symbol_add keep this block; data only)\n${indent}symbols: ${body},` + src.slice(at);
}

// ---- whole-mod operations (tools/mod-symbols.mjs and the MCP server)

export const NAME_RULE = /^[A-Za-z_$][\w$]*$/;

/** the built games in the game folder: { game, builds: [{ label, file, ...buildModel }] } */
export function currentBuilds(gameDir) {
  const out = [];
  for (const [label, name] of [['en', 'Wayward_WML.html'], ['ko', 'Wayward_WML_ko.html']]) {
    const file = path.join(gameDir, name);
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const head = html.match(/\/\* WML_BRIDGE_BEGIN (\S+)/);
    out.push({ label, file, game: head ? head[1] : null, ...buildModel(moduleOfHtml(html, name)) });
  }
  if (!out.length) throw new Error('no built game (Wayward_WML.html / Wayward_WML_ko.html) — run tools/build.mjs first');
  const games = [...new Set(out.map(b => b.game))];
  if (games.length > 1) throw new Error(`the builds are for different game versions (${games.join(', ')}) — rebuild them`);
  // recipes may name shared-table bindings ("@locationOf@"): give every build the shared names
  const shared = sharedSymbols(path.join(gameDir, 'wml'), games[0]);
  for (const b of out) b.symRaw = shared;
  return { game: games[0], builds: out };
}

/** the builds with this mod's own names (for this game) added to the names recipes may refer to */
const withOwn = (builds, symbols, game) => {
  const own = {};
  for (const [n, e] of Object.entries(symbols)) { const r = e && e.raw && e.raw[game]; if (r) { own[n] = r; for (const a of e.aliases || []) own[a] = r; } }
  return builds.map(b => ({ ...b, symRaw: { ...(b.symRaw || {}), ...own } }));
};

/** the shared table (wml/symbols/<game>.json) as { name: raw } */
export function sharedSymbols(wmlDir, game) {
  const f = path.join(wmlDir, 'symbols', `${game}.json`);
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(f, 'utf8')).symbols || {}).map(([k, v]) => [k, v.name]));
}

/** every name a symbols block defines (names and aliases) -> owning entry name */
function namesOf(symbols) {
  const out = new Map();
  for (const [n, e] of Object.entries(symbols)) { out.set(n, n); for (const a of (e && e.aliases) || []) out.set(a, n); }
  return out;
}

/**
 * Add or update symbols in a mod source. items: [{ name, raw, doc?, optional?, aliases? }]. Every item gets a
 * recipe made and checked against all builds. Other fields of an existing entry are kept.
 * Returns { src, report: [{ name, ok, note }] } — nothing is written for an item that is not ok.
 */
export function addModSymbols(src, items, { game, builds, shared = {} }) {
  const symbols = readModSymbols(src);
  const report = [];
  for (const { name, raw, doc, optional, aliases } of items) {
    const names = [name, ...(aliases || [])];
    const bad = names.find(n => !NAME_RULE.test(n || ''));
    if (bad !== undefined) { report.push({ name, ok: false, note: `"${bad}": a name is letters, digits, _ or $ (not starting with a digit)` }); continue; }
    const taken = namesOf(symbols);
    const clash = names.find(n => taken.has(n) && taken.get(n) !== name);
    if (clash) { report.push({ name, ok: false, note: `"${clash}" is already a name of "${taken.get(clash)}" in this mod` }); continue; }
    const missing = builds.filter(b => !b.decls.has(raw));
    if (!raw || missing.length) { report.push({ name, ok: false, note: `${raw} is not a top-level game binding in ${missing.map(b => b.label).join(', ')}` }); continue; }
    const r = makeRecipe(raw, withOwn(builds, symbols, game));
    const prev = symbols[name] || {};
    const notes = [];
    if (prev.raw && prev.raw[game] && prev.raw[game] !== raw) notes.push(`was ${prev.raw[game]} for ${game}`);
    const entry = { ...prev, raw: { ...(prev.raw || {}), [game]: raw } };
    if (r.ok) entry.find = r.recipe; else delete entry.find;
    if (doc !== undefined) entry.doc = doc;
    if (optional !== undefined) { if (optional) entry.optional = true; else delete entry.optional; }
    if (aliases && aliases.length) entry.aliases = [...new Set([...(prev.aliases || []), ...aliases])];
    symbols[name] = entry;
    if (r.kind && r.kind !== 'function') notes.push(`${r.kind} (not a function: api.fn reads it, api.hook cannot)`);
    if (!r.ok) notes.push(`no unique recipe (${r.why}): works on ${game}, but will not follow a game update by itself`);
    for (const n of names) {
      if (shared[n] && shared[n] !== raw) notes.push(`the shared table has "${n}" = ${shared[n]}; inside this mod "${n}" means ${raw}`);
      else if (shared[n] === raw) notes.push(`the shared table already has "${n}" (same binding) — the mod can use it without its own entry`);
    }
    report.push({ name, ok: true, raw, recipe: r.ok ? r.recipe : null, note: notes.join(' · ') });
  }
  return { src: writeModSymbols(src, symbols), report };
}

/** check every symbol of a mod source against the builds: [{ name, raw, ok, notes, optional, doc }] */
export function checkModSymbols(src, { game, builds, shared = {} }) {
  const symbols = readModSymbols(src);
  return Object.entries(symbols).map(([name, entry]) => {
    const res = checkEntry(name, entry, game, withOwn(builds, symbols, game));
    for (const n of [name, ...(entry.aliases || [])]) if (shared[n] && entry.raw && entry.raw[game] && shared[n] !== entry.raw[game]) res.notes.push(`shadows the shared "${n}" (${shared[n]})`);
    return { ...res, optional: !!entry.optional, doc: entry.doc || '', aliases: entry.aliases || [] };
  });
}

/** record this game version's name for every symbol its recipe finds; { src, report } */
export function portModSymbols(src, { game, builds }) {
  const symbols = readModSymbols(src);
  const report = [];
  const done = new Map();
  // two passes: a recipe that names another of this mod's symbols ("@name@") needs that one found first
  for (let pass = 0; pass < 2; pass++) {
    const models = withOwn(builds, symbols, game);
    for (const [name, entry] of Object.entries(symbols)) {
      if (done.has(name)) continue;
      if (entry.raw && entry.raw[game]) { done.set(name, { name, ok: true, note: `already ${entry.raw[game]}` }); continue; }
      if (!entry.find) { done.set(name, { name, ok: false, note: 'no recipe; add the name for this version with --add' }); continue; }
      const found = models.map(b => matchRecipe(entry.find, b));
      if (found.every(m => m.length === 1 && m[0] === found[0][0])) {
        entry.raw = { ...(entry.raw || {}), [game]: found[0][0] };
        done.set(name, { name, ok: true, note: `found ${found[0][0]}` });
      } else if (pass === 1) done.set(name, { name, ok: false, note: `recipe finds ${found.map(m => m.length).join('/')} bindings — check by hand and use --add` });
    }
  }
  report.push(...done.values());
  return { src: writeModSymbols(src, symbols), report };
}

/** markdown asking for some mod symbols to go into the shared table (with checked recipes) */
export function requestDoc(modId, src, { game, builds, shared = {} }, names = null) {
  const rows = checkModSymbols(src, { game, builds, shared }).filter(r => !names || names.includes(r.name));
  const symbols = readModSymbols(src);
  const kindOf = r => (r.raw && builds[0].decls.get(r.raw) ? builds[0].decls.get(r.raw).kind : 'function');
  const lines = [
    `# ${modId}: 공용 심볼 추가 요청`, '',
    `게임 \`${game}\`에서 확인했어요 (${builds.map(b => b.label).join(', ')} 빌드). 찾는 기준(find)은 tools/symbols-lib.mjs가 만들고 모든 빌드에서 정확히 하나만 찾는 것을 확인했어요.`, '',
    '| 심볼 | 압축 이름 | 종류 | 설명 | 확인 |', '|---|---|---|---|---|',
    ...rows.map(r => `| \`${r.name}\`${r.aliases.length ? ` (${r.aliases.map(a => `\`${a}\``).join(', ')})` : ''} | \`${r.raw || '-'}\` | ${kindOf(r)} | ${r.doc || ''} | ${r.ok ? '정확히 하나' : r.notes.join(' / ')} |`),
    '', '```json',
    JSON.stringify(Object.fromEntries(rows.map(r => [r.name, { name: r.raw, kind: kindOf(r), doc: symbols[r.name].doc || '', find: symbols[r.name].find ? [symbols[r.name].find] : [] }])), null, 2),
    '```', '',
  ];
  const already = rows.filter(r => shared[r.name]);
  if (already.length) lines.push(`이미 공용 표에 있는 이름: ${already.map(r => `\`${r.name}\``).join(', ')}`, '');
  return lines.join('\n');
}
