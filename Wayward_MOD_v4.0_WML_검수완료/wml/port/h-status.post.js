// '비밀' tab in the wife panel. The 9-30 mod manager wrote it into the game's tab bar; here the tab is added
// to the rendered bar and the panel (koSESecretPanel) is drawn under it with the game's own React.
(() => {
  const TAB_BASE = 'px-2 desk:px-3 py-1.5 text-[0.8rem] desk:text-sm font-medium rounded-t -mb-px border-b-2 transition-colors ';
  const ON = 'text-amber-300 border-amber-400', OFF = 'text-stone-500 hover:text-stone-300 border-transparent';
  const React = __E.Z, ReactDOM = __E.Kq, jsx = __E.u;
  let open = false, host = null, root = null;

  const barOf = el => el && el.closest('div.flex.flex-wrap.border-b');
  function contentNodes(bar) { const out = []; for (let n = bar.nextElementSibling; n; n = n.nextElementSibling) if (n !== host) out.push(n); return out; }
  function close(bar) {
    open = false;
    if (root) { try { root.unmount(); } catch { /* already gone */ } root = null; }
    if (host) { host.remove(); host = null; }
    if (bar) {
      for (const n of contentNodes(bar)) n.style.display = '';
      const mine = bar.querySelector('[data-ko-se-secret-tab]');
      if (mine) mine.className = TAB_BASE + OFF;
    }
  }
  function show(bar) {
    open = true;
    for (const t of bar.querySelectorAll('button')) if (!t.hasAttribute('data-ko-se-secret-tab')) t.className = t.className.replace(ON, OFF);
    bar.querySelector('[data-ko-se-secret-tab]').className = TAB_BASE + ON;
    for (const n of contentNodes(bar)) n.style.display = 'none';
    if (!host) {
      host = document.createElement('div');
      host.dataset.koSeSecretHost = '';
      bar.after(host);
      root = ReactDOM.createRoot(host);
      root.render(jsx.jsx(koSESecretPanel, {}));
    }
  }
  function decorate() {
    for (const bar of document.querySelectorAll('#root div.flex.flex-wrap.border-b')) {
      const tabs = [...bar.children].filter(n => n.tagName === 'BUTTON');
      if (!tabs.length || !/^(상태|Stats)$/.test(tabs[0].textContent.trim())) continue;
      if (!bar.querySelector('[data-ko-se-secret-tab]')) {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = '비밀'; b.dataset.koSeSecretTab = '';
        b.className = TAB_BASE + OFF;
        b.addEventListener('click', e => { e.preventDefault(); show(bar); });
        bar.append(b);
        for (const t of tabs) t.addEventListener('click', () => close(bar));
      }
      if (open && host && host.previousElementSibling !== bar) close(bar);                 // panel re-mounted
      if (open) for (const n of contentNodes(bar)) if (n.style.display !== 'none') n.style.display = 'none';
    }
    if (open && host && !host.isConnected) close(null);
  }
  let queued = false;
  new MutationObserver(() => { if (queued) return; queued = true; Promise.resolve().then(() => { queued = false; try { decorate(); } catch (e) { console.warn('[h-status] secret tab', e); } }); })
    .observe(document.body, { childList: true, subtree: true });
  void React;
})();
