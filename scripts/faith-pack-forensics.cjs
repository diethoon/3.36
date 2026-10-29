'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const sourcePath = 'Wayward_MOD_v4.0_WML_검수완료/Wayward_WML_ko.html';
const expected = {
  bytes: 6742653,
  sha256: '44874ecddaa7fad0e7b1b6d9b4450e17ca3f7f279c92896cdc742824d0c881ec',
  gitBlob: '5019286cd14be6cb2546fea06b2d63fbc2b93157'
};
const bytes = fs.readFileSync(sourcePath);
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlob = execFileSync('git', ['rev-parse', 'HEAD:' + sourcePath], { encoding: 'utf8' }).trim();
const chunkDir = 'forensic-output';
fs.mkdirSync(chunkDir, { recursive: true });

const chunkLines = ['offset\tlength\tsha256'];
for (let offset = 0; offset < bytes.length; offset += 4096) {
  const chunk = bytes.subarray(offset, Math.min(offset + 4096, bytes.length));
  chunkLines.push(String(offset) + '\t' + chunk.length + '\t' +
    crypto.createHash('sha256').update(chunk).digest('hex'));
}
fs.writeFileSync(path.join(chunkDir, 'chunk-sha256.tsv'), chunkLines.join('\n') + '\n');

const terms = [
  '__WF_OUTFIT_PACKS__',
  '__WAYWARD_IMAGE_PACKS__',
  'image-packs',
  'pack.js',
  'function WOe',
  'window.WOe',
  'function qD',
  'window.qD',
  'm312ImageChanged',
  'window.m312ImageChanged',
  'wf-outfit-packs-changed',
  'imagePath',
  'function ak',
  'function YOe',
  'baseUrl',
  'packFormat',
  'imageType',
  'characterId',
  'window.At',
  'imageBackendMode'
];
const report = [
  'FILE ' + sourcePath,
  'BYTES ' + bytes.length,
  'SHA256 ' + sha256,
  'GIT_BLOB_SHA ' + gitBlob,
  'CHUNK_SIZE 4096',
  'CHUNK_COUNT ' + (chunkLines.length - 1),
  'EXPECTED_BYTES_MATCH ' + (bytes.length === expected.bytes),
  'EXPECTED_SHA256_MATCH ' + (sha256 === expected.sha256),
  'EXPECTED_GIT_BLOB_MATCH ' + (gitBlob === expected.gitBlob),
  ''
];

function occurrences(needle) {
  const term = Buffer.from(needle, 'utf8');
  const found = [];
  let from = 0, count = 0, pos;
  while ((pos = bytes.indexOf(term, from)) !== -1) {
    count++;
    if (found.length < 100) found.push(pos);
    from = pos + Math.max(1, term.length);
  }
  return { count, offsets: found };
}

for (const term of terms) {
  const result = occurrences(term);
  report.push('TERM ' + JSON.stringify(term) + ' count=' + result.count +
    ' byteOffsets=' + result.offsets.join(','));
  for (const offset of result.offsets.slice(0, 4)) {
    const start = Math.max(0, offset - 600);
    const end = Math.min(bytes.length, offset + 1200);
    report.push('CONTEXT ' + JSON.stringify(term) + ' byteOffset=' + offset);
    report.push(bytes.subarray(start, end).toString('utf8').replace(/\r?\n/g, ' '));
  }
  report.push('');
}

const wo = bytes.indexOf(Buffer.from('function WOe', 'utf8'));
if (wo >= 0) {
  const scriptOpen = bytes.lastIndexOf(Buffer.from('<script', 'utf8'), wo);
  const tagEnd = scriptOpen >= 0 ? bytes.indexOf(Buffer.from('>', 'utf8'), scriptOpen) : -1;
  report.push('WOE_SCRIPT_OPEN_BYTE_OFFSET ' + scriptOpen);
  report.push('WOE_SCRIPT_TAG ' + (scriptOpen >= 0 && tagEnd >= 0
    ? bytes.subarray(scriptOpen, Math.min(tagEnd + 1, scriptOpen + 600)).toString('utf8')
    : 'not found'));
  if (scriptOpen >= 0 && tagEnd >= 0) {
    report.push('WOE_SCRIPT_START_CONTEXT ' +
      bytes.subarray(tagEnd + 1, Math.min(tagEnd + 1000, bytes.length)).toString('utf8').replace(/\r?\n/g, ' '));
  }
}
report.push('');
if (bytes.length !== expected.bytes || sha256 !== expected.sha256 || gitBlob !== expected.gitBlob) {
  report.push('FATAL: Source fingerprint does not match the expected target HTML.');
  fs.writeFileSync(path.join(chunkDir, 'forensic-report.txt'), report.join('\n') + '\n');
  process.exit(2);
}
fs.writeFileSync(path.join(chunkDir, 'forensic-report.txt'), report.join('\n') + '\n');
console.log(report.filter(line => /^(FILE |BYTES |SHA256 |GIT_BLOB_SHA |CHUNK_|EXPECTED_|TERM |WOE_SCRIPT_)/.test(line)).join('\n'));
console.log('Full source contexts and every 4096-byte chunk SHA256 were written to forensic-output/; source HTML was not printed.');
