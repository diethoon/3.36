// Shared pieces of the translation layer: which literals count as player-facing text, how a
// template literal becomes a key with {0},{1} placeholders, and a stable id for every place.
//
// Key format: plain text; {0},{1}… stand for the template's ${…} parts (only digits are slots,
// so the game's own tokens like {p} or {w} stay literal text).
import * as walk from 'acorn-walk';
import { topLevel, skeleton } from './lib.mjs';

// property names whose string values are code, not text
const CODE_KEYS = new Set(['id', 'type', 'kind', 'stage', 'slot', 'className', 'class', 'key', 'tone', 'group', 'tier', 'category',
  'location', 'room', 'phase', 'mood', 'task', 'scene', 'outfit', 'act', 'reason', 'source', 'target', 'emotion', 'trigger',
  'role', 'audience', 'severity', 'hotkey', 'workflow', 'imageTags', 'tags', 'negativeImageTags', 'imageBase', 'imageNegative',
  'prompt', 'negativePrompt', 'href', 'src', 'name', 'style', 'variant', 'mode', 'status', 'archetypeId', 'patronType', 'personas']);
// code keys that sometimes carry a message for the player instead of an id
const MIXED_KEYS = new Set(['reason']);
const isCodeKeyValue = (k, v) => CODE_KEYS.has(k) && !(MIXED_KEYS.has(k) && /\s/.test(String(v).trim()));
const NON_TEXT_CALLS = new Set(['startsWith', 'endsWith', 'includes', 'indexOf', 'lastIndexOf', 'split', 'replace', 'replaceAll',
  'getItem', 'setItem', 'removeItem', 'querySelector', 'querySelectorAll', 'getElementById', 'addEventListener', 'removeEventListener',
  'createElement', 'setAttribute', 'getAttribute', 'has', 'get', 'set', 'delete', 'add', 'matchMedia', 'test', 'match', 'register',
  'error', 'warn', 'log', 'info', 'debug', 'hasOwnProperty', 'getPropertyValue', 'setProperty']);
// standalone tailwind classes; any other word needs a "-", ":", "[" or "/" to count as a class ("min" alone is a word)
const TW_BARE = new Set(['flex', 'grid', 'block', 'inline', 'hidden', 'truncate', 'underline', 'italic', 'uppercase', 'lowercase',
  'capitalize', 'relative', 'absolute', 'fixed', 'sticky', 'static', 'grow', 'shrink', 'border', 'rounded', 'shadow', 'ring', 'outline',
  'transition', 'contents', 'table', 'container', 'invisible', 'visible', 'antialiased', 'isolate', 'resize', 'blur', 'grayscale', 'invert']);
