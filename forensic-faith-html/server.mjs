import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const TARGET = path.join(ROOT, 'Wayward_MOD_v4.0_WML_검수완료', 'Wayward_WML_ko.html');
const PORT = Number(process.env.PORT || 10000);
const CHUNK = 4096;
const terms = [
  'webkitdirectory','showDirectoryPicker','FileSystemDirectoryHandle','createObjectURL',
  'image-pack','image pack','imagepack','imagegen','faith','register','mod loader',
  'WML.install','__WAYWARD_IMAGE_PACKS__','image','upload','FileList','webkitRelativePath',
  'IndexedDB','indexedDB','localStorage'
];
let report = {state:'starting'};
function scan() {
  if (!fs.existsSync(TARGET)) throw new Error('Target HTML missing: ' + TARGET);
  const fd = fs.openSync(TARGET, 'r');
  const st = fs.fstatSync(fd);
  const hash = crypto.createHash('sha256');
  const hits = Object.fromEntries(terms.map(t => [t, []]));
  const chunkRecords = [];
  let offset = 0, index = 0, carry = Buffer.alloc(0);
  try {
    while (offset < st.size) {
      const len = Math.min(CHUNK, st.size - offset);
      const b = Buffer.alloc(len);
      const n = fs.readSync(fd, b, 0, len, offset);
      if (n !== len) throw new Error('Short read at offset ' + offset + ': ' + n + '/' + len);
      hash.update(b);
      chunkRecords.push({index, offset, length:n, sha256:crypto.createHash('sha256').update(b).digest('hex')});
      const scanBuf = Buffer.concat([carry, b]);
      const base = offset - carry.length;
      const low = scanBuf.toString('latin1').toLowerCase();
      for (const term of terms) {
        const needle = term.toLowerCase();
        let p = 0;
        while ((p = low.indexOf(needle, p)) !== -1) {
          const absolute = base + p;
          const arr = hits[term];
          if (!arr.length || arr[arr.length-1] !== absolute) {
            if (arr.length < 1000) arr.push(absolute);
          }
          p += 1;
        }
      }
      carry = scanBuf.subarray(Math.max(0, scanBuf.length - 128));
      offset += n;
      index += 1;
    }
  } finally { fs.closeSync(fd); }
  if (offset !== st.size || chunkRecords.length === 0 ||
      chunkRecords[chunkRecords.length-1].offset + chunkRecords[chunkRecords.length-1].length !== st.size) {
    throw new Error('EOF coverage mismatch');
  }
  const excerpts = [];
  const wanted = [
    'webkitdirectory','showDirectoryPicker','FileSystemDirectoryHandle','createObjectURL',
    'image-pack','image pack','imagepack','imagegen','WML.install','__WAYWARD_IMAGE_PACKS__',
    'webkitRelativePath','IndexedDB','indexedDB'
  ];
  const seen = new Set();
  for (const term of wanted) {
    for (const pos of (hits[term] || []).slice(0, 40)) {
      const key = term + ':' + pos;
      if (seen.has(key)) continue;
      seen.add(key);
      const start = Math.max(0, pos - 180), length = Math.min(700, st.size - start);
      const buf = Buffer.alloc(length);
      const fd2 = fs.openSync(TARGET, 'r');
      try { fs.readSync(fd2, buf, 0, length, start); } finally { fs.closeSync(fd2); }
      excerpts.push({term, offset:pos, chunk:Math.floor(pos/CHUNK), start, length, text:buf.toString('utf8').replace(/[\r\n\t]+/g,' ')});
    }
  }
  return {
    state:'complete', source:path.relative(ROOT,TARGET), bytes:st.size,
    chunkSize:CHUNK, chunkCount:chunkRecords.length, eofReached:true,
    sha256:hash.digest('hex'),
    finalChunk:chunkRecords[chunkRecords.length-1],
    keywordOffsets:Object.fromEntries(Object.entries(hits).map(([k,v])=>[k,{count:v.length,first:v.slice(0,100)}])),
    excerpts,
    chunkManifest:chunkRecords
  };
}
const syntax = spawnSync(process.execPath, ['--check', path.join(ROOT, 'forensic-faith-html/mod-prototype.js')], { encoding:'utf8' });
console.log('[MOD-SYNTAX-CHECK]', JSON.stringify({status:syntax.status,stdout:syntax.stdout,stderr:syntax.stderr}));
try { report = scan(); console.log('[FORENSIC-SCAN]', JSON.stringify({
  state:report.state, source:report.source, bytes:report.bytes,
  chunkSize:report.chunkSize, chunkCount:report.chunkCount,
  eofReached:report.eofReached, sha256:report.sha256,
  finalChunk:report.finalChunk, keywordCounts:Object.fromEntries(Object.entries(report.keywordOffsets).map(([k,v])=>[k,v.count])),
  excerptCount:report.excerpts.length
}));
  for (const item of report.excerpts) console.log('[FORENSIC-EXCERPT]', JSON.stringify(item));
  for (const term of ['webkitdirectory','showDirectoryPicker','image pack','imagegen','faith','__WAYWARD_IMAGE_PACKS__','webkitRelativePath','IndexedDB','indexedDB','localStorage']) console.log('[FORENSIC-HITS]', term, JSON.stringify(report.keywordOffsets[term]));
  for (const index of [1348,1349,1350,1351,1352]) { const start=index*CHUNK; if(start>=report.bytes) continue; const len=Math.min(CHUNK,report.bytes-start); const fd=fs.openSync(TARGET,'r'), b=Buffer.alloc(len); try{fs.readSync(fd,b,0,len,start);}finally{fs.closeSync(fd);} console.log('[FORENSIC-CHUNK]', index, start, b.toString('utf8')); }
} catch (e) { report = {state:'error',error:String(e.stack||e)}; console.error('[FORENSIC-SCAN-ERROR]',report.error); }
const server = http.createServer((req,res) => {
  const u = new URL(req.url || '/', 'http://localhost');
  res.setHeader('cache-control','no-store');
  res.setHeader('access-control-allow-origin','*');
  if (u.pathname === '/healthz') {
    res.writeHead(report.state==='complete'?200:500,{'content-type':'application/json; charset=utf-8'});
    return res.end(JSON.stringify({state:report.state,source:report.source,bytes:report.bytes,chunkSize:CHUNK,chunkCount:report.chunkCount,eofReached:report.eofReached,error:report.error||null}));
  }
  if (u.pathname === '/report') {
    res.writeHead(report.state==='complete'?200:500,{'content-type':'application/json; charset=utf-8'});
    const {chunkManifest, ...publicReport} = report;
    return res.end(JSON.stringify(publicReport));
  }
  if (u.pathname === '/manifest') {
    res.writeHead(report.state==='complete'?200:500,{'content-type':'application/json; charset=utf-8'});
    return res.end(JSON.stringify(report.chunkManifest || []));
  }
  if (u.pathname === '/chunk') {
    const raw = Number(u.searchParams.get('offset') || 0);
    if (!Number.isSafeInteger(raw) || raw < 0 || raw >= (report.bytes || 0)) {
      res.writeHead(416,{'content-type':'application/json'}); return res.end(JSON.stringify({error:'offset out of range',bytes:report.bytes||0}));
    }
    const len = Math.min(CHUNK, report.bytes - raw);
    const fd = fs.openSync(TARGET,'r'), b=Buffer.alloc(len);
    try { fs.readSync(fd,b,0,len,raw); } finally { fs.closeSync(fd); }
    res.writeHead(200,{'content-type':'application/octet-stream','x-byte-offset':String(raw),'x-byte-length':String(len),'x-chunk-size':String(CHUNK)});
    return res.end(b);
  }
  res.writeHead(200,{'content-type':'application/json; charset=utf-8'});
  res.end(JSON.stringify({service:'Wayward Faith HTML byte forensic scanner',state:report.state,endpoints:['/healthz','/report','/manifest','/chunk?offset=0'],chunkSize:CHUNK}));
});
server.listen(PORT,'0.0.0.0',()=>console.log('[FORENSIC-SERVER] listening on '+PORT));
