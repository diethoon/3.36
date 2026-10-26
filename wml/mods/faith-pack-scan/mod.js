// Faith 이미지팩 폴더 등록 완화 모드
// 대량의 이미지 파일이 포함된 폴더 선택 뒤 메인 스레드가 장시간 막히는 것을 줄입니다.
// 원본 HTML은 수정하지 않습니다. 등록 함수에는 pack.js 파일만 전달합니다.
WML.define({
  id: 'faith-pack-scan',
  name: { ko: 'Faith 이미지팩 등록 개선', en: 'Faith image-pack registration helper' },
  version: '0.1.0',
  game: 'faith',
  author: 'WML',
  tags: ['util'],
  description: {
    ko: '이미지팩 폴더 선택 후 파일 목록을 나눠 처리하고, pack.js만 기존 등록기에 전달합니다.',
    en: 'Processes folder selections in small batches and passes only pack.js files to the existing registrar.',
  },

  setup(api) {
    const INPUT_SELECTOR = 'input[type="file"][webkitdirectory][aria-label="이미지팩 폴더 갱신"]';
    const CHUNK_SIZE = 384;
    const attached = new WeakSet();
    let observer = null;

    const getScan = () => {
      try {
        const fn = api.fn('wfPackScanFolder');
        return typeof fn === 'function' ? fn : null;
      } catch {
        return null;
      }
    };

    const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

    async function selectPackScripts(fileList) {
      const found = [];
      const total = Number(fileList?.length) || 0;
      for (let start = 0; start < total; start += CHUNK_SIZE) {
        const end = Math.min(total, start + CHUNK_SIZE);
        for (let i = start; i < end; i++) {
          const file = typeof fileList.item === 'function' ? fileList.item(i) : fileList[i];
          if (!file) continue;
          const path = String(file.webkitRelativePath || '').replace(/\\/g, '/');
          if (!path.toLowerCase().includes('image-packs/') || !path.toLowerCase().endsWith('/pack.js')) continue;
          found.push(file);
        }
        if (end < total) await yieldToBrowser();
      }
      return found;
    }

    function setLabel(label, text) {
      if (!label) return;
      const textNode = Array.from(label.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.nodeValue = text;
    }

    function showStatus(input, message, isError = false) {
      const host = input?.parentElement?.parentElement;
      if (!host) return;
      let status = host.querySelector('[data-faith-pack-scan-status]');
      if (!status) {
        status = document.createElement('p');
        status.dataset.faithPackScanStatus = '1';
        status.className = 'text-xs';
        status.style.cssText = 'margin-top:6px;overflow-wrap:anywhere;';
        host.appendChild(status);
      }
      status.textContent = message;
      status.style.color = isError ? '#fca5a5' : '#fcd34d';
    }

    function attach(input) {
      if (attached.has(input)) return;
      attached.add(input);

      input.addEventListener('change', async event => {
        const scan = getScan();
        const files = input.files;
        // If the Faith registrar is not exposed in this runtime, leave the original handler untouched.
        if (!scan || !files?.length) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const label = input.closest('label');
        const oldText = label
          ? (Array.from(label.childNodes).find(node => node.nodeType === Node.TEXT_NODE)?.nodeValue || 'image-packs 폴더 선택')
          : 'image-packs 폴더 선택';
        input.disabled = true;
        setLabel(label, '이미지팩 파일 목록 정리 중…');
        showStatus(input, `폴더 파일 ${files.length.toLocaleString()}개를 작은 단위로 확인하고 있습니다.`);

        try {
          const packFiles = await selectPackScripts(files);
          if (!packFiles.length) {
            throw new Error('선택한 폴더에서 image-packs/*/pack.js 파일을 찾지 못했습니다. image-packs 폴더 자체를 선택했는지 확인해 주세요.');
          }

          setLabel(label, `이미지팩 ${packFiles.length.toLocaleString()}개 등록 중…`);
          showStatus(input, `이미지팩 스크립트 ${packFiles.length.toLocaleString()}개를 등록하고 있습니다.`);
          // The original registrar now receives a small list of metadata scripts, never the image files.
          const count = await scan(packFiles);
          showStatus(input, `이미지팩 ${Number(count).toLocaleString()}개를 등록했습니다.`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          showStatus(input, `이미지팩 등록 실패: ${message}`, true);
          console.error('[faith-pack-scan] image-pack registration failed', error);
        } finally {
          input.value = '';
          input.disabled = false;
          setLabel(label, oldText.trim() || 'image-packs 폴더 선택');
        }
      }, true);
    }

    function scanDom() {
      if (typeof document === 'undefined') return;
      document.querySelectorAll(INPUT_SELECTOR).forEach(attach);
    }

    scanDom();
    if (typeof MutationObserver !== 'undefined' && document.documentElement) {
      observer = new MutationObserver(scanDom);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    // Keep the observer local to this mod; WML may unload the mod between sessions.
    return () => {
      try { observer?.disconnect(); } catch {}
    };
  },
});
