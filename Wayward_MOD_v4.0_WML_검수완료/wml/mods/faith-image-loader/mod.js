// Faith 이미지팩 로더 — 폴더와 ZIP 이미지팩을 등록하고, ZIP 내부 이미지도 필요할 때 직접 연결합니다.
WML.define({
  id: 'faith-image-loader',
  name: 'Faith 이미지팩 로더',
  version: '2.0.0',
  game: 'faith',
  description: '지정된 image-packs 경로의 pack.js를 자동 연결하고, 이미지 파일은 화면에 필요할 때만 직접 읽습니다. ZIP 가져오기도 지원합니다.',
  async setup(api) {
    const h = api.ui.h;
    let win = null;
    let statusEl = null;
    let packListEl = null;
    let busy = false;
    let zipInput = null;
    let lastSuccessfulNames = [];
    let currentStatus = 'image-packs 폴더에서 로컬 이미지팩을 확인하는 중입니다…';
    const registeredPacks = new Map();
    const localImageUrls = new Map();
    const loadedLocalScripts = new Set();

    // Current game build exposes imageManifest (Wb); the older folder-scanner integration is not used.
    // Merge Faith pack entries at the game's real lookup boundary without changing game state.
    const unhookImageManifest = api.hook('imageManifest', {
      after(result) {
        if (!registeredPacks.size) return result;
        const entries = { ...(result && result.entries || {}) };
        const packs = [...registeredPacks.values()].sort((a, b) =>
          (a.priority || 0) - (b.priority || 0) ||
          String(a.generatedAt || '').localeCompare(String(b.generatedAt || ''))
        );
        for (const pack of packs) Object.assign(entries, pack.entries || {});
        return { ...(result || {}), version: result && result.version || 1, entries };
      }
    });

    function resetNativeImageManifest() {
      try {
        const reset = api.fn('imagePackReset');
        if (typeof reset === 'function') reset();
      } catch (error) {
        console.warn('[faith-image-loader] image manifest reset failed:', error);
      }
    }

    function getLoadedNames() {
      const registeredNames = [...registeredPacks.values()]
        .map(pack => pack.folderName || pack.name || pack.packId)
        .filter(Boolean);
      const names = lastSuccessfulNames.length ? lastSuccessfulNames : registeredNames;
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
      currentStatus = message;
      if (statusEl && statusEl.isConnected) {
        statusEl.textContent = message;
        statusEl.style.color = error ? '#fca5a5' : '#fcd34d';
      }
      if (error) console.error('[faith-image-loader]', message);
      else console.info('[faith-image-loader]', message);
    }

    const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

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

    // File.arrayBuffer() is unavailable in some older embedded WebViews.
    // FileReader is the compatibility path for reading ZIP slices.
    function readBlobArrayBuffer(blob) {
      if (blob && typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
      return new Promise((resolve, reject) => {
        if (typeof FileReader !== 'function') {
          reject(new Error('이 실행 환경은 파일 데이터를 읽을 수 없습니다.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('파일 읽기에 실패했습니다.'));
        reader.onabort = () => reject(new Error('파일 읽기가 취소되었습니다.'));
        reader.readAsArrayBuffer(blob);
      });
    }

    async function inflateZipEntry(file, entry) {
      const localHeader = new Uint8Array(await readBlobArrayBuffer(file.slice(entry.localOffset, entry.localOffset + 30)));
      if (localHeader.length < 30 || new DataView(localHeader.buffer, localHeader.byteOffset, localHeader.byteLength).getUint32(0, true) !== 0x04034b50) {
        throw new Error('ZIP 항목의 로컬 헤더가 손상되었습니다: ' + entry.path);
      }
      const lv = new DataView(localHeader.buffer, localHeader.byteOffset, localHeader.byteLength);
      const dataStart = entry.localOffset + 30 + lv.getUint16(26, true) + lv.getUint16(28, true);
      const dataEnd = dataStart + entry.compressedSize;
      if (dataEnd > file.size) throw new Error('ZIP 항목의 데이터 범위가 올바르지 않습니다: ' + entry.path);
      const compressed = new Uint8Array(await readBlobArrayBuffer(file.slice(dataStart, dataEnd)));
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
      const match = /(?:window\.__WF_OUTFIT_PACKS__\s*\[\s*(['"])(.*?)\1\s*\]|\(\s*window\.__WF_OUTFIT_PACKS__\s*=\s*window\.__WF_OUTFIT_PACKS__\s*\|\|\s*Object\.create\(\s*null\s*\)\s*\)\s*\[\s*(['"])(.*?)\3\s*\])\s*=\s*/s.exec(scriptText);
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
      return { key: match[2] ?? match[4], pack };
    }

    // The local-path loader does not enumerate image files. It loads only known pack.js
    // scripts, then lets the browser request each referenced image directly when rendered.
    const DEFAULT_LOCAL_PACK_PATHS = [
      'faith-elena/base/pack.js',
      'faith-mara/base/pack.js',
      'faith-pippa/base/pack.js',
      'faith-extra/pack.js',
      'ssff-denia/base/pack.js',
      'ssff-hitori/base/pack.js',
      'ssff-kaguya/base/pack.js',
      'ssff-phoebe/base/pack.js',
      'ssff-roxy/base/pack.js',
      'ssff-viper/base/pack.js',
    ];

    function loadScriptUrl(url) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = false;
        script.onload = () => resolve(script);
        script.onerror = () => {
          script.remove();
          reject(new Error('스크립트를 열 수 없습니다: ' + url));
        };
        document.head.appendChild(script);
      });
    }

    function registerLocalPack(pack, packRootUrl) {
      if (!pack || pack.packFormat !== 1 || !pack.packId || !pack.entries || typeof pack.entries !== 'object') {
        throw new Error('지원하지 않는 로컬 이미지팩 형식입니다(packFormat 1 필요).');
      }
      const entries = {};
      let count = 0;
      for (const [entryKey, value] of Object.entries(pack.entries)) {
        if (!value || typeof value.imagePath !== 'string') continue;
        const imagePath = normalizeZipPath(value.imagePath);
        const segments = imagePath.split('/');
        if (!imagePath || imagePath.startsWith('/') || /^[a-z]+:/i.test(imagePath) ||
            segments.some(part => !part || part === '.' || part === '..')) {
          throw new Error('팩 내부 이미지 경로가 안전하지 않습니다: ' + value.imagePath);
        }
        const virtualPath = normalizeZipPath('wfil-folder/' + pack.packId + '/' + imagePath);
        const imageUrl = new URL(imagePath, packRootUrl).href;
        localImageUrls.set(virtualPath.toLowerCase(), imageUrl);
        entries[entryKey] = { ...value, imagePath: virtualPath };
        count++;
      }
      if (!count) throw new Error('pack.js의 entries에서 imagePath를 찾지 못했습니다.');
      registeredPacks.set(pack.packId, { ...pack, entries });
      return count;
    }

    async function loadLocalPackScript(relativePath) {
      const cleanPath = normalizeZipPath(relativePath);
      if (!cleanPath || cleanPath.startsWith('/') || cleanPath.split('/').some(part => part === '..')) {
        throw new Error('잘못된 pack.js 경로입니다: ' + relativePath);
      }
      const scriptUrl = new URL('image-packs/' + cleanPath, document.baseURI).href;
      if (loadedLocalScripts.has(scriptUrl)) return { packs: 0, entries: 0, alreadyLoaded: true };

      const registryBefore = new Map(Object.entries(window.__WF_OUTFIT_PACKS__ || {}));
      await loadScriptUrl(scriptUrl);
      const registry = window.__WF_OUTFIT_PACKS__ || {};
      const changed = Object.entries(registry).filter(([key, pack]) => registryBefore.get(key) !== pack);
      if (!changed.length) throw new Error('pack.js는 실행됐지만 새 Faith 팩 등록을 찾지 못했습니다: ' + cleanPath);

      const packRootUrl = new URL('.', scriptUrl).href;
      let entryCount = 0;
      for (const [, pack] of changed) entryCount += registerLocalPack(pack, packRootUrl);
      loadedLocalScripts.add(scriptUrl);
      return { packs: changed.length, entries: entryCount, alreadyLoaded: false };
    }

    async function getLocalPackPaths() {
      // Optional index.js supports additional/future packs without a browser folder picker.
      const indexUrl = new URL('image-packs/index.js', document.baseURI).href;
      if (!loadedLocalScripts.has(indexUrl)) {
        try {
          await loadScriptUrl(indexUrl);
          loadedLocalScripts.add(indexUrl);
        } catch (_) {
          // No index file: use the built-in paths for the user's current Faith/SSFF packs.
        }
      }
      const configured = window.__WF_IMAGE_PACK_PATHS__;
      if (Array.isArray(configured) && configured.length) {
        return [...new Set(configured.map(value => normalizeZipPath(value)).filter(Boolean))];
      }
      return DEFAULT_LOCAL_PACK_PATHS;
    }

    async function loadLocalFolderPacks() {
      const paths = await getLocalPackPaths();
      let loadedPackCount = 0;
      let loadedEntryCount = 0;
      const missing = [];
      for (const path of paths) {
        try {
          const result = await loadLocalPackScript(path);
          loadedPackCount += result.packs;
          loadedEntryCount += result.entries;
        } catch (error) {
          missing.push(path);
        }
      }
      if (!localImageUrls.size) {
        throw new Error('image-packs 폴더에서 사용할 수 있는 로컬 pack.js를 찾지 못했습니다. HTML 옆 image-packs 폴더와 pack.js 경로를 확인하세요. 시도한 경로: ' + paths.join(', '));
      }
      lastSuccessfulNames = [...registeredPacks.values()]
        .map(pack => String(pack.folderName || pack.name || pack.packId))
        .sort((a, b) => a.localeCompare(b));
      try { localStorage.setItem('wfil-successful-pack-names', JSON.stringify(lastSuccessfulNames)); } catch (_) {}
      resetNativeImageManifest();
      installZipImageObserver();
      patchZipTree(document.documentElement);
      renderPackList();
      hideFalseNoImageWarning();
      setStatus(
        '로컬 이미지팩 연결 완료: 팩 ' + registeredPacks.size.toLocaleString() +
        '개 · 이미지 항목 ' + [...registeredPacks.values()].reduce((sum, pack) => sum + Object.keys(pack.entries || {}).length, 0).toLocaleString() +
        '개. 이미지 파일은 화면에 필요할 때 해당 폴더에서 직접 읽습니다.' +
        (missing.length ? '\\n찾지 못한 경로: ' + missing.join(', ') : '')
      );
      return { packs: loadedPackCount, entries: loadedEntryCount, missing };
    }

    async function collectFromZip(file) {
      const size = Number(file.size) || 0;
      if (size < 22) throw new Error('ZIP 파일이 너무 작거나 올바르지 않습니다.');
      const tailStart = Math.max(0, size - 22 - 65535);
      const tail = new Uint8Array(await readBlobArrayBuffer(file.slice(tailStart, size)));
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
      const cdBytes = new Uint8Array(await readBlobArrayBuffer(file.slice(cdOffset, cdOffset + cdSize)));
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
        // 전체 참조 용량 제한은 두지 않습니다. ZIP 이미지 데이터는 등록 시 일괄 압축 해제하지 않고
        // 화면에 실제 표시되는 항목만 개별적으로 압축 해제하므로, 총량 제한은 대형 팩을 불필요하게 막습니다.
        totalBytes += entry.uncompressedSize;
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
      registeredPacks.set(imported.pack.packId, imported.pack);
      const paths = [];
      for (const [key, entry] of imported.entriesByVirtualPath) {
        zipImageEntries.set(key, { file: imported.file, entry });
        paths.push(key);
      }
      zipPackPaths.set(imported.pack.packId, paths);
      resetNativeImageManifest();
      try { window.m312ImageChanged?.(); } catch (_) {}
      installZipImageObserver();
      patchZipTree(document.documentElement);
      return imported;
    }

    async function patchZipImage(img) {
      if (!(img instanceof HTMLImageElement)) return;
      const current = img.getAttribute('src') || '';
      if (zipImageActiveBlob.get(img) === current) return;
      let pathname = current;
      try {
        pathname = new URL(current, document.baseURI).pathname;
        // URL.pathname is percent-encoded; ZIP entry names are decoded UTF-8 paths.
        try { pathname = decodeURIComponent(pathname); } catch (_) {}
      } catch (_) {}
      const folderAt = pathname.toLowerCase().lastIndexOf('/wfil-folder/');
      if (folderAt >= 0) {
        const folderKey = normalizeZipPath(pathname.slice(folderAt + 1)).toLowerCase();
        const directUrl = localImageUrls.get(folderKey);
        if (!directUrl) return;
        if (img.isConnected && img.getAttribute('src') === current) {
          zipImageOriginal.set(img, current);
          zipImageActiveBlob.set(img, directUrl);
          img.setAttribute('src', directUrl);
        }
        return;
      }
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
        lastSuccessfulNames = [String(imported.pack.folderName || imported.pack.name || imported.pack.packId)];
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
            '게임 HTML 옆 image-packs 폴더의 pack.js를 자동으로 읽습니다. 이미지 파일 전체를 열거하거나 메모리에 올리지 않고, 화면에 필요한 파일만 직접 연결합니다.'));

          root.append(h('strong', { style: 'margin-top:2px' }, '등록된 이미지팩'));
          packListEl = h('div', { style: 'max-height:150px;overflow:auto;padding:8px 10px;border:1px solid var(--wml-border,#7778);border-radius:7px' });
          root.append(packListEl);
          renderPackList();

          const row = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' });
          const localButton = h('button', { type: 'button', style: 'font:inherit;padding:8px 10px;max-width:100%' }, 'image-packs 경로 새로고침');
          localButton.addEventListener('click', async () => {
            if (busy) return;
            busy = true;
            localButton.disabled = true;
            try { await loadLocalFolderPacks(); }
            catch (error) { setStatus('로컬 이미지팩 연결 실패: ' + String(error && error.message || error), true); }
            finally { busy = false; localButton.disabled = false; }
          });

          zipInput = document.createElement('input');
          zipInput.type = 'file';
          zipInput.accept = '.zip,application/zip,application/x-zip-compressed';
          zipInput.setAttribute('aria-label', '이미지팩 ZIP 파일 선택');
          zipInput.style.display = 'none';
          zipInput.addEventListener('change', onZipChange);
          const zipButton = h('button', { type: 'button', style: 'font:inherit;padding:8px 10px;max-width:100%' }, 'ZIP 이미지팩 불러오기');
          zipButton.addEventListener('click', () => zipInput.click());
          row.append(localButton, zipButton);

          statusEl = h('div', {
            role: 'status',
            style: 'padding:8px;border:1px solid var(--wml-border,#7778);border-radius:7px;white-space:pre-wrap;overflow-wrap:anywhere;color:#fcd34d'
          }, currentStatus);

          root.append(row, zipInput, statusEl);
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
      return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
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
    try {
      await loadLocalFolderPacks();
    } catch (error) {
      setStatus('로컬 image-packs 자동 연결을 건너뛰었습니다: ' + String(error && error.message || error), true);
    }
  },
});