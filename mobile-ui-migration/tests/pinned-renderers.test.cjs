"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const ELEMENT = Symbol.for("react.element");
const portalTargets = {
  "m36-ui-migration-patron-dialogue-portal": { id: "m36-ui-migration-patron-dialogue-portal" },
  "m36-ui-migration-patron-choices-portal": { id: "m36-ui-migration-patron-choices-portal" }
};
function flatten(input, output = []) {
  if (Array.isArray(input)) {
    for (const value of input) flatten(value, output);
  } else if (input !== null && input !== undefined &&
             typeof input !== "boolean") {
    output.push(input);
  }
  return output;
}

const React = {
  Fragment: Symbol.for("react.fragment"),
  useState(initial) {
    return [typeof initial === "function" ? initial() : initial, () => {}];
  },
  useEffect(callback) {
    callback();
  },
  useRef(initial) {
    return { current: initial };
  },
  createElement(type, props, ...children) {
    const nextProps = { ...(props || {}) };
    if (children.length === 1) nextProps.children = children[0];
    else if (children.length > 1) nextProps.children = children;
    return { $$typeof: ELEMENT, type, key: nextProps.key ?? null, props: nextProps };
  },
  cloneElement(element, props, ...children) {
    assert.ok(this.isValidElement(element), "cloneElement requires an element");
    const nextProps = { ...element.props, ...(props || {}) };
    if (children.length === 1) nextProps.children = children[0];
    else if (children.length > 1) nextProps.children = children;
    return {
      $$typeof: ELEMENT,
      type: element.type,
      key: nextProps.key ?? element.key,
      props: nextProps
    };
  },
  isValidElement(value) {
    return !!value && value.$$typeof === ELEMENT;
  },
  Children: {
    toArray(children) { return flatten(children); },
    forEach(children, callback) { flatten(children).forEach(callback); }
  }
};

let portrait = true;
const media = {
  get matches() { return portrait; },
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {}
};
const doc = {
  head: { appendChild() {} },
  documentElement: {},
  createElement() {
    return {
      id: "",
      textContent: "",
      style: {},
      setAttribute() {},
      addEventListener() {}
    };
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  getElementById(id) { return portalTargets[id] || null; },
  addEventListener() {},
  removeEventListener() {}
};
const win = {
  matchMedia() { return media; },
  requestAnimationFrame(callback) { callback(); },
  addEventListener() {},
  removeEventListener() {}
};
globalThis.document = doc;
globalThis.window = win;
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { userAgent: "Android" }
});
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
};

const ReactDOM = {
  createPortal(children, container) {
    return React.createElement("portal", { container }, children);
  }
};

let definition;
globalThis.WML = {
  define(value) { definition = value; }
};

const registeredHooks = Object.create(null);
const api = {
  game: "2026-10-24-pre7",
  host: { platform: "mobile" },
  fn(name) {
    if (name === "React") return React;
    if (name === "ReactDOM") return ReactDOM;
    return undefined;
  },
  has(name) { return name === "layout"; },
  hook(name, handlers) {
    registeredHooks[name] = handlers;
    return () => { delete registeredHooks[name]; };
  }
};

require(path.resolve(__dirname, "../mod.js"));
assert.ok(definition, "WML.define registered the module");
definition.setup(api);
assert.ok(registeredHooks.customerRow, "customer row hook registered");
assert.ok(registeredHooks.actionRenderer, "action renderer hook registered");
assert.ok(registeredHooks.patronInteractionCard, "third-tab patron interaction card hook registered");
assert.ok(registeredHooks.layout, "layout hook registered");

function findByClass(node, className) {
  if (!React.isValidElement(node)) return null;
  const value = typeof node.props.className === "string"
    ? node.props.className
    : "";
  if (value.includes(className)) return node;
  for (const child of React.Children.toArray(node.props.children)) {
    const found = findByClass(child, className);
    if (found) return found;
  }
  return null;
}

function collectText(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (!React.isValidElement(node)) return "";
  return collectText(node.props.children);
}

function allElements(node, result = []) {
  if (!React.isValidElement(node)) return result;
  result.push(node);
  for (const child of React.Children.toArray(node.props.children)) {
    allElements(child, result);
  }
  return result;
}

