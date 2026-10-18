// What the 9-30 mod manager changed inside the game for the Image Studio, redone as WML hooks.
const LG = globalThis.__WML_LEGACY__;
const raw = LG.name, G = LG.get;            // old 9-30 name -> current name / current value
// offline-only: 'auto' by default — pictures are made live only while the game's image server answers AND can draw: its
// health check says the picture engine is ready (ComfyUI on this or another PC, NovelAI, …).
// Most players have no server, and then no request is ever sent.
// The studio window can pin it: true = never generate, false = always ask the server.
if (globalThis.__WW_STUDIO_OFFLINE_ONLY__ === undefined) globalThis.__WW_STUDIO_OFFLINE_ONLY__ = 'auto';
/** 'none': no image server found · 'noengine': the server answers but cannot draw · 'ready' */
const serverState = () => { try { const s = G('ph')(); return !s || !s.baseUrl ? 'none' : s.comfyui ? 'ready' : 'noengine'; } catch { return 'none'; } };
const serverFound = () => serverState() === 'ready';
const offline = () => { const v = globalThis.__WW_STUDIO_OFFLINE_ONLY__; return v === 'auto' ? !serverFound() : !!v; };

// The game looks for its image server once per session and remembers the answer, so a server started after the game,
// or a picture engine whose connection (another PC, a tunnel, …) drops and comes back, would only be noticed after a reload.
// Look again now and then (more often while the server is there but cannot draw) and when the game window comes back.
let recheckServer = async () => {};
(() => {
  let probe, packReset, mayAuto, settings;
  try {
    probe = api.fn('imageBackendProbe'); packReset = api.fn('imagePackReset');
    mayAuto = api.fn('imageAutoProbeAllowed'); settings = api.fn('settingsStore');
  } catch (e) { api.warn(`그림 서버 다시 찾기를 켜지 못했어요: ${e.message}`); return; }
  let busy = false, last = Date.now();
  recheckServer = async () => {
    if (busy || globalThis.__WW_STUDIO_OFFLINE_ONLY__ === true) return;
    const s = settings.getState();
    if (!s || s.imageBackendMode === 'off') return;
    busy = true; last = Date.now();
    try {
      const before = G('ph')();
      const after = await probe({ mode: s.imageBackendMode, url: s.imageBackendUrl, allowAutoProbe: mayAuto() }, true);
      if ((before && before.baseUrl) !== (after && after.baseUrl)) packReset();   // another server, or none: read the picture list again
    } catch { /* next round */ } finally { busy = false; }
  };
  const every = () => (serverState() === 'noengine' ? 15000 : 60000);
  setInterval(() => { if (!document.hidden && Date.now() - last >= every()) recheckServer(); }, 5000);
  const soon = () => { if (!document.hidden && Date.now() - last > 3000) recheckServer(); };
  document.addEventListener('visibilitychange', soon);
  window.addEventListener('focus', soon);
})();

// 1. "offline only": the game makes no image/video generation calls (cached images are still shown)
api.hook(raw('qMe'), { before: () => (offline() ? { cancel: true, value: Promise.resolve(null) } : undefined) });
const GUARDED = new Set(['/api/video/check', '/api/image/generate', '/api/video/generate']);
api.hook(raw('Is'), { before: ([path]) => (offline() && GUARDED.has(path) ? { cancel: true, value: null } : undefined) });
api.hook(raw('I3e'), { before: () => (offline() ? { cancel: true, value: undefined } : undefined) });

// 2. the random-generation window can open on a chosen wife (it starts on the first wife of the list)
api.hook(raw('gPe'), {
  around(next, props, ...rest) {
    const order = G('dd'), want = props && props.initialWife, at = want ? order.indexOf(want) : -1;
    if (at <= 0) return next(props, ...rest);
    order.splice(at, 1); order.unshift(want);
    try { return next(props, ...rest); } finally { order.splice(order.indexOf(want), 1); order.splice(at, 0, want); }
  },
});

// 3. listing what images exist: every variant, not only variant 0
let wwStudioListing = false;
api.hook(raw('fc'), {
  around(next, entries, archetype, spec, id) {
    if (wwStudioListing && spec && spec.variant === 0) { for (let variant = 0; variant < 4; variant++) next(entries, archetype, { ...spec, variant }, id); return undefined; }
    return next(entries, archetype, spec, id);
  },
});

// 4. the bridge object the studio talks to
globalThis.WW_ImageStudioBridge = {
  ready: () => G('cb')(),
  packs: () => globalThis.__WAYWARD_IMAGE_PACKS__ || [],
  currentWife: () => {
    try {
      const state = G('re').getState().state;
      const wife = state.characters[state.primaryCharacterId];
      return wife.shortname || (wife.archetypeId && wife.archetypeId.split('_')[0]) || null;
    } catch { return null; }
  },
  connection: (...a) => G('ph')(...a),
  setOfflineOnly: value => { globalThis.__WW_STUDIO_OFFLINE_ONLY__ = value === 'auto' ? 'auto' : !!value; G('ND')(); recheckServer(); },
  /** can the image server draw right now (what 'auto' goes by) */
  serverFound,
  /** 'none' | 'noengine' | 'ready' */
  serverState,
  /** look for the image server again now */
  recheck: () => recheckServer(),
  openRandom: wife => {
    const mount = document.createElement('div');
    document.body.append(mount);
    const root = G('i9').createRoot(mount);
    const close = () => { root.unmount(); mount.remove(); };
    root.render(G('u').jsx(G('gPe'), { onClose: close, initialWife: wife }));
  },
  enqueue: (...a) => G('uPe')(...a),
  weight: (...a) => G('iPe')(...a),
  list: async wife => {
    const result = [];
    for (const kind of ['tasks', 'escalation', 'sex']) {
      await G('d3')();
      wwStudioListing = true;
      try {
        for (const item of G('tPe')({ archetype: G('cPe')[wife] || wife, kinds: [kind], moodList: [void 0, 'smile', 'shy', 'scared', 'worried'], sexVariants: false, maxEntries: 100000 })) result.push(item);
      } finally { wwStudioListing = false; }
    }
    return result;
  },
};
