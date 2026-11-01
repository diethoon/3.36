WML.define({
  id: "mobile-portrait-layout",
  name: "M36 모바일 세로 60:40 레이아웃",
  version: "2.0.0",
  game: "2026-10-24-pre7",
  platform: "mobile",
  description: "4.38MB Wayward WML 빌드의 메인·행동 패널을 모바일 세로에서 좌우 60:40으로 강제 배치합니다.",

  setup(api) {
    const ROOT_ID = "root";
    const CONTAINER_CLASS = "m36-mobile-portrait-layout-v2";
    const ACTION_CLASS = "m36-mobile-portrait-layout-v2-action";
    const MAIN_CLASS = "m36-mobile-portrait-layout-v2-main";
    const STYLE_ID = "m36-mobile-portrait-layout-v2-style";

    const parentProperties = [
      "display", "grid-template-columns", "grid-template-rows",
      "grid-auto-flow", "align-items", "gap", "min-width",
      "min-height", "max-width", "max-height", "overflow"
    ];
    const childProperties = [
      "grid-column", "grid-row", "width", "max-width",
      "min-width", "min-height", "height", "overflow"
    ];
    const originalStyles = new WeakMap();

    const state = {
      modId: api.id,
      version: "2.0.0",
      game: api.game,
      setup: true,
      styleInjected: false,
      gameplayLayoutFound: false,
      candidateCount: 0,
      panelCount: 0,
      mobileDetected: false,
      portraitDetected: false,
      actionPanelSide: "unknown",
      applied: false,
      reason: "waiting-for-game-layout",
      viewport: { width: 0, height: 0 },
      measured: null,
      updatedAt: 0
    };

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "#root ." + CONTAINER_CLASS +
      " [class*='overflow-y-auto']{" +
      "min-height:0!important;" +
      "overscroll-behavior:contain!important;" +
      "-webkit-overflow-scrolling:touch;" +
      "}";
    document.head.appendChild(style);
    state.styleInjected = !!document.getElementById(STYLE_ID);

    function remember(node, properties) {
      let saved = originalStyles.get(node);
      if (!saved) {
        saved = new Map();
        originalStyles.set(node, saved);
      }
      for (const property of properties) {
        if (!saved.has(property)) {
          saved.set(property, {
            value: node.style.getPropertyValue(property),
            priority: node.style.getPropertyPriority(property)
          });
        }
      }
    }

    function applyStyles(node, values, properties) {
      remember(node, properties);
      for (const [property, value] of Object.entries(values)) {
        node.style.setProperty(property, value, "important");
      }
    }

    function restoreStyles(node) {
      const saved = originalStyles.get(node);
      if (!saved) return;
      for (const [property, original] of saved.entries()) {
        if (original.value) {
          node.style.setProperty(property, original.value, original.priority);
        } else {
          node.style.removeProperty(property);
        }
      }
      originalStyles.delete(node);
    }

    function getHostPlatform() {
      try {
        return window.WML?.status?.()?.host?.platform || "unknown";
      } catch (_) {
        return "unknown";
      }
    }

    function isMobileDevice() {
      if (getHostPlatform() === "mobile") return true;
      const userAgent = navigator.userAgent || "";
      const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
      const coarsePointer = !!window.matchMedia?.("(pointer:coarse)").matches;
      const touchDevice = Number(navigator.maxTouchPoints || 0) > 0;
      return mobileUA || coarsePointer || touchDevice;
    }

    function isPortrait() {
      return !!window.matchMedia?.("(orientation:portrait)").matches ||
        window.innerHeight > window.innerWidth;
    }

    function inspect() {
      const root = document.getElementById(ROOT_ID);
      const candidates = root
        ? Array.from(root.querySelectorAll('[class~="lg:hidden"]'))
        : [];

      state.candidateCount = candidates.length;
      state.viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      state.mobileDetected = isMobileDevice();
      state.portraitDetected = isPortrait();

      let target = null;
      let action = null;
      let main = null;

      for (const candidate of candidates) {
        const children = Array.from(candidate.children);
        if (children.length !== 2) continue;

        const actionPanel = children.find(node =>
          typeof node.className === "string" &&
          node.className.includes("w-[37%]")
        );
        if (!actionPanel) continue;

        target = candidate;
        action = actionPanel;
        main = children.find(node => node !== actionPanel);
        break;
      }

      state.gameplayLayoutFound = !!(target && action && main);
      state.panelCount = target ? target.children.length : 0;
      state.actionPanelSide = !target
        ? "unknown"
        : action === target.firstElementChild ? "left" : "right";

      if (!target || !action || !main) {
        state.applied = false;
        state.reason = root
          ? "gameplay-two-panel-layout-not-found"
          : "root-not-found";
        state.measured = null;
        state.updatedAt = Date.now();
        return;
      }

      target.classList.add(CONTAINER_CLASS);
      action.classList.add(ACTION_CLASS);
      main.classList.add(MAIN_CLASS);

      if (!state.mobileDetected || !state.portraitDetected) {
        restoreStyles(target);
        restoreStyles(action);
        restoreStyles(main);
        target.classList.remove(CONTAINER_CLASS);
        action.classList.remove(ACTION_CLASS);
        main.classList.remove(MAIN_CLASS);
        state.applied = false;
        state.reason = !state.mobileDetected
          ? "not-detected-as-mobile"
          : "landscape-orientation";
        state.measured = null;
        state.updatedAt = Date.now();
        return;
      }

      const actionFirst = action === target.firstElementChild;
      const columns = actionFirst
        ? "minmax(0,40fr) minmax(0,60fr)"
        : "minmax(0,60fr) minmax(0,40fr)";
      const actionColumn = actionFirst ? "1" : "2";
      const mainColumn = actionFirst ? "2" : "1";

      // Inline !important wins over flex-direction rules injected by other mods.
      applyStyles(target, {
        "display": "grid",
        "grid-template-columns": columns,
        "grid-template-rows": "minmax(0,1fr)",
        "grid-auto-flow": "column",
        "align-items": "stretch",
        "gap": "0",
        "min-width": "0",
        "min-height": "0",
        "max-width": "100%",
        "max-height": "100%",
        "overflow": "hidden"
      }, parentProperties);

      applyStyles(action, {
        "grid-column": actionColumn,
        "grid-row": "1",
        "width": "100%",
        "max-width": "none",
        "min-width": "0",
        "min-height": "0",
        "height": "100%",
        "overflow": "hidden"
      }, childProperties);

      applyStyles(main, {
        "grid-column": mainColumn,
        "grid-row": "1",
        "width": "100%",
        "max-width": "none",
        "min-width": "0",
        "min-height": "0",
        "height": "100%",
        "overflow": "hidden"
      }, childProperties);

      const actionRect = action.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      state.applied = true;
      state.reason = "applied";
      state.measured = {
        action: {
          x: Math.round(actionRect.x * 100) / 100,
          width: Math.round(actionRect.width * 100) / 100
        },
        main: {
          x: Math.round(mainRect.x * 100) / 100,
          width: Math.round(mainRect.width * 100) / 100
        }
      };
      state.updatedAt = Date.now();
    }

    const root = document.getElementById(ROOT_ID);
    let observer = null;
    if (root && typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(() => inspect());
      observer.observe(root, { childList: true, subtree: true });
    }

    const onResize = () => inspect();
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
    inspect();

    Object.defineProperty(window, "__WML_MOBILE_PORTRAIT_LAYOUT__", {
      configurable: true,
      value: {
        getStatus: () => {
          inspect();
          return {
            ...state,
            viewport: { ...state.viewport },
            measured: state.measured
              ? {
                  action: { ...state.measured.action },
                  main: { ...state.measured.main }
                }
              : null,
            hostPlatform: getHostPlatform()
          };
        },
        stop: () => {
          observer?.disconnect();
          window.removeEventListener("resize", onResize);
          window.removeEventListener("orientationchange", onResize);
        }
      }
    });

    console.info("[WML] mobile portrait layout 2.0.0 setup", {
      mod: api.id,
      game: api.game,
      styleInjected: state.styleInjected
    });
  }
});
