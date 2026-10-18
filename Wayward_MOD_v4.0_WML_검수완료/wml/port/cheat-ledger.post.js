// The ledger is a tool panel with intended "한글 / English" labels and raw ids (herb ids, moods):
// keep it out of the leftover-English list (🔤).
const markTool = () => { for (const id of ['cheat-ledger-launcher', 'cheat-ledger-overlay', 'cheat-ledger-final-review']) { const n = document.getElementById(id); if (n && !n.hasAttribute('data-i18n-skip')) n.setAttribute('data-i18n-skip', ''); } };
new MutationObserver(markTool).observe(document.body, { childList: true });
markTool();