// Customer row: the original name, activity, order and action text must
// become a two-line identity block, without changing the parent click or
// the service/action control callbacks.
const parentClick = () => "parent-click";
const greetClick = () => "greet";
const dot = React.createElement("span", { className: "w-1.5 h-1.5" });
const name = React.createElement("span", {
  className: "text-[0.8rem] font-medium truncate max-w-[10rem]"
}, "라이자");
const status = React.createElement("span", {
  className: "text-[0.7rem] truncate text-violet-400"
}, "대화를 나누는 중");
const order = React.createElement("span", {
  className: "text-[0.7rem] text-stone-500 truncate"
}, "따뜻한 차 주문");
const acting = React.createElement("span", {
  className: "text-[0.7rem] text-pink-400"
}, "당신이 응대 중");
const warning = React.createElement("span", {
  className: "text-[0.7rem] text-red-400"
}, "⚠1");
const controlButton = React.createElement("button", { onClick: greetClick }, "인사하기");
const controls = React.createElement("span", {
  className: "flex items-center gap-1.5 flex-shrink-0"
}, controlButton);
const originalRow = React.createElement("div", {
  onClick: parentClick,
  className: "group flex items-center gap-1.5 px-1.5 py-0.5 rounded border"
}, dot, name, status, order, acting, warning, controls);
function Ou() {}
const customerComponentResult = React.createElement(Ou, { children: originalRow });
const customerResult = registeredHooks.customerRow.around(
  () => customerComponentResult
);
const transformedRow = findByClass(customerResult, "group flex items-center gap-1.5");
assert.ok(transformedRow, "transformed customer row exists");
assert.equal(transformedRow.props.onClick, parentClick, "row click handler preserved");
const identity = findByClass(transformedRow, "m36-ui-migration-customer-identity");
const meta = findByClass(transformedRow, "m36-ui-migration-customer-meta");
assert.ok(identity, "name and metadata have a dedicated identity block");
assert.ok(meta, "metadata is rendered beneath the name");
assert.equal(
  collectText(identity),
  "라이자대화를 나누는 중따뜻한 차 주문당신이 응대 중",
  "name and all original activity details remain present"
);
assert.equal(
  meta.props.title,
  "대화를 나누는 중 · 따뜻한 차 주문 · 당신이 응대 중",
  "full activity description remains available as a title"
);
assert.ok(
  !React.Children.toArray(transformedRow.props.children)
    .some((child) => child === status || child === order || child === acting),
  "metadata is no longer inline beside the name"
);
assert.equal(findByClass(transformedRow, "text-[0.7rem] text-red-400"), warning,
  "warning badge remains outside the metadata row");
assert.equal(findByClass(transformedRow, "flex items-center gap-1.5 flex-shrink-0")
  .props.children.props.onClick, greetClick, "action button callback preserved");

// Action event: title, description, question prompt, player/Elena gauges and
// dialogue card are pinned; both question answers and normal choices remain
// in the scroll content with their original callbacks and IDs.
const questionPick = () => "question-pick";
const normalPick = () => "normal-pick";
function utt() {}
function fb() {}
function fakeQuestion(props) {
  return React.createElement("div", {
    className: "mb-3 rounded-lg border-2 border-amber-500 bg-amber-950/40 p-3"
  },
    React.createElement("div", { className: "text-xs font-bold" }, "당신을 기다리는 중"),
    React.createElement("p", { className: "text-sm text-amber-100 mb-2" }, "어떻게 대답하시겠습니까?"),
    React.createElement("div", { className: "flex flex-wrap gap-2" },
      React.createElement("button", { onClick: props.onPick, "data-choice-id": "question-yes" }, "네")
    )
  );
}
Object.defineProperty(fakeQuestion, "name", { value: "utt" });
function fakeGauge() {}
Object.defineProperty(fakeGauge, "name", { value: "fb" });

