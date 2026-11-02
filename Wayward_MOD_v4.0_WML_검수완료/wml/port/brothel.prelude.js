// The 9-30 mod manager added data-wayward-room / data-wayward-room-section attributes to the
// "where everyone is" room cards and per-room sections. Here the same markers are put on the rendered
// cards by reading their room names (the game's own label tables, so it works in any language).
const LG = globalThis.__WML_LEGACY__;
const roomOfLabel = () => {
  const m = new Map();
  const add = (label, id) => { if (typeof label === 'string' && label.trim()) m.set(label.trim().replace(/^the /i, '').toLowerCase(), id); };
  for (const table of [LG.get('nY'), LG.get('o3')]) for (const [id, label] of Object.entries(table || {})) add(label, id);
  for (const id of LG.get('Xi') || []) add(id.replace(/_/g, ' '), id);
  return m;
};
let labels = null, labelsAt = 0;
const lookupRoom = text => {
  if (!labels || Date.now() - labelsAt > 5000) { labels = roomOfLabel(); labelsAt = Date.now(); }
  return labels.get(String(text || '').trim().replace(/^the /i, '').toLowerCase());
};
function markRooms() {
  // room cards: <div class="p-1.5 rounded border …"><div>Room name</div>…
  for (const card of document.querySelectorAll('#root div.rounded.border')) {
    if (!/\bp-1\.5\b/.test(card.className) || card.dataset.waywardRoom) continue;
    const head = card.firstElementChild;
    const id = head && lookupRoom(head.textContent);
    if (id) card.dataset.waywardRoom = id;
  }
  // per-room sections: <div class="mb-2"><div class="flex items-center gap-2 mb-0.5"><span>Room</span>…
  for (const sec of document.querySelectorAll('#root div.mb-2')) {
    if (sec.dataset.waywardRoomSection) continue;
    const head = sec.firstElementChild;
    if (!head || !/\bmb-0\.5\b/.test(head.className)) continue;
    const id = lookupRoom(head.firstElementChild && head.firstElementChild.textContent);
    if (id) sec.dataset.waywardRoomSection = id;
  }
}
let markQueued = false;
const queueMark = () => { if (markQueued) return; markQueued = true; Promise.resolve().then(() => { markQueued = false; try { markRooms(); } catch (e) { console.warn('[brothel] room markers', e); } }); };
new MutationObserver(queueMark).observe(document.body, { childList: true, subtree: true, characterData: true });
queueMark();
