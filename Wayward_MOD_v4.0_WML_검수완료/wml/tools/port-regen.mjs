// Regenerate ported mods from their recorded commands (port/regen.json).
//   node tools/port-regen.mjs <id> [<id> …]     regenerate these mods
//   node tools/port-regen.mjs --all             regenerate every ported mod
//   node tools/port-regen.mjs --check [<id> …]  regenerate, compare with the current files, put the current files back:
//                                               shows which mod.js no longer matches its record (hand edits, stale record)
// To change a ported mod, edit its port files (port/<id>.fixes.json / .prelude.js / .post.js, or the bridge source)
// and regenerate; never hand-edit the generated mod.js. A new port: add its command to port/regen.json.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { args } from './lib.mjs';

const wmlDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const record = JSON.parse(fs.readFileSync(path.join(wmlDir, 'port', 'regen.json'), 'utf8')).mods;
const a = args();
const named = [...(typeof a.check === 'string' ? [a.check] : []), ...a._];
const ids = a.all || (a.check && !named.length) ? Object.keys(record) : named;
if (!ids.length) { console.error('usage: <id …> | --all | --check [<id …>]'); process.exit(2); }
const unknown = ids.filter(id => !record[id]);
if (unknown.length) { console.error(`not in port/regen.json: ${unknown.join(', ')}`); process.exit(2); }

// port-inline reads the whole 9-30 game; it needs a big heap
const NODE_ARGS = { 'port-inline': ['--max-old-space-size=12288'], 'wrap-addon': [], 'port-manifest': [] };
const outputs = id => [path.join(wmlDir, 'mods', id, 'mod.js'), ...(record[id].tool === 'port-inline' ? [path.join(wmlDir, 'port', `${id}.names.json`)] : [])];
const read = f => (fs.existsSync(f) ? fs.readFileSync(f) : null);

let bad = 0;
for (const id of ids) {
  const { tool, args: argv } = record[id];
  const files = outputs(id), before = files.map(read);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [...NODE_ARGS[tool], path.join(wmlDir, 'tools', `${tool}.mjs`), ...argv], { cwd: wmlDir, encoding: 'utf8', maxBuffer: 256 << 20 });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  if (r.status !== 0) {
    bad++;
    console.log(`✗ ${id} (${secs}s): ${tool} failed\n${(r.stderr || r.stdout || '').trim().split('\n').slice(-8).join('\n')}`);
    files.forEach((f, i) => { if (before[i]) fs.writeFileSync(f, before[i]); });
    continue;
  }
  if (a.check) {
    const changed = files.filter((f, i) => { const now = read(f); return !(now && before[i] && now.equals(before[i])); });
    files.forEach((f, i) => { if (before[i]) fs.writeFileSync(f, before[i]); else fs.rmSync(f, { force: true }); });
    if (changed.length) bad++;
    console.log(`${changed.length ? '≠' : '='} ${id} (${secs}s)${changed.length ? `: differs from its record — ${changed.map(f => path.relative(wmlDir, f)).join(', ')}` : ''}`);
  } else {
    const changed = files.filter((f, i) => { const now = read(f); return !(now && before[i] && now.equals(before[i])); });
    console.log(`✓ ${id} (${secs}s)${changed.length ? ' changed' : ' unchanged'}`);
  }
}
if (bad) process.exitCode = 1;