const header = React.createElement("h3", {
  className: "text-sm font-bold text-amber-400 uppercase tracking-wider mb-1"
}, "엘레나");
const description = React.createElement("div", {
  className: "text-xs text-violet-300/80 mb-2"
}, "엘레나가 당신이 조용한 틈을 타 가까이 다가옵니다.");
const questionWrapper = React.createElement("div", { className: "transition-opacity" },
  React.createElement(fakeQuestion, { onPick: questionPick })
);
const gauges = React.createElement("div", { className: "mb-3 space-y-1.5" },
  React.createElement(fakeGauge, { label: "당신", value: 45, color: "bg-blue-500" }),
  React.createElement(fakeGauge, { label: "그녀", value: 68, color: "bg-pink-500" })
);
const dialogue = React.createElement("div", {
  className: "p-3 rounded-lg border-2 border-pink-600 bg-stone-800 mb-3"
}, React.createElement("p", {
  className: "text-sm text-stone-200 leading-relaxed whitespace-pre-line"
}, "그녀가 당신을 바라보며 미소 짓습니다."));
const extraControl = React.createElement("div", { className: "event-control" }, "추가 설정");
const choices = React.createElement("div", { className: "grid grid-cols-1 gap-2 transition-opacity" },
  React.createElement("button", {
    onClick: normalPick,
    "data-choice-id": "main-choice"
  }, "계속")
);
const originalEvent = React.createElement("div", {},
  header, description, questionWrapper, extraControl, gauges, dialogue, choices
);
const transformedEvent = registeredHooks.actionRenderer.around(() => originalEvent);
assert.ok(findByClass(transformedEvent, "m36-ui-migration-event-root"),
  "dialogue event is wrapped in a split scrolling layout");
const fixed = findByClass(transformedEvent, "m36-ui-migration-event-fixed");
const scrolling = findByClass(transformedEvent, "m36-ui-migration-event-scroll");
assert.ok(fixed && scrolling, "fixed and scrolling regions exist");
assert.ok(findByClass(fixed, "text-sm font-bold text-amber-400"), "dialogue heading pinned");
assert.ok(findByClass(fixed, "m36-ui-migration-event-description"), "one-line action description pinned");
assert.ok(findByClass(fixed, "m36-ui-migration-event-gauges"), "player/Elena gauges pinned");
assert.ok(findByClass(fixed, "border-2 border-pink-600"), "dialogue text card pinned");
assert.ok(collectText(fixed).includes("당신을 기다리는 중"), "question prompt title pinned");
assert.ok(collectText(fixed).includes("어떻게 대답하시겠습니까?"), "question prompt text pinned");
assert.ok(findByClass(scrolling, "m36-ui-migration-question-choices"),
  "question answer buttons moved to scroll region");
assert.ok(findByClass(scrolling, "grid grid-cols-1 gap-2"),
  "normal choice grid remains scrollable");
assert.ok(findByClass(scrolling, "event-control"), "other interactive controls remain scrollable");
const questionButton = allElements(scrolling).find((element) =>
  element.props["data-choice-id"] === "question-yes");
const normalButton = allElements(scrolling).find((element) =>
  element.props["data-choice-id"] === "main-choice");
assert.equal(questionButton.props.onClick, questionPick, "question answer callback preserved");
assert.equal(normalButton.props.onClick, normalPick, "normal choice callback preserved");
assert.equal(questionButton.props["data-choice-id"], "question-yes", "question choice identity preserved");
assert.equal(normalButton.props["data-choice-id"], "main-choice", "menu choice identity preserved");


/*
 * Third-tab patron interaction:
 * render the dialogue text once in the pinned panel, preserve all three
 * native third-tab actions, and mirror those exact actions to action scroll.
 */
const dispatchedPatronActions = [];
const patronDispatch = (action) => dispatchedPatronActions.push(action);
const patronWaitClick = () => patronDispatch({ type: "wait" });
const patronEngageClick = () => patronDispatch({ type: "engage_patron" });
const patronCallClick = () => patronDispatch({
  type: "patron_interaction_choice",
  choiceId: "step_in"
});
const patronHeader = React.createElement("div", {
  className: "flex items-baseline justify-between gap-2"
}, "톨렌 호크스 & 피파");
const patronDescription = React.createElement("div", {
  className: "text-[0.7rem] text-violet-300/80 mt-0.5"
}, "다른 손님 한 명이 합류했습니다.");
const patronNarration = React.createElement("div", {
  className: "text-stone-300 text-xs mt-1.5 italic"
}, "둘이 이야기하고 있습니다.");
const patronChoiceButtons = [
  React.createElement("button", {
    onClick: patronWaitClick,
    "data-choice-id": "patron-wait"
  }, "계속 일하기 — 상황은 그대로 두기"),
  React.createElement("button", {
    onClick: patronEngageClick,
    "data-choice-id": "patron-engage"
  }, "대화에 끼기"),
  React.createElement("button", {
    onClick: patronCallClick,
    "data-choice-id": "patron-call"
  }, "그녀를 부르기")
];
const patronChoiceGrid = React.createElement("div", {
  className: "grid gap-1 mt-2"
}, ...patronChoiceButtons);
const patronContent = React.createElement("div", { className: "px-3 py-2" },
  patronHeader, patronDescription, patronNarration, patronChoiceGrid
);
const originalPatronCard = React.createElement("div", {
  className: "bg-stone-800/80 border-l-2 border-violet-600 text-sm overflow-hidden"
}, patronContent);
const wrappedPatronCard = registeredHooks.patronInteractionCard.around(
  () => originalPatronCard
);
assert.equal(wrappedPatronCard.type.name, "PatronInteractionPortal",
  "the original third-tab card is wrapped without losing its native renderer");
