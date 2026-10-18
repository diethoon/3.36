// Build a modded game HTML from the untouched vanilla build.
//   node tools/build.mjs [--game ../wayward-YYYY-MM-DD.html] [--out ../Wayward_WML.html] [--lang ko]
//
// The only change to the game module: its final render statement is wrapped by a bridge that
// (1) exposes every top-level binding through getters/setters so mods can read and hook them, and
// (2) lets WML load mods before the first render. Everything else is added as separate <script> files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGame, parseModule, topLevel, MODULE_TAG, LOADER_MARK, args } from './lib.mjs';
import { applyTranslation, applyCodeFixes } from './i18n-apply.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const wmlDir = path.resolve(here, '..');
const gameDir = path.resolve(wmlDir, '..');
const a = args();

function newestGame() {
  const files = fs.readdirSync(gameDir).filter(f => /^wayward-\d{4}-\d{2}-\d{2}\.html$/.test(f)).sort();
  if (files.length) return path.join(gameDir, files[files.length - 1]);
  // no vanilla file kept: the English WML build holds the exact original (lib.mjs unwraps it)
  if (fs.existsSync(path.join(gameDir, 'Wayward_WML.html'))) return path.join(gameDir, 'Wayward_WML.html');
  throw new Error(`no wayward-YYYY-MM-DD.html (or Wayward_WML.html) in ${gameDir}`);
}

const gameFile = a.game ? path.resolve(a.game) : newestGame();
const outFile = a.out ? path.resolve(a.out) : path.join(gameDir, a.lang ? `Wayward_WML_${a.lang}.html` : 'Wayward_WML.html');
const g = readGame(gameFile);
let module = g.module;
if (module.includes('WML_BRIDGE_BEGIN')) throw new Error('input still contains a WML bridge; use the vanilla file or Wayward_WML.html');

const report = { game: g.version, input: path.basename(gameFile), output: path.basename(outFile), lang: a.lang || 'en' };

// 1. translation layer (optional) — string literals are swapped before anything else
if (a.lang) {
  const r = applyTranslation(module, path.join(wmlDir, 'i18n', a.lang), { style: a.style, version: g.version });
  module = r.module;
  report.i18n = r.stats;
  // the few places where the game's code itself assumes English (i18n/<lang>/code.json)
  const c = applyCodeFixes(module, path.join(wmlDir, 'i18n', a.lang));
  module = c.module;
  if (c.stats.length) report.codeFixes = c.stats;
}

// 2. bridge around the final render statement
const ast = parseModule(module);
const last = ast.body[ast.body.length - 1];
const lastSrc = module.slice(last.start, last.end);
if (last.type !== 'ExpressionStatement' || !lastSrc.includes('.createRoot(')) {
  throw new Error('the game module no longer ends with its createRoot(...).render(...) call; the bridge needs updating');
}
const decls = topLevel(ast);
const seen = new Set();
const props = [];
for (const d of decls) {
  if (seen.has(d.name)) continue;
  seen.add(d.name);
  const n = d.name;
  props.push(d.kind === 'const' ? `${JSON.stringify(n)}:{get:()=>${n},enumerable:!0}` : `${JSON.stringify(n)}:{get:()=>${n},set:v=>{${n}=v},enumerable:!0}`);
}
const bridge = [
  `/* WML_BRIDGE_BEGIN ${g.version} lang=${a.lang || 'en'} */`,
  `const __wmlE=Object.create(null);Object.defineProperties(__wmlE,{${props.join(',')}});`,
  `const __wmlRender=()=>{${lastSrc}};`,
  `(globalThis.__WML__&&typeof globalThis.__WML__.boot==="function")?globalThis.__WML__.boot({game:${JSON.stringify(g.version)},engine:__wmlE,render:__wmlRender}):__wmlRender();`,
  `/* WML_BRIDGE_END */`,
].join('\n');
module = module.slice(0, last.start) + bridge + module.slice(last.end);
parseModule(module); // must still parse
report.bindings = props.length;

// 3. loader scripts before the game module
const symbolsJs = `wml/symbols/${g.version}.js`;
if (!fs.existsSync(path.join(gameDir, symbolsJs))) console.warn(`! ${symbolsJs} missing — run tools/port-symbols.mjs for this build`);
if (!fs.existsSync(path.join(wmlDir, 'mods', 'mods.js'))) fs.writeFileSync(path.join(wmlDir, 'mods', 'mods.js'), 'WML.enable([\n]);\n');
const langRuntime = a.lang && fs.existsSync(path.join(wmlDir, 'i18n', a.lang, 'runtime.js')) ? `wml/i18n/${a.lang}/runtime.js` : null;
const loader = [
  LOADER_MARK,
  ...(langRuntime ? ['finals.js', 'display.js', 'voice.js'].filter(f => fs.existsSync(path.join(wmlDir, 'i18n', a.lang, f))).map(f => `<script src="wml/i18n/${a.lang}/${f}"></script>`) : []),
  ...(langRuntime ? [`<script src="${langRuntime}"></script>`] : []),
  '<script src="wml/runtime/wml-core.js"></script>',
  `<script src="${symbolsJs}"></script>`,
  '<script src="wml/mods/mods.js"></script>',
  '',
].join('\n');
let html = g.html.slice(0, g.tagAt) + loader + MODULE_TAG + module + g.html.slice(g.end);
if (a.lang) html = html.replace(/<html lang="[^"]*"/, `<html lang="${a.lang}"`);
fs.writeFileSync(outFile, html);
report.bytes = Buffer.byteLength(html);
console.log(JSON.stringify(report, null, 1));
