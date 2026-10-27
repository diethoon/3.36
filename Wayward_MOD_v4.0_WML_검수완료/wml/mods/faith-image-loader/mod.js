WML.define({
  id: 'faith-image-loader',
  name: 'Faith 이미지팩 로더',
  version: '0.1.1',
  game: '>=2026-10-04',
  description: '이미지 팩 폴더를 한 번에 하나씩 연결하고 파일 처리를 나눠 실행합니다.',
  async setup(api) {
    const h = api.ui.h;
    let win = null;
    let active = true;
    let folderLabel = '';
    const folderLabels = new Set();
    let fileMap = new Map();
    let basenameMap = new Map();
    let objectUrls = new Map();
    let matched = 0;
    let lastError = '';
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
    const MAX_SELECTED_FILES = 20000;

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
      matched = 0;
    }

    function clearFolder() {
      restoreImages();
      revokeUrls();
      fileMap = new Map();
      basenameMap = new Map();
      folderLabel = '';
      folderLabels.clear();
      lastError = '';
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
        const wasTracked = activeBlob.has(img);
        activeBlob.set(img, blobUrl);
        img.setAttribute('src', blobUrl);
        if (!wasTracked) matched++;
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
      if (busy) return '폴더 파일 확인 중: ' + scanned + ' / ' + total;
      if (lastError) return lastError;
      if (folderLabels.size === 0) return '연결된 이미지 폴더가 없습니다.';
      return '연결된 폴더: ' + Array.from(folderLabels).join(', ') + '\n이미지 파일: ' + total + '\n현재 연결된 이미지: ' + matched +
        '\n폴더는 하나씩 추가하며, 이미지 데이터는 실제 화면에 필요할 때만 메모리에 올립니다.';
    }

    function updateStatus() {
      if (statusEl && statusEl.isConnected) statusEl.textContent = statusText();
      if (toggleButton && toggleButton.isConnected) toggleButton.textContent = active ? '로컬 이미지 연결 사용 중' : '로컬 이미지 연결 사용 안 함';
    }

    async function loadFolder(files) {
      const count = files && Number.isFinite(files.length) ? files.length : 0;
      if (!count) throw new Error('선택한 폴더에 파일이 없습니다.');
      if (count > MAX_SELECTED_FILES) throw new Error('파일이 ' + count.toLocaleString() + '개입니다. 모바일 안정성을 위해 한 번에 20,000개 이하인 개별 이미지 팩 폴더를 선택하세요.');
      lastError = '';
      busy = true;
      total = count;
      const first = files[0];
      const firstPath = String(first && (first.webkitRelativePath || first.name) || '');
      folderLabel = firstPath.includes('/') ? firstPath.split('/')[0] : '(선택한 파일)';
      updateStatus();
      let added = 0;
      const pendingMap = new Map();

      for (let start = 0; start < count; start += 200) {
        const end = Math.min(start + 200, count);
        for (let i = start; i < end; i++) {
          const file = files[i];
          if (!file || !IMAGE_EXT.test(file.name || '')) continue;
          added++;
          const relative = String(file.webkitRelativePath || file.name).replace(/\\/g, '/');
          const parts = relative.split('/').filter(Boolean);
          if (parts.length > 1) parts.shift();
          let key = normalizedPath(parts.join('/'));
          key = key.replace(/^images\//, '');
          if (!key) key = normalizedPath(file.name);
          pendingMap.set(key, file);
        }
        scanned = end;
        updateStatus();
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      if (added === 0) {
        folderLabels.delete(folderLabel);
        folderLabel = '';
        busy = false;
        updateStatus();
        throw new Error('선택한 폴더에서 지원되는 이미지 파일을 찾지 못했습니다.');
      }
      folderLabels.add(folderLabel);
      for (const [key, file] of pendingMap) fileMap.set(key, file);
      basenameMap = new Map();
      for (const file of fileMap.values()) {
        const base = normalizedPath(file.name);
        const names = basenameMap.get(base) || [];
        names.push(file);
        basenameMap.set(base, names);
      }
      total = fileMap.size;
      scanned = count;
      busy = false;
      installObserver();
      schedulePatch();
      updateStatus();
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
            '이미지 팩 폴더를 한 번에 하나씩 연결합니다. 65,000개 파일이 든 상위 폴더 전체를 선택하지 마세요. 각 팩 폴더를 따로 선택하세요.'));
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.multiple = true;
          fileInput.accept = 'image/*';
          fileInput.setAttribute('webkitdirectory', '');
          fileInput.setAttribute('directory', '');
          fileInput.setAttribute('aria-label', '이미지 팩 폴더 선택');
          fileInput.addEventListener('change', async () => {
            if (!fileInput.files || !fileInput.files.length) return;
            try { await loadFolder(fileInput.files); }
            catch (error) { folderLabel = ''; busy = false; lastError = String(error.message || error); updateStatus(); }
            finally { fileInput.value = ''; }
            updateStatus();
          });
          const row = h('div', { class: 'wfil-row' });
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
          row.append(toggle, clear);
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
