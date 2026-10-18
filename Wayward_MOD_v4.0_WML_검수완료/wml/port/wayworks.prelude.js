// WAYWORKS: load the framework scripts in install order, then run the in-game bridges below.
const WW_FEATURES = api.settings.get({ cheat: true, stats: true });
const WW_FILES = [
  'WW_Keybind_Framework.js', 'WW_Game_Keybind_Actions.js', 'WW_Legacy_Host.js', 'WW_Keybind_UI.js',
  'WW_Window_Core.js', 'WW_Wayward_Adapter.js', 'WW_Window_Settings.js', 'WW_Action_Core.js',
  ...(WW_FEATURES.cheat ? ['WW_Cheat_Core.js', 'WW_Cheat_Actions.js', 'WW_Cheat_UI.js'] : []),
  ...(WW_FEATURES.stats ? ['WW_Observer_Archive.js', 'WW_Observer_Core.js', 'WW_Observer_Achievements.js', 'WW_Achievement_Runtime.js', 'WW_Observer_Statistics.js'] : []),
];
for (const f of WW_FILES) await api.loadScript('files/' + f);

// helpers of the 9-30 Korean build that this game does not have
let wwShimComplete = result => result;                 // turn completion; the domain bridge replaces it
let wwKeysReady = () => true;                          // the key bridge replaces it: false while it cannot find the game screen
const wwShimValid = state => !!state && typeof state === 'object' && !Array.isArray(state) &&
  !!state.characters && typeof state.characters === 'object' && !!state.economy && Number.isFinite(state.slot) && Number.isFinite(state.day);

api.ui.settings((body, win) => {
  const o = api.settings.get({ cheat: true, stats: true });
  const row = (key, label) => { const c = api.ui.h('input', { type: 'checkbox', checked: o[key] }); c.onchange = () => api.settings.set({ [key]: c.checked }); return api.ui.h('label', { style: 'display:flex;gap:8px;align-items:center;margin:6px 0' }, c, label); };
  body.append(api.ui.h('div', { class: 'wml-small wml-muted' }, '창·단축키는 항상 켜져 있어요. 아래 기능은 바꾼 뒤 새로고침하면 적용돼요.'),
    row('cheat', 'WW 치트'), row('stats', '통계 기록 · 업적 · 통계 화면'));
});
