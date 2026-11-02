WML.define({
  id: "mobile-ui-migration",
  name: "M36 모바일 UI 마이그레이션",
  version: "1.3.2",
  game: "2026-10-24-pre7",
  platform: "mobile",
  description: "4.38MB WML 빌드용: 원본 상태·위치 UI 고정, 이야기 나레이션 정리, 전체화면·비활성 행동 접기",
  symbols: {
    React: { raw: { "2026-10-24-pre7": "J" } },
    layout: { raw: { "2026-10-24-pre7": "Ast" } },
    actionRenderer: { raw: { "2026-10-24-pre7": "sB" } },
    wifePortrait: { raw: { "2026-10-24-pre7": "Znt" } },
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

    function componentName(node) {
      return React.isValidElement(node) && typeof node.type === "function"
        ? node.type.name
        : "";
    }

    function containsComponent(node, name, predicate) {
      if (!React.isValidElement(node)) return false;
      if (componentName(node) === name && (!predicate || predicate(node))) return true;

      let found = false;
      React.Children.forEach(node.props?.children, (child) => {
        if (!found && containsComponent(child, name, predicate)) found = true;
      });
      return found;
    }

    function isOriginalLocationWrapper(node, inStoryPane) {
      const className = typeof node?.props?.className === "string"
        ? node.props.className
        : "";
      return inStoryPane &&
        className.includes("mb-2 pb-2 border-b border-stone-800") &&
        containsComponent(node, "loe");
    }

    function collectOriginalStatus(node, found, inStoryPane = false) {
      if (!React.isValidElement(node)) return;

      const props = node.props || {};
      const className = typeof props.className === "string" ? props.className : "";
      const storyPane = inStoryPane ||
        className.includes("flex-1 min-h-0 overflow-y-auto p-2 text-[0.78rem]");

      // Capture only the original story-tab location/character/family block.
      if (!found.locations && isOriginalLocationWrapper(node, storyPane)) {
        found.locations = node;
        return;
      }

      React.Children.forEach(props.children, (child) => {
        collectOriginalStatus(child, found, storyPane);
      });
    }

    function collectPrepPanel(node, found) {
      if (!React.isValidElement(node) || found.prepPanel) return;
      if (componentName(node) === "$ot") {
        found.prepPanel = node;
        return;
      }
      React.Children.forEach(node.props?.children, (child) => {
        collectPrepPanel(child, found);
      });
    }

    function PinnedPanel({ statusElements }) {
      const locations = statusElements?.locations;
      const prepPanel = statusElements?.prepPanel
        ? React.cloneElement(statusElements.prepPanel, {
            key: "m36-ui-migration-prep-panel"
          })
        : null;

      if (!locations && !prepPanel) return null;

      return h("section", {
        className: PINNED_PANEL_CLASS,
        "aria-label": "인물·위치 상태 및 영업 준비"
      },
        locations
          ? h("div", { className: "m36-ui-migration-original-status" }, locations)
          : null,
        prepPanel
          ? h("div", { className: "m36-ui-migration-prep-fixed" }, prepPanel)
          : null
      );
    }

    function transformTree(node, statusElements, portraitMode, inStoryPane = false) {
      if (!React.isValidElement(node)) return node;

      const props = node.props || {};
      const className = typeof props.className === "string" ? props.className : "";
      const typeName = componentName(node);
      const storyPane = inStoryPane ||
        className.includes("flex-1 min-h-0 overflow-y-auto p-2 text-[0.78rem]");

      if (portraitMode && node === statusElements?.prepPanel &&
          typeName === "$ot") return null;

      if (portraitMode && isOriginalLocationWrapper(node, storyPane)) {
        return null;
      }

      // "hoe" is the response-needed alert, not the narration log ("itt").
      // Keep only the original story log in the story tab.
      if (portraitMode && storyPane && typeName === "hoe") return null;

      if (className.includes("w-[37%]")) {
        const originalChildren = React.Children.toArray(props.children)
          .filter((child) => !(React.isValidElement(child) &&
            componentName(child) === "PinnedPanel"));

        const children = originalChildren.map((child, index) => {
          if (index === 0 && React.isValidElement(child) &&
              typeof child.props?.className === "string" &&
              child.props.className.includes("overflow-y-auto")) {
            const scrollClass = child.props.className.includes(ACTION_SCROLL_CLASS)
              ? child.props.className
              : child.props.className + " " + ACTION_SCROLL_CLASS;
            return React.cloneElement(child, { className: scrollClass });
          }
          return transformTree(child, statusElements, portraitMode, false);
        });

        return React.cloneElement(
          node,
          { className: (className + " " + ACTION_PANEL_CLASS).trim() },
          h(PinnedPanel, {
            key: "m36-ui-migration-pinned-panel",
            statusElements
          }),
          ...children
        );
      }

      const originalChildren = React.Children.toArray(props.children);
      if (!originalChildren.length) return node;

      let changed = false;
      const children = originalChildren.map((child) => {
        const next = transformTree(child, statusElements, portraitMode, storyPane);
        if (next !== child) changed = true;
        return next;
      });
      return changed ? React.cloneElement(node, null, ...children) : node;
    }

    function ResponsiveLayout({ tree }) {
      const [portraitMode, setPortraitMode] = React.useState(MOBILE_PORTRAIT.matches);
      const originalLocationRef = React.useRef(null);

      React.useEffect(() => {
        const updateOrientation = () => setPortraitMode(MOBILE_PORTRAIT.matches);
        if (typeof MOBILE_PORTRAIT.addEventListener === "function") {
          MOBILE_PORTRAIT.addEventListener("change", updateOrientation);
          return () => MOBILE_PORTRAIT.removeEventListener("change", updateOrientation);
        }
        MOBILE_PORTRAIT.addListener?.(updateOrientation);
        return () => MOBILE_PORTRAIT.removeListener?.(updateOrientation);
      }, []);

      try {
        const currentStatusElements = { locations: null, prepPanel: null };
        if (portraitMode) {
          collectOriginalStatus(tree, currentStatusElements);
          collectPrepPanel(tree, currentStatusElements);
        }
        if (currentStatusElements.locations) {
          originalLocationRef.current = currentStatusElements.locations;
        }
        const statusElements = {
          locations: portraitMode
            ? currentStatusElements.locations || originalLocationRef.current
            : null,
          prepPanel: portraitMode ? currentStatusElements.prepPanel : null
        };
        return transformTree(tree, statusElements, portraitMode);
      } catch (error) {
        console.error("[WML mobile-ui-migration] layout transform failed", error);
        return tree;
      }
    }


    function plainTextFromNode(node) {
      if (node == null || typeof node === "boolean") return "";
      if (typeof node === "string" || typeof node === "number") return String(node);
      if (Array.isArray(node)) return node.map(plainTextFromNode).join("");
      if (!React.isValidElement(node)) return "";
      return plainTextFromNode(node.props?.children);
    }

    function findFirstComponent(node, name) {
      if (!React.isValidElement(node)) return null;
      if (componentName(node) === name) return node;
      let found = null;
      React.Children.forEach(node.props?.children, (child) => {
        if (!found) found = findFirstComponent(child, name);
      });
      return found;
    }

    function hasPlayerGauge(node) {
      if (!React.isValidElement(node)) return false;
      if (componentName(node) === "fb" && node.props?.label === "당신") return true;
      let found = false;
      React.Children.forEach(node.props?.children, (child) => {
        if (!found && hasPlayerGauge(child)) found = true;
      });
      return found;
    }

    function isDialogueTextCard(node) {
      if (!React.isValidElement(node) || node.type !== "div") return false;
      const className = typeof node.props?.className === "string"
        ? node.props.className
        : "";
      if (!className.includes("border-2") || !className.includes("p-3")) return false;
      let found = false;
      function visit(child) {
        if (!React.isValidElement(child)) return;
        const childClass = typeof child.props?.className === "string"
          ? child.props.className
          : "";
        if (child.type === "p" && childClass.includes("whitespace-pre-line") &&
            childClass.includes("leading-relaxed")) {
          found = true;
          return;
        }
        React.Children.forEach(child.props?.children, visit);
      }
      React.Children.forEach(node.props?.children, visit);
      return found;
    }

    function splitQuestionPrompt(node) {
      const questionNode = findFirstComponent(node, "utt");
      if (!questionNode || typeof questionNode.type !== "function") return null;

      // In 2026-10-24-pre7, utt is a pure JSX component without hooks.
      // Calling it exposes its original prompt and button children so only
      // the prompt can be pinned while the exact original buttons still scroll.
      const renderedQuestion = questionNode.type(questionNode.props || {});
      if (!React.isValidElement(renderedQuestion)) return null;

      const questionChildren = React.Children.toArray(renderedQuestion.props?.children);
      const buttonIndex = questionChildren.findIndex((child) =>
        React.isValidElement(child) &&
        typeof child.props?.className === "string" &&
        child.props.className.includes("flex flex-wrap gap-2")
      );
      if (buttonIndex < 0) return null;

      const buttonBlock = questionChildren[buttonIndex];
      const promptChildren = questionChildren.filter((child, index) => index !== buttonIndex);
      if (promptChildren.length < 2) return null;

      const pinnedQuestion = React.cloneElement(renderedQuestion, null, ...promptChildren);
      const pinnedWrapper = React.cloneElement(node, null, pinnedQuestion);
      const oldButtonClass = typeof buttonBlock.props?.className === "string"
        ? buttonBlock.props.className
        : "";
      const scrollingButtons = React.cloneElement(buttonBlock, {
        className: (oldButtonClass + " m36-ui-migration-question-choices").trim()
      });

      return { pinned: pinnedWrapper, scrolling: scrollingButtons };
    }

    function transformActionEvent(result) {
      if (!MOBILE_PORTRAIT.matches || !React.isValidElement(result) || result.type !== "div") {
        return result;
      }

      const children = React.Children.toArray(result.props?.children);
      const pinned = [];
      const scrolling = [];
      let hasHeader = false;
      let hasDialogue = false;
      let hasChoiceGrid = false;

      for (const child of children) {
        const className = React.isValidElement(child) &&
          typeof child.props?.className === "string"
          ? child.props.className
          : "";

        if (React.isValidElement(child) && child.type === "h3" &&
            className.includes("text-sm font-bold text-amber-400")) {
          pinned.push(child);
          hasHeader = true;
          continue;
        }

        if (React.isValidElement(child) && child.type === "div" &&
            className.includes("text-xs text-violet-300/80 mb-2")) {
          pinned.push(React.cloneElement(child, {
            className: (className + " m36-ui-migration-event-description").trim()
          }));
          continue;
        }

        if (React.isValidElement(child) && findFirstComponent(child, "utt")) {
          const split = splitQuestionPrompt(child);
          if (split) {
            pinned.push(split.pinned);
            scrolling.push(split.scrolling);
            continue;
          }
        }

        if (hasPlayerGauge(child)) {
          pinned.push(React.cloneElement(child, {
            className: (className + " m36-ui-migration-event-gauges").trim()
          }));
          continue;
        }

        if (isDialogueTextCard(child)) {
          pinned.push(child);
          hasDialogue = true;
          continue;
        }

        if (React.isValidElement(child) && child.type === "div" &&
            className.includes("grid grid-cols-1 gap-2")) {
          hasChoiceGrid = true;
        }
        scrolling.push(child);
      }

      if (!hasHeader || !hasDialogue || !hasChoiceGrid || !pinned.length) return result;

      return h(
        "div",
        { className: "m36-ui-migration-event-root" },
        h(
          "div",
          { className: "m36-ui-migration-event-fixed", "aria-label": "대화 내용과 상태" },
          ...pinned
        ),
        h(
          "div",
          { className: "m36-ui-migration-event-scroll" },
          ...scrolling
        )
      );
    }

    function transformInnerThoughtNode(node) {
      if (!React.isValidElement(node)) return node;
      const props = node.props || {};
      const className = typeof props.className === "string" ? props.className : "";
      if (node.type === "div" &&
          className.includes("bg-stone-900/50") &&
          plainTextFromNode(node).includes("그녀의 속마음")) {
        return React.cloneElement(node, {
          className: (className + " m36-ui-migration-inner-thought").trim(),
          "data-m36-ui-inner-thought": "1"
        });
      }
      const children = React.Children.toArray(props.children);
      if (!children.length) return node;
      let changed = false;
      const nextChildren = children.map((child) => {
        const next = transformInnerThoughtNode(child);
        if (next !== child) changed = true;
        return next;
      });
      return changed ? React.cloneElement(node, null, ...nextChildren) : node;
    }

    const unhookWifePortrait = api.hook("wifePortrait", {
      around(next, ...args) {
        const result = next(...args);
        return mobileHost && MOBILE_PORTRAIT.matches
          ? transformInnerThoughtNode(result)
          : result;
      }
    });

    const unhookActionRenderer = api.hook("actionRenderer", {
      around(next, ...args) {
        return transformActionEvent(next(...args));
      }
    });

    const unhookLayout = api.hook("layout", {
      after(result) {
        if (!mobileHost) return result;
        return h(ResponsiveLayout, { tree: result });
      }
    });

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "#root ." + PINNED_PANEL_CLASS + "{display:none;box-sizing:border-box;flex:0 0 auto;min-width:0;max-width:100%;max-height:44vh;padding:4px 4px 5px;color:#e7e5e4;background:rgba(28,25,23,.98);border-bottom:1px solid rgba(120,113,108,.48);overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain}",
      "#root .m36-ui-migration-original-status{min-width:0;max-width:100%;overflow-x:hidden}",
      "#root ." + ACTION_SCROLL_CLASS + "{min-height:0!important;max-height:66.666%!important;flex:0 1 66.666%!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}",
      "#root ." + ACTION_SCROLL_CLASS + " button.m36-ui-migration-disabled-choice{position:relative!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:.35rem!important;box-sizing:border-box!important;width:100%!important;min-width:0!important;min-height:1.75rem!important;margin:.08rem 0!important;padding:.28rem .4rem!important;border:1px solid rgb(68 64 60)!important;border-radius:.4rem!important;background:rgba(28,25,23,.72)!important;color:rgb(168 162 158)!important;text-align:left!important;font-size:0!important;line-height:1.15!important;opacity:.7!important;overflow:hidden!important;white-space:nowrap!important}",
      "#root ." + ACTION_SCROLL_CLASS + " button.m36-ui-migration-disabled-choice>*{display:none!important}",
      "#root ." + ACTION_SCROLL_CLASS + " button.m36-ui-migration-disabled-choice::before{content:attr(data-m36-ui-disabled-label);display:block!important;flex:1 1 auto!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:.68rem!important;line-height:1.15!important}",
      "#root ." + ACTION_SCROLL_CLASS + " button.m36-ui-migration-disabled-choice::after{content:attr(data-m36-ui-disabled-status);display:block!important;flex:0 1 auto!important;max-width:44%!important;min-width:0!important;overflow:hidden!important;color:rgb(148 163 184)!important;font-size:.61rem!important;line-height:1.15!important;text-align:right!important;text-overflow:ellipsis!important;white-space:nowrap!important}",
      "#root .m36-ui-migration-fullscreen-button{box-sizing:border-box;flex:0 0 auto}",
      "#root .m36-ui-migration-inner-thought{position:sticky;bottom:0;z-index:36;width:fit-content;max-width:100%;margin-top:.35rem;margin-right:auto;box-sizing:border-box;overflow-wrap:anywhere;box-shadow:0 -5px 12px rgba(0,0,0,.28)}#root .m36-ui-migration-inner-thought>div:last-child{max-width:100%;overflow-wrap:anywhere}",
      "#root .m36-ui-migration-prep-fixed{flex:0 1 auto;min-width:0;max-width:100%;max-height:32vh;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;margin-top:.35rem;padding-top:.35rem;border-top:1px solid rgba(120,113,108,.45)}",
      "@media screen and (max-width:1023px) and (orientation:portrait){#root ." + PINNED_PANEL_CLASS + "{display:block}#root .m36-ui-migration-event-root{display:flex;flex-direction:column;width:100%;height:100%;min-width:0;min-height:0;max-height:100%;overflow:hidden;box-sizing:border-box}#root .m36-ui-migration-event-fixed{flex:0 1 auto;min-width:0;max-width:100%;max-height:48vh;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;padding:4px 4px 5px;background:rgba(28,25,23,.98);border-bottom:1px solid rgba(120,113,108,.48)}#root .m36-ui-migration-event-description{display:block;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#root .m36-ui-migration-event-gauges{margin-bottom:.45rem}#root .m36-ui-migration-event-scroll{flex:0 1 66.666%;min-width:0;min-height:0;max-height:66.666%;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:4px 3px 8px}#root .m36-ui-migration-question-choices{margin:0 0 .75rem}}",
      "@media screen and (orientation:landscape),(min-width:1024px){#root ." + PINNED_PANEL_CLASS + "{display:none!important}#root .m36-ui-migration-fullscreen-button{display:none!important}}"
    ].join("\n");
    document.head.appendChild(style);

    function cleanLabel(value) {
      let text = String(value || "").replace(/\s+/g, " ").trim();
      const cuts = [
        "5pm에 문을 엽니다",
        "아직 손님을 받을 수 없습니다",
        "손님을 받을 수 없습니다",
        "·", "•", "무료", "영업 전", "시간 부족", "시간이 부족",
        "사용 불가", "이용 불가", "완료", "종료", "마감", "끝났", "오후"
      ];
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
      if (text.includes("오후 5시") || /\b\d{1,2}\s*pm에 문을 엽니다/i.test(text) ||
          text.includes("손님을 받을 수 없습니다") || text.includes("영업 전") ||
          text.includes("영업시간")) return "영업 전";
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
      if (title === "일하기") return "work";
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
        version: "1.3.2",
        game: api.game,
        hostPlatform,
        getStatus: () => ({
          version: "1.3.2",
          game: api.game,
          hostPlatform,
          mobileHost,
          portrait: MOBILE_PORTRAIT.matches,
          actionPanel: !!document.querySelector(GAME_SELECTOR + " ." + ACTION_PANEL_CLASS),
          actionScroll: !!document.querySelector(GAME_SELECTOR + " ." + ACTION_SCROLL_CLASS),
          pinnedPanel: !!document.querySelector(GAME_SELECTOR + " ." + PINNED_PANEL_CLASS),
          fixedEventRoots: document.querySelectorAll(GAME_SELECTOR + " .m36-ui-migration-event-root").length,
          fixedInnerThoughts: document.querySelectorAll(GAME_SELECTOR + " .m36-ui-migration-inner-thought").length,
          fixedPrepPanels: document.querySelectorAll(GAME_SELECTOR + " .m36-ui-migration-prep-fixed").length,
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
          unhookWifePortrait?.();
          unhookActionRenderer?.();
          unhookLayout();
        }
      }
    });

    console.info("[WML] M36 mobile UI migration 1.3.2 ready", {
      game: api.game,
      hostPlatform,
      mobileHost,
      layoutHook: api.has("layout")
    });
  }
});
