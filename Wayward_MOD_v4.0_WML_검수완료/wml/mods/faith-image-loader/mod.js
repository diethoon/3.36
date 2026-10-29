// Faith 이미지팩 로더 — Faith의 기존 이미지팩 설정 UI를 WML 버튼에서 엽니다.
// 원본 HTML의 이미지팩 관리/등록 기능을 복제하거나 숨기지 않습니다.
// 원본 설정 버튼을 클릭하므로 wfPackManager와 wfPackScanFolder의 기존 동작을 그대로 사용합니다.
WML.define({
  id: 'faith-image-loader',
  name: 'Faith 이미지팩 로더',
  version: '1.0.0',
  game: 'faith',
  description: 'Faith의 기존 이미지팩 설정 창을 WML 메뉴에서 엽니다. 원본 메뉴와 등록 기능은 변경하지 않습니다.',
  setup(api) {
    function isVisible(element) {
      if (!element || !element.isConnected) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || 1) !== 0 &&
        rect.width > 0 && rect.height > 0;
    }

    function normalizedText(element) {
      return String(element?.innerText || element?.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function findNativeSettingsButton() {
      return [...document.querySelectorAll('button')]
        .find(button => isVisible(button) && normalizedText(button) === '이미지팩 설정');
    }

    function showFallback(message) {
      api.ui.window({
        id: 'faith-image-loader-open-help',
        title: 'Faith 이미지팩 로더',
        width: 420,
        height: 210,
        render(body) {
          body.replaceChildren();
          body.append(
            api.ui.h('p', { style: 'line-height:1.5;white-space:pre-wrap' }, message),
            api.ui.button('다시 찾기', () => openNativeSettings())
          );
        },
      });
    }

    function openNativeSettings() {
      // 시작 화면에는 설정 버튼이 바로 보이고, 플레이 중에는 햄버거 메뉴 안에 있습니다.
      const settingsButton = findNativeSettingsButton();
      if (settingsButton) {
        settingsButton.click();
        return;
      }

      const menuButton = [
        ...document.querySelectorAll(
          'button[aria-label="메뉴 열기"], button[title="메뉴 (Esc)"], button[title="메뉴"]'
        ),
      ].find(isVisible);

      if (menuButton) {
        menuButton.click();
        window.setTimeout(() => {
          const openedSettingsButton = findNativeSettingsButton();
          if (openedSettingsButton) {
            openedSettingsButton.click();
          } else {
            showFallback(
              'Faith의 기존 이미지팩 설정 버튼을 메뉴에서 찾지 못했습니다.\n' +
              '원본 햄버거 메뉴와 시작 화면 설정은 변경하거나 비활성화하지 않았습니다.'
            );
          }
        }, 120);
        return;
      }

      showFallback(
        '현재 화면에서 Faith의 기존 이미지팩 설정 버튼을 찾지 못했습니다.\n' +
        '게임 시작 화면 또는 플레이 화면의 햄버거 메뉴에서 원본 설정이 열리는지 확인해 주세요.'
      );
    }

    api.ui.addButton({
      label: 'Faith 이미지팩 로더',
      title: 'Faith의 기존 이미지팩 설정 창 열기',
      onClick: openNativeSettings,
    });
  },
});
