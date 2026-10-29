'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const p = 'Wayward_MOD_v4.0_WML_검수완료/Wayward_WML_ko.html';
const b = fs.readFileSync(p);
const sha = crypto.createHash('sha256').update(b).digest('hex');
if (b.length !== 6742653 || sha !== '44874ecddaa7fad0e7b1b6d9b4450e17ca3f7f279c92896cdc742824d0c881ec') {
  throw new Error('The source fingerprint changed; refusing forensic extraction.');
}
const terms = [
  'function WOe', 'WOe(', 'function YOe', 'YOe(', 'function ak(e)', 'ak(',
  'function qD()', 'm312ImageChanged', '__WAYWARD_IMAGE_PACKS__',
  '__WF_OUTFIT_PACKS__', 'imageBackendMode', 'baseUrl', 'imagePath',
  'source:"server"', 'new Set(o.map'
];
function findAll(term) {
  const needle = Buffer.from(term);
  const out = [];
  let from = 0, offset;
  while ((offset = b.indexOf(needle, from)) >= 0) {
    out.push(offset);
    from = offset + Math.max(1, needle.length);
  }
  return out;
}
const lines = [
  'FILE ' + p, 'BYTES ' + b.length, 'SHA256 ' + sha,
  'CHUNK_SIZE 4096 CHUNK_COUNT ' + Math.ceil(b.length / 4096), ''
];
for (const term of terms) {
  const offsets = findAll(term);
  lines.push('OFFSETS ' + JSON.stringify(term) + ' count=' + offsets.length + ' ' + offsets.slice(0, 30).join(','));
}
lines.push('');
const probes = [
  ['WOE_DEFINITION', 'function WOe', 1],
  ['WOE_CALL', 'WOe(', 8],
  ['YOE_DEFINITION', 'function YOe', 1],
  ['YOE_CALL', 'YOe(', 5],
  ['RESOLVER', 'function ak(e)', 2],
  ['AK_CALL_SITES', 'ak(', 20],
  ['Q_RESET', 'function qD()', 2],
  ['IMAGE_CHANGED', 'm312ImageChanged', 6],
  ['NATIVE_PACK_REGISTRY', '__WAYWARD_IMAGE_PACKS__', 2],
  ['IMAGE_BACKEND_MODE', 'imageBackendMode', 4],
  ['PACK_MERGE', 'source:"server"', 2]
];
for (const [label, term, limit] of probes) {
  for (const offset of findAll(term).slice(0, limit)) {
    const start = Math.max(0, offset - 500);
    const end = Math.min(b.length, offset + 1700);
    lines.push('');
    lines.push('CONTEXT ' + label + ' offset=' + offset);
    lines.push(b.subarray(start, end).toString('utf8').replace(/\r?\n/g, ' '));
  }
}
fs.mkdirSync('forensic-output', { recursive: true });
fs.writeFileSync('forensic-output/native-code-contexts.txt', lines.join('\n') + '\n');
for (const line of lines) if (/^(FILE |BYTES |SHA256 |CHUNK_SIZE |OFFSETS )/.test(line)) console.log(line);
console.log('Native minified function contexts saved; source fingerprint verified; source HTML not printed.');
