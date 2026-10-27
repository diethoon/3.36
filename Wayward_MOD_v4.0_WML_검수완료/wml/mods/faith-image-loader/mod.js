// Faith 이미지팩 설정의 기존 폴더 등록 입력을 보조합니다.
// Faith의 이미지 로더/등록 함수를 새로 만들지 않고, 원래 등록 처리기에 pack.js만 전달합니다.
// 대형 HTML 본문은 수정하지 않습니다.
WML.define({
  id: 'faith-image-loader',
  name: { ko: 'Faith 이미지팩 등록 보조', en: 'Faith image-pack registration helper' },
  version: '0.2.1',
  game: 'faith',
  author: 'WML',
  tags: ['util'],
  description: {
    ko: 'Faith의 이미지팩 설정에서 폴더를 선택하면 pack.js를 찾아 기존 등록 처리기에 전달합니다.',
    en: 'Finds pack.js files in Faith image-pack settings and passes them to the native registration handler.',
  },

  setup(api) {
    const INPUT_SELECTOR = [
      'input[type="file"][webkitdirectory][aria-label="이미지팩 폴더 갱신"]',
      'input[type="file"][webkitdirectory][aria-label*="이미지팩"]',
      'input[type="file"][webkitdirectory]'
    ].join(',');
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
      let status = host.querySelector('[data-faith-image-loader-status]');
      if (!status) {
        status = document.createElement('p');
        status.dataset.faithImageLoaderStatus = '1';
        status.className = 'text-xs';
        status.style.cssText = 'margin-top:6px;overflow-wrap:anywhere;white-space:pre-wrap;';
        host.appendChild(status);
      }
      status.textContent = message;
      status.style.color = isError ? '#fca5a5' : '#fcd34d';
    }

    async function findPackScripts(fileList) {
      const allPacks = [];
      const imagePacks = [];
      const total = Number(fileList?.length) || 0;
      for (let start = 0; start < total; start += CHUNK_SIZE) {
        const end = Math.min(total, start + CHUNK_SIZE);
        for (let i = start; i < end; i++) {
          const file = typeof fileList.item === 'function' ? fileList.item(i) : fileList[i];
          if (!file) continue;
          const path = String(file.webkitRelativePath || file.name || '').replace(/\\/g, '/');
          if (!/(^|\/)pack\.js$/i.test(path)) continue;
          allPacks.push(file);
          if (/(^|\/)image-packs\//i.test(path)) imagePacks.push(file);
        }
        if (end < total) await yieldToBrowser();
      }
      // Selecting the image-packs root preserves image-packs/<pack>/pack.js.
      // Selecting one pack folder instead produces <pack>/pack.js, so allow that shape too.
      return imagePacks.length ? imagePacks : allPacks;
    }

    function attach(input) {
      if (attached.has(input)) return;
      attached.add(input);
      const label = input.closest('label');
      showStatus(input, 'Faith 이미지팩 등록 보조 활성화됨. 이 입력에서 폴더를 선택하면 pack.js를 찾아 기존 등록 처리기에 전달합니다.');

      input.addEventListener('change', async event => {
        if (replaying.has(input)) {
          replaying.delete(input);
          return;
        }
        const files = input.files;
        if (!files?.length) return;

        // Capture phase: stop the unfiltered huge FileList reaching Faith's native handler.
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const oldText = label
          ? (Array.from(label.childNodes).find(node => node.nodeType === Node.TEXT_NODE)?.nodeValue || '이미지팩 폴더 선택')
          : '이미지팩 폴더 선택';

        input.disabled = true;
        setLabel(label, '이미지팩 등록 파일 확인 중…');
        showStatus(input, '선택된 파일 ' + files.length.toLocaleString() + '개를 나눠 확인합니다.');

        try {
          const packFiles = await findPackScripts(files);
          if (!packFiles.length) {
            throw new Error('선택한 폴더에서 pack.js를 찾지 못했습니다. 이미지팩 루트 또는 개별 이미지팩 폴더를 선택하세요.');
          }
          if (typeof DataTransfer === 'undefined') {
            throw new Error('이 브라우저는 DataTransfer를 지원하지 않아 안전하게 파일 목록을 바꿀 수 없습니다. 원본 대량 등록은 실행하지 않았습니다.');
          }

          const transfer = new DataTransfer();
          for (const file of packFiles) transfer.items.add(file);
          input.files = transfer.files;
          input.disabled = false;
          setLabel(label, '이미지팩 ' + packFiles.length.toLocaleString() + '개 등록 중…');
          showStatus(input, '전체 ' + files.length.toLocaleString() + '개 중 pack.js ' + packFiles.length.toLocaleString() + '개만 Faith의 기존 등록 처리기에 전달합니다.');

          replaying.add(input);
          input.dispatchEvent(new Event('change', { bubbles: true }));
          setTimeout(() => {
            input.value = '';
            setLabel(label, oldText.trim() || '이미지팩 폴더 선택');
            showStatus(input, 'pack.js ' + packFiles.length.toLocaleString() + '개를 기존 등록 처리기에 전달했습니다. Faith의 이미지팩 목록에서 등록 결과를 확인하세요.');
          }, 1500);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          showStatus(input, '이미지팩 처리 중단: ' + message, true);
          console.error('[faith-image-loader] pack registration helper failed', error);
          input.value = '';
          input.disabled = false;
          setLabel(label, oldText.trim() || '이미지팩 폴더 선택');
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
