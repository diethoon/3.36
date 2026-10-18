// 1. The installer put "skip the game's own shortcut when WAYWORKS owns it" at the start of three key
//    handlers. Those handlers are registered with window.addEventListener('keydown', …) when the game
//    renders, so they are recognised by their code shape and wrapped with the same check.
(() => {
  // WML: 10-04 — only while the key bridge can find the game screen (wwKeysReady); otherwise the game's own keys stay on
  const owns = k => { try { return !!(window.WWGameKeybinds && window.WWGameKeybinds[k] && window.WWGameKeybinds[k]() && wwKeysReady()); } catch { return false; } };
  // WML: 10-04 — Esc first closes the encyclopedia; the game's handler does that, so it runs while one is open
  const encyclopediaOpen = () => { try { return __E.uh.getState().at !== undefined; } catch { return false; } };
  // WML: 10-04 — the game's event modal shows a ↵ choice that the bridge cannot reach (WAYWORKS treats it as a blocking modal),
  // so the game's own handler answers Enter/1/2/3 while that modal is the only overlay
  const eventModalOnly = () => { const o = [...(document.getElementById('root')?.querySelectorAll('.fixed.inset-0') || [])].filter(n => n.getClientRects().length); return o.length > 0 && o.every(n => n.matches('[class~="backdrop-blur-sm"]')); };
  const GUARDS = [
    { shape: /^function [\w$]+\([\w$]+\)\{(?:var [\w$,]+;)?if\([\w$]+\.ctrlKey\|\|[\w$]+\.metaKey\|\|[\w$]+\.altKey\)return;/, skip: () => owns('ownsGameplayShortcuts') && !eventModalOnly() },
    { shape: /^function [\w$]+\([\w$]+\)\{if\([\w$]+\.key!=="Escape"\)return;const [\w$]+=[\w$]+\.getState\(\);if\([\w$]+\.at!==void 0\)/, skip: () => owns('ownsMenuShortcut') && !encyclopediaOpen() },
    { shape: /^function [\w$]+\([\w$]+\)\{[\w$]+\.key==="Escape"&&\([\w$]+\.preventDefault\(\),[\w$]+\?[\w$]+\(null\):[\w$]+\(\)\)\}/, skip: () => owns('ownsMenuShortcut') },
  ];
  const wrapped = new WeakMap();
  const add = window.addEventListener, remove = window.removeEventListener;
  window.addEventListener = function (type, fn, opts) {
    if (type === 'keydown' && typeof fn === 'function') {
      const guard = GUARDS.find(g => g.shape.test(Function.prototype.toString.call(fn)));
      if (guard) {
        let w = wrapped.get(fn);
        if (!w) { w = function (ev) { if (guard.skip()) return undefined; return fn.call(this, ev); }; wrapped.set(fn, w); }
        return add.call(this, type, w, opts);
      }
    }
    return add.call(this, type, fn, opts);
  };
  window.removeEventListener = function (type, fn, opts) {
    return remove.call(this, type, (typeof fn === 'function' && wrapped.get(fn)) || fn, opts);
  };
})();

// 2. The 9-30 Korean build ran a "complete turn" step after every game action (and noted the day close);
//    WAYWORKS' transforms (statistics, cheats) hook in there. This game does it inline, so the same step runs
//    right after each action instead.
(() => {
  const store = __E.ae;
  const inner = store.getState().dispatch;
  // the closed day is the night's state right after the patron-record cleanup, the point the 9-30 build noted;
  // the night's ticks may already have moved state.day past midnight, so it is labelled with the day being closed
  const nightCleanup = __E.OK;
  let openDay = null;
  if (typeof nightCleanup === 'function') __E.OK = function () {
    const r = nightCleanup.apply(this, arguments);
    try { window.WWGameRuntime?.noteDayClose(r && openDay != null && r.day !== openDay ? { ...r, day: openDay } : r); } catch (e) { console.error('[wayworks] day close', e); }
    return r;
  };
  // the game writes the day-start autosave inside dispatch; hold it until the transforms have run (9-30 order)
  const daySave = __E.UDe;
  let depth = 0, held = null;
  if (typeof daySave === 'function') __E.UDe = function (s, v) { if (depth) { held = [s, v]; return; } return daySave.apply(this, arguments); };
  store.setState({
    dispatch(action) {
      const before = store.getState().state;
      let r, after, threw = true;
      if (!depth) openDay = before ? before.day : null;
      depth++;
      try {
        try { r = inner(action); threw = false; } finally { depth--; if (!depth) openDay = null; }
        after = store.getState().state;
        if (after && after !== before) {
          const newDay = !!before && after.day !== before.day;
          try {
            const res = wwShimComplete({ state: after }, newDay, before);
            if (res && res.state && res.state !== after) store.setState({ state: res.state });
          } catch (e) { console.error('[wayworks] turn transforms', e); }
        }
      } finally {
        if (held && !depth) {
          // one write, after the transforms; the slot keeps the random state the game saved
          // (if the game's own dispatch threw after holding its save, write exactly what it meant to save)
          const [s, v] = held, fin = store.getState().state;
          held = null;
          try { daySave(!threw && fin && fin !== after && !fin.gameOver ? { ...fin, rngState: s.rngState } : s, v); } catch (e) { console.error('[wayworks] day autosave', e); }
        }
      }
      return r;
    },
  });
})();