const mirroredPatronTree = wrappedPatronCard.type(wrappedPatronCard.props);
assert.equal(mirroredPatronTree.type, React.Fragment,
  "the native card and portal locations share one React fragment");
const nativePatronCard = mirroredPatronTree.props.children[0];
assert.notEqual(nativePatronCard, originalPatronCard,
  "the original card has only its duplicated dialogue text removed");
assert.doesNotMatch(collectText(nativePatronCard), /톨렌 호크스 & 피파/,
  "the title is not repeated in the original third-tab card");
assert.doesNotMatch(collectText(nativePatronCard), /둘이 이야기하고 있습니다\./,
  "the narration is not repeated in the original third-tab card");
const expectedPatronChoiceIds = ["patron-wait", "patron-engage", "patron-call"];
const nativePatronButtons = allElements(nativePatronCard).filter((element) =>
  element.type === "button" && expectedPatronChoiceIds.includes(element.props["data-choice-id"])
);
assert.deepEqual(nativePatronButtons.map((button) => button.props["data-choice-id"]),
  expectedPatronChoiceIds,
  "all three original third-tab actions remain in the native card");
const expectedPatronCallbacks = [patronWaitClick, patronEngageClick, patronCallClick];
for (let i = 0; i < expectedPatronChoiceIds.length; i++) {
  assert.equal(nativePatronButtons[i].props.onClick, expectedPatronCallbacks[i],
    "native third-tab action callback is preserved");
}

const patronPortals = allElements(mirroredPatronTree)
  .filter((element) => element.type === "portal");
assert.equal(patronPortals.length, 2,
  "one fixed dialogue portal and one scrolling choices portal are rendered");
const fixedPatronPortal = patronPortals.find((element) =>
  element.props.container.id === "m36-ui-migration-patron-dialogue-portal"
);
const scrollingPatronPortal = patronPortals.find((element) =>
  element.props.container.id === "m36-ui-migration-patron-choices-portal"
);
assert.ok(fixedPatronPortal && scrollingPatronPortal,
  "the dialogue and choices use their intended separate targets");
assert.ok(collectText(fixedPatronPortal).includes("톨렌 호크스 & 피파"),
  "customer/wife heading is rendered in the fixed panel");
assert.ok(collectText(fixedPatronPortal).includes("둘이 이야기하고 있습니다."),
  "dialogue narration is rendered in the fixed panel");
assert.equal(allElements(fixedPatronPortal).some((element) => element.type === "button"), false,
  "no action choice is pinned");
assert.equal(
  (collectText(mirroredPatronTree).match(/톨렌 호크스 & 피파/g) || []).length,
  1,
  "the combined portrait render contains exactly one customer/wife heading"
);
for (const label of ["계속 일하기", "대화에 끼기", "그녀를 부르기"]) {
  assert.ok(collectText(scrollingPatronPortal).includes(label),
    "the original action " + label + " is mirrored into the ordinary scroll area");
}
const mirroredPatronButtons = allElements(scrollingPatronPortal).filter((element) =>
  element.type === "button" && expectedPatronChoiceIds.includes(element.props["data-choice-id"])
);
assert.deepEqual(mirroredPatronButtons.map((button) => button.props["data-choice-id"]),
  expectedPatronChoiceIds,
  "all three actions are present in the ordinary action scroll area");
for (let i = 0; i < expectedPatronChoiceIds.length; i++) {
  assert.equal(mirroredPatronButtons[i].props.onClick, expectedPatronCallbacks[i],
    "mirrored action keeps the original dispatch callback");
  assert.equal(mirroredPatronButtons[i].props.onClick, nativePatronButtons[i].props.onClick,
    "native and mirrored buttons share the exact callback function");
  mirroredPatronButtons[i].props.onClick();
}
assert.deepEqual(dispatchedPatronActions, [
  { type: "wait" },
  { type: "engage_patron" },
  { type: "patron_interaction_choice", choiceId: "step_in" }
], "the mirrored buttons dispatch the original WML action payloads");