const isCssClass = w => TW_BARE.has(w) || (/[-:\[\/]/.test(w) && (TAILWIND.test(w) || /^[a-z]+(-[a-z0-9.\/\[\]%#]+)+$/.test(w)));
const TAILWIND = /^(-?[a-z]+:)*-?(flex|grid|block|inline|hidden|text|bg|border|rounded|p[xytrbl]?|m[xytrbl]?|gap|space|w|h|min|max|items|justify|self|font|leading|tracking|shadow|ring|opacity|z|top|bottom|left|right|inset|overflow|cursor|select|transition|duration|ease|animate|translate|scale|rotate|absolute|relative|fixed|sticky|truncate|underline|italic|uppercase|lowercase|whitespace|break|object|aspect|col|row|order|grow|shrink|basis|divide|outline|backdrop|blur|fill|stroke|pointer|sr|not|group|peer|tabular|line|list|decoration|content|place|from|via|to)(-|$|\[|\/)/;

// property names whose values are only ever shown to the player
export const DISPLAY_PROPS = new Set(['title', 'label', 'description', 'text', 'hint', 'blurb', 'what', 'how', 'changes', 'raises',
  'lowers', 'children', 'placeholder', 'tooltip', 'summary', 'body', 'message', 'logText', 'askText', 'subtitle', 'heading', 'caption']);
const propOf = (parent, node) => (parent && parent.type === 'Property' && parent.value === node && !parent.computed ? (parent.key.name || parent.key.value) : undefined);

/** Does this look like text a player reads (English prose / labels), rather than an identifier? */
export function looksLikeText(s) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length < 2) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  const padded = /^\s|\s$/.test(s) && /[A-Za-z]{2,}/.test(t) && !/[_\/#@$%]/.test(t);   // " and ", "wants ": sentence pieces
  if (!padded && /^[a-z0-9_.:\/#@$%-]+$/.test(t)) return false;                         // snake/kebab ids, paths
  if (/^[A-Za-z0-9_]+$/.test(t) && /[a-z][A-Z]|_/.test(t)) return false;  // camelCase / SNAKE
  if (/^\d[\d\s.,~–-]*\s?(min|mins|minutes?|hours?|hrs?|days?|nights?|weeks?|gold|g|times|men|people)\b/i.test(t) && /[a-z]{2,}/i.test(t)) return true; // "60-90 min · 5-8g"
  const promptLike = /^(1girl|1boy|2girls|2boys|\d+\s*position|3d\b)/i.test(t) || /\([^()]*:[\d.]+\)/.test(t);  // image prompt tags
  if (/^\d/.test(t) && !promptLike && /\s/.test(t) && (t.match(/[A-Za-z]{3,}/g) || []).length >= 2 && !/[_{}]/.test(t)) return true;               // "80% of what it is worth"
  if (/^(https?:|data:|blob:|#[0-9a-f]{3,8}$|rgba?\(|hsla?\(|var\(|calc\(|translate|scale|rotate|matrix|\d)/i.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.every(isCssClass)) return false;                                                               // css class lists
  if (/^(masterpiece|best quality|score_\d|1girl|1boy|2girls|solo\b)/i.test(t) || /^\([^()]*:[\d.]+\)/.test(t)) return false; // image prompt tags
  if (/[a-z]_[a-z]/.test(t) && /,/.test(t) && !/[.!?"]/.test(t)) return false;                              // tag lists with underscores
  if (/^(?:[a-z][a-z0-9 _'\-:.()]*)(?:,\s*[a-z][a-z0-9 _'\-:.()]*){2,}$/.test(t) && !/[.!?]["']?$/.test(t)) return false; // "a, b, c" tag lists
  return true;
}

export const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

/** Top-level units (declarators / statements) with a structural hash, used for place ids. */
export function units(ast, src) {
  const decls = topLevel(ast);
  const topNames = new Set(decls.map(d => d.name));
  const out = [];
  const seen = new Set();
  for (const d of decls) { const k = d.start + ':' + d.end; if (!seen.has(k)) { seen.add(k); out.push({ start: d.start, end: d.end, name: d.name }); } }
  for (const n of ast.body) if (n.type !== 'FunctionDeclaration' && n.type !== 'ClassDeclaration' && n.type !== 'VariableDeclaration') out.push({ start: n.start, end: n.end, name: null });
  out.sort((a, b) => a.start - b.start);
  for (const u of out) u.hash = fnv((skeleton(src.slice(u.start, u.end), topNames) || []).join(' '));
  return { list: out, topNames };
}

function unitFinder(list) {
  const starts = list.map(u => u.start);
  return pos => {
    let lo = 0, hi = list.length - 1, r = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (starts[m] <= pos) { r = m; lo = m + 1; } else hi = m - 1; }
    return r >= 0 && pos < list[r].end ? r : -1;
  };
}

/**
 * Collect translatable literals of a module.
 * Each item: { start, end, kind: 'string'|'template', key, exprs?, exprRanges?, ctx }
 * ctx = "<unit hash>#<n>.<text hash>": the n-th text of a top-level declaration with that shape. It survives
 * minifier renames, so per-place decisions carry over to builds where that declaration is unchanged.
 * Nested templates are returned too (their parent template lists them inside an expression range).
 */
export function collectTexts(ast, src, u = units(ast, src)) {
  const items = [];
  const isGrammar = grammarDetector(ast);
  walk.fullAncestor(ast, (node, _st, ancestors) => {
    const parent = ancestors[ancestors.length - 2];
    if (node.type === 'Literal' && typeof node.value === 'string') {
      if (!looksLikeText(node.value)) return;
      if (parent && parent.type === 'Property' && parent.key === node && !parent.computed) return;             // object key
      if (parent && parent.type === 'Property' && parent.value === node && !parent.computed && isCodeKeyValue(parent.key.name || parent.key.value, node.value)) return;
      if (parent && parent.type === 'BinaryExpression' && /^([!=]==?|in)$/.test(parent.operator)) return;       // compared value
      if (parent && parent.type === 'SwitchCase') return;
      if (parent && parent.type === 'MemberExpression' && parent.property === node) return;
      if (parent && (parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportAllDeclaration')) return;
      if (parent && parent.type === 'CallExpression' && parent.callee.type === 'MemberExpression' && NON_TEXT_CALLS.has(parent.callee.property.name)) return;
      if (/\{\d+\}/.test(node.value)) return;                                                                  // would collide with slots
      items.push({ start: node.start, end: node.end, kind: 'string', key: node.value, prop: propOf(parent, node) });
    } else if (node.type === 'TemplateLiteral') {
      if (parent && parent.type === 'TaggedTemplateExpression') return;
      const cooked = node.quasis.map(q => q.value.cooked ?? q.value.raw);
      if (cooked.some(c => /\{\d+\}/.test(c))) return;
      const joined = cooked.join(' ');
      const unitsOnly = node.expressions.length > 0 && cooked.every(c => /^[\s~(),·–+×−-]*(?:(?:min|mins|m|h|hr|hrs|g|d)\b[\s)·,.]*)?$/.test(c)) && /[a-z]/.test(cooked.join(''));
      if (!unitsOnly && (!looksLikeText(joined) || !/[A-Za-z]{2,}/.test(cooked.join('')))) return;
      if (parent && parent.type === 'Property' && parent.value === node && !parent.computed && isCodeKeyValue(parent.key.name || parent.key.value, joined)) return;
      if (parent && parent.type === 'BinaryExpression' && /^[!=]==?$/.test(parent.operator)) return;
      let key = '';
      cooked.forEach((c, i) => { key += c; if (i < node.expressions.length) key += `{${i}}`; });
      items.push({
        start: node.start, end: node.end, kind: 'template', key, prop: propOf(parent, node),
        exprs: node.expressions.map(e => src.slice(e.start, e.end)),
        exprRanges: node.expressions.map(e => [e.start, e.end]),
        grammar: node.expressions.map(e => isGrammar(e)),
      });
    }
  });
  items.sort((a, b) => a.start - b.start);
  const find = unitFinder(u.list), count = new Map();
  for (const it of items) {
    const ui = find(it.start);
    const h = ui >= 0 ? u.list[ui].hash : 'top';
    const k = ui >= 0 ? ui : -1;
    const n = count.get(k) || 0;
    count.set(k, n + 1);
    it.ctx = `${h}#${n}.${fnv(it.key)}`;
  }
  return items;
}

/**
 * Every plain string literal with a place id "<unit hash>@<n>.<value hash>" (n counts all string
 * literals of the declaration). Used for "extra" entries: id-looking words the reference
 * translation still translated at that exact place (e.g. lo:"prudish" shown on a slider).
 */
// properties whose values are identifiers the code switches on: never translated, not even at one place
export const STRICT_CODE_PROPS = new Set(['id', 'type', 'kind', 'key', 'slot', 'stage', 'room', 'location', 'phase', 'status', 'mode',
  'role', 'target', 'trigger', 'severity', 'variant', 'archetypeId', 'patronType', 'tone', 'group', 'tier', 'category', 'scene', 'outfit',
  'act', 'emotion', 'task', 'mood', 'className', 'class', 'style', 'href', 'src', 'imageTags', 'tags', 'negativeImageTags', 'imageBase',
  'imageNegative', 'negativePrompt', 'workflow', 'hotkey']);
export function stringPlaces(ast, u) {
  const out = [];
  walk.fullAncestor(ast, (n, _s, anc) => {
    if (n.type !== 'Literal' || typeof n.value !== 'string') return;
    const p = anc[anc.length - 2];
    const prop = p && p.type === 'Property' && p.value === n && !p.computed ? (p.key.name || p.key.value) : undefined;
    out.push({ start: n.start, end: n.end, value: n.value, prop });
  });
  out.sort((a, b) => a.start - b.start);
  const find = unitFinder(u.list), count = new Map();
  for (const it of out) {
    const ui = find(it.start);
    const n = count.get(ui) || 0;
    count.set(ui, n + 1);
    it.lid = `${ui >= 0 ? u.list[ui].hash : 'top'}@${n}.${fnv(it.value)}`;
  }
  return out;
}

/**
 * String values the code relies on (compared, switched on, used as keys or lookups).
 * Translating such a value in one place but not another could change game logic.
 */
export function codeValues(ast) {
  const vals = new Set();
  const lit = n => n && n.type === 'Literal' && typeof n.value === 'string';
  walk.full(ast, n => {
    if (n.type === 'BinaryExpression' && /^([!=]==?|in)$/.test(n.operator)) { if (lit(n.left)) vals.add(n.left.value); if (lit(n.right)) vals.add(n.right.value); }
    else if (n.type === 'SwitchCase' && lit(n.test)) vals.add(n.test.value);
    else if (n.type === 'Property' && !n.computed) {
      if (lit(n.key)) vals.add(n.key.value); else if (n.key.type === 'Identifier') vals.add(n.key.name);
      if (lit(n.value) && isCodeKeyValue(n.key.name || n.key.value, n.value.value)) vals.add(n.value.value);
    } else if (n.type === 'MemberExpression' && n.computed && lit(n.property)) vals.add(n.property.value);
    else if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && NON_TEXT_CALLS.has(n.callee.property.name)) {
      for (const x of n.arguments) if (lit(x)) vals.add(x.value);
      if (n.callee.object.type === 'ArrayExpression') for (const x of n.callee.object.elements) if (lit(x)) vals.add(x.value);
    } else if (n.type === 'ObjectExpression' && n.properties.length > 2 && n.properties.every(q => q.type === 'Property' && !q.computed && q.key.type === 'Literal' && typeof q.key.value === 'number')) {
      for (const q of n.properties) if (lit(q.value)) vals.add(q.value.value);
    } else if (n.type === 'NewExpression' && n.callee.type === 'Identifier' && /^(Set|Map)$/.test(n.callee.name) && n.arguments[0] && n.arguments[0].type === 'ArrayExpression') {
      for (const x of n.arguments[0].elements) if (lit(x)) vals.add(x.value);
    }
  });
  return vals;
}

const GRAMMAR = new Set(['a', 'an', 's', 'es', '', 'is', 'are', 'was', 'were', 'has', 'have', 'does', 'do']);
/**
 * Which ${…} parts of templates only produce English grammar words (articles, plural s, is/are).
 * Korean has no such words, so a translation drops those slots. Returns expr node -> boolean.
 */
export function grammarDetector(ast) {
  const fns = new Set();
  const onlyGrammar = (e, depth = 0) => {
    if (!e || depth > 6) return false;
    if (e.type === 'Literal') return typeof e.value === 'string' && GRAMMAR.has(e.value);
    if (e.type === 'TemplateLiteral') return e.expressions.length === 0 && GRAMMAR.has(e.quasis[0].value.cooked);
    if (e.type === 'ConditionalExpression') return onlyGrammar(e.consequent, depth + 1) && onlyGrammar(e.alternate, depth + 1);
    if (e.type === 'LogicalExpression') return onlyGrammar(e.right, depth + 1) && (e.operator !== '&&' ? onlyGrammar(e.left, depth + 1) : true);
    if (e.type === 'CallExpression' && e.callee.type === 'Identifier') return fns.has(e.callee.name);
    return false;
  };
  // helper functions like Ca(x){ return /^[aeiou]/i.test(x) ? "an" : "a" }
  for (const n of ast.body) {
    const f = n.type === 'FunctionDeclaration' ? n : null;
    if (!f || !f.id || f.body.body.length !== 1 || f.body.body[0].type !== 'ReturnStatement') continue;
    if (onlyGrammar(f.body.body[0].argument)) fns.add(f.id.name);
  }
  return e => onlyGrammar(e);
}

/** Build template-literal source from a translated key ("…{1}…{0}…") and the expressions' source. */
export function buildTemplate(translated, exprs) {
  let out = '`';
  let i = 0;
  while (i < translated.length) {
    const c = translated[i];
    const m = c === '{' ? /^\{(\d+)\}/.exec(translated.slice(i)) : null;
    if (m) {
      const n = Number(m[1]);
      if (n >= exprs.length) throw new Error(`bad placeholder {${n}} in: ${translated}`);
      out += '${' + exprs[n] + '}';
      i += m[0].length;
      continue;
    }
    if (c === '`' || c === '\\') out += '\\' + c;
    else if (c === '$' && translated[i + 1] === '{') out += '\\$';
    else out += c;
    i++;
  }
  return out + '`';
}

/** Placeholders a key uses, e.g. "{1} and {0}" -> [1, 0] */
export function placeholders(key) {
  return [...key.matchAll(/\{(\d+)\}/g)].map(m => Number(m[1]));
}
