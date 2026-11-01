WML.define({
  id: "mobile-ui-migration",
  name: "M36 모바일 UI 마이그레이션",
  version: "1.0.0",
  game: "2026-10-24-pre7",
  platform: "mobile",
  description: "4.38MB 최종 WML 빌드용: 전체화면, 고정 상태 게이지·나레이션, 비활성 행동 접기",
  symbols: {
    React: { raw: { "2026-10-24-pre7": "J" } },
    layout: { raw: { "2026-10-24-pre7": "Ast" } },
    store: { raw: { "2026-10-24-pre7": "ie" } },
    wife: { raw: { "2026-10-24-pre7": "_" } }
  },
  setup(api) {
    const React = api.fn("React");
    const h = React.createElement;
    const GAME_SELECTOR = "#root";
    const ACTION_PANEL_CLASS = "m36-ui-migration-action-panel";
    const ACTION_SCROLL_CLASS = "m36-ui-migration-action-scroll";
    const PINNED_PANEL_CLASS = "m36-ui-migration-pinned-panel";
    const STYLE_ID = "m36-mobile-ui-migration-style";
    const MOBILE_PORTRAIT = window.matchMedia("(max-width: 1023px) and (orientation: portrait)");
    const hostPlatform = api.host?.platform || "unknown";
    const mobileHost = hostPlatform === "mobile" ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");

    function readSnapshot() {
      const state = api.store.game();
      if (!state) return { phaseLabel: "현재 상태", isPrep: false, wifeName: "아내", gauges: [], narration: "" };
      let wife = null;
      try { wife = api.fn("wife")(state); } catch (_) { wife = null; }

      const playerStats = state.player?.stats || {};
      const wifeStats = wife?.stats || {};
      const relationship = wife?.relationship || {};
      const attributes = wife?.attributes || {};
      const wifeName = wife?.name || "아내";
      const value = (raw) => {
        const n = Number(raw);
        return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
      };

      const gauges = [
        { label: "당신 기력", value: value(playerStats.energy) },
        { label: wifeName + " 기력", value: value(wifeStats.energy) },
        { label: wifeName + " 기분", value: value(wifeStats.mood) },
        { label: "신뢰도", value: value(relationship.trust) },
        { label: "매력", value: value(attributes.charm) },
        { label: "흥분도", value: value(wifeStats.arousal) }
      ].filter((item) => item.value !== null);

      const latestLog = Array.isArray(state.log)
        ? [...state.log].reverse().find((entry) => entry && typeof entry.text === "string")
        : null;
      const eventText = typeof state.pendingEvent?.text === "string" ? state.pendingEvent.text : "";
      return {
        phaseLabel: state.phase === "prep" ? "오후 영업 준비" : "현재 상태",
        isPrep: state.phase === "prep",
        wifeName,
        gauges,
        narration: (eventText || latestLog?.text || "").trim(),
        narrationLabel: eventText ? "대화 · 이벤트" : "강조 나레이션"
      };
    }

    function GaugeCell({ item }) {
      return h("div", { className: "m36-ui-migration-gauge", key: item.label },
        h("div", { className: "m36-ui-migration-gauge-heading" },
          h("span", { className: "m36-ui-migration-gauge-name" }, item.label),
          h("span", { className: "m36-ui-migration-gauge-value" }, String(item.value))
        ),
        h("span", { className: "m36-ui-migration-gauge-track" },
          h("span", {
            className: "m36-ui-migration-gauge-fill",
            style: { width: item.value + "%" }
          })
        )
      );
    }

    function PinnedPanel() {
      const [snapshot, setSnapshot] = React.useState(readSnapshot);
      React.useEffect(() => {
        let frame = 0;
        const refresh = () => {
          if (frame) return;
          frame = window.requestAnimationFrame(() => {
            frame = 0;
            setSnapshot(readSnapshot());
          });
        };
        const unsubscribe = api.store.subscribe(refresh);
        window.addEventListener("orientationchange", refresh, { passive: true });
        refresh();
        return () => {
          unsubscribe?.();
          window.removeEventListener("orientationchange", refresh);
          if (frame) window.cancelAnimationFrame(frame);
        };
      }, []);

      return h("section", {
          className: PINNED_PANEL_CLASS,
          "aria-label": "고정 상태 및 강조 나레이션"
        },
        h("div", { className: "m36-ui-migration-topline" },
          snapshot.isPrep
            ? h("button", {
                type: "button",
                className: "m36-ui-migration-phase-button",
                title: "영업 준비 내용 보기",
                "aria-label": "영업 준비 내용 보기",
                onClick: () => {
                  const storyTab = Array.from(document.querySelectorAll("#root button"))
                    .find((button) => button.textContent.trim() === "이야기");
                  storyTab?.click();
                }
              }, snapshot.phaseLabel)
            : h("strong", { className: "m36-ui-migration-phase" }, snapshot.phaseLabel),
          h("span", { className: "m36-ui-migration-wife" }, snapshot.wifeName)
        ),
        snapshot.gauges.length
          ? h("div", { className: "m36-ui-migration-gauges" },
              snapshot.gauges.map((item) => h(GaugeCell, { item, key: item.label }))
            )
          : null,
        snapshot.narration
          ? h("div", { className: "m36-ui-migration-narration" },
              h("div", { className: "m36-ui-migration-narration-label" }, snapshot.narrationLabel),
              h("p", { className: "m36-ui-migration-narration-text" }, snapshot.narration)
            )
          : null
      );
    }

    function transformTree(node) {
      if (!React.isValidElement(node)) return node;
      const props = node.props || {};
      const className = typeof props.className === "string" ? props.className : "";

      if (className.includes("w-[37%]")) {
        const originalChildren = React.Children.toArray(props.children);
        const alreadyMarked = className.includes(ACTION_PANEL_CLASS);
        const children = originalChildren.map((child, index) => {
          if (index === 0 && React.isValidElement(child) &&
              typeof child.props?.className === "string" &&
              child.props.className.includes("overflow-y-auto")) {
            const scrollClass = child.props.className.includes(ACTION_SCROLL_CLASS)
              ? child.props.className
              : child.props.className + " " + ACTION_SCROLL_CLASS;
            return React.cloneElement(child, { className: scrollClass });
          }
          return transformTree(child);
        });

        if (alreadyMarked) return React.cloneElement(node, null, ...children);
        return React.cloneElement(
          node,
          { className: (className + " " + ACTION_PANEL_CLASS).trim() },
          h(PinnedPanel, { key: "m36-ui-migration-pinned-panel" }),
          ...children
        );
      }

      const originalChildren = React.Children.toArray(props.children);
      if (!originalChildren.length) return node;
      let changed = false;
      const children = originalChildren.map((child) => {
        const next = transformTree(child);
        if (next !== child) changed = true;
        return next;
      });
      return changed ? React.cloneElement(node, null, ...children) : node;
    }

    const unhookLayout = api.hook("layout", {
      after(result) {
        if (!mobileHost) return result;
        try { return transformTree(result); }
        catch (error) {
          console.error("[WML mobile-ui-migration] layout transform failed", error);
          return result;
        }
      }
    });

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "#root ." + PINNED_PANEL_CLASS + "{display:none;box-sizing:border-box;flex:0 0 auto;min-width:0;max-width:100%;padding:5px 5px 6px;color:#e7e5e4;background:rgba(28,25,23,.98);border-bottom:1px solid rgba(120,113,108,.48);overflow:hidden}",
      "#root .m36-ui-migration-topline{display:flex;align-items:center;justify-content:space-between;gap:4px;min-width:0;margin-bottom:4px}",
      "#root .m36-ui-migration-phase,#root .m36-ui-migration-phase-button{min-width:0;overflow:hidden;color:#fbbf24;font-size:10px;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}",
      "#root .m36-ui-migration-phase-button{padding:0;border:0;background:transparent;text-align:left;font-weight:700;cursor:pointer}",
      "#root .m36-ui-migration-phase-button:focus-visible{outline:1px solid #fbbf24;outline-offset:2px}",
      "#root .m36-ui-migration-wife{flex:0 0 auto;max-width:42%;overflow:hidden;color:#a8a29e;font-size:9px;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}",
      "#root .m36-ui-migration-gauges{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 5px;min-width:0}",
      "#root .m36-ui-migration-gauge{min-width:0;overflow:hidden}",
      "#root .m36-ui-migration-gauge-heading{display:flex;align-items:center;justify-content:space-between;gap:2px;min-width:0;margin-bottom:2px;color:#a8a29e;font-size:8px;line-height:1.1}",
      "#root .m36-ui-migration-gauge-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      "#root .m36-ui-migration-gauge-value{flex:0 0 auto;color:#d6d3d1;font-size:8px;font-variant-numeric:tabular-nums}",
      "#root .m36-ui-migration-gauge-track{display:block;height:3px;overflow:hidden;border-radius:3px;background:rgba(87,83,78,.65)}",
      "#root .m36-ui-migration-gauge-fill{display:block;height:100%;border-radius:inherit;background:#d6a64f}",
      "#root .m36-ui-migration-narration{min-width:0;margin-top:5px;padding:4px 5px;border-left:2px solid #d6a64f;border-radius:3px;background:rgba(68,49,20,.38);overflow:hidden}",
      "#root .m36-ui-migration-narration-label{margin-bottom:2px;color:#fbbf24;font-size:8px;font-weight:700;line-height:1.15}",
      "#root .m36-ui-migration-narration-text{display:-webkit-box;max-height:3.6em;overflow:hidden;color:#e7e5e4;font-size:9px;line-height:1.2;overflow-wrap:anywhere;-webkit-box-orient:vertical;-webkit-line-clamp:3}",
      "#root ." + ACTION_SCROLL_CLASS + "{min-height:0!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}",
      "#root ." + ACTION_SCROLL_CLASS + " button.m36-ui-migration-disabled-choice{position:relative!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:.35rem!important;box-sizing:border-box!important;width:100%!important;min-width:0!important;min-height:1.75rem!important;margin:.08rem 0!important;padding:.28rem .4rem!important;border:1px solid rgb(68 64 60)!important;border-radius:.4rem!important;background:rgba(28,25,23,.72)!important;color:rgb(168 162 158)!important;text-align:left!important;font-size:0!important;line-height:1.15!important;opacity:.7!important;overflow:hidden!important;white-space:nowrap!important}",
      "#root ." + ACTION_SCROLL_CLASS + " button.m36-ui-migration-disabled-choice>*{display:none!important}",
      "#root ." + ACTION_SCROLL_CLASS + " button.m36-ui-migration-disabled-choice::before{content:attr(data-m36-ui-disabled-label);display:block!important;flex:1 1 auto!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:.68rem!important;line-height:1.15!important}",
      "#root ." + ACTION_SCROLL_CLASS + " button.m36-ui-migration-disabled-choice::after{content:attr(data-m36-ui-disabled-status);display:block!important;flex:0 1 auto!important;max-width:44%!important;min-width:0!important;overflow:hidden!important;color:rgb(148 163 184)!important;font-size:.61rem!important;line-height:1.15!important;text-align:right!important;text-overflow:ellipsis!important;white-space:nowrap!important}",
      "#root .m36-ui-migration-fullscreen-button{box-sizing:border-box;flex:0 0 auto}",
      "@media screen and (max-width:1023px) and (orientation:portrait){#root ." + PINNED_PANEL_CLASS + "{display:block}}",
      "@media screen and (orientation:landscape),(min-width:1024px){#root ." + PINNED_PANEL_CLASS + "{display:none!important}#root .m36-ui-migration-fullscreen-button{display:none!important}}"
    ].join("\n");
    document.head.appendChild(style);

    function cleanLabel(value) {
      let text = String(value || "").replace(/\s+/g, " ").trim();
      const cuts = ["·", "•", "무료", "영업 전", "시간 부족", "시간이 부족",
        "사용 불가", "이용 불가", "완료", "종료", "마감", "끝났", "오후"];
      let cut = text.length;
      for (const token of cuts) {
        const index = text.indexOf(token);
        if (index >= 0 && index < cut) cut = index;
      }
      text = text.slice(0, cut).trim();
      return text.length > 60 ? text.slice(0, 60) : text;
    }

    function choiceLabel(button) {
      const candidates = Array.from(button.querySelectorAll("span,strong,b"))
        .map((element) => cleanLabel(element.textContent))
        .filter(Boolean);
      return candidates[0] || cleanLabel(button.textContent) || "선택지";
    }

    function choiceStatus(value) {
      const text = String(value || "").replace(/\s+/g, " ");
      if (text.includes("완료")) return "완료";
      if (text.includes("오후 5시") || text.includes("영업 전") || text.includes("영업시간")) return "영업 전";
      if (text.includes("시간이 부족") || text.includes("시간 부족") ||
          text.includes("시간이 너무") || text.includes("너무 늦") || text.includes("늦었습니다")) return "시간 부족";
      if (text.includes("종료") || text.includes("마감") || text.includes("끝났")) return "종료";
      if (text.includes("없습니다") || text.includes("없어요") || text.includes("방 안에")) return "이용 불가";
      return "사용 불가";
    }

    function clearDisabledChoice(button) {
      button.classList.remove("m36-ui-migration-disabled-choice");
      button.removeAttribute("data-m36-ui-disabled-label");
      button.removeAttribute("data-m36-ui-disabled-status");
    }

    const categoryOpen = new Map();
    function categoryKey(heading) {
      const title = String(heading.textContent || "").replace(/[▸▾]/g, "")
        .replace(/·\s*비활성\s*\d+개/g, "").trim();
      if (title === "외출") return "outside";
      if (title.indexOf("마을 둘러보기") === 0) return "village";
      return null;
    }
    function restoreFold(button) {
      if (!button.hasAttribute("data-m36-ui-folded")) return;
      const value = button.getAttribute("data-m36-ui-display-before") || "";
      const priority = button.getAttribute("data-m36-ui-priority-before") || "";
      button.style.removeProperty("display");
      if (value) button.style.setProperty("display", value, priority);
      button.removeAttribute("data-m36-ui-folded");
      button.removeAttribute("data-m36-ui-display-before");
      button.removeAttribute("data-m36-ui-priority-before");
    }
    function foldChoice(button, folded) {
      if (!folded) return restoreFold(button);
      if (!button.hasAttribute("data-m36-ui-folded")) {
        button.setAttribute("data-m36-ui-display-before", button.style.getPropertyValue("display"));
        button.setAttribute("data-m36-ui-priority-before", button.style.getPropertyPriority("display"));
        button.setAttribute("data-m36-ui-folded", "1");
      }
      button.style.setProperty("display", "none", "important");
    }
    function syncCategory(heading, key) {
      const list = heading.nextElementSibling;
      if (!list) return;
      const disabled = Array.from(list.querySelectorAll("button:disabled"));
      if (!MOBILE_PORTRAIT.matches || disabled.length === 0) {
        list.querySelectorAll("[data-m36-ui-folded]").forEach(restoreFold);
        const oldArrow = heading.querySelector(".m36-ui-migration-category-arrow");
        if (oldArrow) oldArrow.remove();
        heading.style.cursor = "";
        heading.style.userSelect = "";
        heading.removeAttribute("role");
        heading.removeAttribute("tabindex");
        heading.removeAttribute("aria-expanded");
        return;
      }
      if (!categoryOpen.has(key)) categoryOpen.set(key, false);
      const open = categoryOpen.get(key) === true;
      disabled.forEach((button) => foldChoice(button, !open));
      let arrow = heading.querySelector(".m36-ui-migration-category-arrow");
      if (!arrow) {
        arrow = document.createElement("span");
        arrow.className = "m36-ui-migration-category-arrow";
        arrow.setAttribute("aria-hidden", "true");
        heading.appendChild(arrow);
      }
      const arrowText = " · 비활성 " + disabled.length + "개 " + (open ? "▾" : "▸");
      if (arrow.textContent !== arrowText) arrow.textContent = arrowText;
      heading.style.cursor = "pointer";
      heading.style.userSelect = "none";
      heading.setAttribute("role", "button");
      heading.setAttribute("tabindex", "0");
      heading.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function renderDisabledChoices() {
      const scroll = document.querySelector(GAME_SELECTOR + " ." + ACTION_SCROLL_CLASS);
      if (!scroll) return;
      if (!mobileHost || !MOBILE_PORTRAIT.matches) {
        scroll.querySelectorAll("button.m36-ui-migration-disabled-choice").forEach(clearDisabledChoice);
        scroll.querySelectorAll("[data-m36-ui-folded]").forEach(restoreFold);
        return;
      }
      scroll.querySelectorAll("button:disabled").forEach((button) => {
        button.classList.add("m36-ui-migration-disabled-choice");
        const label = choiceLabel(button);
        const status = choiceStatus(button.textContent);
        if (button.getAttribute("data-m36-ui-disabled-label") !== label) {
          button.setAttribute("data-m36-ui-disabled-label", label);
        }
        if (button.getAttribute("data-m36-ui-disabled-status") !== status) {
          button.setAttribute("data-m36-ui-disabled-status", status);
        }
      });
      scroll.querySelectorAll("button.m36-ui-migration-disabled-choice:not(:disabled)")
        .forEach(clearDisabledChoice);
      scroll.querySelectorAll("h3,h4").forEach((heading) => {
        const key = categoryKey(heading);
        if (key) syncCategory(heading, key);
      });
    }

    function onCategoryClick(event) {
      if (!mobileHost || !MOBILE_PORTRAIT.matches) return;
      const scroll = document.querySelector(GAME_SELECTOR + " ." + ACTION_SCROLL_CLASS);
      const target = event.target;
      if (!scroll || !target || typeof target.closest !== "function") return;
      const heading = target.closest("h3,h4");
      if (!heading || !scroll.contains(heading)) return;
      const key = categoryKey(heading);
      const list = heading.nextElementSibling;
      if (!key || !list || !list.querySelector("button:disabled")) return;
      event.preventDefault();
      event.stopPropagation();
      categoryOpen.set(key, categoryOpen.get(key) !== true);
      syncCategory(heading, key);
    }
    function onCategoryKeydown(event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      onCategoryClick(event);
    }

    let fullscreenButton = null;
    function updateFullscreenButton() {
      if (!fullscreenButton) return;
      const active = !!document.fullscreenElement;
      fullscreenButton.textContent = active ? "↙" : "⛶";
      fullscreenButton.title = active ? "전체화면 종료" : "전체화면";
      fullscreenButton.setAttribute("aria-label", active ? "전체화면 종료" : "전체화면");
      fullscreenButton.setAttribute("aria-pressed", active ? "true" : "false");
    }
    async function toggleFullscreen(event) {
      event.preventDefault();
      event.stopPropagation();
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen({ navigationUI: "hide" });
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen();
        } else {
          throw new Error("이 실행 환경은 전체화면 API를 지원하지 않습니다.");
        }
      } catch (error) {
        console.warn("[WML mobile-ui-migration] fullscreen request failed", error);
      }
      updateFullscreenButton();
    }
    function syncFullscreenButton() {
      if (!mobileHost || !MOBILE_PORTRAIT.matches) return;
      const root = document.querySelector(GAME_SELECTOR);
      if (!root) return;
      const menu = Array.from(root.querySelectorAll("button")).find((button) =>
        button.getAttribute("aria-label") === "메뉴" ||
        button.title === "메뉴" ||
        button.textContent.trim() === "☰"
      );
      if (!menu || !menu.parentElement) return;
      if (!fullscreenButton || !fullscreenButton.isConnected) {
        fullscreenButton = document.createElement("button");
        fullscreenButton.type = "button";
        fullscreenButton.className =
          (typeof menu.className === "string" ? menu.className : "") +
          " m36-ui-migration-fullscreen-button";
        fullscreenButton.setAttribute("data-m36-ui-migration-fullscreen", "1");
        fullscreenButton.textContent = "⛶";
        fullscreenButton.addEventListener("click", toggleFullscreen);
      }
      if (fullscreenButton.parentElement !== menu.parentElement ||
          fullscreenButton.nextElementSibling !== menu) {
        menu.parentElement.insertBefore(fullscreenButton, menu);
      }
      updateFullscreenButton();
    }

    let queued = false;
    function queueSync() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        syncFullscreenButton();
        renderDisabledChoices();
      });
    }

    const root = document.querySelector(GAME_SELECTOR);
    let observer = null;
    if (root && typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(queueSync);
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["disabled"]
      });
    }
    root?.addEventListener("click", onCategoryClick, true);
    root?.addEventListener("keydown", onCategoryKeydown, true);
    window.addEventListener("resize", queueSync, { passive: true });
    window.addEventListener("orientationchange", queueSync, { passive: true });
    MOBILE_PORTRAIT.addEventListener?.("change", queueSync);
    document.addEventListener("fullscreenchange", updateFullscreenButton);
    queueSync();

    Object.defineProperty(window, "__M36_MOBILE_UI_MIGRATION__", {
      configurable: true,
      value: {
        version: "1.0.0",
        game: api.game,
        hostPlatform,
        getStatus: () => ({
          version: "1.0.0",
          game: api.game,
          hostPlatform,
          mobileHost,
          portrait: MOBILE_PORTRAIT.matches,
          actionPanel: !!document.querySelector(GAME_SELECTOR + " ." + ACTION_PANEL_CLASS),
          actionScroll: !!document.querySelector(GAME_SELECTOR + " ." + ACTION_SCROLL_CLASS),
          pinnedPanel: !!document.querySelector(GAME_SELECTOR + " ." + PINNED_PANEL_CLASS),
          fullscreenButton: !!document.querySelector(GAME_SELECTOR + " [data-m36-ui-migration-fullscreen]"),
          disabledChoices: document.querySelectorAll(
            GAME_SELECTOR + " ." + ACTION_SCROLL_CLASS + " button.m36-ui-migration-disabled-choice"
          ).length,
          foldedChoices: document.querySelectorAll(
            GAME_SELECTOR + " ." + ACTION_SCROLL_CLASS + " button[data-m36-ui-folded]"
          ).length
        }),
        stop: () => {
          observer?.disconnect();
          root?.removeEventListener("click", onCategoryClick, true);
          root?.removeEventListener("keydown", onCategoryKeydown, true);
          window.removeEventListener("resize", queueSync);
          window.removeEventListener("orientationchange", queueSync);
          MOBILE_PORTRAIT.removeEventListener?.("change", queueSync);
          document.removeEventListener("fullscreenchange", updateFullscreenButton);
          unhookLayout();
        }
      }
    });

    console.info("[WML] M36 mobile UI migration 1.0.0 ready", {
      game: api.game,
      hostPlatform,
      mobileHost,
      layoutHook: api.has("layout")
    });
  }
});

