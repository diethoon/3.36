// Faith 원본 이미지팩 로더 — 원본 wfPackScanFolder를 호출하고 pack.js만 읽습니다.
// 이미지 파일을 직접 색인하거나 <img>/CSS를 가로채지 않습니다.
// 이미지팩 등록은 게임의 기존 wfPackScanFolder -> wfPackValidate -> wfImagePacks 저장 흐름에 맡깁니다.
WML.define({
  id: 'faith-image-loader',
  name: 'Faith 원본 이미지팩 로더',
  version: '1.0.0',
  game: 'faith',
  description: '원본 이미지팩 등록기를 재사용합니다. 이미지 파일을 직접 색인하지 않고 가능한 경우 images 하위 폴더를 건너뛰며 pack.js만 읽습니다.',
  async setup(api) {
    const h = api.ui.h;
    let win = null;
    let statusEl = null;
    let busy = false;
    let fallbackInput = null;
    let nativeScan = null;

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
      return files.map(file => {
        const parts = String(file.webkitRelativePath || '').split('/');
        if (parts.length < 3) return '';
        const parent = parts[parts.length - 2];
        return parent.toLowerCase() === 'base' ? (parts[parts.length - 3] || '') : parent;
      }).filter(Boolean);
    }

    function installStartScreenNotice() {
      if (document.getElementById('wfil-start-notice')) return;
      const warningText = '그림이 준비되지 않았습니다';
      const observer = new MutationObserver(() => {
        const bodyText = document.body?.innerText || '';
        if (!bodyText.includes(warningText)) return;
        if (document.getElementById('wfil-start-notice')) return;
        const packs = readNativePacks();
        const names = packs.map(p => p.name).filter(Boolean);
        const box = document.createElement('section');
        box.id = 'wfil-start-notice';
        box.style.cssText = 'margin:8px 0;padding:10px;border:1px solid #6b9f77;border-radius:8px;background:rgba(20,70,35,.18);font:inherit;line-height:1.45;overflow-wrap:anywhere';
        const heading = document.createElement('strong');
        heading.textContent = names.length ? 'Faith 이미지팩 등록 확인' : 'Faith 이미지팩 로더';
        box.append(heading);
        const line = document.createElement('div');
        line.textContent = names.length
          ? '등록된 이미지팩: ' + names.join(', ')
          : '원본 이미지팩 설정에 등록된 팩 이름을 읽지 못했습니다. 원본 이미지팩 설정에서 등록 목록을 확인하세요.';
        box.append(line);
        const loaded = [];
        for (const pack of packs) {
          const tokens = [pack.name, pack.path].filter(Boolean);
          const imgs = [...document.images].filter(img => img.complete && img.naturalWidth > 0 &&
            tokens.some(token => token && (img.currentSrc || img.src).includes(token)));
          if (imgs.length) loaded.push(pack.name);
        }
        const actual = document.createElement('div');
        actual.textContent = loaded.length
          ? '현재 화면에서 이미지 출력이 확인된 팩: ' + [...new Set(loaded)].join(', ')
          : '현재 화면에서 팩별 이미지 출력을 아직 자동 확인하지 못했습니다. 실제 초상화/장면이 표시되는지 확인하세요.';
        box.append(actual);
        const target = [...document.querySelectorAll('body *')].find(el =>
          el.children.length === 0 && (el.textContent || '').includes(warningText));
        (target?.parentElement || document.body).prepend(box);
      });
      observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
      // 등록된 이미지팩이 이미 있고 시작화면이 표시된 경우도 처리합니다.
      setTimeout(() => {
        if ((document.body?.innerText || '').includes(warningText)) {
          observer.disconnect();
          const marker = document.createElement('span');
          marker.style.display = 'none';
          document.body.append(marker);
          observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
        }
      }, 500);
    }

    installStartScreenNotice();

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
      const nativePacks = readNativePacks();
      const selectedNames = [...new Set(folderNames(files))];
      const nativeNames = [...new Set(nativePacks.map(pack => pack.name).filter(Boolean))];
      const successNames = nativeNames.length ? nativeNames : (Number(count) > 0 ? selectedNames : []);
      const nameLine = successNames.length
        ? '\\n등록 확인된 팩 이름: ' + successNames.join(', ')
        : '\\n원본 등록 함수는 실행됐지만 성공한 팩 이름을 카탈로그에서 확인하지 못했습니다.';
      setStatus(`원본 등록 완료: ${Number(count).toLocaleString()}개 이미지팩.${nameLine}\\n시작화면 안내에도 등록 목록과 현재 화면에서 이미지 출력이 확인된 팩을 표시합니다. 이미지 파일 자체는 다시 색인하거나 복사하지 않았습니다.`);
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
          setStatus('이 브라우저는 단계별 폴더 선택을 지원하지 않습니다. 아래 호환용 선택 버튼을 눌러 image-packs 최상위 폴더를 선택하세요.');
          return;
        }
        setStatus('image-packs 폴더 선택을 기다리는 중…');
        const root = await window.showDirectoryPicker({ mode: 'read' });
        setStatus('이미지 파일 폴더는 건너뛰고 pack.js만 찾는 중…');
        const files = await collectFromDirectory(root);
        await registerPackFiles(files);
      } catch (error) {
        if (error && error.name === 'AbortError') {
          setStatus('폴더 선택을 취소했습니다.');
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
        setStatus('선택 목록에서 pack.js만 추리는 중입니다. 이미지 파일은 읽지 않습니다…');
        const packFiles = await collectFromFileList(files);
        await registerPackFiles(packFiles);
      } catch (error) {
        setStatus('등록 실패: ' + String(error && error.message || error), true);
      } finally {
        fallbackInput.value = '';
        busy = false;
      }
    }

    function openWindow() {
      win = api.ui.window({
        id: 'faith-native-image-packs',
        title: 'Faith 원본 이미지팩 로더',
        width: 460,
        height: 390,
        render(body) {
          body.replaceChildren();
          const root = h('div', { class: 'wfil-wrap', style: 'display:flex;flex-direction:column;gap:10px;font:inherit;color:inherit' });
          root.append(h('p', { style: 'font-size:.9em;line-height:1.5;opacity:.9;margin:0' },
            '원본 게임의 이미지팩 등록기를 그대로 사용합니다. 게임 HTML 옆의 image-packs 최상위 폴더를 선택하세요. 캐릭터 폴더나 base 폴더를 선택하지 마세요. 이미지 파일은 직접 색인하지 않고 pack.js만 등록합니다.'));

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
          row.append(nativeButton, fallbackButton);

          statusEl = h('div', {
            role: 'status',
            style: 'padding:8px;border:1px solid var(--wml-border,#7778);border-radius:7px;white-space:pre-wrap;overflow-wrap:anywhere;color:#fcd34d'
          }, nativeScan
            ? '원본 등록 함수 확인됨. 이미지팩 최상위 폴더를 선택할 준비가 되었습니다.'
            : '원본 등록 함수가 아직 확인되지 않았습니다. 선택을 실행해도 등록을 시도하지 않습니다.');

          root.append(row, fallbackInput, statusEl);
          body.append(root);
        },
      });
    }

    api.ui.addButton({
      label: 'Faith 원본 이미지팩',
      title: '원본 이미지팩 등록기를 사용해 pack.js만 등록합니다.',
      onClick: openWindow,
    });
  },
});
