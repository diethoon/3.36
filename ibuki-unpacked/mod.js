/* WML adapter for the legacy Wayward wife addon: Ibuki.
 *
 * IMPORTANT: the legacy addon must execute BEFORE the game's module script.
 * WML loads mod.js itself during the preload phase, but setup() runs only
 * after the game module is initialized. Therefore the legacy registration
 * code is intentionally executed at top level here rather than from setup().
 */
(() => {
  'use strict';

  // Execute the legacy addon immediately, preserving its original preload timing.
  const code = "/* Wayward wife addon: 이부키. Load before the game's module script. */\n(() => {\n  'use strict';\n  const wives = window.__WAYWARD_WIFE_ADDONS__ ||= [];\n  if (wives.some(wife => wife.id === \"ibuki_addon\")) return;\n\n  const WIFE = {\n    \"id\": \"ibuki_addon\",\n    \"basedOn\": \"pippa_waif\",\n    \"name\": \"이부키\",\n    \"shortname\": \"ibuki\",\n    \"tagline\": \"게헨나 학원 초등부, 1○세\",\n    \"backstory\": \"학교에 다니며 여관일을 도우러 온다.\",\n    \"imageBase\": \"(ibuki \\\\(blue archive\\\\):1.2), loli, short stature, petite slim build, cute doll-like appearance, small breasts, pointy ears, cute face, yellow eyes, blonde hair, long hair, demon horns, yellow halo, demon tail, demon wings\",\n    \"imageNegative\": \"mature_female,adult_baby,minigirl,black hair, tall,curvy, large breasts, huge breasts, poorly drawn, bad hands, bad feet, bad proportions, tattoo, piercing, makeup heavy\"\n  };\n  wives.push(WIFE);\n\n  // 선택 화면 초상화 자동 생성: 캐시에 wife_preview_영문이름 이미지가 없으면 이미지 서버에 한 장 요청합니다.\n  const PORTRAIT_KEY = 'wife_preview_' + WIFE.shortname;\n  const dedupeTags = text => {\n    const seen = new Set(), out = [];\n    for (const tag of text.split(',').map(t => t.trim()).filter(Boolean)) {\n      const norm = tag.toLowerCase().replace(/[()]/g, '').replace(/:[0-9.]+/g, '').trim();\n      if (!seen.has(norm)) { seen.add(norm); out.push(tag); }\n    }\n    return out.join(', ');\n  };\n  const requestPortrait = async (tries = 0) => {\n    const api = window.__WAYWARD_ADDON_API__;\n    if (!api) { if (tries < 20) setTimeout(() => requestPortrait(tries + 1), 500); return; }\n    if (window['__WAYWARD_PORTRAIT_' + PORTRAIT_KEY]) return;\n    window['__WAYWARD_PORTRAIT_' + PORTRAIT_KEY] = true;\n    // PORTRAIT_REV가 바뀌면 캐시에 있어도 한 번 새로 그립니다.\n    const PORTRAIT_REV = 'v7';\n    const revKey = 'wayward-addon-portrait-rev:' + PORTRAIT_KEY;\n    let redo = false;\n    try { redo = localStorage.getItem(revKey) !== PORTRAIT_REV; } catch {}\n    try { if (!redo && await api.pp(PORTRAIT_KEY)) return; } catch {}\n    const prefs = api.vt?.getState?.() ?? {};\n    if (prefs.imageBackendMode === 'off') return;\n    // 신버전(2026-09-30)은 게임이 찾아낸 이미지 서버 주소를 그대로 사용합니다.\n    let found = null;\n    try { found = api.imageBackend?.()?.baseUrl ?? null; } catch {}\n    const base = (found || (prefs.imageBackendMode === 'custom' && prefs.imageBackendUrl\n      ? prefs.imageBackendUrl : 'http://127.0.0.1:8189')).replace(/\\/+$/, '');\n    const prompt = dedupeTags('masterpiece, best quality, 1girl, solo, ' + WIFE.imageBase\n      + ', simple medieval tavern dress, long dress, white apron, modest cleavage'\n      + ', cowboy shot, leaning on counter, light smile, long sleeves, looking at viewer, warm lighting, medieval tavern background');\n    const negativePrompt = 'worst quality, low quality, blurry, bad anatomy, extra limbs, deformed, text, watermark, signature, ugly, duplicate, morbid, mutilated, large breasts, huge breasts, gigantic breasts, multiple girls, 2girls'\n      + (WIFE.imageNegative ? ', ' + WIFE.imageNegative : '')\n      + ', nude, naked, breasts_out, nipples, lingerie, heavy armor, cloak hiding body, cropped, close-up';\n    // 게임과 같은 생성 설정: 태그 수에 따른 기본값, 또는 게임 설정의 사용자 지정 값\n    const tagCount = prompt.split(',').map(t => t.trim()).filter(Boolean).length;\n    let gen = tagCount <= 40 ? { steps: 8, cfg: 1.5, loraStrength: 1 }\n      : tagCount <= 60 ? { steps: 12, cfg: 2, loraStrength: 0.9 } : { steps: 18, cfg: 2.5, loraStrength: 0.8 };\n    const ko = prefs.koImage297;\n    if (ko && ko.mode === 'custom' && ko.custom) {\n      const n = (v, lo, hi, int) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, int ? Math.round(x) : x)) : null; };\n      const c = { steps: n(ko.custom.steps, 4, 40, true), cfg: n(ko.custom.cfg, 1, 10), loraStrength: n(ko.custom.loraStrength, 0, 1) };\n      if (c.steps !== null && c.cfg !== null && c.loraStrength !== null) gen = c;\n    }\n    try {\n      const res = await fetch(base + '/api/image/generate', {\n        method: 'POST', headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify({ talentId: PORTRAIT_KEY, prompt, negativePrompt, workflow: 'illustrious', width: 832, height: 1216,\n          ...gen, checkpoint: WIFE.imageCheckpoint, bypassCache: redo || undefined }),\n      });\n      if (res.ok) { try { localStorage.setItem(revKey, PORTRAIT_REV); } catch {} }\n      console.log('[Wayward Addon] ' + WIFE.name + ' 초상화 생성 요청: HTTP ' + res.status + '. 완성 후 게임을 새로고침하면 선택 화면에 표시됩니다.');\n    } catch (err) {\n      console.warn('[Wayward Addon] 초상화 생성 요청 실패. 이미지 서버가 켜져 있는지 확인하세요.', err);\n    }\n  };\n  if (document.readyState === 'complete') setTimeout(requestPortrait, 1000);\n  else window.addEventListener('load', () => setTimeout(requestPortrait, 1000), { once: true });\n})();\n";
  try {
    const s = document.createElement('script');
    s.textContent = code + '\n//# sourceURL=wml-installed/wifeaddon_ibuki/Addon_Newwife_ibuki.js';
    document.head.appendChild(s);
    s.remove();
  } catch (e) {
    console.error('[WML] wifeaddon_ibuki preload failed', e);
  }

  WML.define({
    id: 'wifeaddon_ibuki',
    name: '캐릭터 애드온: 이부키',
    version: '1.0.0-wml-preload',
    game: '>=2026-09-30',
    role: 'character-look',
    setup(api) {
      // The actual character registration happened above during preload.
      // Keep setup() for WML bookkeeping and future compatibility.
      api.warn('legacy preload registration executed before the game module');
    },
  });
})();
