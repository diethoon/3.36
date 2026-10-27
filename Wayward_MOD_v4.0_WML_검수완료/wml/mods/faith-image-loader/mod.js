WML.define({
  id: 'faith-image-loader',
  name: 'Faith 이미지팩 로더',
  version: '0.4.0',
  game: '>=2026-10-04',
  description: 'Faith 이미지팩의 로컬 경로를 보정하고, 폴더 핸들을 저장해 새로고침 후 다시 연결합니다.',
  async setup(api) {
    const h = api.ui.h;
    let win = null;
    let active = true;
    let folderLabel = '';
    let savedHandleAvailable = false;
    let restoreInProgress = false;
    let reconnectButton = null;
    let fileMap = new Map();
    let basenameMap = new Map();
    let aliasMap = new Map();
    let ambiguousAliases = new Set();
    let objectUrls = new Map();
    let matched = 0;
    let scanned = 0;
    let total = 0;
    let busy = false;
    let observer = null;
    let patchQueued = false;
    let statusEl = null;
    let toggleButton = null;
    const original = new WeakMap();
    const activeBlob = new WeakMap();
    const originalBackground = new WeakMap();
    const activeBackground = new WeakMap();
    const IMAGE_EXT = /\.(avif|gif|jpe?g|png|webp|bmp)$/i;
    const HANDLE_DB = 'faith-image-loader-v1';
    const HANDLE_STORE = 'directory-handles';
    const HANDLE_KEY = 'last-image-pack';

    const styleId = 'faith-image-loader-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent =
        '.wfil-wrap{display:flex;flex-direction:column;gap:10px;font:inherit;color:inherit}' +
        '.wfil-note{font-size:.9em;line-height:1.45;opacity:.82;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}' +
        '.wfil-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
        '.wfil-status{padding:8px;border:1px solid var(--wml-border,#7778);border-radius:7px;white-space:pre-wrap;overflow-wrap:anywhere}' +
        '.wfil-wrap input[type=file]{max-width:100%;font:inherit}' +
        '.wfil-wrap button{font:inherit;max-width:100%;padding:7px 10px}';
      document.head.appendChild(style);
    }

    function normalizedPath(value) {
      let path = String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
      try { path = decodeURIComponent(path); } catch (_) {}
      return path.split('/').filter(Boolean).join('/').toLowerCase();
    }

    function pathFromImageUrl(value) {
      if (!value) return '';
      let path = String(value);
      try {
        const url = new URL(path, document.baseURI);
        path = url.pathname;
      } catch (_) {}
      path = path.replace(/\\/g, '/');
      const marker = '/images/';
      const at = path.toLowerCase().lastIndexOf(marker);
      if (at >= 0) path = path.slice(at + marker.length);
      else path = path.replace(/^\/?images\//i, '');
      return normalizedPath(path);
    }

    function revokeUrls() {
      for (const url of objectUrls.values()) URL.revokeObjectURL(url);
      objectUrls.clear();
    }

    function restoreImages() {
      for (const img of document.querySelectorAll('img')) {
        const saved = original.get(img);
        if (saved !== undefined && img.getAttribute('src') !== saved) img.setAttribute('src', saved);
        activeBlob.delete(img);
      }
      for (const el of document.querySelectorAll('*')) {
        if (!originalBackground.has(el)) continue;
        const saved = originalBackground.get(el);
        if (el.style.backgroundImage !== saved) el.style.backgroundImage = saved;
        activeBackground.delete(el);
      }
    }

    function clearFolder() {
      restoreImages();
      revokeUrls();
      fileMap = new Map();
      basenameMap = new Map();
      aliasMap = new Map();
      ambiguousAliases = new Set();
      folderLabel = '';
      matched = 0;
      scanned = 0;
      total = 0;
    }

    function getOriginalSrc(img) {
      const current = img.getAttribute('src') || '';
      const blob = activeBlob.get(img);
      if (blob && current === blob) return original.get(img) || '';
      if (current.startsWith('blob:') && blob === current) return original.get(img) || '';
      original.set(img, current);
      return current;
    }

    function lookupFile(src) {
      const key = pathFromImageUrl(src);
      if (!key) return null;
      if (fileMap.has(key)) return fileMap.get(key);
      if (aliasMap.has(key) && !ambiguousAliases.has(key)) return aliasMap.get(key);
      const name = key.split('/').pop();
      const candidates = basenameMap.get(name);
      return candidates && candidates.length === 1 ? candidates[0] : null;
    }

    function patchImage(img) {
      if (!(img instanceof HTMLImageElement)) return;
      const src = getOriginalSrc(img);
      if (!src) return;
      const existingBlob = activeBlob.get(img);
      if (existingBlob && img.getAttribute('src') === existingBlob) return;
      if (!active || fileMap.size === 0) return;
      const file = lookupFile(src);
      if (!file) return;
      let blobUrl = objectUrls.get(file);
      if (!blobUrl) {
        blobUrl = URL.createObjectURL(file);
        objectUrls.set(file, blobUrl);
      }
      if (img.getAttribute('src') !== blobUrl) {
        activeBlob.set(img, blobUrl);
        img.setAttribute('src', blobUrl);
        matched++;
        updateStatus();
      }
    }

    function patchBackgroundImage(el) {
      if (!(el instanceof Element) || !el.style) return;
      const current = el.style.backgroundImage || '';
      const activeValue = activeBackground.get(el);
      if (activeValue && current === activeValue) return;
      if (!originalBackground.has(el) || activeValue) originalBackground.set(el, current);
      if (!active || fileMap.size === 0 || !current) return;

      let changed = false;
      const rewritten = current.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (whole, quote, src) => {
        const file = lookupFile(src);
        if (!file) return whole;
        let blobUrl = objectUrls.get(file);
        if (!blobUrl) {
          blobUrl = URL.createObjectURL(file);
          objectUrls.set(file, blobUrl);
        }
        changed = true;
        return 'url("' + blobUrl + '")';
      });
      if (changed && rewritten !== current) {
        el.style.backgroundImage = rewritten;
        activeBackground.set(el, rewritten);
        matched++;
        updateStatus();
      }
    }

    function patchTree(root) {
      if (!root) return;
      if (root instanceof HTMLImageElement) patchImage(root);
      if (root instanceof Element) patchBackgroundImage(root);
      if (root.querySelectorAll) {
        root.querySelectorAll('img').forEach(patchImage);
        root.querySelectorAll('[style*="background"]').forEach(patchBackgroundImage);
      }
    }

    function schedulePatch() {
      if (patchQueued || !active || fileMap.size === 0) return;
      patchQueued = true;
      setTimeout(() => {
        patchQueued = false;
        patchTree(document.documentElement);
      }, 0);
    }

    function installObserver() {
      if (observer || !document.documentElement) return;
      observer = new MutationObserver(records => {
        for (const record of records) {
          if (record.type === 'attributes') {
            if (record.target instanceof HTMLImageElement) patchImage(record.target);
            if (record.attributeName === 'style') patchBackgroundImage(record.target);
          } else {
            for (const node of record.addedNodes) patchTree(node);
          }
        }
      });
      observer.observe(document.documentElement, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'style']
      });
    }

    function statusText() {
      if (busy && total < 0) return '폴더를 순차적으로 읽는 중: 이미지 ' + scanned + '개 확인';
      if (busy) return '폴더 파일 확인 중: ' + scanned + ' / ' + total;
      if (!folderLabel) return savedHandleAvailable ? '저장된 이미지 폴더가 있습니다. 다시 연결을 눌러 불러오세요.' : '연결된 이미지 폴더가 없습니다.';
      return '폴더: ' + folderLabel + '\n이미지 파일: ' + total + '\n현재 연결된 이미지: ' + matched +
        '\n파일은 실제로 화면에 필요할 때만 메모리에 올립니다.';
    }

    function updateStatus() {
      if (statusEl && statusEl.isConnected) statusEl.textContent = statusText();
      if (toggleButton && toggleButton.isConnected) toggleButton.textContent = active ? '로컬 이미지 연결 사용 중' : '로컬 이미지 연결 사용 안 함';
      if (reconnectButton && reconnectButton.isConnected) reconnectButton.disabled = busy || !savedHandleAvailable;
    }

    function addFileToMaps(file, relativePath) {
      let key = normalizedPath(relativePath);
      key = key.replace(/^images\//, '');
      if (!key) key = normalizedPath(file.name);
      fileMap.set(key, file);
      const parts = key.split('/').filter(Boolean);
      // Faith/Android directory pickers may include an extra selected-folder prefix.
      // Register every path suffix so "pack/images/x.png", "images/x.png" and
      // "x.png" can resolve without guessing between duplicate basenames.
      for (let i = 1; i < parts.length; i++) {
        const alias = parts.slice(i).join('/');
        if (!alias || ambiguousAliases.has(alias) || fileMap.has(alias)) continue;
        const previous = aliasMap.get(alias);
        if (previous && previous !== file) {
          aliasMap.delete(alias);
          ambiguousAliases.add(alias);
        } else if (!previous) {
          aliasMap.set(alias, file);
        }
      }
      const base = normalizedPath(file.name);
      const names = basenameMap.get(base) || [];
      names.push(file);
      basenameMap.set(base, names);
    }

    async function loadFolder(files) {
      const count = files && Number.isFinite(files.length) ? files.length : 0;
      if (!count) throw new Error('선택한 폴더에 파일이 없습니다.');
      clearFolder();
      busy = true;
      total = count;
      const first = files[0];
      const firstPath = String(first && (first.webkitRelativePath || first.name) || '');
      folderLabel = firstPath.includes('/') ? firstPath.split('/')[0] : '(선택한 파일)';
      updateStatus();

      for (let start = 0; start < count; start += 200) {
        const end = Math.min(start + 200, count);
        for (let i = start; i < end; i++) {
          const file = files[i];
          if (!file || !IMAGE_EXT.test(file.name || '')) continue;
          const relative = String(file.webkitRelativePath || file.name).replace(/\\/g, '/');
          addFileToMaps(file, relative);
        }
        scanned = end;
        updateStatus();
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      if (fileMap.size === 0) {
        busy = false;
        clearFolder();
        updateStatus();
        throw new Error('선택한 폴더에서 지원되는 이미지 파일을 찾지 못했습니다.');
      }
      total = fileMap.size;
      scanned = count;
      busy = false;
      installObserver();
      schedulePatch();
      updateStatus();
    }

    async function loadDirectoryHandle(handle) {
      clearFolder();
      busy = true;
      total = -1;
      scanned = 0;
      folderLabel = handle.name || '(선택한 폴더)';
      updateStatus();
      let unavailable = 0;
      let visited = 0;

      async function walk(directory, prefix) {
        let batch = [];
        async function flushBatch() {
          if (!batch.length) return;
          const current = batch;
          batch = [];
          const results = await Promise.all(current.map(async item => {
            try { return { file: await item.handle.getFile(), path: item.path }; }
            catch (_) { unavailable++; return null; }
          }));
          for (const result of results) {
            if (!result) continue;
            addFileToMaps(result.file, result.path);
            scanned++;
          }
          updateStatus();
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        for await (const [name, entry] of directory.entries()) {
          if (entry.kind === 'directory') {
            await walk(entry, prefix + name + '/');
          } else if (IMAGE_EXT.test(name)) {
            batch.push({ handle: entry, path: prefix + name });
            if (batch.length >= 64) await flushBatch();
          }
          visited++;
          if (visited % 250 === 0) {
            updateStatus();
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        await flushBatch();
      }

      try {
        await walk(handle, handle.name ? handle.name + '/' : '');
        total = fileMap.size;
        if (!total) throw new Error('선택한 폴더에서 지원되는 이미지 파일을 찾지 못했습니다.');
        busy = false;
        installObserver();
        schedulePatch();
        if (unavailable) folderLabel += ' (' + unavailable + '개 파일을 읽지 못함)';
        updateStatus();
      } catch (error) {
        busy = false;
        clearFolder();
        updateStatus();
        throw error;
      }
    }

    function openHandleDb() {
      return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) return reject(new Error('IndexedDB 미지원'));
        const request = indexedDB.open(HANDLE_DB, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(HANDLE_STORE)) db.createObjectStore(HANDLE_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('폴더 저장소 열기 실패'));
      });
    }

    async function saveDirectoryHandle(handle) {
      const db = await openHandleDb();
      try {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(HANDLE_STORE, 'readwrite');
          tx.objectStore(HANDLE_STORE).put(handle, HANDLE_KEY);
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error || new Error('폴더 핸들 저장 실패'));
          tx.onabort = () => reject(tx.error || new Error('폴더 핸들 저장 취소'));
        });
      } finally { db.close(); }
    }

    async function readDirectoryHandle() {
      const db = await openHandleDb();
      try {
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(HANDLE_STORE, 'readonly');
          const req = tx.objectStore(HANDLE_STORE).get(HANDLE_KEY);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error || new Error('저장된 폴더 핸들 읽기 실패'));
        });
      } finally { db.close(); }
    }

    async function deleteDirectoryHandle() {
      try {
        const db = await openHandleDb();
        try {
          await new Promise((resolve, reject) => {
            const tx = db.transaction(HANDLE_STORE, 'readwrite');
            tx.objectStore(HANDLE_STORE).delete(HANDLE_KEY);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error || new Error('저장된 폴더 핸들 삭제 실패'));
          });
        } finally { db.close(); }
      } catch (_) {}
      savedHandleAvailable = false;
      updateStatus();
    }

    async function restoreSavedHandle() {
      if (restoreInProgress || busy || fileMap.size) return;
      restoreInProgress = true;
      try {
        const handle = await readDirectoryHandle();
        if (!handle) {
          savedHandleAvailable = false;
          updateStatus();
          return;
        }
        savedHandleAvailable = true;
        if (typeof handle.queryPermission === 'function') {
          const permission = await handle.queryPermission({ mode: 'read' });
          if (permission !== 'granted') {
            if (statusEl) statusEl.textContent = '이전에 선택한 폴더가 저장되어 있습니다. 아래 “이전 폴더 다시 연결”을 눌러 접근 권한을 허용하세요.';
            updateStatus();
            return;
          }
        }
        await loadDirectoryHandle(handle);
      } catch (error) {
        if (statusEl) statusEl.textContent = '저장된 폴더를 다시 연결하지 못했습니다: ' + String(error?.message || error);
      } finally {
        restoreInProgress = false;
        updateStatus();
      }
    }

    async function pickDirectory(fallbackInput) {
      if (typeof window.showDirectoryPicker !== 'function') {
        if (fallbackInput) fallbackInput.click();
        else throw new Error('이 브라우저는 폴더 선택을 지원하지 않습니다.');
        return;
      }
      try {
        const handle = await window.showDirectoryPicker({ id: 'wayward-faith-image-pack', mode: 'read' });
        await saveDirectoryHandle(handle);
        savedHandleAvailable = true;
        updateStatus();
        await loadDirectoryHandle(handle);
      } catch (error) {
        if (error && error.name === 'AbortError') return;
        throw error;
      }
    }

    function openWindow() {
      win = api.ui.window({
        id: 'faith-image-loader-main',
        title: 'Faith 이미지팩 로더',
        width: 460,
        height: 500,
        render(body) {
          body.replaceChildren();
          const root = h('div', { class: 'wfil-wrap', 'data-wml-ui': 'true' });
          root.append(h('p', { class: 'wfil-note' },
            'Faith의 img src와 인라인 background-image 양쪽을 로컬 파일로 연결합니다. 가능하면 “이미지 폴더 선택 (순차 읽기)”를 사용하세요. 폴더를 한 번에 하나씩 선택하면 모바일에서 파일 목록을 단계적으로 읽습니다. 호환용 선택은 대형 폴더에서 느릴 수 있습니다.'));
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.multiple = true;
          fileInput.style.display = 'none';
          fileInput.setAttribute('webkitdirectory', '');
          fileInput.setAttribute('directory', '');
          fileInput.setAttribute('aria-label', '호환용 이미지 폴더 선택');
          fileInput.addEventListener('change', async () => {
            if (!fileInput.files || !fileInput.files.length) return;
            try { await loadFolder(fileInput.files); }
            catch (error) { folderLabel = ''; busy = false; if (statusEl) statusEl.textContent = String(error.message || error); }
            finally { fileInput.value = ''; }
            updateStatus();
          });
          const row = h('div', { class: 'wfil-row' });
          const folderButton = document.createElement('button');
          folderButton.type = 'button';
          folderButton.textContent = '이미지 폴더 선택 (순차 읽기)';
          folderButton.addEventListener('click', async () => {
            if (busy) return;
            try { await pickDirectory(fileInput); }
            catch (error) { if (statusEl) statusEl.textContent = String(error.message || error); }
          });
          const fallbackButton = document.createElement('button');
          fallbackButton.type = 'button';
          fallbackButton.textContent = '호환용 폴더 선택';
          fallbackButton.addEventListener('click', () => fileInput.click());
          const toggle = document.createElement('button');
          toggleButton = toggle;
          toggle.type = 'button';
          toggle.textContent = active ? '로컬 이미지 연결 사용 중' : '로컬 이미지 연결 사용 안 함';
          toggle.addEventListener('click', () => {
            active = !active;
            toggle.textContent = active ? '로컬 이미지 연결 사용 중' : '로컬 이미지 연결 사용 안 함';
            if (active) schedulePatch();
            else restoreImages();
            updateStatus();
          });
          const clear = document.createElement('button');
          clear.type = 'button';
          clear.textContent = '연결 해제';
          clear.addEventListener('click', () => { clearFolder(); busy = false; updateStatus(); });
          reconnectButton = document.createElement('button');
          reconnectButton.type = 'button';
          reconnectButton.textContent = '이전 폴더 다시 연결';
          reconnectButton.addEventListener('click', async () => {
            if (busy) return;
            try {
              const handle = await readDirectoryHandle();
              if (!handle) throw new Error('저장된 폴더가 없습니다. 먼저 이미지 폴더를 선택하세요.');
              if (typeof handle.requestPermission === 'function') {
                const permission = await handle.requestPermission({ mode: 'read' });
                if (permission !== 'granted') throw new Error('폴더 접근 권한이 허용되지 않았습니다.');
              }
              await loadDirectoryHandle(handle);
            } catch (error) {
              if (statusEl) statusEl.textContent = String(error?.message || error);
            }
          });
          clear.addEventListener('click', () => { clearFolder(); busy = false; void deleteDirectoryHandle(); updateStatus(); });
          row.append(folderButton, fallbackButton, reconnectButton, toggle, clear);
          statusEl = h('div', { class: 'wfil-status', role: 'status' }, statusText());
          root.append(fileInput, row, statusEl);
          body.append(root);
          void restoreSavedHandle();
        },
      });
    }


    api.ui.addButton({
      label: 'Faith 이미지 로더',
      title: '이미지 팩 폴더를 하나씩 연결합니다.',
      onClick: openWindow,
    });
    installObserver();
    api.onBack(() => {
      if (!win || !win.el || !win.el.isConnected) return false;
      win.close();
      return true;
    });
  },
});
