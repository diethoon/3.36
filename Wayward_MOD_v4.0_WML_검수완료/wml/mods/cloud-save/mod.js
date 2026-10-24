/* Personal Google Drive-backed cloud saves for WML.
 * No game-save backend is called by this addon. Tokens stay in memory;
 * save contents are encrypted on-device with a user-supplied passphrase.
 */
WML.define({
  id: 'cloud-save',
  name: '클라우드세이브 (개인 Google Drive)',
  version: '0.2.0',
  game: '>=2026-10-04',
  description: '개인 Google Drive에 암호화 세이브를 저장합니다. 별도 중계 서버를 사용하지 않습니다.',
  symbols: {
    "nativeSaveJSON": {
      "raw": { "2026-10-04": "VDe" },
      "doc": "게임 기본 세이브(JSON)를 생성합니다.",
      "find": { "all": ["gameVersion:"], "len": 150, "any": ["modData:", "format:", "savedAt:", ".toISOString", ".stringify", "state:"] }
    },
    "pauseMenu": {
      "raw": { "2026-10-04": "N6e" },
      "doc": "게임 기본 일시정지 메뉴.",
      "find": { "all": ["\"support\""], "len": 2849, "any": ["\"save\"", ".returnToTitle", "\"changelog\"", "\"settings\"", "onDone:", "\"load\""] }
    }
  },
  async setup(api) {
    await api.loadScript('crypto.js');
    if (!globalThis.WMLGoogleDriveCrypto) {
      throw new Error('Google Drive 세이브 암호화 모듈을 불러오지 못했습니다.');
    }

    const h = api.ui.h;
    const button = api.ui.button;
    let win = null;
    let view = { page: 'home' };
    let message = '';
    let fields = {};
    let drafts = {};
    let busy = false;
    let clientId = api.settings.get({ googleClientId: '' }).googleClientId || '';
    let accessToken = '';
    let tokenExpiresAt = 0;
    let driveSlots = [];
    let gsiReady = false;
    let gsiError = '';

    const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
    const FILE_PREFIX = 'wayward-cloud-slot-';
    const STYLE_ID = 'wml-google-drive-save-style';

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent =
        '.wml-gd-wrap{display:flex;flex-direction:column;gap:12px;color:inherit;font:inherit}' +
        '.wml-gd-desc{margin:0;opacity:.82;font-size:.92em;line-height:1.45;white-space:pre-line}' +
        '.wml-gd-field{display:flex;flex-direction:column;gap:5px;min-width:0;font-size:.92em}' +
        '.wml-gd-input{box-sizing:border-box;width:100%;min-width:0;min-height:42px;padding:9px 11px;border:1px solid var(--wml-border,#7778);border-radius:8px;background:var(--wml-panel,#00000010);color:inherit;font:inherit}' +
        '.wml-gd-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}' +
        '.wml-gd-slot{display:flex;flex-direction:column;gap:8px;padding:11px;border:1px solid var(--wml-border,#7778);border-radius:9px}' +
        '.wml-gd-slot-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}' +
        '.wml-gd-slot-title{font-weight:600;overflow-wrap:anywhere}' +
        '.wml-gd-small{font-size:.82em;opacity:.72}' +
        '.wml-gd-wrap button{max-width:100%}';
      document.head.appendChild(style);
    }

    function loadGoogleIdentityLibrary() {
      if (globalThis.google && globalThis.google.accounts && globalThis.google.accounts.oauth2) {
        return Promise.resolve();
      }
      const existing = document.querySelector('script[data-wml-google-identity="true"]');
      if (existing) {
        return new Promise((resolve, reject) => {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', () => reject(new Error('Google 인증 라이브러리를 불러오지 못했습니다.')), { once: true });
        });
      }
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.wmlGoogleIdentity = 'true';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Google 인증 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'));
        document.head.appendChild(script);
      });
    }

    loadGoogleIdentityLibrary()
      .then(() => { gsiReady = true; })
      .catch(error => { gsiError = String(error && error.message || error); });

    function hasToken() {
      return !!accessToken && Date.now() < tokenExpiresAt - 30000;
    }

    function clearToken() {
      accessToken = '';
      tokenExpiresAt = 0;
      driveSlots = [];
    }

    function requestGoogleToken(id) {
      return new Promise((resolve, reject) => {
        if (!gsiReady || !globalThis.google || !globalThis.google.accounts || !globalThis.google.accounts.oauth2) {
          reject(new Error(gsiError || 'Google 인증 모듈을 준비하고 있습니다. 잠시 후 다시 연결해 주세요.'));
          return;
        }
        try {
          const tokenClient = globalThis.google.accounts.oauth2.initTokenClient({
            client_id: id,
            scope: DRIVE_SCOPE,
            callback(response) {
              if (!response || response.error || !response.access_token) {
                reject(new Error((response && response.error_description) || 'Google 인증이 완료되지 않았습니다.'));
                return;
              }
              accessToken = response.access_token;
              tokenExpiresAt = Date.now() + Math.max(60, Number(response.expires_in) || 3600) * 1000;
              resolve();
            },
            error_callback(error) {
              reject(new Error((error && error.message) || 'Google 로그인 창을 열지 못했습니다. 팝업 차단 여부를 확인해 주세요.'));
            }
          });
          tokenClient.requestAccessToken({ prompt: '' });
        } catch (error) {
          reject(error);
        }
      });
    }

    async function driveFetch(path, options) {
      if (!hasToken()) {
        clearToken();
        throw new Error('Google 연결이 만료되었습니다. Google Drive 연결 버튼을 다시 눌러 주세요.');
      }
      const opts = Object.assign({ method: 'GET', headers: {} }, options || {});
      opts.headers = Object.assign({}, opts.headers || {}, { Authorization: 'Bearer ' + accessToken });
      const response = await fetch('https://www.googleapis.com' + path, opts);
      if (response.status === 401) {
        clearToken();
        throw new Error('Google 연결이 만료되었습니다. Google Drive 연결 버튼을 다시 눌러 주세요.');
      }
      if (!response.ok) {
        let detail = '';
        try {
          const data = await response.clone().json();
          detail = data && data.error && data.error.message ? data.error.message : '';
        } catch (_) { /* response body may not be JSON */ }
        throw new Error('Google Drive 요청 실패 (' + response.status + ')' + (detail ? ': ' + detail : ''));
      }
      return response;
    }

    async function refreshSlots() {
      const query = new URLSearchParams({
        spaces: 'appDataFolder',
        pageSize: '100',
        q: 'trashed = false',
        fields: 'files(id,name,modifiedTime,size),nextPageToken'
      });
      const response = await driveFetch('/drive/v3/files?' + query.toString());
      const data = await response.json();
      const slots = new Map();
      for (const file of (Array.isArray(data.files) ? data.files : [])) {
        const match = new RegExp('^' + FILE_PREFIX + '([1-5])\\.json$').exec(String(file.name || ''));
        if (!match) continue;
        const slot = Number(match[1]);
        const previous = slots.get(slot);
        if (!previous || String(file.modifiedTime || '') > String(previous.modifiedTime || '')) {
          slots.set(slot, file);
        }
      }
      driveSlots = Array.from(slots.values());
      return driveSlots;
    }

    function currentFile(slot) {
      return driveSlots.find(file => file.name === FILE_PREFIX + slot + '.json') || null;
    }

    async function readSlotEnvelope(file) {
      const response = await driveFetch('/drive/v3/files/' + encodeURIComponent(file.id) + '?alt=media');
      return response.json();
    }

    async function writeSlotEnvelope(slot, envelope) {
      const existing = currentFile(slot);
      const body = JSON.stringify(envelope);
      if (existing) {
        await driveFetch('/upload/drive/v3/files/' + encodeURIComponent(existing.id) + '?uploadType=media', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json; charset=UTF-8' },
          body
        });
      } else {
        const boundary = 'wml_drive_' + Math.random().toString(16).slice(2) + Date.now().toString(16);
        const metadata = {
          name: FILE_PREFIX + slot + '.json',
          mimeType: 'application/json',
          parents: ['appDataFolder']
        };
        const multipart =
          '--' + boundary + '\r\n' +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) + '\r\n' +
          '--' + boundary + '\r\n' +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          body + '\r\n' +
          '--' + boundary + '--';
        await driveFetch('/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
          body: multipart
        });
      }
      await refreshSlots();
    }

    async function deleteSlot(slot) {
      const file = currentFile(slot);
      if (!file) throw new Error('삭제할 저장 파일을 찾지 못했습니다.');
      await driveFetch('/drive/v3/files/' + encodeURIComponent(file.id), { method: 'DELETE' });
      await refreshSlots();
    }

    function buildSnapshot() {
      const state = api.store.game();
      if (!state || typeof state !== 'object' || Array.isArray(state)) {
        throw new Error('게임이 시작된 뒤에 저장할 수 있습니다.');
      }
      const native = JSON.parse(api.fn('nativeSaveJSON')(state, String(api.game || '')));
      if (!native || native.format !== 1 || !native.state || typeof native.state !== 'object') {
        throw new Error('게임의 기본 세이브 형식을 만들지 못했습니다.');
      }
      return {
        schema: 'wayward-cloud-save',
        version: 1,
        game: String(api.game || ''),
        gameVersion: native.gameVersion,
        nativeFormat: native.format,
        savedAt: Date.now(),
        title: defaultTitle(native.state),
        state: native.state,
        modData: native.modData || {}
      };
    }

    function defaultTitle(state) {
      const day = Number(state && state.day);
      return Number.isFinite(day) && day > 0 ? 'Day ' + day : 'Wayward 세이브';
    }

    function applySnapshot(snapshot) {
      if (!snapshot || snapshot.schema !== 'wayward-cloud-save' || snapshot.version !== 1 ||
          snapshot.nativeFormat !== 1 || !snapshot.state ||
          typeof snapshot.state !== 'object' || Array.isArray(snapshot.state)) {
        throw new Error('지원하지 않는 세이브 형식입니다.');
      }
      if (String(snapshot.game || '') !== String(api.game || '') ||
          String(snapshot.gameVersion || '') !== String(api.game || '')) {
        throw new Error('이 세이브와 현재 게임의 버전 정보가 다릅니다.');
      }
      const modData = snapshot.modData == null ? {} : snapshot.modData;
      if (!modData || typeof modData !== 'object' || Array.isArray(modData)) {
        throw new Error('세이브 MOD 데이터 형식이 올바르지 않습니다.');
      }
      const savedMods = snapshot.state.mods && typeof snapshot.state.mods === 'object' &&
        !Array.isArray(snapshot.state.mods) ? snapshot.state.mods : {};
      const restored = { ...snapshot.state, mods: { ...savedMods, ...modData } };
      // Set both the saved game state and the game-start flag so title-screen loads
      // transition into the playable screen instead of remaining on the title screen.
      api.store.set(current => ({ ...current, state: restored, started: true }));
    }

    function isConnected() {
      return !!(win && win.el && win.el.isConnected);
    }

    function render() {
      if (win && win.refresh && isConnected()) win.refresh();
      else openWindow();
    }

    function show(nextView, notice) {
      view = nextView;
      message = notice || '';
      fields = {};
      drafts = {};
      if (isConnected()) win.setTitle('클라우드세이브 (개인 Google Drive)');
      render();
    }

    function openWindow() {
      win = api.ui.window({
        id: 'cloud-save-google-drive-main',
        title: '클라우드세이브 (개인 Google Drive)',
        width: 460,
        height: 650,
        render(body) {
          body.replaceChildren();
          const root = h('div', { class: 'wml-gd-wrap', 'data-wml-ui': 'true' });
          body.append(root);
          renderView(root);
        }
      });
    }

    function open() {
      view = { page: 'home' };
      message = '';
      if (isConnected()) {
        win.focus();
        win.refresh();
      } else openWindow();
    }

    function addText(root, text, cls) {
      root.append(h('p', { class: cls || 'wml-gd-desc' }, String(text)));
    }

    function addTitle(root, text) {
      root.append(h('h3', { class: 'wml-gd-slot-title' }, text));
    }

    function addButton(root, label, fn, primary) {
      root.append(button(label, fn, primary ? { primary: true } : {}));
    }

    function addField(root, key, label, type, value, autocomplete) {
      const wrap = h('label', { class: 'wml-gd-field' }, label);
      const input = document.createElement('input');
      input.className = 'wml-gd-input';
      input.type = type || 'text';
      input.value = Object.prototype.hasOwnProperty.call(drafts, key) ? drafts[key] : (value || '');
      input.addEventListener('input', () => { drafts[key] = input.value; });
      input.autocomplete = autocomplete || 'off';
      input.setAttribute('data-wml-ui', 'true');
      if (type === 'password') input.minLength = 10;
      wrap.append(input);
      root.append(wrap);
      fields[key] = input;
      return input;
    }

    function runAction(fn) {
      if (busy) return;
      busy = true;
      message = '처리 중…';
      render();
      let task;
      try { task = fn(); }
      catch (error) { task = Promise.reject(error); }
      Promise.resolve(task).catch(error => {
        message = String(error && error.message || error || '요청에 실패했습니다.');
        render();
      }).finally(() => {
        busy = false;
        if (isConnected()) render();
      });
    }

    function connectFromClick() {
      const proposedId = String(fields.clientId && fields.clientId.value || clientId).trim();
      if (!proposedId || !/^[^@\s]+\.apps\.googleusercontent\.com$/.test(proposedId)) {
        message = 'Google Cloud에서 만든 OAuth 클라이언트 ID를 입력해 주세요.';
        render();
        return;
      }
      clientId = proposedId;
      api.settings.set({ googleClientId: clientId });
      if (!gsiReady) {
        message = gsiError || 'Google 인증 라이브러리를 불러오는 중입니다. 잠시 후 다시 눌러 주세요.';
        render();
        return;
      }
      message = 'Google 인증 창을 여는 중…';
      const task = requestGoogleToken(clientId);
      render();
      task.then(() => refreshSlots())
        .then(() => show({ page: 'home' }, 'Google Drive에 연결했습니다.'))
        .catch(error => {
          message = String(error && error.message || error || 'Google 연결에 실패했습니다.');
          render();
        });
    }

    async function saveSlot(slot) {
      const passphrase = String(fields.passphrase && fields.passphrase.value || '');
      if (passphrase.length < 10) throw new Error('세이브 암호화 비밀번호는 10자 이상으로 설정해 주세요.');
      const snapshot = buildSnapshot();
      const envelope = await globalThis.WMLGoogleDriveCrypto.encryptSnapshot(snapshot, passphrase);
      await writeSlotEnvelope(slot, envelope);
      show({ page: 'home' }, '저장 슬롯 ' + slot + '에 암호화하여 저장했습니다.');
    }

    async function loadSlot(slot) {
      const passphrase = String(fields.passphrase && fields.passphrase.value || '');
      if (!passphrase) throw new Error('이 세이브를 저장할 때 사용한 암호화 비밀번호를 입력해 주세요.');
      const file = currentFile(slot);
      if (!file) throw new Error('저장 슬롯이 비어 있습니다.');
      const envelope = await readSlotEnvelope(file);
      const snapshot = await globalThis.WMLGoogleDriveCrypto.decryptSnapshot(envelope, passphrase);
      applySnapshot(snapshot);
      if (win) win.close();
      message = '';
    }

    async function removeSlot(slot) {
      await deleteSlot(slot);
      show({ page: 'home' }, '저장 슬롯 ' + slot + '을 삭제했습니다.');
    }

    async function exportSlot(slot) {
      const file = currentFile(slot);
      if (!file) throw new Error('내보낼 저장 파일을 찾지 못했습니다.');
      const envelope = await readSlotEnvelope(file);
      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = FILE_PREFIX + slot + '.json';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      show({ page: 'home' }, '암호화된 세이브 파일을 내보냈습니다. 파일과 암호화 비밀번호를 안전하게 보관하세요.');
    }

    function renderSlots(root) {
      addTitle(root, 'Google Drive 저장 슬롯');
      addText(root, '최대 5개 슬롯을 사용합니다. 저장할 때 정한 암호화 비밀번호는 다른 기기에서 불러올 때도 필요합니다.');
      const bySlot = new Map(driveSlots.map(file => {
        const match = new RegExp('^' + FILE_PREFIX + '([1-5])\\.json$').exec(file.name);
        return [Number(match && match[1]), file];
      }));
      for (let slot = 1; slot <= 5; slot++) {
        const file = bySlot.get(slot);
        const row = h('div', { class: 'wml-gd-slot' });
        const head = h('div', { class: 'wml-gd-slot-head' });
        head.append(h('div', { class: 'wml-gd-slot-title' }, '저장 슬롯 ' + slot));
        head.append(h('div', { class: 'wml-gd-small' }, file ? '저장됨' : '비어 있음'));
        row.append(head);
        if (file && file.modifiedTime) {
          row.append(h('div', { class: 'wml-gd-small' }, '마지막 수정: ' + new Date(file.modifiedTime).toLocaleString()));
        }
        const actions = h('div', { class: 'wml-gd-actions' });
        actions.append(button(file ? '덮어쓰기' : '저장', () => show({ page: 'save', slot } ), { primary: true }));
        if (file) {
          actions.append(button('불러오기', () => show({ page: 'load', slot })));
          actions.append(button('파일 내보내기', () => runAction(() => exportSlot(slot))));
          actions.append(button('삭제', () => show({ page: 'delete', slot })));
        }
        row.append(actions);
        root.append(row);
      }
    }

    function renderView(root) {
      if (view.page === 'home') {
        addTitle(root, '개인 Google Drive 세이브');
        addText(root,
          '별도 게임 세이브 서버를 사용하지 않습니다. Google Drive에 직접 연결합니다.\n' +
          '페이지를 새로 열면 보안을 위해 다시 연결해야 할 수 있습니다.');
        addField(root, 'clientId', 'Google OAuth 클라이언트 ID', 'text', clientId, 'off');
        addButton(root, 'Google Drive 연결 / 재연결', connectFromClick, true);
        addButton(root, '연결 해제', () => {
          clearToken();
          show({ page: 'home' }, '이 모드의 Google 연결을 해제했습니다.');
        });
        addText(root, hasToken()
          ? '상태: 연결됨 (브라우저 메모리에만 토큰 보관)'
          : '상태: 연결되지 않음', 'wml-gd-small');
        if (hasToken()) {
          addButton(root, '저장 목록 새로고침', () => runAction(async () => {
            await refreshSlots();
            show({ page: 'home' }, '저장 목록을 새로고침했습니다.');
          }));
          renderSlots(root);
        } else {
          addText(root,
            '처음 사용 전 README의 Google Cloud 설정을 완료해야 합니다. 클라이언트 ID는 비밀번호가 아니므로 모드 파일에 포함될 수 있지만, 실제 Client Secret은 입력하거나 저장하지 마세요.');
        }
        addMessage(root);
      } else if (view.page === 'save') {
        addTitle(root, '저장 슬롯 ' + view.slot + ' 저장');
        addText(root, '세이브를 암호화할 비밀번호를 입력하세요. 10자 이상을 권장합니다. 이 비밀번호는 서버나 Google에 보내지 않습니다. 잊어버리면 복구할 수 없습니다.');
        addField(root, 'passphrase', '세이브 암호화 비밀번호', 'password', '', 'new-password');
        addButton(root, '암호화하여 저장', () => runAction(() => saveSlot(view.slot)), true);
        addButton(root, '취소', () => show({ page: 'home' }));
        addMessage(root);
      } else if (view.page === 'load') {
        addTitle(root, '저장 슬롯 ' + view.slot + ' 불러오기');
        addText(root, '저장할 때 사용한 암호화 비밀번호를 입력하세요. 올바른 비밀번호로 복호화한 뒤 게임을 불러옵니다.');
        addField(root, 'passphrase', '세이브 암호화 비밀번호', 'password', '', 'current-password');
        addButton(root, '복호화하고 불러오기', () => runAction(() => loadSlot(view.slot)), true);
        addButton(root, '취소', () => show({ page: 'home' }));
        addMessage(root);
      } else if (view.page === 'delete') {
        addTitle(root, '저장 슬롯 ' + view.slot + ' 삭제');
        addText(root, 'Google Drive의 이 모드 전용 저장 파일을 삭제합니다. 삭제 후에는 복구할 수 없습니다.');
        addButton(root, '삭제 확인', () => runAction(() => removeSlot(view.slot)), true);
        addButton(root, '취소', () => show({ page: 'home' }));
        addMessage(root);
      }
    }

    function addMessage(root) {
      if (message) root.append(h('p', { class: 'wml-gd-desc wml-note', role: 'status' }, message));
    }

    // Title-screen shortcut: available even when native local-save loading is disabled.
    const TITLE_NEW_GAME_LABELS = ['새 게임', '새로 시작', 'New Game', 'Start New Game', 'Start Game'];
    const TITLE_LOAD_LABELS = ['불러오기', '게임 불러오기', '세이브 불러오기', 'Load', 'Load Game', 'Load Save'];
    let titleMenuObserver = null;
    let titleMenuSyncQueued = false;

    function normalizedMenuText(node) {
      return String(node && (node.innerText || node.textContent) || '')
        .replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    }
    function isVisibleMenuControl(node) {
      if (!node || !node.isConnected || node.closest('[data-wml-ui="true"]')) return false;
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 &&
        style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }
    function findVisibleMenuControl(labels) {
      const wanted = new Set(labels.map(label => label.toLocaleLowerCase()));
      const selector = 'button,[role="button"],a,[tabindex],input[type="button"],input[type="submit"]';
      for (const node of document.querySelectorAll(selector)) {
        if (wanted.has(normalizedMenuText(node)) && isVisibleMenuControl(node)) return node;
      }
      for (const node of document.querySelectorAll('div,li,span')) {
        if (!wanted.has(normalizedMenuText(node)) || !isVisibleMenuControl(node)) continue;
        const style = window.getComputedStyle(node);
        if (style.cursor === 'pointer' || node.hasAttribute('onclick') ||
            node.getAttribute('role') === 'button' || node.hasAttribute('tabindex')) return node;
      }
      return null;
    }
    function hasNearbyMenu(newGame, load) {
      if (!newGame || !load || newGame === load || newGame.contains(load) || load.contains(newGame)) return false;
      const ancestors = new Map();
      let node = newGame;
      for (let depth = 0; node && depth <= 4; depth++, node = node.parentElement) ancestors.set(node, depth);
      node = load;
      for (let depth = 0; node && depth <= 4; depth++, node = node.parentElement) {
        if (ancestors.has(node) && node !== document.body && node !== document.documentElement) {
          return ancestors.get(node) + depth <= 5;
        }
      }
      return false;
    }
    function syncTitleCloudButton() {
      const marker = '[data-wml-cloud-drive-title-load="true"]';
      const existing = document.querySelector(marker);
      const newGame = findVisibleMenuControl(TITLE_NEW_GAME_LABELS);
      const nativeLoad = findVisibleMenuControl(TITLE_LOAD_LABELS);
      if (!newGame || !nativeLoad || !hasNearbyMenu(newGame, nativeLoad)) {
        if (existing) existing.remove();
        return;
      }
      if (existing && existing.isConnected && existing.parentElement === nativeLoad.parentElement) {
        if ('disabled' in existing) existing.disabled = false;
        existing.removeAttribute('disabled');
        existing.removeAttribute('aria-disabled');
        return;
      }
      if (existing) existing.remove();
      const cloudLoad = nativeLoad.cloneNode(false);
      cloudLoad.removeAttribute('id');
      cloudLoad.removeAttribute('disabled');
      cloudLoad.removeAttribute('aria-disabled');
      cloudLoad.setAttribute('data-wml-cloud-drive-title-load', 'true');
      cloudLoad.setAttribute('data-wml-ui', 'true');
      cloudLoad.setAttribute('title', '클라우드 불러오기');
      cloudLoad.setAttribute('aria-label', '클라우드 불러오기');
      cloudLoad.setAttribute('role', cloudLoad.getAttribute('role') || 'button');
      if (cloudLoad.tagName === 'BUTTON') cloudLoad.type = 'button';
      else if (!cloudLoad.hasAttribute('tabindex')) cloudLoad.tabIndex = 0;
      for (const name of [...cloudLoad.classList]) {
        if (/disabled|cursor-not-allowed|pointer-events-none/i.test(name) ||
            /^opacity-(?:[0-9]|[1-9][0-9])$/.test(name)) cloudLoad.classList.remove(name);
      }
      cloudLoad.style.removeProperty('opacity');
      cloudLoad.style.removeProperty('pointer-events');
      cloudLoad.style.removeProperty('cursor');
      cloudLoad.textContent = '클라우드 불러오기';
      const activate = event => {
        event.preventDefault();
        event.stopPropagation();
        open();
      };
      cloudLoad.addEventListener('click', activate);
      cloudLoad.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') activate(event);
      });
      nativeLoad.insertAdjacentElement('afterend', cloudLoad);
    }
    function treeHasTitleMenuLabel(node) {
      if (!node) return false;
      if (node.nodeType === 3) {
        const text = normalizedMenuText(node);
        return TITLE_NEW_GAME_LABELS.concat(TITLE_LOAD_LABELS).some(label => label.toLocaleLowerCase() === text);
      }
      if (node.nodeType !== 1) return false;
      if (node.matches && node.matches('[data-wml-cloud-drive-title-load="true"]')) return true;
      if (TITLE_NEW_GAME_LABELS.concat(TITLE_LOAD_LABELS).some(label => label.toLocaleLowerCase() === normalizedMenuText(node))) return true;
      if (node.querySelector) {
        const candidates = node.querySelectorAll('button,[role="button"],a,[tabindex],input[type="button"],input[type="submit"],div,li,span');
        for (const candidate of candidates) {
          if (candidate.matches('[data-wml-cloud-drive-title-load="true"]')) return true;
          if (TITLE_NEW_GAME_LABELS.concat(TITLE_LOAD_LABELS).some(label => label.toLocaleLowerCase() === normalizedMenuText(candidate))) return true;
        }
      }
      return false;
    }
    function scheduleTitleSync() {
      if (titleMenuSyncQueued) return;
      titleMenuSyncQueued = true;
      Promise.resolve().then(() => {
        titleMenuSyncQueued = false;
        syncTitleCloudButton();
      });
    }
    function installTitleCloudButton() {
      if (titleMenuObserver) return;
      const start = () => {
        if (!document.body || titleMenuObserver) return;
        titleMenuObserver = new MutationObserver(records => {
          if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(treeHasTitleMenuLabel))) {
            scheduleTitleSync();
          }
        });
        titleMenuObserver.observe(document.body, { childList: true, subtree: true });
        syncTitleCloudButton();
      };
      if (document.body) start();
      else document.addEventListener('DOMContentLoaded', start, { once: true });
    }
    installTitleCloudButton();

    let fallbackDockButton = null;
    let nativeMenuEntrySeen = false;
    function ensureDockFallback() {
      if (fallbackDockButton || nativeMenuEntrySeen) return;
      fallbackDockButton = api.ui.addButton({
        label: '클라우드세이브',
        title: '개인 Google Drive 저장 및 불러오기',
        onClick: open
      });
    }
    function removeDockFallback() {
      if (!fallbackDockButton) return;
      try { fallbackDockButton.remove(); } catch (_) { /* best effort */ }
      fallbackDockButton = null;
    }

    if (api.has('pauseMenu')) {
      api.hook('pauseMenu', {
        around(next, props) {
          const tree = next(props);
          const state = { inserted: false };
          function patch(node) {
            if (!node || typeof node !== 'object') return node;
            if (Array.isArray(node)) {
              let changed = false;
              const out = node.map(child => {
                const value = patch(child);
                if (value !== child) changed = true;
                return value;
              });
              return changed ? out : node;
            }
            const nodeProps = node.props;
            if (!nodeProps) return node;
            let result = node;
            const children = nodeProps.children;
            let nextChildren = children;
            if (Array.isArray(children)) nextChildren = children.map(child => patch(child));
            else if (children && typeof children === 'object') nextChildren = patch(children);
            if (nextChildren !== children) result = { ...node, props: { ...nodeProps, children: nextChildren } };
            const p = result.props || {};
            if (!state.inserted && result.type === 'div' &&
                p.className === 'flex flex-col gap-2' && Array.isArray(p.children)) {
              const rows = p.children;
              const loadIndex = rows.findIndex(item => {
                const label = item && item.props ? item.props.children : null;
                return typeof label === 'string' && ['불러오기', 'Load', 'Load Game', 'Load Save'].includes(label.trim());
              });
              if (loadIndex >= 0) {
                const original = rows[loadIndex];
                const driveButton = {
                  ...original,
                  key: 'wml-google-drive-cloud-save',
                  props: {
                    ...original.props,
                    onClick: () => {
                      if (typeof props.onClose === 'function') props.onClose();
                      open();
                    },
                    title: '클라우드세이브 (개인 Google Drive)',
                    'aria-label': '클라우드세이브',
                    children: '클라우드세이브'
                  }
                };
                result = { ...result, props: { ...p, children: [...rows.slice(0, loadIndex + 1), driveButton, ...rows.slice(loadIndex + 1)] } };
                state.inserted = true;
              }
            }
            return result;
          }
          const patched = patch(tree);
          if (state.inserted) {
            nativeMenuEntrySeen = true;
            removeDockFallback();
          } else if (!nativeMenuEntrySeen) ensureDockFallback();
          return patched;
        }
      });
    } else ensureDockFallback();

    api.onBack(() => {
      if (!isConnected()) return false;
      if (view.page === 'home') { win.close(); return true; }
      show({ page: 'home' });
      return true;
    });
  }
});