// Missing action target must not remove the native third-tab buttons.
const savedChoicesTarget = portalTargets["m36-ui-migration-patron-choices-portal"];
portalTargets["m36-ui-migration-patron-choices-portal"] = null;
const noActionTargetTree = wrappedPatronCard.type(wrappedPatronCard.props);
const noActionTargetNative = noActionTargetTree.props.children[0];
assert.equal(allElements(noActionTargetNative).filter((element) =>
  element.type === "button" && expectedPatronChoiceIds.includes(element.props["data-choice-id"])
).length, 3, "all native choices remain when the mirror target is unavailable");
assert.equal(allElements(noActionTargetTree).filter((element) => element.type === "portal").length, 1,
  "the fixed dialogue can render independently of the action-scroll mirror");
portalTargets["m36-ui-migration-patron-choices-portal"] = savedChoicesTarget;

// Missing fixed target falls back to the complete original card.
const savedDialogueTarget = portalTargets["m36-ui-migration-patron-dialogue-portal"];
portalTargets["m36-ui-migration-patron-dialogue-portal"] = null;
const noDialogueTargetTree = wrappedPatronCard.type(wrappedPatronCard.props);
assert.equal(noDialogueTargetTree.props.children[0], originalPatronCard,
  "the complete native card remains without the fixed target");
assert.ok(collectText(noDialogueTargetTree).includes("톨렌 호크스 & 피파"),
  "the native title is never lost when the fixed target is unavailable");
portalTargets["m36-ui-migration-patron-dialogue-portal"] = savedDialogueTarget;

// The mirror target is inserted before existing actions, not at the bottom.
function loe() {}
const locationWrapper = React.createElement("div", {
  className: "mb-2 pb-2 border-b border-stone-800"
}, React.createElement(loe, {}));
const layoutStoryPane = React.createElement("div", {
  className: "flex-1 min-h-0 overflow-y-auto p-2 text-[0.78rem]"
}, locationWrapper);
const existingActionChoice = React.createElement("button", { "data-choice-id": "existing-action" },
  "기존 행동 선택지");
const actionScrollFixture = React.createElement("div", {
  className: "flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]"
}, existingActionChoice);
const actionPanelFixture = React.createElement("div", {
  className: "w-[37%] max-w-[13rem] shrink-0 flex flex-col min-h-0"
}, actionScrollFixture);
const layoutFixture = React.createElement("main", {}, layoutStoryPane, actionPanelFixture);
const layoutElement = registeredHooks.layout.after(layoutFixture);
const transformedLayout = layoutElement.type(layoutElement.props);
const transformedActionScroll = findByClass(transformedLayout, "m36-ui-migration-action-scroll");
assert.ok(transformedActionScroll, "portrait layout has a dedicated action scroll container");
const transformedScrollChildren = React.Children.toArray(transformedActionScroll.props.children);
assert.equal(transformedScrollChildren[0].props.id, "m36-ui-migration-patron-choices-portal",
  "patron choices target is the first child in the action scroll area");
assert.equal(transformedScrollChildren[1], existingActionChoice,
  "the original action list remains after the patron choices target");

// Landscape returns the original React trees, with no wrapper added.
portrait = false;
assert.equal(
  registeredHooks.actionRenderer.around(() => originalEvent),
  originalEvent,
  "landscape action event remains unchanged"
);
assert.equal(
  registeredHooks.customerRow.around(() => customerComponentResult),
  customerComponentResult,
  "landscape customer row remains unchanged"
);
assert.equal(
  registeredHooks.patronInteractionCard.around(() => originalPatronCard),
  originalPatronCard,
  "landscape third-tab interaction card remains unchanged"
);

const modSource = fs.readFileSync(path.join(__dirname, "..", "mod.js"), "utf8");
assert.equal(modSource.split('version: "1.3.9"').length - 1, 3,
  "all exposed module status versions match 1.3.9");
assert.ok(modSource.includes("#root .m36-ui-migration-action-panel>.m36-ui-migration-action-scroll{box-sizing:border-box!important;padding-bottom:calc(.25rem + env(safe-area-inset-bottom,0px))!important}"),
  "safe-area padding is contained inside the action scroll region");
