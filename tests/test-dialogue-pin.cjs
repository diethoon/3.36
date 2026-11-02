"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");

const hooks = Object.create(null);
const styles = [];
let portrait = true;
let definition = null;
let unhookCalls = 0;

function flatten(children, output = []) {
  for (const child of children || []) {
    if (Array.isArray(child)) flatten(child, output);
    else if (child !== null && child !== undefined && typeof child !== "boolean") {
      output.push(child);
    }
  }
  return output;
}

const React = {
  createElement(type, props, ...children) {
    const nextProps = { ...(props || {}) };
    if (children.length === 1) nextProps.children = children[0];
    else if (children.length > 1) nextProps.children = children;
    return { type, props: nextProps, key: nextProps.key ?? null };
  },
  cloneElement(element, props, ...children) {
    const nextProps = { ...element.props, ...(props || {}) };
    if (children.length === 1) nextProps.children = children[0];
    else if (children.length > 1) nextProps.children = children;
    return { ...element, props: nextProps, key: nextProps.key ?? element.key ?? null };
  },
  isValidElement(value) {
    return !!value && typeof value === "object" &&
      Object.prototype.hasOwnProperty.call(value, "type") &&
      Object.prototype.hasOwnProperty.call(value, "props");
  },
  Children: {
    toArray(children) {
      return flatten(Array.isArray(children) ? children : [children]);
    },
    forEach(children, callback) {
      flatten(Array.isArray(children) ? children : [children]).forEach(callback);
    }
  }
};

const root = {
  addEventListener() {},
  removeEventListener() {},
  querySelectorAll() { return []; },
  querySelector() { return null; }
};

global.WML = {
  define(value) { definition = value; }
};
global.document = {
  head: { appendChild(value) { styles.push(value); } },
  createElement(tag) { return { tagName: tag.toUpperCase(), textContent: "", id: "" }; },
  querySelector(selector) { return selector === "#root" ? root : null; },
  querySelectorAll() { return []; },
  getElementById() { return null; },
  addEventListener() {},
  removeEventListener() {}
};
global.window = {
  matchMedia() {
    return {
      get matches() { return portrait; },
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {}
    };
  },
  requestAnimationFrame(callback) { callback(); },
  addEventListener() {},
  removeEventListener() {}
};
Object.defineProperty(global, "navigator", {
  configurable: true,
  value: { userAgent: "Android" }
});

require(path.resolve(__dirname, "../mobile-ui-migration/mod.js"));
assert.ok(definition, "WML.define must register the mode");
assert.equal(definition.version, "1.4.0");
assert.equal(definition.id, "mobile-ui-migration");

definition.setup({
  fn(name) {
    assert.equal(name, "React");
    return React;
  },
  hook(name, implementation) {
    hooks[name] = implementation;
    return () => { unhookCalls += 1; };
  },
  host: { platform: "mobile" },
  game: "2026-10-24-pre7",
  has() { return true; }
});

assert.ok(hooks.sB && typeof hooks.sB.around === "function",
  "dialogue renderer sB hook must be registered");

const title = React.createElement("h3", { className: "text-sm font-bold" }, "라이자");
const status = React.createElement("div", { className: "text-xs text-violet-300/80" }, "라이자가 응대 중");
const question = React.createElement("div", { className: "question-input" }, "무슨 말을 할까요?");
const gauges = React.createElement("div", { className: "mb-3 space-y-1.5" },
  React.createElement("div", {}, "당신"),
  React.createElement("div", {}, "그녀"));
const dialogueCard = React.createElement("div", {
  className: "p-3 rounded-lg border-2 border-pink-600 bg-stone-800 mb-3"
}, React.createElement("p", { className: "text-sm" },
  "당신이 조용한 틈을 타 라이자에게 가까이 다가갑니다."));
const choiceButton = React.createElement("button", { onClick() {} }, "다가간다");
const choiceGrid = React.createElement("div", {
  className: "grid grid-cols-1 gap-2 transition-opacity"
}, choiceButton);
const original = React.createElement("div", { "data-testid": "sB-result" },
  title, status, question, gauges, dialogueCard, choiceGrid);

const wrapped = hooks.sB.around((...args) => {
  assert.equal(args.length, 0);
  return original;
});

assert.notEqual(wrapped, original, "dialogue event result should be wrapped");
assert.equal(wrapped.type, "div");
assert.equal(wrapped.props["data-testid"], "sB-result");
const wrappedChildren = React.Children.toArray(wrapped.props.children);
assert.equal(wrappedChildren.length, 2, "pinned content and original choice grid expected");

const pinned = wrappedChildren[0];
assert.equal(pinned.type, "section");
assert.equal(pinned.props.className, "m36-ui-migration-dialogue-pinned");
assert.deepEqual(
  React.Children.toArray(pinned.props.children),
  [title, status, question, gauges, dialogueCard],
  "title, status, question controls, gauges and message must remain original elements in original order"
);
assert.equal(wrappedChildren[1], choiceGrid,
  "choice grid must remain the exact original React element");
assert.equal(React.Children.toArray(choiceGrid.props.children)[0], choiceButton,
  "original choice button and its event handler must remain intact");

const statusElement = styles.find(style => style.id === "m36-mobile-ui-migration-style");
assert.ok(statusElement, "mobile migration stylesheet must be attached");
assert.match(statusElement.textContent, /position:sticky/,
  "dialogue panel must use sticky positioning");
assert.match(statusElement.textContent, /text-overflow:ellipsis/,
  "long character status must be ellipsized");
assert.match(statusElement.textContent, /flex-direction:column/,
  "character name and status must be separated into rows");

const noMessage = React.createElement("div", {},
  title, status, choiceGrid);
assert.equal(hooks.sB.around(() => noMessage), noMessage,
  "non-dialogue choice panels must remain untouched");

const malformedChoice = React.createElement("div", {},
  title, dialogueCard, React.createElement("div", { className: "flex gap-2" }, choiceButton));
assert.equal(hooks.sB.around(() => malformedChoice), malformedChoice,
  "non-matching choice container must remain untouched");

portrait = false;
assert.equal(hooks.sB.around(() => original), original,
  "landscape layout must remain untouched");
portrait = true;

definition.setup && console.log("PASS: original React dialogue/gauge elements pinned; choices and handlers preserved; non-dialogue/landscape unchanged.");
