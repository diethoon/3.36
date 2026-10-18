// 새 아내: 이부키 — WML 포팅판
// 원본: Addon_Newwife_ibuki.js. WML은 setup()을 첫 렌더 전에 실행합니다.
// WML 게임 호환 브리지가 옛 아내 등록 API를 제공하며, setup()에서 아내 목록에 반영합니다.
WML.define({
  id: 'ibuki-wml-native-fixed',
  name: '캐릭터 애드온: 이부키 (WML 수정판)',
  version: '1.0.3',
  game: '>=2026-10-04',
  description: '아내 선택지에 이부키를 추가하고, 이미지 서버가 연결된 경우 선택 화면 초상화를 요청합니다.',
  setup(api) {
    // ---- 원본 아내 애드온 ----
    /* Wayward wife addon: 이부키. Wrapped as a WML mod; registration is completed through addon-compat. */
    (() => {
      'use strict';
      const wives = window.__WAYWARD_WIFE_ADDONS__ ||= [];
      if (wives.some(wife => wife.id === "ibuki_addon")) return;
    
      const WIFE = {
        "id": "ibuki_addon",
        "basedOn": "pippa_waif",
        "name": "이부키",
        "shortname": "ibuki",
        "tagline": "게헨나 학원 초등부, 1○세",
        "backstory": "학교에 다니며 여관일을 도우러 온다.",
        "imageBase": "(ibuki \\(blue archive\\):1.2), loli, short stature, petite slim build, cute doll-like appearance, small breasts, pointy ears, cute face, yellow eyes, blonde hair, long hair, demon horns, yellow halo, demon tail, demon wings",
        "imageNegative": "mature_female,adult_baby,minigirl,black hair, tall,curvy, large breasts, huge breasts, poorly drawn, bad hands, bad feet, bad proportions, tattoo, piercing, makeup heavy"
      };
      wives.push(WIFE);
    
      // 선택 화면 초상화 자동 생성: 캐시에 wife_preview_영문이름 이미지가 없으면 이미지 서버에 한 장 요청합니다.
      const PORTRAIT_KEY = 'wife_preview_' + WIFE.shortname;
      const dedupeTags = text => {
        const seen = new Set(), out = [];
        for (const tag of text.split(',').map(t => t.trim()).filter(Boolean)) {
          const norm = tag.toLowerCase().replace(/[()]/g, '').replace(/:[0-9.]+/g, '').trim();
          if (!seen.has(norm)) { seen.add(norm); out.push(tag); }
        }
        return out.join(', ');
      };
      const requestPortrait = async (tries = 0) => {
        const api = window.__WAYWARD_ADDON_API__;
        if (!api) { if (tries < 20) setTimeout(() => requestPortrait(tries + 1), 500); return; }
        if (window['__WAYWARD_PORTRAIT_' + PORTRAIT_KEY]) return;
        window['__WAYWARD_PORTRAIT_' + PORTRAIT_KEY] = true;
        // PORTRAIT_REV가 바뀌면 캐시에 있어도 한 번 새로 그립니다.
        const PORTRAIT_REV = 'v7';
        const revKey = 'wayward-addon-portrait-rev:' + PORTRAIT_KEY;
        let redo = false;
        try { redo = localStorage.getItem(revKey) !== PORTRAIT_REV; } catch {}
        try { if (!redo && await api.pp(PORTRAIT_KEY)) return; } catch {}
        const prefs = api.vt?.getState?.() ?? {};
        if (prefs.imageBackendMode === 'off') return;
        // 신버전(2026-09-30)은 게임이 찾아낸 이미지 서버 주소를 그대로 사용합니다.
        let found = null;
        try { found = api.imageBackend?.()?.baseUrl ?? null; } catch {}
        if (!found || !(api.imageBackend?.()?.comfyui) || globalThis.__WW_STUDIO_OFFLINE_ONLY__ === true) return;
        const base = found.replace(/\/+$/, '');
        const prompt = dedupeTags('masterpiece, best quality, 1girl, solo, ' + WIFE.imageBase
          + ', simple medieval tavern dress, long dress, white apron, modest cleavage'
          + ', cowboy shot, leaning on counter, light smile, long sleeves, looking at viewer, warm lighting, medieval tavern background');
        const negativePrompt = 'worst quality, low quality, blurry, bad anatomy, extra limbs, deformed, text, watermark, signature, ugly, duplicate, morbid, mutilated, large breasts, huge breasts, gigantic breasts, multiple girls, 2girls'
          + (WIFE.imageNegative ? ', ' + WIFE.imageNegative : '')
          + ', nude, naked, breasts_out, nipples, lingerie, heavy armor, cloak hiding body, cropped, close-up';
        // 게임과 같은 생성 설정: 태그 수에 따른 기본값, 또는 게임 설정의 사용자 지정 값
        const tagCount = prompt.split(',').map(t => t.trim()).filter(Boolean).length;
        let gen = tagCount <= 40 ? { steps: 8, cfg: 1.5, loraStrength: 1 }
          : tagCount <= 60 ? { steps: 12, cfg: 2, loraStrength: 0.9 } : { steps: 18, cfg: 2.5, loraStrength: 0.8 };
        const ko = prefs.koImage297;
        if (ko && ko.mode === 'custom' && ko.custom) {
          const n = (v, lo, hi, int) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, int ? Math.round(x) : x)) : null; };
          const c = { steps: n(ko.custom.steps, 4, 40, true), cfg: n(ko.custom.cfg, 1, 10), loraStrength: n(ko.custom.loraStrength, 0, 1) };
          if (c.steps !== null && c.cfg !== null && c.loraStrength !== null) gen = c;
        }
        try {
          const res = await fetch(base + '/api/image/generate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ talentId: PORTRAIT_KEY, prompt, negativePrompt, workflow: 'illustrious', width: 832, height: 1216,
              ...gen, checkpoint: WIFE.imageCheckpoint, bypassCache: redo || undefined }),
          });
          if (res.ok) { try { localStorage.setItem(revKey, PORTRAIT_REV); } catch {} }
          console.log('[Wayward Addon] ' + WIFE.name + ' 초상화 생성 요청: HTTP ' + res.status + '. 완성 후 게임을 새로고침하면 선택 화면에 표시됩니다.');
        } catch (err) {
          console.warn('[Wayward Addon] 초상화 생성 요청 실패. 이미지 서버가 켜져 있는지 확인하세요.', err);
        }
      };
      if (document.readyState === 'complete') setTimeout(requestPortrait, 1000);
      else window.addEventListener('load', () => setTimeout(requestPortrait, 1000), { once: true });
    })();
    
    // ---- 게임의 아내 프리셋/이름/ID 목록에 실제 등록 ----
    globalThis.__WML_LEGACY__.registerWives();
  },
});
