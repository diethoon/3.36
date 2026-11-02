"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");

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
const injectedStyles = [];
const doc = {
  head: { appendChild(style) { injectedStyles.push(style); } },
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
assert.ok(registeredHooks.wifePortrait, "wife portrait hook registered");
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

// Customer rows remain native. The old two-line/ellipsis transform is removed
// so order, response, tip and other original details remain visible inline.
assert.equal(registeredHooks.customerRow, undefined,
  "native customer row is not rewritten or truncated");

// Inner thoughts: tag only the original "그녀의 속마음" card, preserving its
// content and click handler. CSS keeps it sticky and content-width responsive.
const toggleThought = () => "toggle-thought";
const thoughtToggle = React.createElement("button", {
  onClick: toggleThought,
  "aria-expanded": true
}, "그녀의 속마음");
const thoughtBody = React.createElement("div", {
  className: "text-stone-400 italic text-[0.8rem] leading-relaxed"
}, "그녀가 아직 말하지 않은 생각이 여기에 표시됩니다.");
const thoughtCard = React.createElement("div", {
  className: "px-3 py-2 bg-stone-900/50 border-l-2 border-l-stone-700 text-sm leading-relaxed"
},
  React.createElement("div", { className: "flex justify-between items-baseline mb-1" },
    thoughtToggle
  ),
  thoughtBody
);
function Znt() {}
const portraitResult = React.createElement(Znt, { children: thoughtCard });
const transformedPortrait = registeredHooks.wifePortrait.around(() => portraitResult);
const pinnedThought = findByClass(transformedPortrait, "m36-ui-migration-inner-thought");
assert.ok(pinnedThought, "original inner-thought card is tagged for sticky placement");
assert.equal(collectText(pinnedThought), collectText(thoughtCard),
  "inner-thought text and toggle label are preserved");
assert.equal(findByClass(pinnedThought, "text-stone-400 italic").props.children,
  "그녀가 아직 말하지 않은 생각이 여기에 표시됩니다.",
  "inner-thought body is preserved");
assert.equal(findByClass(pinnedThought, "text-stone-400 italic").props.children,
  thoughtBody.props.children, "inner-thought text is not rewritten");
assert.equal(
  allElements(pinnedThought).find((element) => element.type === "button").props.onClick,
  toggleThought,
  "inner-thought expand/collapse callback is preserved"
);
assert.ok(injectedStyles.some((style) =>
  style.textContent.includes("position:sticky") &&
  style.textContent.includes("width:fit-content") &&
  style.textContent.includes("m36-ui-migration-inner-thought")
), "inner-thought card uses sticky, content-sized styling");
assert.ok(injectedStyles.some((style) =>
  style.textContent.includes("max-height:66.666%") &&
  style.textContent.includes("m36-ui-migration-event-scroll")
), "choice scroll area is reduced to about two-thirds of available height");

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
  registeredHooks.wifePortrait.around(() => portraitResult),
  portraitResult,
  "landscape wife portrait remains unchanged"
);

console.log("PASS 1.3.2: native customer details, sticky content-width inner thoughts, two-thirds choice scroll, dialogue/gauge pinning, callbacks and landscape passthrough");
