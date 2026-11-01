WML.define({
  id: "mobile-portrait-layout",
  name: "모바일 세로 60:40 레이아웃",
  version: "1.0.0",
  description: "세로 화면에서 메인 패널 60%, 상태·행동 패널 40%로 배치하고 아내 상태를 고정합니다.",
  platforms: ["mobile"],

  setup(api) {
    const jsx = api.fn("u");
    const useGameSelector = api.fn("ie");
    const useSettingsSelector = api.fn("at");
    const getWife = api.fn("_");
    const getWifeLocation = api.fn("ye");
    const getActivePatronInteraction = api.fn("n8");
    const isWifeColumnAvailable = api.fn("LX");
    const isPlayerNear = api.fn("Ue");
    const WifeStatus = api.fn("Znt");

    const requiredFunctions = {
      jsxRuntime: jsx,
      useGameSelector,
      useSettingsSelector,
      getWife,
      getWifeLocation,
      getActivePatronInteraction,
      isWifeColumnAvailable,
      isPlayerNear,
      WifeStatus,
    };

    for (const [name, value] of Object.entries(requiredFunctions)) {
      if (!value) throw new Error("필수 WML 바인딩을 찾지 못했습니다: " + name);
    }
    if (typeof jsx.jsx !== "function" || typeof jsx.jsxs !== "function" || !jsx.Fragment) {
      throw new Error("WML React JSX 런타임이 예상한 형식이 아닙니다.");
    }

    function MobilePortraitStatus() {
      const gameState = useGameSelector((store) => store.state);
      const dispatch = useGameSelector((store) => store.dispatch);
      const proximityMode = useSettingsSelector((store) => store.proximityMode);

      // Ast()와 같은 근접 모드 제한을 적용해 기존 정보 표시 규칙을 유지합니다.
      const hideWifeColumn = Boolean(proximityMode && !isWifeColumnAvailable(gameState));
      const peekOnly = Boolean(proximityMode && !isPlayerNear(gameState) && !hideWifeColumn);
      const wife = getWife(gameState);
      const wifeLoc = getWifeLocation(gameState);
      const activePatronInteraction = getActivePatronInteraction(gameState);
      const crowdNames =
        activePatronInteraction?.crowdPatronIds
          ?.map((id) => gameState.customers.find((customer) => customer.id === id)?.name)
          .filter(Boolean) ?? [];

      return jsx.jsx(WifeStatus, {
        hideWifeColumn,
        peekOnly,
        wife,
        wifeLoc,
        slot: gameState.slot,
        activePatronInteraction,
        crowdNames,
        dispatch,
        portrait: "external",
        stats: true,
      });
    }

    // sB() 원본은 인수와 이벤트 흐름을 유지한 채 한 번만 실행합니다.
    // 같은 기존 스크롤 컨테이너에서 상태 패널만 sticky로 고정합니다.
    api.hook("sB", {
      around(next, ...args) {
        const choices = next(...args);
        const status = jsx.jsx("div", {
          className: "m36-wml-portrait-status",
          "aria-label": "아내 상태와 최근 반응",
          children: jsx.jsx(MobilePortraitStatus, {}),
        });
        return jsx.jsxs(jsx.Fragment, {
          children: [status, choices],
        });
      },
    });

    const styleId = "m36-wml-mobile-portrait-layout";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = [
        ".m36-wml-portrait-status{display:none}",
        "@media screen and (max-width:1023px) and (orientation:portrait){",
        '#root [class~="lg:hidden"]>div[class*="w-[37%]"]{',
        "flex:0 0 40%!important;width:40%!important;max-width:none!important;min-width:0!important}",
        "#root .m36-wml-portrait-status{display:block;position:sticky;top:0;z-index:30;flex:0 0 auto;",
        "padding:.25rem .25rem .45rem;background:#1c1917;border-bottom:1px solid #44403c;box-shadow:0 5px 12px rgba(0,0,0,.22)}",
        "}",
      ].join("");
      document.head.appendChild(style);
    }
  },
});
