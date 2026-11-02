// Helpers for the other ported mods (their preludes use the 9-30 Korean names through __WML_LEGACY__).
(() => {
  // 9-30 Korean name -> current name, per game build (made with tools/port-names.mjs, wml/compat/bridge-map.json)
  const MAPS = {
    '2026-10-04': {"re":"ae","g":"_","Y":"Y","Ce":"$e","vt":"bt","Qt":"Qt","Bt":"Pt","Rt":"At","C9":"wV","be":"_e","Ft":"Yt","bt":"pt","Qhe":"eme","_L":"n8","gL":"o8","dp":"Hp","v0":"ak","wc":"Bc","Xi":"hl","f2e":"mje","mY":"rF","nY":"K7","hhe":"lue","o3":"bO","Va":"hs","C3":"XO","Vr":"Xr","Jre":"Jle","_d":"Bd","Pb":"_w","iO":"CP","gT":"u$","pT":"d$","Yb":"vw","r8":"VB","Lf":"gp","Ob":"gw","MMe":"HOe","CMe":"POe","qMe":"JOe","Is":"Cs","I3e":"HPe","gPe":"w6e","dd":"Md","Zl":"mh","tl":"ul","cPe":"f6e","nae":"nhe","aH":"VL","f$":"T5","aae":"ahe","iae":"ihe","vpe":"pye","rae":"rhe","Pm":"ff","L6":"IB","MY":"$F","LIe":"PAe","j":"N","fc":"Dc","cb":"Wb","ph":"Eh","i9":"Kq","uPe":"g6e","iPe":"d6e","d3":"jO","tPe":"r6e","ND":"qD","mc":"Mc","w4e":"$He","Z":"Z","u":"u","gh":"Rh","bL":"r8","yL":"s8","Ile":"$de","dL":"J6","E$":"W5","iy":"Ly","iL":"q6","es":"ls","Av":"bx","Bo":"Oo"},
  };
  const map = MAPS[api.game];
  if (!map) throw new Error(`게임 ${api.game}용 이름 표가 없어요 (tools/port-names.mjs로 만들어 주세요)`);
  const cur = old => { const n = map[old]; if (!n) throw new Error(`이름 표에 ${old}가 없어요`); return n; };
  const L = old => __E[cur(old)];
  const setL = (old, v) => { __E[cur(old)] = v; };

  // new wives (old "wife addon" files push definitions into globalThis.__WAYWARD_WIFE_ADDONS__):
  // the same merge the mod manager patched into the game — a copy of the base wife with the changes on top
  const registerWife = def => {
    const presets = L('Zl'), names = L('dd'), ids = L('cPe');
    if (!def || typeof def.id !== 'string' || presets.some(w => w.id === def.id)) return false;
    const base = presets.find(w => w.id === def.basedOn);
    if (!base) { api.warn(`새 아내 ${def.name || def.id}: 바탕 아내 ${def.basedOn}을(를) 찾지 못했어요`); return false; }
    const { basedOn, ...changes } = def;
    presets.push({ ...base, ...changes, attributeBias: { ...base.attributeBias, ...changes.attributeBias }, backstoryPins: changes.backstoryPins || {} });
    if (def.shortname && !names.includes(def.shortname)) names.push(def.shortname);
    if (def.shortname) ids[def.shortname] = def.id;
    return true;
  };
  const registerWives = () => { for (const w of globalThis.__WAYWARD_WIFE_ADDONS__ || []) registerWife(w); };
  registerWives();
  // image packs: also look for images-<wife>-custom.js (made by the image studio)
  api.hook(cur('MMe'), { after: (files, [who]) => (Array.isArray(files) && !files.includes(`images-${who}-custom.js`) ? [...files, `images-${who}-custom.js`] : files) });

  globalThis.__WML_LEGACY__ = Object.freeze({ game: api.game, name: cur, get: L, set: setL, map: { ...map }, registerWife, registerWives });
})();
