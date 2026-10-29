'use strict';
WML.define({
  id: 'faith-pack-forensic-probe',
  name: 'Faith pack forensic probe',
  version: '0.1.0',
  game: 'faith',
  description: 'Temporary QA helper. Not for release.',
  setup(api) {
    globalThis.__WF_FORENSIC_PROBE__ = {
      bindings() {
        let manifestFn = null, resetFn = null;
        try { manifestFn = api.fn('imageManifest'); } catch (_) {}
        try { resetFn = api.fn('imagePackReset'); } catch (_) {}
        return {
          engineWOe: typeof api.engine.WOe,
          engineQd: typeof api.engine.qD,
          engineM312ImageChanged: typeof api.engine.m312ImageChanged,
          engineAk: typeof api.engine.ak,
          imageManifest: typeof manifestFn,
          imagePackReset: typeof resetFn,
          windowWOe: typeof window.WOe,
          windowQd: typeof window.qD,
          windowM312ImageChanged: typeof window.m312ImageChanged
        };
      },
      async entry(talentName) {
        const fn = api.fn('imageManifest');
        const manifest = await fn();
        const value = manifest && manifest.entries && manifest.entries[talentName];
        return {
          version: manifest && manifest.version,
          entryCount: Object.keys((manifest && manifest.entries) || {}).length,
          found: !!value,
          entry: value || null,
          imageUrl: value && typeof api.engine.ak === 'function' ? api.engine.ak(value) : null
        };
      },
      async render(talentName) {
        const found = await this.entry(talentName);
        if (!found.found || !found.imageUrl) return { ...found, rendered: false };
        const img = document.createElement('img');
        img.id = 'wfil-forensic-smoke-image';
        img.alt = 'temporary forensic image load check';
        img.src = found.imageUrl;
        img.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1px;height:1px';
        document.body.appendChild(img);
        await new Promise(resolve => setTimeout(resolve, 1800));
        const result = {
          ...found,
          srcAttribute: img.getAttribute('src'),
          currentSrc: img.currentSrc,
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          rendered: img.complete && img.naturalWidth > 0
        };
        img.remove();
        return result;
      }
    };
    globalThis.__WF_FORENSIC_READY__ = true;
    console.info('[WF_FORENSIC_PROBE_READY]', JSON.stringify(globalThis.__WF_FORENSIC_PROBE__.bindings()));
  }
});