assert.ok(!modSource.includes('padding-bottom:env(safe-area-inset-bottom,0px)!important'),
  "the side-panel parent no longer receives safe-area padding");
assert.ok(modSource.includes("flex:0 0 1.5rem!important;height:1.5rem!important;min-height:1.5rem!important;max-height:1.5rem!important;padding:0 .4rem!important"),
  "the bottom side-switch target stays fixed at 1.5rem without vertical padding");
assert.ok(modSource.includes('document.addEventListener("pointerup", onResumeGesture, true);'),
  "fullscreen restoration uses the trusted pointerup activation event");
assert.ok(modSource.includes('document.addEventListener("touchend", onResumeGesture, { capture: true, passive: true });'),
  "fullscreen restoration retains a touchend fallback");
assert.ok(!modSource.includes('document.addEventListener("pointerdown"') &&
          !modSource.includes('document.addEventListener("touchstart"'),
  "non-activation input events cannot race the first fullscreen activation");
assert.match(modSource, /max-height:66\.666%/,
  "action scroll area is capped at approximately two-thirds height");
assert.match(modSource, /ReactDOM: \{ raw: \{ "2026-10-24-pre7": "nte" \} \}/,
  "ReactDOM is bound to the source-confirmed createPortal module");
assert.match(modSource, /patronInteractionCard: \{ raw: \{ "2026-10-24-pre7": "cst" \} \}/,
  "the original same-room interaction renderer is hooked by its source symbol");
assert.match(modSource, /ReactDOM\.createPortal/,
  "the original dialogue and choices are mirrored through React portals");
assert.match(modSource, /FULLSCREEN_PREFERENCE_KEY/,
  "fullscreen intent is persisted");
assert.match(modSource, /onResumeStateChange/,
  "app resume events only refresh fullscreen state");
assert.match(modSource, /pointerup/,
  "fullscreen restoration retries on the first trusted pointerup");

// Audit the target WML source in bounded 4KB reads; guard the exact Znt -> hst -> cst path.
const gameHtmlPath = path.resolve(__dirname, "..", "..", "Wayward_WML_ko.html");
const requiredGameSource = [
  "function Znt({hideWifeColumn:e,peekOnly:t,wife:o,wifeLoc:n,slot:s,activePatronInteraction:r,crowdNames:a,dispatch:i",
  "r&&!r.playerEngaged&&u.jsx(hst,{customerName:r.customerName,crowdNames:a,wifeName:A,stage:r.stage,primarySlot:r.primarySlot,goldEarned:r.goldEarned??0,dispatch:i})",
  "function hst(e){const t=ie(n=>Qe(n.state));return ie(n=>NS(n.state))?u.jsx(cst,{...e}):u.jsx(dst,{...e,interactionLoc:t})}",
  "function cst({customerName:e,crowdNames:t,wifeName:o,stage:n,primarySlot:s,goldEarned:r,dispatch:a})",
  'className:"grid gap-1 mt-2"',
  'children:"계속 일하기 — 상황은 그대로 두기"',
  '"대화에 끼기"',
  '"그녀를 부르기"'
];
const unresolvedGameSource = new Set(requiredGameSource);
const gameHtmlFd = fs.openSync(gameHtmlPath, "r");
const gameHtmlBuffer = Buffer.alloc(4096);
const overlapBytes = Math.max(...requiredGameSource.map((value) => Buffer.byteLength(value))) - 1;
let gameHtmlCarry = Buffer.alloc(0);
try {
  let bytesRead;
  while ((bytesRead = fs.readSync(gameHtmlFd, gameHtmlBuffer, 0, gameHtmlBuffer.length, null)) > 0) {
    const data = Buffer.concat([gameHtmlCarry, gameHtmlBuffer.subarray(0, bytesRead)]);
    for (const token of unresolvedGameSource) {
      if (data.includes(Buffer.from(token))) unresolvedGameSource.delete(token);
    }
    gameHtmlCarry = data.subarray(Math.max(0, data.length - overlapBytes));
  }
} finally {
  fs.closeSync(gameHtmlFd);
}
assert.equal(unresolvedGameSource.size, 0,
  "the exact target WML Znt/hst/cst route or its original action labels changed: " +
  [...unresolvedGameSource].join(" | "));

console.log("PASS 1.3.9 regression: customer rows, pinned status, third-tab dialogue mirror, scroll-only original choices, callbacks and landscape passthrough");
