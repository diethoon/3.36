// WML test mod: route image-server URLs to same-origin local /images/
// Purpose: diagnostic only. Does not download/copy image files.
WML.define({
  id: 'mika_local_image_path_test',
  name: '테스트: 신캐 이미지 로컬 경로',
  version: '0.1.0',
  game: '>=2026-10-04',
  description: 'art.sintention.com/images/... 이미지 요청을 현재 게임 서버의 /images/... 경로로 바꾸는 진단용 모드입니다.',
  setup() {
    'use strict';

    const TARGET_HOST = 'art.sintention.com';
    const TARGET_PREFIX = '/images/';
    const FLAG = '__WML_LOCAL_IMAGE_PATH_TEST__';

    if (window[FLAG]?.installed) return;

    const state = window[FLAG] = {
      installed: true,
      rewrites: 0,
      misses: 0,
      lastOriginal: '',
      lastLocal: ''
    };

    function rewrite(value) {
      if (typeof value !== 'string' || !value) return value;
      let parsed;
      try {
        parsed = new URL(value, document.baseURI);
      } catch {
        return value;
      }

      if (parsed.hostname !== TARGET_HOST || !parsed.pathname.startsWith(TARGET_PREFIX)) {
        return value;
      }

      // Same-origin root path: the local WML/game server must expose /images/...
      const localUrl = new URL(parsed.pathname + parsed.search + parsed.hash, location.origin).href;
      state.rewrites++;
      state.lastOriginal = value;
      state.lastLocal = localUrl;

      if (state.rewrites <= 5 || state.rewrites % 100 === 0) {
        console.info('[WML local-image-test] redirected', value, '=>', localUrl);
      }
      return localUrl;
    }

    // Covers ordinary <img>.src = URL assignments.
    const imgSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (imgSrc?.get && imgSrc?.set && imgSrc.configurable) {
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        configurable: true,
        enumerable: imgSrc.enumerable,
        get() { return imgSrc.get.call(this); },
        set(value) { imgSrc.set.call(this, rewrite(String(value))); }
      });
    }

    // Covers setAttribute('src', URL) and image elements inserted with src attributes.
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
      if (this instanceof HTMLImageElement && String(name).toLowerCase() === 'src') {
        return originalSetAttribute.call(this, name, rewrite(String(value)));
      }
      return originalSetAttribute.call(this, name, value);
    };

    // Covers frameworks that mutate the src attribute directly after node creation.
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type !== 'attributes' || record.attributeName !== 'src') continue;
        const el = record.target;
        if (!(el instanceof HTMLImageElement)) continue;
        const before = el.getAttribute('src');
        const after = rewrite(before);
        if (after !== before) originalSetAttribute.call(el, 'src', after);
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });

    // Public read-only-ish diagnostic state for console checks.
    window[FLAG].getStatus = () => ({
      installed: state.installed,
      rewrites: state.rewrites,
      lastOriginal: state.lastOriginal,
      lastLocal: state.lastLocal,
      currentOrigin: location.origin,
      note: 'If /images/... on this same origin returns 404, the local image folder is not being served by this origin.'
    });

    console.info('[WML local-image-test] installed. Image requests to https://art.sintention.com/images/... will be redirected to same-origin /images/....');
  }
});
