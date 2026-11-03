"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const ELEMENT = Symbol.for("react.element");
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
  useState(initial) { return [typeof initial === "function" ? initial() : initial, () => {}]; },
  useRef(initial) { return { current: initial }; },
  useEffect() {},
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
const appendedStyles = [];
const doc = {
  head: { appendChild(node) { appendedStyles.push(node); } },
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
  getElementById() { return null; },
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

let definition;
globalThis.WML = {
  define(value) { definition = value; }
};

const registeredHooks = Object.create(null);
const api = {
  game: "2026-10-24-pre7",
  host: { platform: "mobile" },
  fn(name) { return name === "React" ? React : undefined; },
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

// Prep panel: move the original WML $ot component (not a recreated control
// panel) out of the portrait story scroller and above the choice scroller.
function loe() {}
function $ot() {}
function itt() {}
function sB() {}
const prepClick = () => "original-prep-callback";
const originalPrep = React.createElement($ot, { onClick: prepClick, marker: "native-prep" });
const storyPane = React.createElement("div", {
  className: "flex-1 min-h-0 overflow-y-auto p-2 text-[0.78rem]"
},
  React.createElement("div", { className: "mb-2 pb-2 border-b border-stone-800" },
    React.createElement(loe, {})),
  React.createElement("div", { className: "min-w-0" }, originalPrep, React.createElement(itt, {}))
);
const originalChoiceRenderer = React.createElement(sB, {});
const choiceScroll = React.createElement("div", {
  className: "flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]"
}, originalChoiceRenderer);
const sideToggleClick = () => "toggle-side";
const sideToggle = React.createElement("button", {
  title: "행동 버튼을 반대쪽으로 이동",
  "aria-label": "행동 버튼을 왼쪽으로 이동",
  className: "shrink-0 flex items-center text-lg leading-none px-3",
  onClick: sideToggleClick
}, "⇤");
const originalActionPanel = React.createElement("div", {
  className: "w-[37%] max-w-[13rem] shrink-0 flex flex-col min-h-0"
}, choiceScroll, sideToggle);
const originalLayout = React.createElement("main", {}, storyPane, originalActionPanel);
const portraitLayoutElement = registeredHooks.layout.after(originalLayout);
const portraitLayout = portraitLayoutElement.type(portraitLayoutElement.props);
const prepPanel = findByClass(portraitLayout, "m36-ui-migration-prep-panel");
const actionPanel = findByClass(portraitLayout, "m36-ui-migration-action-panel");
const storyAfterMove = findByClass(portraitLayout, "flex-1 min-h-0 overflow-y-auto p-2 text-[0.78rem]");
assert.ok(prepPanel && actionPanel, "native prep component is mounted in the action panel");
assert.equal(allElements(prepPanel).filter((node) => node.type === $ot).length, 1,
  "the original prep component is moved exactly once");
assert.equal(allElements(prepPanel)[1], originalPrep,
  "the exact original React element is reused, not reconstructed");
assert.equal(allElements(storyAfterMove).some((node) => node.type === $ot), false,
  "the original prep component is removed from the story pane");
assert.equal(findByClass(actionPanel, "m36-ui-migration-action-scroll")?.props.children, originalChoiceRenderer,
  "the original choice renderer remains in its independent scroll region");
const movedToggle = allElements(actionPanel).find((node) => node.type === "button" &&
  node.props.title === "행동 버튼을 반대쪽으로 이동");
assert.ok(movedToggle.props.className.includes("m36-ui-migration-side-toggle"),
  "the side toggle receives an independent fixed-size class");
assert.equal(movedToggle.props.onClick, sideToggleClick, "the original side-toggle callback is preserved");
assert.equal(allElements(prepPanel)[1].props.onClick, prepClick,
  "the original prep callback is preserved");
assert.ok(appendedStyles.find((node) => node.id === "m36-mobile-ui-migration-style").textContent.includes(
  "flex:1 1 0%!important"), "choice scrolling uses remaining height, not a percentage coupled to the header");
const migrationCss = appendedStyles.find((node) => node.id === "m36-mobile-ui-migration-style").textContent;
assert.ok(migrationCss.includes("max-height:30vh;overflow-x:hidden;overflow-y:auto"),
  "prep panel has a 30vh cap and its own internal scroll");
assert.ok(migrationCss.includes(
  "height:30px!important;min-height:30px!important;max-height:30px!important"),
  "side toggle height is explicitly fixed");

// Landscape keeps the native story placement and does not add the portrait prep panel.
portrait = false;
const landscapeLayoutElement = registeredHooks.layout.after(originalLayout);
const landscapeLayout = landscapeLayoutElement.type(landscapeLayoutElement.props);
assert.equal(findByClass(landscapeLayout, "m36-ui-migration-prep-panel"), null,
  "landscape does not create a portrait prep panel");
const landscapeStory = findByClass(landscapeLayout, "flex-1 min-h-0 overflow-y-auto p-2 text-[0.78rem]");
assert.ok(allElements(landscapeStory).some((node) => node.type === $ot),
  "landscape keeps the original prep component in the story pane");
portrait = true;

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

const modSource = fs.readFileSync(path.join(__dirname, "..", "mod.js"), "utf8");
assert.match(modSource, /max-height:66\.666%/,
  "action scroll area is capped at approximately two-thirds height");
assert.match(modSource, /FULLSCREEN_PREFERENCE_KEY/,
  "fullscreen intent is persisted");
assert.match(modSource, /visibilitychange/,
  "fullscreen restoration is retried when the app becomes visible");
assert.match(modSource, /pointerdown/,
  "fullscreen restoration retries on the next trusted user gesture");

console.log("PASS 1.3.5: native prep component move, separate prep/choice scroll, fixed side toggle, native callbacks, customer/dialogue transforms and landscape passthrough");
