/* WML cloud save mode.
 * Uses the existing wayward-save-share Worker; account storage and one-time
 * share codes are kept server-side. Game state is validated before restore.
 */
WML.define({
  id: 'cloud-save',
  name: '클라우드세이브',
  version: '1.0.1',
  game: '>=2026-10-04',
  description: '계정 저장 슬롯 5개와 7일 만료 1회성 세이브 코드를 제공합니다.',
  symbols: {
    "nativeSaveJSON": {"raw":{"2026-10-04":"VDe"},"doc":"게임의 기본 세이브 형식(JSON)을 만들며 MOD 데이터도 포함합니다.","find":{"all":["gameVersion:"],"like":"function [\\w$]+\\([\\w$]+,[\\w$]+\\)\\{const [\\w$]+=\\{format:[\\w$]+,gameVersion:[\\w$]+,savedAt:new [\\w$]+\\(\\)\\.toISOString\\(\\),state:[\\w$]+\\([\\w$]+\\) ,modData:[\\w$]+\\([\\w$]+\\) \\};return [\\w$]+\\.stringify\\([\\w$]+,null,2\\)\\}","len":150,"any":["modData:","format:","savedAt:",".toISOString",".stringify","state:"]}},
    "pauseMenu": {"raw":{"2026-10-04":"N6e"},"doc":"우측 상단 삼선 버튼이 여는 게임 기본 일시 정지 메뉴.","find":{"all":["\"support\""],"len":2849,"any":["\"save\"",".returnToTitle","\"changelog\"","\"settings\"","onDone:","\"load\""]}}
  },
  async setup(api) {
    await api.loadScript('opaque-client.bundle.js');
    await api.loadScript('crypto.js');
    if (!globalThis.WMLCloudOpaque || !globalThis.WMLCloudOpaque.client || !globalThis.WMLCloudSaveCrypto) {
      throw new Error('클라우드세이브 보안 모듈을 불러오지 못했습니다.');
    }
    await globalThis.WMLCloudOpaque.ready;
    const ENDPOINT = 'https://wayward-save-share.trpgengine.workers.dev';
    const OPAQUE_SERVER_PUBLIC_KEY = 'wI_wRWLbsQr-apmHp3XpRQm1w-kD3prQufjZSi7PqBc';
    const OPAQUE_SERVER_ID = 'wayward-save-share.trpgengine.workers.dev';
    const h = api.ui.h;
    const button = api.ui.button;
    const secret = api.secret;
    let win = null;
    let view = { page: 'home' };
    let message = '';
    let username = api.settings.get({ username: '' }).username || '';
    let authState = readStoredAuth();
    let slots = [];
    let fields = {};
    let drafts = {};
    let busy = false;

    const styleId = 'wml-cloud-save-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent =
        '.wml-cloud-wrap{display:flex;flex-direction:column;gap:12px;color:inherit;font:inherit}' +
        '.wml-cloud-desc{margin:0;opacity:.78;font-size:.92em;line-height:1.45}' +
        '.wml-cloud-field{display:flex;flex-direction:column;gap:5px;min-width:0;font-size:.92em}' +
        '.wml-cloud-input{box-sizing:border-box;width:100%;min-width:0;min-height:42px;padding:9px 11px;border:1px solid var(--wml-border,#7778);border-radius:8px;background:var(--wml-panel,#00000010);color:inherit;font:inherit}' +
        '.wml-cloud-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}' +
        '.wml-cloud-slot{display:flex;flex-direction:column;gap:8px;padding:11px;border:1px solid var(--wml-border,#7778);border-radius:9px}' +
        '.wml-cloud-slot-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}' +
        '.wml-cloud-slot-title{font-weight:600;overflow-wrap:anywhere}' +
        '.wml-cloud-small{font-size:.82em;opacity:.72}' +
        '.wml-cloud-code{font-size:1.45em;font-weight:700;letter-spacing:.12em;text-align:center;padding:12px;border:1px dashed var(--wml-border,#7778);border-radius:8px;user-select:all;overflow-wrap:anywhere}' +
        '.wml-cloud-alert{white-space:pre-wrap;overflow-wrap:anywhere}' +
        '.wml-cloud-wrap button{max-width:100%}';
      document.head.appendChild(style);
    }

    function readStoredAuth() {
      try {
        const value = JSON.parse(secret.get() || '{}');
        return { token: typeof value.token === 'string' ? value.token : '',
          exportKey: typeof value.exportKey === 'string' ? value.exportKey : '' };
      } catch (_) { return { token: '', exportKey: '' }; }
    }
    function currentToken() { return authState.token; }
    function persistAuth(token, exportKey) {
      if (typeof token !== 'string' || !token || typeof exportKey !== 'string' || !exportKey) {
        throw new Error('안전한 계정 세션을 만들지 못했습니다. 다시 로그인해 주세요.');
      }
      authState = { token, exportKey };
      secret.set(JSON.stringify(authState));
    }
    function clearAuth() { authState = { token: '', exportKey: '' }; secret.set(''); }
    function opaqueClient() {
      const client = globalThis.WMLCloudOpaque && globalThis.WMLCloudOpaque.client;
      if (!client) throw new Error('OPAQUE 보안 모듈을 사용할 수 없습니다. 모드 파일을 다시 설치해 주세요.');
      return client;
    }
    function assertPinnedServerKey(value) {
      if (!OPAQUE_SERVER_PUBLIC_KEY || OPAQUE_SERVER_PUBLIC_KEY.startsWith('SET_AFTER_')) {
        throw new Error('인증 서버 공개키 설정이 아직 완료되지 않았습니다.');
      }
      if (typeof value !== 'string' || value !== OPAQUE_SERVER_PUBLIC_KEY) {
        throw new Error('인증 서버 신원을 확인하지 못했습니다. 공식 모드 파일과 서버 설정을 확인해 주세요.');
      }
    }
    function opaqueIdentifiers(id) {
      return { client: String(id).trim().toLowerCase(), server: OPAQUE_SERVER_ID };
    }
    function isConnected() { return !!(win && win.el && win.el.isConnected); }
    function render() {
      if (win && win.refresh && isConnected()) win.refresh();
      else openWindow();
    }
    function show(nextView, notice) {
      view = nextView;
      message = notice || '';
      fields = {};
      drafts = {};
      if (isConnected()) win.setTitle('클라우드세이브');
      render();
    }
    function openWindow() {
      win = api.ui.window({
        id: 'cloud-save-main',
        title: '클라우드세이브',
        width: 440,
        height: 570,
        render(body) {
          body.replaceChildren();
          const root = h('div', { class: 'wml-cloud-wrap', 'data-wml-ui': 'true' });
          body.append(root);
          renderView(root);
        },
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
      root.append(h('p', { class: cls || 'wml-cloud-desc' }, String(text)));
    }
    function addTitle(root, text) {
      root.append(h('h3', { class: 'wml-cloud-slot-title' }, text));
    }
    function addButton(root, label, fn, primary) {
      root.append(button(label, fn, primary ? { primary: true } : {}));
    }
    function addField(root, key, label, type, value, autocomplete) {
      const wrap = h('label', { class: 'wml-cloud-field' }, label);
      const input = document.createElement('input');
      input.className = 'wml-cloud-input';
      input.type = type || 'text';
      input.value = Object.prototype.hasOwnProperty.call(drafts, key) ? drafts[key] : (value || '');
      input.addEventListener('input', () => { drafts[key] = input.value; });
      input.autocomplete = autocomplete || 'off';
      input.setAttribute('data-wml-ui', 'true');
      if (key === 'code') {
        input.maxLength = 6;
        input.autocapitalize = 'characters';
        input.spellcheck = false;
      }
      wrap.append(input);
      root.append(wrap);
      fields[key] = input;
      return input;
    }
    function addMessage(root) {
      if (message) root.append(h('p', { class: 'wml-cloud-alert wml-note', role: 'status' }, message));
    }
    async function request(path, options, useAuth) {
      const opts = Object.assign({ method: 'GET', headers: {} }, options || {});
      opts.headers = Object.assign({}, opts.headers || {});
      if (useAuth !== false) {
        const token = currentToken();
        if (token) opts.headers.Authorization = 'Bearer ' + token;
      }
      const res = await fetch(ENDPOINT + path, opts);
      if (res.status === 204) return { response: res, data: null };
      const contentType = res.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) data = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 401 && useAuth !== false) {
          clearAuth();
          username = '';
          api.settings.set({ username: '' });
        }
        throw new Error((data && data.message) || ('서버 요청 실패 (' + res.status + ')'));
      }
      return { response: res, data };
    }
    function buildSnapshot(state, title) {
      if (!state || typeof state !== 'object' || Array.isArray(state)) {
        throw new Error('게임이 시작된 뒤에 세이브할 수 있습니다.');
      }
      // Use the game's own native save serializer so its normalization and MOD data
      // (including m31Data) match ordinary manual save slots.
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
        title: title || defaultTitle(state),
        state: native.state,
        modData: native.modData || {},
      };
    }
    function defaultTitle(state) {
      const day = Number(state && state.day);
      return Number.isFinite(day) && day > 0 ? 'Day ' + day : 'Wayward 세이브';
    }
    function getSnapshot() {
      return buildSnapshot(api.store.game());
    }
    function applySnapshot(snapshot) {
      if (!snapshot || snapshot.schema !== 'wayward-cloud-save' || snapshot.version !== 1 ||
          snapshot.nativeFormat !== 1 || !snapshot.state ||
          typeof snapshot.state !== 'object' || Array.isArray(snapshot.state)) {
        throw new Error('지원하지 않는 세이브 형식입니다.');
      }
      if (String(snapshot.game || '') !== String(api.game || '') ||
          String(snapshot.gameVersion || '') !== String(api.game || '')) {
        throw new Error('다른 게임 버전에서 만든 세이브입니다. 같은 WML 게임 버전에서 불러와 주세요.');
      }
      // WML's store API exposes the Zustand state/dispatch pair, not a JSON-import
      // method. The cloud snapshot is restricted to the exact same engine version,
      // so apply the already-native state directly and reattach WML mod data.
      const modData = snapshot.modData == null ? {} : snapshot.modData;
      if (!modData || typeof modData !== 'object' || Array.isArray(modData)) {
        throw new Error('세이브 MOD 데이터 형식이 올바르지 않습니다.');
      }
      const savedMods = snapshot.state.mods && typeof snapshot.state.mods === 'object' &&
        !Array.isArray(snapshot.state.mods) ? snapshot.state.mods : {};
      const restored = { ...snapshot.state, mods: { ...savedMods, ...modData } };
      api.store.update(() => restored);
    }
    async function loadAccountSlots() {
      const result = await request('/api/account/saves');
      slots = result.data && Array.isArray(result.data.slots) ? result.data.slots : [];
      return slots;
    }
    async function login() {
      const id = (fields.username && fields.username.value || '').trim();
      const password = fields.password && fields.password.value || '';
      if (!id || !password) throw new Error('아이디와 비밀번호를 입력해 주세요.');
      const client = opaqueClient();
      const identifiers = opaqueIdentifiers(id);
      const { clientLoginState, startLoginRequest } = client.startLogin({
        password, keyStretching: 'memory-constrained',
      });
      const started = await request('/api/opaque/login/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: id, startLoginRequest }),
      }, false);
      const loginResult = client.finishLogin({
        clientLoginState, loginResponse: started.data.loginResponse,
        password, keyStretching: 'memory-constrained', identifiers,
      });
      if (!loginResult) throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
      assertPinnedServerKey(loginResult.serverStaticPublicKey);
      const completed = await request('/api/opaque/login/finish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId: started.data.flowId, finishLoginRequest: loginResult.finishLoginRequest }),
      }, false);
      if (!completed.data || !completed.data.token) throw new Error('로그인 응답이 올바르지 않습니다.');
      persistAuth(completed.data.token, loginResult.exportKey);
      username = completed.data.username || id;
      api.settings.set({ username });
      await loadAccountSlots();
      show({ page: 'account' }, username + ' 계정으로 로그인했습니다.');
    }

    async function register() {
      const id = (fields.username && fields.username.value || '').trim();
      const password = fields.password && fields.password.value || '';
      const confirm = fields.confirm && fields.confirm.value || '';
      if (!id || !password) throw new Error('아이디와 비밀번호를 입력해 주세요.');
      if (password !== confirm) throw new Error('비밀번호가 서로 다릅니다.');
      const client = opaqueClient();
      const identifiers = opaqueIdentifiers(id);
      const { clientRegistrationState, registrationRequest } =
        client.startRegistration({ password, keyStretching: 'memory-constrained' });
      const started = await request('/api/opaque/register/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: id, registrationRequest }),
      }, false);
      const registration = client.finishRegistration({
        clientRegistrationState, registrationResponse: started.data.registrationResponse,
        password, keyStretching: 'memory-constrained', identifiers,
      });
      assertPinnedServerKey(registration.serverStaticPublicKey);
      const completed = await request('/api/opaque/register/finish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: id, registrationRecord: registration.registrationRecord }),
      }, false);
      if (!completed.data || !completed.data.token) throw new Error('계정 생성 응답이 올바르지 않습니다.');
      persistAuth(completed.data.token, registration.exportKey);
      username = completed.data.username || id;
      api.settings.set({ username });
      await loadAccountSlots();
      show({ page: 'account' }, '계정이 생성되었습니다. 비밀번호를 잊으면 복구할 수 없으니 안전하게 보관해 주세요.');
    }
    async function logout() {
      try {
        if (currentToken()) await request('/api/account/logout', { method: 'POST' });
      } catch (_) { /* clear the local token even when the session already expired */ }
      clearAuth();
      username = '';
      api.settings.set({ username: '' });
      slots = [];
      show({ page: 'home' }, '로그아웃했습니다.');
    }
    async function saveAccountSlot(slot) {
      const snap = getSnapshot();
      const title = defaultTitle(snap.state);
      if (!authState.exportKey) throw new Error('세이브 암호화 키가 없습니다. 다시 로그인해 주세요.');
      const encrypted = await globalThis.WMLCloudSaveCrypto.encryptSnapshot(
        snap, authState.exportKey, username.toLowerCase()
      );
      await request('/api/account/saves/' + slot + '?title=' + encodeURIComponent(title), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encrypted),
      });
      await loadAccountSlots();
      show({ page: 'account' }, '저장 슬롯 ' + slot + '에 저장했습니다.');
    }
    async function loadAccountSlot(slot) {
      const result = await request('/api/account/saves/' + slot);
      if (!authState.exportKey) throw new Error('세이브 복호화 키가 없습니다. 다시 로그인해 주세요.');
      const snapshot = await globalThis.WMLCloudSaveCrypto.decryptSnapshot(
        result.data, authState.exportKey, username.toLowerCase()
      );
      applySnapshot(snapshot);
      if (win) win.close();
      message = '';
    }
    async function deleteAccountSlot(slot) {
      await request('/api/account/saves/' + slot, { method: 'DELETE' });
      await loadAccountSlots();
      show({ page: 'account' }, '저장 슬롯 ' + slot + '을 삭제했습니다.');
    }
    async function saveOneTime() {
      const snap = getSnapshot();
      const title = defaultTitle(snap.state);
      const result = await request('/api/share?title=' + encodeURIComponent(title), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(snap),
      }, false);
      show({ page: 'show-code', code: result.data.code, expiresAt: result.data.expiresAt },
        '코드는 7일 동안 유효하며, 한 번 불러오면 서버에서 삭제됩니다.');
    }
    async function loadOneTime() {
      const code = (fields.code && fields.code.value || '').trim();
      if (!/^[A-Za-z0-9]{6}$/.test(code)) throw new Error('영문 대소문자와 숫자로 된 6자리 코드를 입력해 주세요.');
      const result = await request('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code }),
      }, false);
      applySnapshot(result.data);
      if (win) win.close();
      message = '';
    }
    function actionButton(root, label, fn, primary) {
      addButton(root, label, () => {
        if (busy) return;
        busy = true;
        message = '처리 중…';
        render();
        Promise.resolve().then(fn).catch(err => {
          message = String(err && err.message || err || '요청에 실패했습니다.');
          render();
        }).finally(() => {
          busy = false;
          if (isConnected()) render();
        });
      }, primary);
    }
    function renderView(root) {
      const page = view.page;
      if (page === 'home') {
        addTitle(root, '클라우드세이브');
        addText(root, '사용할 방식을 선택하세요.');
        addButton(root, '로그인', () => {
          if (currentToken() && authState.exportKey) {
            busy = true;
            message = '저장 목록을 불러오는 중…';
            render();
            loadAccountSlots().then(() => show({ page: 'account' }))
              .catch(err => show({ page: 'login' }, String(err.message || err)))
              .finally(() => { busy = false; });
          } else show({ page: 'login' });
        }, true);
        addButton(root, '1회성 코드', () => show({ page: 'onetime' }));
        addMessage(root);
      } else if (page === 'login') {
        addTitle(root, '클라우드 계정 로그인');
        addText(root, 'OPAQUE 인증으로 비밀번호 원문을 서버에 전송하지 않습니다. 계정 세이브도 기기에서 암호화되어 여러 기기에서 안전하게 이용할 수 있습니다.');
        addField(root, 'username', '아이디', 'text', username, 'username');
        addField(root, 'password', '비밀번호', 'password', '', 'current-password');
        const row = h('div', { class: 'wml-cloud-actions' });
        row.append(button('로그인', () => {
          if (busy) return;
          busy = true; message = '로그인 중…';
          render();
          login().catch(err => { message = String(err.message || err); render(); })
            .finally(() => { busy = false; if (isConnected()) render(); });
        }, { primary: true }));
        row.append(button('아이디 생성', () => show({ page: 'register' })));
        root.append(row);
        addButton(root, '뒤로', () => show({ page: 'home' }));
        addMessage(root);
      } else if (page === 'register') {
        addTitle(root, '아이디 생성');
        addText(root, '아이디는 영문자·숫자·밑줄로 3~24자, 비밀번호는 10~128자입니다. OPAQUE 인증으로 비밀번호 원문을 서버에 보내지 않습니다. 비밀번호를 잊으면 암호화 세이브를 복구할 수 없습니다.');
        addField(root, 'username', '아이디', 'text', username, 'username');
        addField(root, 'password', '비밀번호', 'password', '', 'new-password');
        addField(root, 'confirm', '비밀번호 확인', 'password', '', 'new-password');
        actionButton(root, '계정 만들기', register, true);
        addButton(root, '로그인으로 돌아가기', () => show({ page: 'login' }));
        addMessage(root);
      } else if (page === 'onetime') {
        addTitle(root, '1회성 코드');
        addText(root, '세이브는 7일 후 만료되며, 한 번 불러오면 코드와 파일이 삭제됩니다. 다만 코드를 먼저 아는 사람은 최초 1회 불러올 수 있으므로 공개 게시물에 올리지 말고 신뢰하는 상대에게만 전달하세요. 계정 세이브의 종단 간 암호화와는 다른 방식입니다.');
        addButton(root, '세이브', saveOneTime, true);
        addButton(root, '로드', () => show({ page: 'code-load' }));
        addButton(root, '뒤로', () => show({ page: 'home' }));
        addMessage(root);
      } else if (page === 'code-load') {
        addTitle(root, '1회성 코드로 로드');
        addField(root, 'code', '6자리 코드', 'text', '', 'one-time-code');
        actionButton(root, '로드', loadOneTime, true);
        addButton(root, '뒤로', () => show({ page: 'onetime' }));
        addMessage(root);
      } else if (page === 'show-code') {
        addTitle(root, '세이브 코드');
        addText(root, '이 코드는 한 번만 사용할 수 있습니다. 상대방에게 코드를 전달하세요.');
        root.append(h('div', { class: 'wml-cloud-code' }, view.code));
        const expiry = new Date(Number(view.expiresAt) * 1000);
        addText(root, '만료: ' + expiry.toLocaleString(), 'wml-cloud-small');
        addButton(root, '코드 복사', () => {
          const text = String(view.code || '');
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => show({ page: 'show-code', code: text, expiresAt: view.expiresAt }, '코드를 복사했습니다.'))
              .catch(() => show({ page: 'show-code', code: text, expiresAt: view.expiresAt }, '코드를 길게 눌러 복사하세요.'));
          } else show({ page: 'show-code', code: text, expiresAt: view.expiresAt }, '코드를 길게 눌러 복사하세요.');
        });
        addButton(root, '완료', () => show({ page: 'home' }));
        addMessage(root);
      } else if (page === 'account') {
        addTitle(root, username ? username + ' · 클라우드 세이브' : '클라우드 세이브');
        addText(root, '계정당 최대 5개 저장 슬롯 · 총 5개');
        const bySlot = new Map(slots.map(item => [Number(item.slot), item]));
        for (let slot = 1; slot <= 5; slot++) {
          const item = bySlot.get(slot);
          const row = h('div', { class: 'wml-cloud-slot' });
          const header = h('div', { class: 'wml-cloud-slot-head' });
          header.append(h('div', { class: 'wml-cloud-slot-title' }, '저장 슬롯 ' + slot));
          header.append(h('div', { class: 'wml-cloud-small' }, item ? (item.title || 'Wayward 세이브') : '비어 있음'));
          row.append(header);
          if (item) {
            const savedAt = Number(item.savedAt || item.updatedAt || 0);
            if (savedAt) row.append(h('div', { class: 'wml-cloud-small' }, '저장 시각: ' + new Date(savedAt * 1000).toLocaleString()));
          } else row.append(h('div', { class: 'wml-cloud-small' }, '현재 진행을 이 슬롯에 저장할 수 있습니다.'));
          const actions = h('div', { class: 'wml-cloud-actions' });
          actions.append(button(item ? '덮어쓰기' : '현재 진행 저장', () => show({ page: 'confirm-save', slot: slot, exists: !!item, title: item && item.title }), { primary: true }));
          if (item) {
            actions.append(button('불러오기', () => show({ page: 'confirm-load', slot: slot, title: item.title })));
            actions.append(button('삭제', () => show({ page: 'confirm-delete', slot: slot, title: item.title })));
          }
          row.append(actions);
          root.append(row);
        }
        addButton(root, '새로고침', () => {
          busy = true; message = '저장 목록을 불러오는 중…'; render();
          loadAccountSlots().then(() => show({ page: 'account' }))
            .catch(err => { message = String(err.message || err); render(); })
            .finally(() => { busy = false; if (isConnected()) render(); });
        });
        addButton(root, '로그아웃', logout);
        addMessage(root);
      } else if (page === 'confirm-save') {
        addTitle(root, '저장 슬롯 ' + view.slot);
        addText(root, view.exists ? '기존 클라우드 세이브를 현재 진행으로 덮어쓸까요?' : '현재 진행을 이 슬롯에 저장할까요?');
        actionButton(root, view.exists ? '덮어쓰기' : '저장', () => saveAccountSlot(view.slot), true);
        addButton(root, '취소', () => show({ page: 'account' }));
        addMessage(root);
      } else if (page === 'confirm-load') {
        addTitle(root, '저장 슬롯 ' + view.slot + ' 불러오기');
        addText(root, '현재 진행은 이 세이브로 교체됩니다.' + (view.title ? '\n' + view.title : ''));
        actionButton(root, '이 세이브 불러오기', () => loadAccountSlot(view.slot), true);
        addButton(root, '취소', () => show({ page: 'account' }));
        addMessage(root);
      } else if (page === 'confirm-delete') {
        addTitle(root, '저장 슬롯 ' + view.slot + ' 삭제');
        addText(root, '삭제한 세이브는 복구할 수 없습니다. 삭제할까요?');
        actionButton(root, '삭제', () => deleteAccountSlot(view.slot), true);
        addButton(root, '취소', () => show({ page: 'account' }));
        addMessage(root);
      }
    }

    // On the title screen, offer cloud loading beside the native new/load actions.
    // This is DOM-only: the game's own menu actions and cloud-save workflows stay untouched.
    const TITLE_NEW_GAME_LABELS = [
      '새 게임', '새로 시작', 'New Game', 'Start New Game', 'Start Game',
    ];
    const TITLE_LOAD_LABELS = [
      '불러오기', '게임 불러오기', '세이브 불러오기',
      'Load', 'Load Game', 'Load Save',
    ];
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
      const interactive = document.querySelectorAll(
        'button,[role="button"],a,[tabindex],input[type="button"],input[type="submit"]'
      );
      for (const node of interactive) {
        if (wanted.has(normalizedMenuText(node)) && isVisibleMenuControl(node)) return node;
      }
      // Some game builds use a clickable div instead of a native button.
      for (const node of document.querySelectorAll('div,li,span')) {
        if (!wanted.has(normalizedMenuText(node)) || !isVisibleMenuControl(node)) continue;
        const style = window.getComputedStyle(node);
        if (style.cursor === 'pointer' || node.hasAttribute('onclick') ||
            node.getAttribute('role') === 'button' || node.hasAttribute('tabindex')) return node;
      }
      return null;
    }
    function hasNearbyMenu(newGame, load) {
      if (!newGame || !load || newGame === load ||
          newGame.contains(load) || load.contains(newGame)) return false;
      const newAncestors = new Map();
      let node = newGame;
      for (let depth = 0; node && depth <= 4; depth++, node = node.parentElement) {
        newAncestors.set(node, depth);
      }
      node = load;
      for (let depth = 0; node && depth <= 4; depth++, node = node.parentElement) {
        if (newAncestors.has(node) && node !== document.body && node !== document.documentElement) {
          return newAncestors.get(node) + depth <= 5;
        }
      }
      return false;
    }
    function enableCloudTitleButton(buttonNode) {
      buttonNode.removeAttribute('id');
      buttonNode.removeAttribute('disabled');
      buttonNode.removeAttribute('aria-disabled');
      buttonNode.removeAttribute('data-disabled');
      buttonNode.removeAttribute('inert');
      if ('disabled' in buttonNode) buttonNode.disabled = false;
      buttonNode.setAttribute('data-wml-cloud-title-load', 'true');
      buttonNode.setAttribute('data-wml-ui', 'true');
      buttonNode.setAttribute('title', '클라우드 불러오기');
      buttonNode.setAttribute('aria-label', '클라우드 불러오기');
      buttonNode.setAttribute('aria-disabled', 'false');
      buttonNode.setAttribute('role', buttonNode.getAttribute('role') || 'button');
      if (buttonNode.tagName === 'BUTTON') buttonNode.type = 'button';
      else if (!buttonNode.hasAttribute('tabindex')) buttonNode.tabIndex = 0;
      // Some game builds apply disabled styling as ordinary class names instead
      // of a :disabled selector. Strip those state-only classes on the clone.
      for (const name of [...buttonNode.classList]) {
        if (/disabled|cursor-not-allowed|pointer-events-none/i.test(name) ||
            /^opacity-(?:[0-9]|[1-9][0-9])$/.test(name)) {
          buttonNode.classList.remove(name);
        }
      }
      buttonNode.style.removeProperty('opacity');
      buttonNode.style.removeProperty('pointer-events');
      buttonNode.style.removeProperty('cursor');
    }
    function syncTitleScreenCloudButton() {
      const existing = document.querySelector('[data-wml-cloud-title-load="true"]');
      const newGame = findVisibleMenuControl(TITLE_NEW_GAME_LABELS);
      const nativeLoad = findVisibleMenuControl(TITLE_LOAD_LABELS);
      if (!newGame || !nativeLoad || !hasNearbyMenu(newGame, nativeLoad)) {
        if (existing) existing.remove();
        return;
      }
      if (existing && existing.isConnected && existing.parentElement === nativeLoad.parentElement) {
        enableCloudTitleButton(existing);
        return;
      }
      if (existing) existing.remove();

      // Clone the native Load button for consistent layout, but never inherit its
      // disabled appearance/state: native Load is disabled when no local saves exist.
      const cloudLoad = nativeLoad.cloneNode(false);
      enableCloudTitleButton(cloudLoad);
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
        return TITLE_NEW_GAME_LABELS.concat(TITLE_LOAD_LABELS)
          .some(label => label.toLocaleLowerCase() === text);
      }
      if (node.nodeType !== 1) return false;
      if (node.matches && node.matches('[data-wml-cloud-title-load="true"]')) return true;
      if (TITLE_NEW_GAME_LABELS.concat(TITLE_LOAD_LABELS)
          .some(label => normalizedMenuText(node) === label.toLocaleLowerCase())) return true;
      if (node.querySelector) {
        const candidates = node.querySelectorAll(
          'button,[role="button"],a,[tabindex],input[type="button"],input[type="submit"],div,li,span'
        );
        for (const candidate of candidates) {
          if (candidate.matches('[data-wml-cloud-title-load="true"]')) return true;
          const text = normalizedMenuText(candidate);
          if (TITLE_NEW_GAME_LABELS.concat(TITLE_LOAD_LABELS)
              .some(label => label.toLocaleLowerCase() === text)) return true;
        }
      }
      return false;
    }
    function scheduleTitleMenuSync() {
      if (titleMenuSyncQueued) return;
      titleMenuSyncQueued = true;
      Promise.resolve().then(() => {
        titleMenuSyncQueued = false;
        syncTitleScreenCloudButton();
      });
    }
    function installTitleScreenCloudButton() {
      if (titleMenuObserver) return;
      const start = () => {
        if (!document.body || titleMenuObserver) return;
        titleMenuObserver = new MutationObserver(records => {
          const relevant = records.some(record =>
            [...record.addedNodes, ...record.removedNodes].some(treeHasTitleMenuLabel)
          );
          if (relevant) scheduleTitleMenuSync();
        });
        titleMenuObserver.observe(document.body, { childList: true, subtree: true });
        syncTitleScreenCloudButton();
      };
      if (document.body) start();
      else document.addEventListener('DOMContentLoaded', start, { once: true });
    }
    installTitleScreenCloudButton();

    // Prefer the native hamburger/pause menu. Some localized/game builds render
    // a slightly different button tree, so keep a WML-dock fallback until a
    // successful native insertion has actually been observed.
    let fallbackDockButton = null;
    let nativeMenuEntrySeen = false;
    function ensureDockFallback() {
      if (fallbackDockButton || nativeMenuEntrySeen) return;
      fallbackDockButton = api.ui.addButton({
        label: '클라우드세이브',
        title: '계정 저장과 1회성 코드',
        onClick: open,
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
            if (Array.isArray(children)) {
              nextChildren = children.map(child => patch(child));
            } else if (children && typeof children === 'object') {
              nextChildren = patch(children);
            }
            if (nextChildren !== children) {
              result = { ...node, props: { ...nodeProps, children: nextChildren } };
            }
            const p = result.props || {};
            if (!state.inserted && result.type === 'div' &&
                p.className === 'flex flex-col gap-2' && Array.isArray(p.children)) {
              const rows = p.children;
              const loadIndex = rows.findIndex(item => {
                const label = item && item.props ? item.props.children : null;
                return typeof label === 'string' &&
                  ['불러오기', 'Load', 'Load Game', 'Load Save'].includes(label.trim());
              });
              if (loadIndex >= 0) {
                const original = rows[loadIndex];
                const cloudButton = {
                  ...original,
                  key: 'wml-cloud-save-pause-menu',
                  props: {
                    ...original.props,
                    onClick: () => {
                      if (typeof props.onClose === 'function') props.onClose();
                      open();
                    },
                    title: '클라우드세이브',
                    'aria-label': '클라우드세이브',
                    children: '클라우드세이브',
                  },
                };
                result = {
                  ...result,
                  props: {
                    ...p,
                    children: [
                      ...rows.slice(0, loadIndex + 1),
                      cloudButton,
                      ...rows.slice(loadIndex + 1),
                    ],
                  },
                };
                state.inserted = true;
              }
            }
            return result;
          }

          const patchedTree = patch(tree);
          if (state.inserted) {
            nativeMenuEntrySeen = true;
            removeDockFallback();
          } else if (!nativeMenuEntrySeen) {
            ensureDockFallback();
          }
          return patchedTree;
        },
      });
    } else {
      ensureDockFallback();
    }
    api.onBack(() => {
      if (!isConnected()) return false;
      if (view.page === 'home') { win.close(); return true; }
      show({ page: 'home' });
      return true;
    });
  },
});
