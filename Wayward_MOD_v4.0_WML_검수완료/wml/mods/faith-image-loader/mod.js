// Faith 이미지팩 로더 — 폴더와 ZIP 이미지팩을 등록하고, ZIP 내부 이미지도 필요할 때 직접 연결합니다.
WML.define({
  id: 'faith-image-loader',
  name: 'Faith 이미지팩 로더',
  version: '1.2.0',
  game: 'faith',
  description: '폴더와 Faith outfit ZIP(pack.js + WebP) 이미지팩을 등록하고 출력합니다.',
  async setup(api) {
    const h = api.ui.h;
    let win = null;
    let statusEl = null;
    let packListEl = null;
    let busy = false;
    let fallbackInput = null;
    let zipInput = null;
    let nativeScan = null;
    let lastSuccessfulNames = [];

    function findNativeScanner() {
      const engine = api.engine || {};
      if (typeof engine.wfPackScanFolder === 'function') return engine.wfPackScanFolder;
      for (const [key, value] of Object.entries(engine)) {
        if (typeof value !== 'function') continue;
        if (key === 'wfPackScanFolder' || value.name === 'wfPackScanFolder') return value;
      }
      return null;
    }

    nativeScan = findNativeScanner();

    // 원본 게임이 보유한 이미지팩 카탈로그를 읽기 전용으로 확인합니다.
    function readNativePacks() {
      const roots = [api.engine, window];
      const candidates = [];
      for (const root of roots) {
        if (!root) continue;
        for (const key of ['wfImagePacks', '__WAYWARD_IMAGE_PACKS__', 'imagePacks', 'image_packs']) {
          try { if (root[key]) candidates.push(root[key]); } catch (_) {}
        }
        try {
          for (const [key, value] of Object.entries(root)) {
            if (/wfImagePacks|WAYWARD_IMAGE_PACKS/i.test(key) && value) candidates.push(value);
          }
        } catch (_) {}
      }
      const seen = new Set();
      const packs = [];
      function add(value, keyHint = '') {
        if (!value || typeof value !== 'object' || seen.has(value)) return;
        seen.add(value);
        if (Array.isArray(value)) {
          for (const item of value) add(item, keyHint);
          return;
        }
        const name = value.name || value.title || value.id || value.packName || value.folderName ||
          (typeof value.key === 'string' ? value.key : '');
        const path = value.webkitRelativePath || value.path || value.baseUrl || value.baseURL || value.url || '';
        const entries = value.entries || value.images || value.files;
        if (name && (path || entries || /pack/i.test(keyHint))) {
          const count = Array.isArray(entries) ? entries.length :
            (entries && typeof entries === 'object' ? Object.keys(entries).length : 0);
          packs.push({ name: String(name), path: String(path), count });
        } else {
          for (const [key, child] of Object.entries(value)) {
            if (child && typeof child === 'object') add(child, key);
          }
        }
      }
      for (const candidate of candidates) add(candidate);
      const unique = new Map();
      for (const pack of packs) unique.set(pack.name + '|' + pack.path, pack);
      return [...unique.values()];
    }

    function folderNames(files) {
      // image-packs/<팩이름>/.../pack.js 에서 최상위 팩 이름만 추립니다.
      return [...new Set(files.map(file => {
        const parts = String(file.webkitRelativePath || '').replace(/\\/g, '/').split('/');
        return parts[0]?.toLowerCase() === 'image-packs' && parts.length >= 3 ? parts[1] : '';
      }).filter(Boolean))];
    }

    function savedNames() {
      try {
        const value = JSON.parse(localStorage.getItem('wfil-successful-pack-names') || '[]');
        return Array.isArray(value) ? value.filter(name => typeof name === 'string' && name.trim()) : [];
      } catch (_) { return []; }
    }

    function getLoadedNames() {
      const nativeNames = readNativePacks().map(pack => pack.name).filter(Boolean);
      const names = lastSuccessfulNames.length ? lastSuccessfulNames : (nativeNames.length ? nativeNames : savedNames());
      return [...new Set(names.map(name => String(name).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    }

    function hideFalseNoImageWarning() {
      if (!getLoadedNames().length) return;
      const leaf = [...document.querySelectorAll('body *')].find(el =>
        el.children.length === 0 && (el.textContent || '').trim() === '그림이 준비되지 않았습니다');
      if (!leaf) return;
      const card = leaf.closest('section, article, [role="alert"]') || leaf.parentElement;
      if (card && card.isConnected) card.style.display = 'none';
    }

    // 시작화면 경고를 새로 만들거나 덧붙이지 않습니다. 이미지팩 등록 후 원본의
    // "그림이 준비되지 않았습니다" 경고만 숨기고, 팩 목록은 모드 창 안에 표시합니다.
    function watchNoImageWarning() {
      // Do not walk the entire game DOM on every mutation. The old subtree observer
      // repeatedly scanned body * and the global pack registry during popup rendering,
      // which could starve click handling on large/mobile game sessions.
      setTimeout(hideFalseNoImageWarning, 1200);
      setTimeout(hideFalseNoImageWarning, 3500);
    }

    function setStatus(message, error = false) {
      if (statusEl && statusEl.isConnected) {
        statusEl.textContent = message;
        statusEl.style.color = error ? '#fca5a5' : '#fcd34d';
      }
      if (error) console.error('[faith-image-loader]', message);
      else console.info('[faith-image-loader]', message);
    }

    const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

    async function collectFromDirectory(root) {
      if (!root || root.kind !== 'directory') throw new Error('폴더를 선택하지 않았습니다.');
      if (String(root.name).toLowerCase() !== 'image-packs') {
        throw new Error('캐릭터 폴더나 base 폴더가 아니라, 게임 HTML 옆의 image-packs 최상위 폴더를 선택하세요.');
      }
      const packFiles = [];
      let visited = 0;

      async function walk(dir, relative) {
        for await (const [name, handle] of dir.entries()) {
          visited++;
          if (visited % 128 === 0) await yieldToBrowser();

          if (handle.kind === 'directory') {
            // 이미지가 수만 개 들어 있는 하위 폴더는 아예 순회하지 않습니다.
            if (name.toLowerCase() === 'images') continue;
            await walk(handle, relative ? relative + '/' + name : name);
            continue;
          }

          if (handle.kind !== 'file' || name.toLowerCase() !== 'pack.js') continue;
          const file = await handle.getFile();
          const path = 'image-packs/' + (relative ? relative + '/' : '') + name;
          packFiles.push({
            name,
            webkitRelativePath: path,
            text: () => file.text(),
          });
        }
      }

      await walk(root, '');
      return packFiles;
    }

    async function collectFromFileList(fileList) {
      const found = [];
      const total = Number(fileList && fileList.length) || 0;
      for (let start = 0; start < total; start += 256) {
        const end = Math.min(total, start + 256);
        for (let i = start; i < end; i++) {
          const file = typeof fileList.item === 'function' ? fileList.item(i) : fileList[i];
          if (!file) continue;
          const path = String(file.webkitRelativePath || '').replace(/\\/g, '/');
          if (!/^image-packs\/.+\/pack\.js$/i.test(path)) continue;
          found.push({
            name: file.name,
            webkitRelativePath: path,
            text: () => file.text(),
          });
        }
        if (end < total) await yieldToBrowser();
      }
      return found;
    }

    async function registerPackFiles(files) {
      if (!nativeScan) {
        throw new Error('현재 실행 중인 게임에서 원본 wfPackScanFolder 함수를 찾지 못했습니다. 이 모드는 Faith 원본 게임의 WML 브리지에서 실행해야 합니다. 다른 게임 HTML에는 등록을 시도하지 않았습니다.');
      }
      if (!files.length) {
        throw new Error('image-packs 아래에서 pack.js를 찾지 못했습니다. 각 팩의 base/pack.js 또는 outfits/*/pack.js가 있는 최상위 image-packs 폴더를 선택하세요.');
      }
      setStatus(`이미지 파일은 건드리지 않고 pack.js ${files.length.toLocaleString()}개만 원본 등록기에 전달합니다…`);
      const count = await nativeScan(files);
      const selectedNames = folderNames(files);
      // 원본 스캐너가 오류 없이 완료되면 선택한 image-packs 아래의 팩 이름을 보존합니다.
      // 이름은 다음에 모드 창을 다시 열어도 유지되며, 숫자 카운터 대신 목록으로 보여줍니다.
      lastSuccessfulNames = [...new Set(selectedNames)].sort((a, b) => a.localeCompare(b));
      try { localStorage.setItem('wfil-successful-pack-names', JSON.stringify(lastSuccessfulNames)); } catch (_) {}
      hideFalseNoImageWarning();
      renderPackList();
      setStatus(lastSuccessfulNames.length
        ? '이미지팩 등록이 완료되었습니다. 아래 목록에서 등록된 팩을 확인하세요.'
        : '원본 등록 함수는 실행됐지만 팩 이름을 확인하지 못했습니다. 원본 이미지팩 설정에서 확인하세요.');
    }

    // ZIP 중앙 디렉터리와 pack.js만 먼저 읽고, 각 WebP는 화면에서 참조될 때만 압축 해제합니다.
    const zipObjectUrls = new Map();
    const zipInflight = new Map();
    const zipImageEntries = new Map();
    const zipPackPaths = new Map();
    const zipImageOriginal = new WeakMap();
    const zipImageActiveBlob = new WeakMap();
    let zipImageObserver = null;

    function normalizeZipPath(path) {
      return String(path || '').replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/\/+/g, '/');
    }

    async function inflateZipEntry(file, entry) {
      const localHeader = new Uint8Array(await file.slice(entry.localOffset, entry.localOffset + 30).arrayBuffer());
      if (localHeader.length < 30 || new DataView(localHeader.buffer, localHeader.byteOffset, localHeader.byteLength).getUint32(0, true) !== 0x04034b50) {
        throw new Error('ZIP 항목의 로컬 헤더가 손상되었습니다: ' + entry.path);
      }
      const lv = new DataView(localHeader.buffer, localHeader.byteOffset, localHeader.byteLength);
      const dataStart = entry.localOffset + 30 + lv.getUint16(26, true) + lv.getUint16(28, true);
      const dataEnd = dataStart + entry.compressedSize;
      if (dataEnd > file.size) throw new Error('ZIP 항목의 데이터 범위가 올바르지 않습니다: ' + entry.path);
      const compressed = new Uint8Array(await file.slice(dataStart, dataEnd).arrayBuffer());
      let bytes;
      if (entry.method === 0) bytes = compressed;
      else if (entry.method === 8) {
        if (typeof DecompressionStream !== 'function') {
          throw new Error('이 브라우저는 ZIP deflate 압축 해제를 지원하지 않습니다. 최신 브라우저에서 다시 시도하세요.');
        }
        try {
          const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          bytes = new Uint8Array(await new Response(stream).arrayBuffer());
        } catch (_) {
          throw new Error('ZIP 압축 해제 실패: ' + entry.path);
        }
      } else throw new Error('지원하지 않는 ZIP 압축 방식(' + entry.method + '): ' + entry.path);
      if (bytes.length !== entry.uncompressedSize) throw new Error('ZIP 크기 검증 실패: ' + entry.path);
      return bytes;
    }

    function parseFaithPackScript(scriptText) {
      const match = /window\.__WF_OUTFIT_PACKS__\s*\[\s*(['"])(.*?)\1\s*\]\s*=\s*/s.exec(scriptText);
      if (!match) throw new Error('pack.js에서 window.__WF_OUTFIT_PACKS__[키] 등록문을 찾지 못했습니다.');
      const objectStart = match.index + match[0].length;
      let depth = 0, inString = '', escaped = false, objectEnd = -1;
      for (let i = objectStart; i < scriptText.length; i++) {
        const ch = scriptText[i];
        if (inString) {
          if (escaped) escaped = false;
          else if (ch === '\\') escaped = true;
          else if (ch === inString) inString = '';
          continue;
        }
        if (ch === '"' || ch === "'") { inString = ch; continue; }
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) { objectEnd = i + 1; break; }
        }
      }
      if (objectEnd < 0) throw new Error('pack.js의 팩 데이터 객체가 완성되지 않았습니다.');
      let pack;
      try { pack = JSON.parse(scriptText.slice(objectStart, objectEnd)); }
      catch (_) { throw new Error('pack.js의 팩 데이터가 JSON 형식이 아닙니다.'); }
      if (!pack || pack.packFormat !== 1 || !pack.packId || !pack.entries || typeof pack.entries !== 'object') {
        throw new Error('지원하지 않는 Faith 이미지팩 형식입니다(packFormat 1 필요).');
      }
      return { key: match[2], pack };
    }

    async function collectFromZip(file) {
      const size = Number(file.size) || 0;
      if (size < 22) throw new Error('ZIP 파일이 너무 작거나 올바르지 않습니다.');
      const tailStart = Math.max(0, size - 22 - 65535);
      const tail = new Uint8Array(await file.slice(tailStart, size).arrayBuffer());
      const tv = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
      let eocd = -1;
      for (let p = tail.length - 22; p >= 0; p--) {
        if (tv.getUint32(p, true) === 0x06054b50) { eocd = p; break; }
      }
      if (eocd < 0) throw new Error('ZIP 중앙 디렉터리를 찾지 못했습니다.');
      const t16 = p => tv.getUint16(p, true), t32 = p => tv.getUint32(p, true);
      const disk = t16(eocd + 4), cdDisk = t16(eocd + 6), count = t16(eocd + 10);
      const cdSize = t32(eocd + 12), cdOffset = t32(eocd + 16);
      if (disk || cdDisk || count === 0xffff || cdOffset === 0xffffffff || cdSize === 0xffffffff) {
        throw new Error('분할 ZIP 또는 ZIP64는 지원하지 않습니다.');
      }
      if (cdSize > 64 * 1024 * 1024 || cdOffset + cdSize > size) throw new Error('ZIP 중앙 디렉터리 크기/범위가 올바르지 않습니다.');
      const cdBytes = new Uint8Array(await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer());
      const cv = new DataView(cdBytes.buffer, cdBytes.byteOffset, cdBytes.byteLength);
      const u16 = p => cv.getUint16(p, true), u32 = p => cv.getUint32(p, true);
      const decoder = new TextDecoder('utf-8');
      const entries = [];
      let p = 0;
      for (let i = 0; i < count; i++) {
        if (p + 46 > cdBytes.length || u32(p) !== 0x02014b50) throw new Error('ZIP 중앙 디렉터리 항목이 손상되었습니다.');
        const flags = u16(p + 8), method = u16(p + 10);
        const compressedSize = u32(p + 20), uncompressedSize = u32(p + 24);
        const nameLength = u16(p + 28), extraLength = u16(p + 30), commentLength = u16(p + 32);
        const localOffset = u32(p + 42);
        const rawName = decoder.decode(cdBytes.subarray(p + 46, p + 46 + nameLength));
        p += 46 + nameLength + extraLength + commentLength;
        const name = normalizeZipPath(rawName);
        if (!name || name.endsWith('/') || name.split('/').some(part => part === '..')) continue;
        if (flags & 1) throw new Error('암호화된 ZIP은 지원하지 않습니다.');
        entries.push({ path: name, flags, method, compressedSize, uncompressedSize, localOffset });
      }
      const packEntries = entries.filter(e => /(^|\/)pack\.js$/i.test(e.path));
      if (packEntries.length !== 1) throw new Error('ZIP 안에 pack.js가 정확히 하나 있어야 합니다. 발견: ' + packEntries.length);
      const packEntry = packEntries[0];
      const packRoot = packEntry.path.slice(0, packEntry.path.lastIndexOf('/') + 1);
      const imageEntries = entries.filter(e => {
        const relative = e.path.startsWith(packRoot) ? e.path.slice(packRoot.length) : '';
        return relative && /^images\/.+\.webp$/i.test(relative);
      });
      if (!imageEntries.length) throw new Error('pack.js와 같은 폴더 아래 images/*.webp를 찾지 못했습니다.');
      const scriptBytes = await inflateZipEntry(file, packEntry);
      if (scriptBytes.length > 4 * 1024 * 1024) throw new Error('pack.js가 4MB를 초과합니다.');
      const parsed = parseFaithPackScript(decoder.decode(scriptBytes));
      const byRelativePath = new Map();
      for (const entry of imageEntries) {
        const relative = normalizeZipPath(entry.path.slice(packRoot.length));
        byRelativePath.set(relative.toLowerCase(), entry);
      }

      // 팩에서 실제 참조하는 이미지에 대해서만 Blob URL을 생성합니다.
      // 파일 전체를 동시에 압축 해제하지 않으며, 존재하지 않는 이미지 경로는 명시적으로 거부합니다.
      const refs = new Set();
      for (const value of Object.values(parsed.pack.entries)) {
        if (value && typeof value.imagePath === 'string') refs.add(normalizeZipPath(value.imagePath));
      }
      if (!refs.size) throw new Error('pack.js의 entries에서 imagePath를 찾지 못했습니다.');
      const entriesByVirtualPath = new Map();
      let totalBytes = 0;
      for (const ref of refs) {
        const entry = byRelativePath.get(ref.toLowerCase());
        if (!entry) throw new Error('pack.js가 참조하는 이미지가 ZIP에 없습니다: ' + ref);
        if (entry.uncompressedSize > 20 * 1024 * 1024) throw new Error('개별 이미지가 20MB를 초과합니다: ' + ref);
        totalBytes += entry.uncompressedSize;
        if (totalBytes > 600 * 1024 * 1024) throw new Error('참조 이미지 총량이 600MB를 초과합니다. 안전을 위해 중단했습니다.');
        const virtualPath = normalizeZipPath('wfil-zip/' + parsed.pack.packId + '/' + ref).toLowerCase();
        entriesByVirtualPath.set(virtualPath, entry);
        for (const value of Object.values(parsed.pack.entries)) {
          if (value && typeof value.imagePath === 'string' && normalizeZipPath(value.imagePath).toLowerCase() === ref.toLowerCase()) value.imagePath = virtualPath;
        }
      }
      return { file, key: parsed.key, pack: parsed.pack, entriesByVirtualPath, imageCount: refs.size, bytes: totalBytes };
    }

    function registerZipPack(imported) {
      const registry = window.__WF_OUTFIT_PACKS__ || (window.__WF_OUTFIT_PACKS__ = Object.create(null));
      if (!registry || typeof registry !== 'object') throw new Error('게임의 __WF_OUTFIT_PACKS__ 레지스트리를 사용할 수 없습니다.');
      const old = registry[imported.key];
      if (old && old.packId !== imported.pack.packId) throw new Error('같은 레지스트리 키에 다른 팩이 이미 등록되어 있습니다: ' + imported.key);
      for (const key of zipPackPaths.get(imported.pack.packId) || []) {
        zipImageEntries.delete(key);
        const oldUrl = zipObjectUrls.get(key);
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        zipObjectUrls.delete(key);
      }
      registry[imported.key] = imported.pack;
      const paths = [];
      for (const [key, entry] of imported.entriesByVirtualPath) {
        zipImageEntries.set(key, { file: imported.file, entry });
        paths.push(key);
      }
      zipPackPaths.set(imported.pack.packId, paths);
      try { window.qD?.(); } catch (_) {}
      try { window.m312ImageChanged?.(); } catch (_) {}
      try { window.dispatchEvent(new CustomEvent('wf-outfit-packs-changed', { detail: { packId: imported.pack.packId } })); } catch (_) {}
      installZipImageObserver();
      return imported;
    }

    async function patchZipImage(img) {
      if (!(img instanceof HTMLImageElement)) return;
      const current = img.getAttribute('src') || '';
      if (zipImageActiveBlob.get(img) === current) return;
      let pathname = current;
      try { pathname = new URL(current, document.baseURI).pathname; } catch (_) {}
      const at = pathname.toLowerCase().lastIndexOf('/wfil-zip/');
      if (at < 0) return;
      const key = normalizeZipPath(pathname.slice(at + 1)).toLowerCase();
      const source = zipImageEntries.get(key);
      if (!source) return;
      zipImageOriginal.set(img, current);
      let url = zipObjectUrls.get(key);
      if (!url) {
        let pending = zipInflight.get(key);
        if (!pending) {
          pending = inflateZipEntry(source.file, source.entry).then(bytes => {
            const created = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
            zipObjectUrls.set(key, created);
            return created;
          }).finally(() => zipInflight.delete(key));
          zipInflight.set(key, pending);
        }
        try { url = await pending; } catch (error) { console.error('[faith-image-loader] ZIP 이미지 로드 실패:', key, error); return; }
      }
      if (img.isConnected && img.getAttribute('src') === current) {
        zipImageActiveBlob.set(img, url);
        img.setAttribute('src', url);
      }
    }

    function patchZipTree(root) {
      if (!root) return;
      if (root instanceof HTMLImageElement) void patchZipImage(root);
      if (root.querySelectorAll) root.querySelectorAll('img').forEach(img => void patchZipImage(img));
    }

    function installZipImageObserver() {
      if (zipImageObserver || !document.documentElement) return;
      zipImageObserver = new MutationObserver(records => {
        for (const record of records) {
          if (record.type === 'attributes' && record.target instanceof HTMLImageElement) void patchZipImage(record.target);
          else for (const node of record.addedNodes || []) patchZipTree(node);
        }
      });
      zipImageObserver.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
    }

    function restoreZipImages() {
      for (const img of document.querySelectorAll('img')) {
        const activeUrl = zipImageActiveBlob.get(img);
        if (!activeUrl) continue;
        const original = zipImageOriginal.get(img);
        if (original !== undefined && img.getAttribute('src') === activeUrl) img.setAttribute('src', original);
        zipImageActiveBlob.delete(img);
      }
    }

        async function onZipChange() {
      const file = zipInput?.files?.[0];
      if (!file || busy) return;
      busy = true;
      let imported = null;
      try {
        setStatus('ZIP의 pack.js와 이미지 경로를 확인하는 중입니다…');
        imported = await collectFromZip(file);
        registerZipPack(imported);
        lastSuccessfulNames = [String(imported.pack.name || imported.pack.folderName || imported.pack.packId)];
        try { localStorage.setItem('wfil-successful-pack-names', JSON.stringify(lastSuccessfulNames)); } catch (_) {}
        renderPackList();
        hideFalseNoImageWarning();
        setStatus('ZIP 이미지팩을 등록했습니다: ' + lastSuccessfulNames[0] + ' · 이미지 ' +
          imported.imageCount.toLocaleString() + '개 · 이미지 데이터는 실제 표시 시점에 연결됩니다. 페이지를 새로고침하면 ZIP을 다시 불러와야 합니다.');
      } catch (error) {
        setStatus('ZIP 등록 실패: ' + String(error && error.message || error), true);
      } finally {
        if (zipInput) zipInput.value = '';
        busy = false;
      }
    }

    async function chooseDirectory() {
      if (busy) return;
      if (!nativeScan) {
        setStatus('원본 wfPackScanFolder를 찾지 못했습니다. 이 게임에서 등록할 수 없으므로 폴더를 읽지 않았습니다.', true);
        return;
      }
      busy = true;
      try {
        if (typeof window.showDirectoryPicker !== 'function') {
          setStatus('이 실행 환경은 단계별 폴더 선택을 지원하지 않습니다. 호환용 폴더 선택기를 엽니다…');
          busy = false;
          await new Promise(resolve => setTimeout(resolve, 120));
          if (fallbackInput && fallbackInput.isConnected) fallbackInput.click();
          else setStatus('호환용 선택기를 열 수 없습니다. 모드 창에서 “호환용 폴더 선택”을 누르세요.', true);
          return;
        }
        setStatus('image-packs 폴더 선택을 기다리는 중…');
        const root = await window.showDirectoryPicker({ mode: 'read' });
        setStatus('이미지 파일 폴더는 건너뛰고 pack.js만 찾는 중…');
        const files = await collectFromDirectory(root);
        await registerPackFiles(files);
      } catch (error) {
        if (error && error.name === 'AbortError') {
          // 일부 Android WebView/APK는 showDirectoryPicker를 노출하지만 실제 SAF 폴더 선택을
          // 완료하지 못하고 AbortError를 반환합니다. 즉시 호환용 파일 선택기로 전환합니다.
          setStatus('이 실행 환경의 폴더 선택기를 사용할 수 없어 호환용 선택기를 엽니다…');
          busy = false;
          await new Promise(resolve => setTimeout(resolve, 120));
          if (fallbackInput && fallbackInput.isConnected) {
            fallbackInput.click();
          } else {
            setStatus('호환용 선택기를 열 수 없습니다. 모드 창에서 “호환용 폴더 선택”을 눌러 다시 시도하세요.', true);
          }
          return;
        } else {
          setStatus('등록 실패: ' + String(error && error.message || error), true);
        }
      } finally {
        busy = false;
      }
    }

    async function onFallbackChange() {
      if (busy || !fallbackInput?.files?.length) return;
      if (!nativeScan) {
        setStatus('원본 wfPackScanFolder를 찾지 못했습니다. 이 게임에서 등록할 수 없으므로 파일 목록을 읽지 않았습니다.', true);
        fallbackInput.value = '';
        return;
      }
      busy = true;
      const files = fallbackInput.files;
      try {
        setStatus('선택 목록에서 pack.js만 추리는 중입니다. 이미지 파일을 불필요하게 읽지 않고 pack.js를 찾는 중…');
        const packFiles = await collectFromFileList(files);
        await registerPackFiles(packFiles);
      } catch (error) {
        setStatus('등록 실패: ' + String(error && error.message || error), true);
      } finally {
        fallbackInput.value = '';
        busy = false;
      }
    }

    function renderPackList() {
      if (!packListEl || !packListEl.isConnected) return;
      packListEl.replaceChildren();
      const names = getLoadedNames();
      if (!names.length) {
        packListEl.append(h('div', { style: 'opacity:.75;padding:8px 0' }, '아직 표시할 이미지팩이 없습니다. 아래에서 image-packs 폴더를 등록하세요.'));
        return;
      }
      const list = h('ul', { style: 'margin:0;padding:0 0 0 20px;display:flex;flex-direction:column;gap:5px' });
      for (const name of names) list.append(h('li', { style: 'overflow-wrap:anywhere' }, name));
      packListEl.append(list);
    }

    function openWindow() {
      // 폴더와 ZIP 등록 기능을 같은 관리 창에서 제공합니다.
      win = api.ui.window({
        id: 'faith-image-packs',
        title: 'Faith 이미지팩 로더',
        width: 460,
        height: 430,
        render(body) {
          body.replaceChildren();
          const root = h('div', { class: 'wfil-wrap', style: 'display:flex;flex-direction:column;gap:10px;font:inherit;color:inherit' });
          root.append(h('p', { style: 'font-size:.9em;line-height:1.5;opacity:.9;margin:0' },
            '폴더와 ZIP 이미지팩을 등록·관리합니다. ZIP 이미지는 실제 표시 시점에 연결합니다.'));

          root.append(h('strong', { style: 'margin-top:2px' }, '등록된 이미지팩'));
          packListEl = h('div', { style: 'max-height:150px;overflow:auto;padding:8px 10px;border:1px solid var(--wml-border,#7778);border-radius:7px' });
          root.append(packListEl);
          renderPackList();

          const row = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });
          const nativeButton = h('button', { type: 'button', style: 'font:inherit;padding:8px 10px;max-width:100%' }, 'image-packs 폴더 선택 (단계 처리)');
          nativeButton.addEventListener('click', chooseDirectory);

          fallbackInput = document.createElement('input');
          fallbackInput.type = 'file';
          fallbackInput.multiple = true;
          fallbackInput.setAttribute('webkitdirectory', '');
          fallbackInput.setAttribute('directory', '');
          fallbackInput.setAttribute('aria-label', '호환용 image-packs 폴더 선택');
          fallbackInput.style.display = 'none';
          fallbackInput.addEventListener('change', onFallbackChange);

          const fallbackButton = h('button', { type: 'button', style: 'font:inherit;padding:8px 10px;max-width:100%' }, '호환용 폴더 선택');
          fallbackButton.addEventListener('click', () => fallbackInput.click());

          zipInput = document.createElement('input');
          zipInput.type = 'file';
          zipInput.accept = '.zip,application/zip,application/x-zip-compressed';
          zipInput.setAttribute('aria-label', '이미지팩 ZIP 파일 선택');
          zipInput.style.display = 'none';
          zipInput.addEventListener('change', onZipChange);
          const zipButton = h('button', { type: 'button', style: 'font:inherit;padding:8px 10px;max-width:100%' }, 'ZIP 이미지팩 불러오기');
          zipButton.addEventListener('click', () => zipInput.click());
          row.append(nativeButton, fallbackButton, zipButton);

          statusEl = h('div', {
            role: 'status',
            style: 'padding:8px;border:1px solid var(--wml-border,#7778);border-radius:7px;white-space:pre-wrap;overflow-wrap:anywhere;color:#fcd34d'
          }, nativeScan
            ? '폴더 등록 또는 Faith outfit ZIP 등록을 기다리는 중입니다.'
            : '폴더 등록은 원본 함수가 필요하지만, Faith outfit ZIP 등록은 별도 레지스트리 경로를 사용합니다.');

          root.append(row, fallbackInput, zipInput, statusEl);
          body.append(root);
        },
      });
    }

    // 일반 설정의 기존 이미지팩 설정 항목을 이 모드의 창으로 연결합니다.
    // WML 버튼을 추가하지 않으므로 중복된 WML2 메뉴가 생기지 않습니다.
    const nativeImagePackLabels = new Set([
      '이미지팩 설정', '이미지 팩 설정', 'Image Pack Settings', 'Image Packs',
      'Image pack settings', 'Image pack'
    ]);
    function normalizedLabel(value) {
      return String(value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    }
    function getNativeImagePackItem(target) {
      const clickable = target?.closest?.('button,[role="button"],a,label,[tabindex]');
      if (!clickable) return null;
      if (clickable.dataset?.wmlFaithImagePackMenu === '1') return clickable;
      const label = normalizedLabel(clickable.getAttribute('aria-label') || clickable.getAttribute('title') || clickable.innerText || clickable.textContent);
      if ([...nativeImagePackLabels].some(value => normalizedLabel(value) === label)) return clickable;
      // Some settings rows contain a separate text span and a larger clickable parent.
      const leaf = target?.nodeType === 1 ? target : target?.parentElement;
      const textNode = leaf?.closest?.('button,[role="button"],a,label,[tabindex]') || leaf;
      const text = normalizedLabel(textNode?.textContent);
      return [...nativeImagePackLabels].some(value => normalizedLabel(value) === text) ? textNode : null;
    }
    function renameNativeImagePackItem(item) {
      if (!item || item.dataset?.wmlFaithImagePackMenu === '1') return;
      const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const text = normalizedLabel(node.nodeValue);
        if ([...nativeImagePackLabels].some(value => normalizedLabel(value) === text)) {
          node.nodeValue = 'Faith 이미지팩 로더';
          item.dataset.wmlFaithImagePackMenu = '1';
          item.setAttribute('aria-label', 'Faith 이미지팩 로더');
          item.setAttribute('title', 'Faith 이미지팩 로더');
          return;
        }
      }
      // If the whole row is a plain text node, preserve the click target and replace its label.
      if ([...nativeImagePackLabels].some(value => normalizedLabel(value) === normalizedLabel(item.textContent))) {
        item.textContent = 'Faith 이미지팩 로더';
        item.dataset.wmlFaithImagePackMenu = '1';
        item.setAttribute('aria-label', 'Faith 이미지팩 로더');
        item.setAttribute('title', 'Faith 이미지팩 로더');
      }
    }
    function scanNativeImagePackMenu() {
      const candidates = document.querySelectorAll('button,[role="button"],a,label,[tabindex]');
      for (const item of candidates) {
        const label = normalizedLabel(item.getAttribute('aria-label') || item.getAttribute('title') || item.innerText || item.textContent);
        if ([...nativeImagePackLabels].some(value => normalizedLabel(value) === label) ||
            [...nativeImagePackLabels].some(value => normalizedLabel(value) === normalizedLabel(item.textContent)) ||
            [...nativeImagePackLabels].some(value => normalizedLabel(item.textContent).includes(normalizedLabel(value)))) {
          renameNativeImagePackItem(item);
        }
      }
    }
    document.addEventListener('click', event => {
      const item = getNativeImagePackItem(event.target);
      if (!item) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openWindow();
    }, true);
    const settingsMenuObserver = new MutationObserver(scanNativeImagePackMenu);
    settingsMenuObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title'] });
    scanNativeImagePackMenu();

    installZipImageObserver();
    watchNoImageWarning();
  },
});