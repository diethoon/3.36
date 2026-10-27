// Faith 이미지팩 로더 — 원본 wfPackScanFolder를 호출하고 pack.js만 읽습니다.
// 이미지 파일을 직접 색인하거나 <img>/CSS를 가로채지 않습니다.
// 이미지팩 등록은 게임의 기존 wfPackScanFolder -> wfPackValidate -> wfImagePacks 저장 흐름에 맡깁니다.
WML.define({
  id: 'faith-image-loader',
  name: 'Faith 이미지팩 로더',
  version: '1.0.0',
  game: 'faith',
  description: '원본 이미지팩 등록기를 재사용합니다. 이미지 파일을 직접 색인하지 않고 가능한 경우 images 하위 폴더를 건너뛰며 pack.js만 읽습니다.',
  async setup(api) {
    const h = api.ui.h;
    let win = null;
    let statusEl = null;
    let packListEl = null;
    let busy = false;
    let fallbackInput = null;
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

    // 생성형 외형/프롬프트 옵션 패널이 실제로 활성화되면 이 로더를 비활성화합니다.
    let generationModeActive = false;
    let loaderButton = null;
    try { generationModeActive = sessionStorage.getItem('wfil-generation-mode-active') === '1'; } catch (_) {}

    function detectGenerationMode() {
      const labels = ['메인 프롬프트', '네거티브 프롬프트', '캐릭터 LORA 파일명', '상황별 프롬프트'];
      const visibleLabels = [...document.querySelectorAll('body *')].filter(el => {
        if (el.children.length > 0) return false;
        const text = (el.textContent || '').trim();
        if (!labels.includes(text) && !['외형 내보내기', '외형 가져오기'].includes(text)) return false;
        const style = getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
      });
      const bodyText = document.body?.innerText || '';
      const labelHits = labels.filter(label => bodyText.includes(label)).length;
      const exportImportHits = ['외형 내보내기', '외형 가져오기'].filter(label => bodyText.includes(label)).length;
      const hasPromptInputs = [...document.querySelectorAll('textarea, input')].some(el => {
        if (el.type === 'hidden' || el.disabled || !el.getClientRects().length) return false;
        const hint = [el.getAttribute('placeholder'), el.getAttribute('aria-label'), el.name, el.id].join(' ').toLowerCase();
        const parent = el.parentElement?.parentElement?.innerText || el.parentElement?.innerText || '';
        return /프롬프트|lora|외형/i.test(hint + ' ' + parent) && String(el.value || '').trim().length > 0;
      });
      return visibleLabels.length >= 2 && (labelHits >= 2 || exportImportHits >= 1) && hasPromptInputs;
    }

    function syncGenerationMode() {
      // 한 번 생성형 설정을 감지하면 현재 게임 세션에서는 계속 비활성화합니다.
      // 설정 패널을 닫아도 다시 살아나지 않도록 세션 저장소에 기록합니다.
      if (detectGenerationMode()) {
        generationModeActive = true;
        try { sessionStorage.setItem('wfil-generation-mode-active', '1'); } catch (_) {}
      }
      const active = generationModeActive;
      const buttons = [...document.querySelectorAll('button, [role="button"]')].filter(el =>
        (el.textContent || '').trim() === 'Faith 이미지팩 로더');
      for (const button of buttons) {
        button.style.display = active ? 'none' : '';
        button.disabled = active;
        button.title = active
          ? '생성형 외형/프롬프트 설정 사용 중에는 Faith 이미지팩 로더가 비활성화됩니다.'
          : 'Faith 원본 이미지팩 등록기를 사용해 pack.js만 등록합니다.';
      }
      if (loaderButton && typeof loaderButton === 'object' && 'style' in loaderButton) {
        loaderButton.style.display = active ? 'none' : '';
        loaderButton.disabled = active;
      }
      if (!active) hideFalseNoImageWarning();
      return active;
    }

    const generationObserver = new MutationObserver(() => syncGenerationMode());
    generationObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    document.addEventListener('input', syncGenerationMode, true);
    document.addEventListener('change', syncGenerationMode, true);
    setTimeout(syncGenerationMode, 300);
    setTimeout(syncGenerationMode, 1500);
    watchNoImageWarning();

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
      if (generationModeActive || !getLoadedNames().length) return;
      const leaf = [...document.querySelectorAll('body *')].find(el =>
        el.children.length === 0 && (el.textContent || '').trim() === '그림이 준비되지 않았습니다');
      if (!leaf) return;
      const card = leaf.closest('section, article, [role="alert"]') || leaf.parentElement;
      if (card && card.isConnected) card.style.display = 'none';
    }

    // 시작화면 경고를 새로 만들거나 덧붙이지 않습니다. 이미지팩 등록 후 원본의
    // "그림이 준비되지 않았습니다" 경고만 숨기고, 팩 목록은 모드 창 안에 표시합니다.
    function watchNoImageWarning() {
      const observer = new MutationObserver(() => {
        syncGenerationMode();
        hideFalseNoImageWarning();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
      setTimeout(hideFalseNoImageWarning, 500);
      setTimeout(hideFalseNoImageWarning, 2000);
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

    async function chooseDirectory() {
      if (syncGenerationMode()) {
        setStatus('생성형 외형/프롬프트 설정이 활성화되어 있어 이미지팩 로더를 비활성화했습니다.');
        return;
      }
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
      if (syncGenerationMode()) {
        if (fallbackInput) fallbackInput.value = '';
        setStatus('생성형 외형/프롬프트 설정이 활성화되어 있어 이미지팩 로더를 비활성화했습니다.');
        return;
      }
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
      if (syncGenerationMode()) {
        console.info('[faith-image-loader] 생성형 옵션 사용 중이므로 모드 창 열기를 차단했습니다.');
        return;
      }
      win = api.ui.window({
        id: 'faith-image-packs',
        title: 'Faith 이미지팩 로더',
        width: 460,
        height: 430,
        render(body) {
          body.replaceChildren();
          const root = h('div', { class: 'wfil-wrap', style: 'display:flex;flex-direction:column;gap:10px;font:inherit;color:inherit' });
          root.append(h('p', { style: 'font-size:.9em;line-height:1.5;opacity:.9;margin:0' },
            '게임 HTML 옆의 image-packs 최상위 폴더를 선택하세요. 이미지 파일은 직접 색인하지 않고 pack.js만 원본 등록기에 전달합니다.'));

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
          row.append(nativeButton, fallbackButton);

          statusEl = h('div', {
            role: 'status',
            style: 'padding:8px;border:1px solid var(--wml-border,#7778);border-radius:7px;white-space:pre-wrap;overflow-wrap:anywhere;color:#fcd34d'
          }, nativeScan
            ? '이미지팩 등록을 기다리는 중입니다.'
            : '원본 등록 함수를 찾지 못했습니다. 현재 게임에서 등록할 수 없습니다.');

          root.append(row, fallbackInput, statusEl);
          body.append(root);
        },
      });
    }

    loaderButton = api.ui.addButton({
      label: 'Faith 이미지팩 로더',
      title: 'Faith 원본 이미지팩 등록기를 사용해 pack.js만 등록합니다.',
      onClick: openWindow,
    }) || null;
    syncGenerationMode();
  },
});
