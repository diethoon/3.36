globalThis.__WML_LEGACY__.registerWives();
// 1.1.0 (hina pack): her portrait on the wife picker. The game keeps the picker portraits in one table keyed by
// shortname (wifePortraits); a new key is all it needs. The picture ships in files/ next to this mod.
try {
  const portraits = api.fn('wifePortraits');
  if (portraits && typeof portraits === 'object' && !portraits.hina) portraits.hina = api.fileUrl('files/hina_preview.webp');
} catch (e) { console.warn('[newwife-hina] portrait', e); }
