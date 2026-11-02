// Port a semantic symbol table from one game build to another.
//   node tools/port-symbols.mjs --from <old.html> --symbols symbols/<old>.json --to <new.html> [--out symbols/<new>.json]
//
// Resolution order per symbol:
//   1. `find` regex patterns in the table (written against stable English action names / property names)
//   2. literal-valued consts (e.g. "player") – nearest by bundle position when several share a value
//   3. identical structural fingerprint (minified names + text ignored)
//   4. reference agreement: the candidate whose referenced globals match the old ones (via a bundle-wide rename map)
//   5. fuzzy 4-gram similarity
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import { readGame, parseModule, topLevel, skeleton, similarity, writeJsonJs, args } from './lib.mjs';

const a = args();
if (!a.from || !a.symbols || !a.to) {
  console.error('usage: node tools/port-symbols.mjs --from old.html --symbols symbols/old.json --to new.html [--out symbols/new.json]');
  process.exit(2);
}

function refsOf(src, names) {
  const out = [];
  let prev = null;
  try {
    for (const tok of acorn.tokenizer(src, { ecmaVersion: 'latest', sourceType: 'module' })) {
      if (tok.type.label === 'name' && prev !== '.' && prev !== '?.' && names.has(tok.value)) out.push(tok.value);
      prev = tok.type.label;
    }
  } catch { /* partial refs are fine */ }
  return out;
}

function index(file) {
  const g = readGame(file);
  const decls = topLevel(parseModule(g.module));
  const names = new Set(decls.map(d => d.name));
  const byName = new Map();
  decls.forEach((d, i) => {
    d.order = i / decls.length;
    d.src = g.module.slice(d.start, d.end);
    d.skel = skeleton(d.src, names) || [];
    d.key = d.skel.join(' ');
    d.literal = d.init && d.init.type === 'Literal' ? JSON.stringify(d.init.value) : null;
    d.refs = refsOf(d.src, names).filter(n => n !== d.name);
    if (!byName.has(d.name)) byName.set(d.name, d);
  });
  const byKey = new Map();
  for (const d of decls) {
    if (!byKey.has(d.key)) byKey.set(d.key, []);
    byKey.get(d.key).push(d);
  }
  return { g, decls, byName, byKey, names };
}

const oldIx = index(a.from);
const newIx = index(a.to);
const table = JSON.parse(fs.readFileSync(a.symbols, 'utf8'));

// bundle-wide rename map from shapes that are unique on both sides
const rename = new Map();
for (const [key, olds] of oldIx.byKey) {
  const news = newIx.byKey.get(key);
  if (olds.length === 1 && news && news.length === 1 && olds[0].skel.length > 6) rename.set(olds[0].name, news[0].name);
}
// literal consts with a unique value on both sides also anchor the map
const litOld = new Map(), litNew = new Map();
for (const d of oldIx.decls) if (d.literal) litOld.set(d.literal, [...(litOld.get(d.literal) || []), d]);
for (const d of newIx.decls) if (d.literal) litNew.set(d.literal, [...(litNew.get(d.literal) || []), d]);

const refScore = (od, nd) => {
  if (!od.refs.length) return 0;
  const expected = od.refs.map(n => rename.get(n)).filter(Boolean);
  if (!expected.length) return 0;
  const have = new Set(nd.refs);
  return expected.filter(n => have.has(n)).length / expected.length;
};
const nearest = (od, list) => [...list].sort((x, y) => Math.abs(x.order - od.order) - Math.abs(y.order - od.order));

