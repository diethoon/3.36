// Faith 이미지팩 폴더 등록 개선 모드
// 핵심: 대규모 FileList 전체를 게임의 기존 change 처리기에 넘기지 않고,
// image-packs 내부의 pack.js만 남긴 FileList로 교체한 뒤 원래 이벤트를 재실행합니다.
// 원본 HTML 및 기존 등록 함수를 직접 수정하지 않습니다.
WML.define({
  id: 'faith-pack-scan',
  name: { ko: 'Faith 이미지팩 등록 개선', en: 'Faith image-pack registration helper' },
  version: '0.3.0',
  game: 'faith',
  author: 'WML',
  tags: ['util'],
  description: {
    ko: '등록용 폴더의 pack.js만 게임에 전달하고, 이미지 수만 개를 선택한 경우 즉시 중단합니다.',
    en: 'Passes only pack.js files from a small index folder and stops immediately for huge selections.',
  },

  setup(api) {
    const INPUT_SELECTOR = 'input[type="file"][webkitdirectory][aria-label="이미지팩 폴더 갱신"], input[type="file"][webkitdirectory][aria-label*="이미지팩"]';
    const CHUNK_SIZE = 256;
    const attached = new WeakSet();
    const replaying = new WeakSet();
    let observer = null;

    const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

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

    function attach(input) {
      if (attached.has(input)) return;
      attached.add(input);

      const label = input.closest('label');
      showStatus(input, '이미지팩 등록 개선 모드 활성화됨. 폴더 선택 후 처리 상태가 여기에 표시됩니다.');

      input.addEventListener('change', async event => {
        // The replayed event must reach the game's original React/native handler.
        if (replaying.has(input)) {
          replaying.delete(input);
          return;
        }

        const files = input.files;
        if (!files?.length) return;

        // Stop the original handler before it can iterate over tens of thousands of images.
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const oldText = label
          ? (Array.from(label.childNodes).find(node => node.nodeType === Node.TEXT_NODE)?.nodeValue || '등록용 이미지팩 폴더 선택')
          : '등록용 이미지팩 폴더 선택';

        // A huge directory selection can freeze mobile browsers before filtering helps.
        // Require a small index folder containing only pack.js files.
        if (files.length > 2000) {
          showStatus(
            input,
            `선택 파일이 ${files.length.toLocaleString()}개입니다. 처리를 중단했습니다. 원본 image-packs 대신 pack.js만 모은 image-packs-index 폴더를 선택하세요.`,
            true
          );
          input.value = '';
          setLabel(label, oldText.trim() || '등록용 이미지팩 폴더 선택');
          return;
        }

        input.disabled = true;
        setLabel(label, '등록용 pack.js 확인 중…');
        showStatus(input, `등록용 폴더의 파일 ${files.length.toLocaleString()}개를 확인합니다.`);

        try {
          const packFiles = await selectPackScripts(files);
          if (!packFiles.length) {
            throw new Error('image-packs/*/pack.js 파일을 찾지 못했습니다. 아래 README의 image-packs-index 구조를 확인해 주세요.');
          }
          if (typeof DataTransfer === 'undefined') {
            throw new Error('이 브라우저에서 파일 목록을 안전하게 교체할 수 없습니다(DataTransfer 미지원). 원본 대량 처리는 실행하지 않았습니다.');
          }

          const transfer = new DataTransfer();
          for (const file of packFiles) transfer.items.add(file);
          input.files = transfer.files;
          input.disabled = false;
          setLabel(label, `이미지팩 ${packFiles.length.toLocaleString()}개 전달 중…`);
          showStatus(input, `전체 ${files.length.toLocaleString()}개 중 pack.js ${packFiles.length.toLocaleString()}개만 게임 등록기에 전달합니다.`);

          // Re-dispatch so the original game handler processes only the reduced FileList.
          replaying.add(input);
          input.dispatchEvent(new Event('change', { bubbles: true }));
          setTimeout(() => {
            input.value = '';
            setLabel(label, oldText.trim() || 'image-packs 폴더 선택');
            showStatus(input, `pack.js ${packFiles.length.toLocaleString()}개를 게임 등록기에 전달했습니다. 게임 화면의 등록 결과를 확인해 주세요.`);
          }, 1200);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          showStatus(input, `이미지팩 처리 중단: ${message}`, true);
          console.error('[faith-pack-scan] image-pack selection failed', error);
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

    return () => {
      try { observer?.disconnect(); } catch {}
    };
  },
});
