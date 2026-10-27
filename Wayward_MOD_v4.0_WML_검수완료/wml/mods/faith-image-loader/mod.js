WML.define({
  id: 'faith-image-loader',
  name: 'Faith 이미지팩 로더',
  version: '0.2.0',
  game: '>=2026-10-04',
  description: '모바일 폴더 선택을 순차 처리하고 이미지 경로를 로컬 파일로 연결합니다.',
  async setup(api) {
    const h = api.ui.h;
    let win = null;
    let active = true;
    let folderLabel = '';
    let fileMap = new Map();
    let basenameMap = new Map();
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
    const IMAGE_EXT = /\.(avif|gif|jpe?g|png|webp|bmp)$/i;

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
        if (saved && img.getAttribute('src') !== saved) img.setAttribute('src', saved);
        activeBlob.delete(img);
      }
    }

    function clearFolder() {
      restoreImages();
      revokeUrls();
      fileMap = new Map();
      basenameMap = new Map();
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

    function patchTree(root) {
      if (!root) return;
      if (root instanceof HTMLImageElement) patchImage(root);
      if (root.querySelectorAll) root.querySelectorAll('img').forEach(patchImage);
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
          } else {
            for (const node of record.addedNodes) patchTree(node);
          }
        }
      });
      observer.observe(document.documentElement, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['src']
      });
    }

    function statusText() {
      if (busy && total < 0) return '폴더를 순차적으로 읽는 중: 이미지 ' + scanned + '개 확인';
      if (busy) return '폴더 파일 확인 중: ' + scanned + ' / ' + total;
      if (!folderLabel) return '연결된 이미지 폴더가 없습니다.';
      return '폴더: ' + folderLabel + '\n이미지 파일: ' + total + '\n현재 연결된 이미지: ' + matched +
        '\n파일은 실제로 화면에 필요할 때만 메모리에 올립니다.';
    }

    function updateStatus() {
      if (statusEl && statusEl.isConnected) statusEl.textContent = statusText();
      if (toggleButton && toggleButton.isConnected) toggleButton.textContent = active ? '로컬 이미지 연결 사용 중' : '로컬 이미지 연결 사용 안 함';
    }

    function addFileToMaps(file, relativePath) {
      let key = normalizedPath(relativePath);
      key = key.replace(/^images\//, '');
      if (!key) key = normalizedPath(file.name);
      fileMap.set(key, file);
      const parts = key.split('/').filter(Boolean);
      if (parts.length > 1) {
        const withoutRoot = parts.slice(1).join('/');
        if (withoutRoot && !fileMap.has(withoutRoot)) fileMap.set(withoutRoot, file);
      }
      const base = normalizedPath(file.name);
      const names = basenameMap.get(base) || [];
      names.push(file);
      basenameMap.set(base, names);
    }

    async function loadFolder(files) {
      const list = Array.from(files || []).filter(file => IMAGE_EXT.test(file.name || ''));
      if (!list.length) throw new Error('선택한 폴더에서 지원되는 이미지 파일을 찾지 못했습니다.');
      clearFolder();
      busy = true;
      total = list.length;
      const firstPath = String(list[0].webkitRelativePath || list[0].name);
      folderLabel = firstPath.includes('/') ? firstPath.split('/')[0] : '(선택한 파일)';
      updateStatus();

      for (let start = 0; start < list.length; start += 200) {
        const batch = list.slice(start, start + 200);
        for (const file of batch) {
          const relative = String(file.webkitRelativePath || file.name).replace(/\\/g, '/');
          const parts = relative.split('/').filter(Boolean);
          addFileToMaps(file, parts.join('/'));
        }
        scanned = Math.min(start + batch.length, list.length);
        updateStatus();
        await new Promise(resolve => setTimeout(resolve, 0));
      }
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
        for await (const [name, entry] of directory.entries()) {
          if (entry.kind === 'directory') {
            await walk(entry, prefix + name + '/');
          } else if (IMAGE_EXT.test(name)) {
            try {
              const file = await entry.getFile();
              addFileToMaps(file, prefix + name);
              scanned++;
            } catch (_) {
              unavailable++;
            }
          }
          visited++;
          if (visited % 100 === 0) {
            updateStatus();
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      }

      try {
        await walk(handle, handle.name ? handle.name + '/' : '');
        total = scanned;
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

    async function pickDirectory(fallbackInput) {
      if (typeof window.showDirectoryPicker !== 'function') {
        if (fallbackInput) fallbackInput.click();
        else throw new Error('이 브라우저는 폴더 선택을 지원하지 않습니다.');
        return;
      }
      try {
        const handle = await window.showDirectoryPicker({ id: 'wayward-faith-image-pack', mode: 'read' });
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
            '가능하면 “이미지 폴더 선택 (순차 읽기)”를 사용하세요. 폴더를 한 번에 하나씩 선택하면 모바일에서 파일 목록을 단계적으로 읽습니다. 호환용 선택은 브라우저가 파일 목록을 먼저 만드는 방식이므로 대형 폴더에서 느릴 수 있습니다.'));
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
          row.append(folderButton, fallbackButton, toggle, clear);
          statusEl = h('div', { class: 'wfil-status', role: 'status' }, statusText());
          root.append(fileInput, row, statusEl);
          body.append(root);
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