function viaPatterns(entry) {
  for (const f of entry.find || []) {
    if (f.re) {
      const ms = [...newIx.g.module.matchAll(new RegExp(f.re, 'g'))].map(m => m[1]);
      const uniq = [...new Set(ms)];
      if (uniq.length === 1 && newIx.byName.has(uniq[0])) return { d: newIx.byName.get(uniq[0]), how: 'pattern' };
    }
    if (f.mostUsed) {
      // e.g. "{X}.jsx(" -> the global used most often in that position
      const re = new RegExp('(?<![\\w$.])([A-Za-z_$][\\w$]*)' + f.mostUsed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\{X\\}', ''), 'g');
      const counts = new Map();
      for (const m of newIx.g.module.matchAll(re)) counts.set(m[1], (counts.get(m[1]) || 0) + 1);
      const best = [...counts].sort((x, y) => y[1] - x[1])[0];
      if (best && newIx.byName.has(best[0])) return { d: newIx.byName.get(best[0]), how: 'usage' };
    }
  }
  return null;
}

const out = { game: newIx.g.version, portedFrom: table.game, generated: new Date().toISOString(), symbols: {} };
const report = [];
// pass 1: pattern-anchored symbols first, so their renames help reference matching in pass 2
const entries = Object.entries(table.symbols).sort((x, y) => (y[1].find ? 1 : 0) - (x[1].find ? 1 : 0));
for (const [sem, entry] of entries) {
  const od = oldIx.byName.get(entry.name);
  let pick = null, how = '', score = 0;
  const p = viaPatterns(entry);
  if (p) { pick = p.d; how = p.how; score = 1; }
  if (!pick && !od) { report.push(['MISSING-OLD', sem, entry.name]); continue; }
  if (!pick && od.literal && litNew.has(od.literal)) {
    const c = litNew.get(od.literal).filter(d => d.kind === od.kind);
    if (c.length) { pick = nearest(od, c)[0]; how = c.length === 1 ? 'literal' : `literal×${c.length}/position`; score = c.length === 1 ? 1 : 0.9; }
  }
  if (!pick) {
    const exact = newIx.byKey.get(od.key) || [];
    if (exact.length === 1) { pick = exact[0]; how = 'exact'; score = 1; }
    else if (exact.length > 1) {
      const ranked = exact.map(d => [d, refScore(od, d)]).sort((x, y) => y[1] - x[1] || Math.abs(x[0].order - od.order) - Math.abs(y[0].order - od.order));
      pick = ranked[0][0];
      how = ranked[0][1] > 0 && ranked[0][1] > (ranked[1] ? ranked[1][1] : 0) ? `exact×${exact.length}/refs` : `exact×${exact.length}/position`;
      score = how.endsWith('refs') ? 0.95 : 0.8;
    }
  }
  if (!pick) {
    const len = od.skel.length;
    let best = null, bestScore = 0;
    for (const d of newIx.decls) {
      if ((d.kind === 'function') !== (od.kind === 'function')) continue;
      const l = d.skel.length;
      if (l < len * 0.6 || l > len * 1.6) continue;
      const s = similarity(od.skel, d.skel) * 0.8 + refScore(od, d) * 0.2 - Math.abs(d.order - od.order) * 0.05;
      if (s > bestScore) { bestScore = s; best = d; }
    }
    if (best && bestScore >= 0.5) { pick = best; how = 'fuzzy'; score = Math.round(bestScore * 100) / 100; }
  }
  if (!pick) { report.push(['UNMATCHED', sem, entry.name]); continue; }
  out.symbols[sem] = { ...entry, name: pick.name, kind: pick.kind, match: how, score };
  if (od && score >= 0.9) rename.set(od.name, pick.name);
  report.push([score >= 0.9 ? 'ok' : 'CHECK', sem, `${entry.name || '?'} -> ${pick.name}`, how, score]);
}

// two semantic names on one global is almost always a mistake
const seen = new Map();
for (const [sem, e] of Object.entries(out.symbols)) {
  if (seen.has(e.name)) report.push(['DUPLICATE', sem, `${e.name} also used by ${seen.get(e.name)}`]);
  else seen.set(e.name, sem);
}

out.symbols = Object.fromEntries(Object.keys(table.symbols).filter(k => out.symbols[k]).map(k => [k, out.symbols[k]]));
const outFile = a.out || path.join(path.dirname(a.symbols), `${newIx.g.version}.json`);
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
writeJsonJs(outFile.replace(/\.json$/, '.js'), 'WML.symbols', out);
for (const r of report) console.log(r.join('\t'));
const bad = report.filter(r => r[0] !== 'ok').length;
console.log(`\nrename map: ${rename.size} globals matched across builds`);
console.log(`${Object.keys(out.symbols).length}/${Object.keys(table.symbols).length} ported -> ${outFile}${bad ? `  (${bad} need a look)` : ''}`);
