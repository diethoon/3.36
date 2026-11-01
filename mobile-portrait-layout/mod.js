WML.define({
  id: "mobile-portrait-layout",
  name: "모바일 세로 60:40 레이아웃",
  version: "1.1.0",
  description: "세로 화면에서 메인 패널 60%, 상태·행동 패널 40%로 배치합니다.",
  platforms: ["mobile"],

  setup(api) {
    // 레이아웃은 게임 내부 심볼과 독립적으로 먼저 적용합니다.
    // 심볼 이름이 다른 빌드에서 상태 위젯 바인딩이 실패해도 CSS까지 취소되지 않습니다.
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

    // Prefer semantic bindings from the active WML symbol table; keep aliases for pre7.
    const getFn = (...names) => {
      for (const name of names) {
        try {
          const value = api.fn(name);
          if (value) return value;
        } catch (_) {
          // Try the next binding name. Layout CSS is already installed above.
        }
      }
      return undefined;
    };

    const jsx = getFn("jsx", "u");
    const useGameSelector = getFn("store", "ie");
    const useSettingsSelector = getFn("settingsStore", "at");
    const getWife = getFn("wife", "_");
    const getWifeLocation = getFn("wifeLocation", "_e", "ye");
    const getActivePatronInteraction = getFn("RV", "n8");
    const isWifeColumnAvailable = getFn("kt", "LX");
    const isPlayerNear = getFn("Ue");
    const WifeStatus = getFn("sLe", "Znt");

    // Some game builds do not expose the status component. Keep the layout fix active
    // rather than failing setup and suppressing all changes.
    if (
      !jsx || typeof jsx.jsx !== "function" || typeof jsx.jsxs !== "function" || !jsx.Fragment ||
      !useGameSelector || !useSettingsSelector || !getWife || !getWifeLocation ||
      !getActivePatronInteraction || !isWifeColumnAvailable || !WifeStatus
    ) {
      return;
    }

    function MobilePortraitStatus() {
      const gameState = useGameSelector((store) => store.state);
      const dispatch = useGameSelector((store) => store.dispatch);
      const proximityMode = useSettingsSelector((store) => store.proximityMode);
      const hideWifeColumn = Boolean(proximityMode && !isWifeColumnAvailable(gameState));
      const peekOnly = Boolean(
        isPlayerNear && proximityMode && !isPlayerNear(gameState) && !hideWifeColumn
      );
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

    // Preserve the original choice component and event flow; only prepend status UI.
    api.hook("sB", {
      around(next, ...args) {
        const choices = next(...args);
        const status = jsx.jsx("div", {
          className: "m36-wml-portrait-status",
          "aria-label": "아내 상태와 최근 반응",
          children: jsx.jsx(MobilePortraitStatus, {}),
        });
        return jsx.jsxs(jsx.Fragment, { children: [status, choices] });
      },
    });
  },
});
