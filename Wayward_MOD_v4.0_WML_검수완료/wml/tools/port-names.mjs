// Map minified top-level names of one game build to another (for porting old addons).
//   node tools/port-names.mjs --from old.html --to new.html --names re,g,Y,... [--names-file list.txt] [--out map.json]
// For every requested old name: exact structural match (unique, or ranked by what it references),
// equal literal constant, or fuzzy similarity near the same bundle position. Each result carries how
// it was found and a score; anything below 0.9 should be looked at.
import fs from 'node:fs';
import * as acorn from 'acorn';
import { readGame, parseModule, topLevel, skeleton, similarity, args } from './lib.mjs';

const a = args();
if (!a.from || !a.to || (!a.names && !a['names-file'])) {
  console.error('usage: node tools/port-names.mjs --from old.html --to new.html --names a,b,c | --names-file list.txt [--out map.json]');
  process.exit(2);
}
const wanted = [...new Set([
  ...String(a.names || '').split(',').map(s => s.trim()).filter(Boolean),
  ...(a['names-file'] ? fs.readFileSync(a['names-file'], 'utf8').split(/[\s,]+/).filter(Boolean) : []),
])];

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
  for (const d of decls) { if (!byKey.has(d.key)) byKey.set(d.key, []); byKey.get(d.key).push(d); }
  return { g, decls, byName, byKey, names };
}

console.error('reading builds…');
const oldIx = index(a.from), newIx = index(a.to);

// anchors: shapes unique on both sides
const rename = new Map();
for (const [key, olds] of oldIx.byKey) {
  const news = newIx.byKey.get(key);
  if (olds.length === 1 && news && news.length === 1 && olds[0].skel.length > 6) rename.set(olds[0].name, news[0].name);
}
const litNew = new Map();
for (const d of newIx.decls) if (d.literal) litNew.set(d.literal, [...(litNew.get(d.literal) || []), d]);
const refScore = (od, nd) => {
  const expected = od.refs.map(n => rename.get(n)).filter(Boolean);
  if (!expected.length) return 0;
  const have = new Set(nd.refs);
  return expected.filter(n => have.has(n)).length / expected.length;
};
const nearest = (od, list) => [...list].sort((x, y) => Math.abs(x.order - od.order) - Math.abs(y.order - od.order));

function resolveOne(name) {
  const od = oldIx.byName.get(name);
  if (!od) return { status: 'not-in-old' };
  if (rename.has(name)) return { name: rename.get(name), how: 'exact', score: 1 };
  if (od.literal && litNew.has(od.literal)) {
    const c = litNew.get(od.literal).filter(d => d.kind === od.kind);
    if (c.length) return { name: nearest(od, c)[0].name, how: c.length === 1 ? 'literal' : `literal×${c.length}`, score: c.length === 1 ? 1 : 0.85 };
  }
  const exact = newIx.byKey.get(od.key) || [];
  if (exact.length) {
    const ranked = exact.map(d => [d, refScore(od, d)]).sort((x, y) => y[1] - x[1] || Math.abs(x[0].order - od.order) - Math.abs(y[0].order - od.order));
    const clear = ranked.length === 1 || ranked[0][1] > ranked[1][1];
    return { name: ranked[0][0].name, how: `exact×${exact.length}/${clear ? 'refs' : 'position'}`, score: ranked.length === 1 ? 1 : clear ? 0.95 : 0.8 };
  }
  const len = od.skel.length;
  let best = null, bestScore = 0, second = 0;
  for (const d of newIx.decls) {
    if ((d.kind === 'function') !== (od.kind === 'function')) continue;
    const l = d.skel.length;
    if (l < len * 0.5 || l > len * 2) continue;
    if (Math.abs(d.order - od.order) > 0.25) continue;
    const s = similarity(od.skel, d.skel) * 0.75 + refScore(od, d) * 0.25 - Math.abs(d.order - od.order) * 0.1;
    if (s > bestScore) { second = bestScore; bestScore = s; best = d; } else if (s > second) second = s;
  }
  if (best && bestScore >= 0.45) return { name: best.name, how: `fuzzy (next ${second.toFixed(2)})`, score: Math.round(bestScore * 100) / 100 };
  return { status: 'unmatched' };
}

// two passes: confident answers become anchors for the rest
const result = {};
for (let pass = 0; pass < 2; pass++) {
  for (const n of wanted) {
    const r = resolveOne(n);
    result[n] = r;
    if (r.name && r.score >= 0.9) rename.set(n, r.name);
  }
}
const rows = wanted.map(n => {
  const r = result[n];
  const head = d => d ? d.src.slice(0, 90).replace(/\s+/g, ' ') : '';
  return { old: n, ...r, oldHead: head(oldIx.byName.get(n)), newHead: r.name ? head(newIx.byName.get(r.name)) : '' };
});
const out = { from: oldIx.g.version, to: newIx.g.version, generated: new Date().toISOString(), map: Object.fromEntries(rows.filter(r => r.name).map(r => [r.old, r.name])), detail: rows };
if (a.out) fs.writeFileSync(a.out, JSON.stringify(out, null, 1));
for (const r of rows) console.log(`${(r.score >= 0.9 ? 'ok   ' : r.name ? 'CHECK' : 'MISS ')} ${r.old.padEnd(6)} -> ${(r.name || r.status || '').padEnd(6)} ${String(r.how || '').padEnd(22)} ${r.score ?? ''}`);
console.log(`\n${rows.filter(r => r.score >= 0.9).length} sure, ${rows.filter(r => r.name && r.score < 0.9).length} to check, ${rows.filter(r => !r.name).length} missing (anchors ${rename.size})`);
