// Korean runtime for the translation layer.
// Translated lines carry both particle forms because the word in front is only known while playing
// ("{p}이(가)" -> "울프이(가)"). This picks the right one in everything shown on screen:
// 이(가) 은(는) 을(를) 와(과) (으)로 아(야) (이)… — the game's own data is left untouched.
(function () {
  'use strict';
  var PAIRS = {
    '이(가)': ['이', '가'], '가(이)': ['이', '가'],
    '은(는)': ['은', '는'], '는(은)': ['은', '는'],
    '을(를)': ['을', '를'], '를(을)': ['을', '를'],
    '과(와)': ['과', '와'], '와(과)': ['과', '와'],
    '아(야)': ['아', '야'], '이(야)': ['아', '야'],
    '(으)로': ['으로', '로'], '(이)': ['이', ''],
  };
  var RE = /이\(가\)|가\(이\)|은\(는\)|는\(은\)|을\(를\)|를\(을\)|과\(와\)|와\(과\)|아\(야\)|이\(야\)|\(으\)로|\(이\)/g;
  var CLOSERS = '"\'”’)]}」』>*_ ';
  var DIGIT_FINAL = { 0: 1, 1: 2, 3: 1, 6: 1, 7: 2, 8: 2 }; // 1 = has a final consonant, 2 = final ㄹ

  // 0: no final consonant, 1: final consonant, 2: final ㄹ, -1: unknown
  function finalOf(ch) {
    if (!ch) return -1;
    var c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) { var j = (c - 0xac00) % 28; return j === 0 ? 0 : j === 8 ? 2 : 1; }
    if (c >= 0x3131 && c <= 0x314e) return ch === 'ㄹ' ? 2 : 1;      // bare consonant jamo
    if (ch >= '0' && ch <= '9') return DIGIT_FINAL[ch] || 0;
    return -1;
  }
  // names that stay in English: known ones from finals.js (final consonant index), else a rough guess
  function latinFinal(text) {
    var known = window.WML_I18N_FINALS || {};
    var two = /[A-Za-z]+ [A-Za-z]+$/.exec(text), one = /[A-Za-z]+$/.exec(text);
    var hit = two && known[two[0].toLowerCase()] != null ? known[two[0].toLowerCase()] : one && known[one[0].toLowerCase()];
    if (hit != null) return hit === 0 ? 0 : hit === 8 ? 2 : 1;
    var w = one ? one[0].toLowerCase() : '';
    if (/(ng|m|n)$/.test(w)) return 1;
    if (/l$/.test(w)) return 2;
    if (/(ck|[aeiou]c|[aeiou]k|[aeiou]b|[aeiou]p|[aeiou]t)$/.test(w)) return 1;
    return 0;
  }
  function lastWordFinal(before) {
    var i = before.length - 1;
    while (i >= 0 && CLOSERS.indexOf(before[i]) >= 0) i--;
    if (i < 0) return { f: -1, empty: true };
    var f = finalOf(before[i]);
    if (f >= 0) return { f: f };
    return { f: /[A-Za-z]$/.test(before[i]) ? latinFinal(before.slice(0, i + 1)) : -1 };
  }
  function choose(marker, f) {
    var p = PAIRS[marker];
    if (marker === '(으)로') return f === 1 ? p[0] : p[1];         // ㄹ takes 로
    return f === 0 ? p[1] : p[0];
  }

  /** Resolve particle markers in a string. `prev` is text shown just before it (another node), if any. */
  function josa(text, prev) {
    if (typeof text !== 'string' || text.indexOf('(') < 0) return text;
    return text.replace(RE, function (marker, offset, all) {
      var r = lastWordFinal(all.slice(0, offset));
      if (r.empty && prev) r = lastWordFinal(prev);
      return r.f < 0 ? marker : choose(marker, r.f);
    });
  }

  // --- screen text ---------------------------------------------------------------------------
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, NOSCRIPT: 1 };
  function prevText(node) {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    w.currentNode = node;
    var p = w.previousNode();
    return p ? p.nodeValue : '';
  }
  var DISPLAY = window.WML_I18N_DISPLAY || {};
  var WORDS = window.WML_I18N_WORDS || {};
  var wordList = Object.keys(WORDS).sort(function (a, b) { return b.length - a.length; });
  var WORD_RE = wordList.length ? new RegExp('\\b(' + wordList.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')\\b', 'gi') : null;
  var HANGUL = /[가-힣]/;
  // ids with numbers or names in them ("moment contradiction 12 16975 오스릭"): regex rules from custom.json "patterns"
  var PATTERNS = (window.WML_I18N_PATTERNS || []).map(function (p) { try { return [new RegExp(p[0], 'g'), p[1]]; } catch (e) { return null; } }).filter(Boolean);
  // ids are lower case; the game sometimes capitalizes them ("Bathing") — look up both ways
  function lookup(table, key) {
    if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
    var low = key.toLowerCase();
    if (low !== key && Object.prototype.hasOwnProperty.call(table, low)) return table[low];
    var cap = key.charAt(0).toUpperCase() + key.slice(1);
    if (cap !== key && Object.prototype.hasOwnProperty.call(table, cap)) return table[cap];
    return undefined;
  }
  function swapWord(w) { var t = lookup(WORDS, w); return t === undefined ? w : t; }
  // a Korean line, or a short label like "Aldric · sex patron" (long English prose is left alone)
  function looksTranslatable(v) { return HANGUL.test(v) || (v.match(/[A-Za-z]+/g) || []).length < 6; }
  /** Everything done to one piece of screen text: whole-text labels, stray ids, particles. */
  function fixString(v, prevFn) {
    if (!v) return v;
    for (var i = 0; i < PATTERNS.length; i++) { PATTERNS[i][0].lastIndex = 0; if (PATTERNS[i][0].test(v)) { PATTERNS[i][0].lastIndex = 0; v = v.replace(PATTERNS[i][0], PATTERNS[i][1]); } }
    var core = v.trim();
    var whole = core ? lookup(DISPLAY, core) : undefined;
    if (whole !== undefined) v = v.replace(core, whole);                                      // whole text built by the game
    else if (WORD_RE && looksTranslatable(v)) v = v.replace(WORD_RE, swapWord);                // stray ids in a line
    if (v.indexOf('(') >= 0) {
      RE.lastIndex = 0;
      if (RE.test(v)) {
        var head = v.replace(/^[\s"'“‘(]*/, '');
        var needsPrev = /^(이\(가\)|가\(이\)|은\(는\)|는\(은\)|을\(를\)|를\(을\)|과\(와\)|와\(과\)|아\(야\)|이\(야\)|\(으\)로|\(이\))/.test(head);
        v = josa(v, needsPrev && prevFn ? prevFn() : '');
      }
    }
    return v;
  }
  function fixText(node) {
    var v = node.nodeValue;
    if (!v) return;
    var parent = node.parentNode;
    if (!parent || SKIP[parent.nodeName] || (parent.isContentEditable)) return;
    var next = fixString(v, function () { return prevText(node); });
    if (next !== v) node.nodeValue = next;
    noteEnglish(parent, next);
  }

  // --- leftover English on screen: collected so testers can report it (see the i18n-check mod) ------
  // the list belongs to one build of the translation: a new build starts an empty list
  var MISS_KEY = 'wml.i18n.missing', BUILD = window.WML_I18N_BUILD || '', missing = {};
  try { var saved = JSON.parse(localStorage.getItem(MISS_KEY) || 'null'); if (saved && saved.build === BUILD && saved.items) missing = saved.items; } catch (e) { missing = {}; }
  var ALLOW = { wayward: 1, wml: 1, ok: 1, npc: 1, comfyui: 1, webp: 1, png: 1, json: 1, pony: 1, sdxl: 1, lora: 1, api: 1, url: 1, http: 1, https: 1 };
  var saveTimer = null;
  function noteEnglish(el, text) {
    var s = (text || '').trim();
    if (!/[A-Za-z]{3,}/.test(s) || s.length > 400) return;
    if (el.closest && el.closest('[data-wml-ui],[data-i18n-skip],.font-mono,code,pre')) return;      // loader UI, tool panels that opt out, prompts, code
    if ((s.match(/,/g) || []).length >= 3 && !HANGUL.test(s)) return;                          // image tag lists
    var names = window.WML_I18N_FINALS || {};
    // file names (images.js) and quoted folder names (‘images’) are not text to translate
    var words = s.replace(/[\w.-]+\.(?:js|html?|json|png|webp|jpe?g|txt|md|cmd|ps1)\b/gi, '').replace(/[‘'"][\w./-]{1,40}[’'"]/g, '').match(/[A-Za-z][A-Za-z'’-]{2,}/g) || [];
    var left = words.filter(function (w) { var l = w.toLowerCase(); return !ALLOW[l] && names[l] == null; });
    if (!left.length) return;
    if (missing[s]) { missing[s]++; return; }
    if (Object.keys(missing).length >= 500) return;
    missing[s] = 1;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { try { localStorage.setItem(MISS_KEY, JSON.stringify({ build: BUILD, items: missing })); } catch (e) { /* storage off */ } }, 1500);
  }
  function listMissing() { return Object.keys(missing).sort(); }
  function clearMissing() { missing = {}; try { localStorage.removeItem(MISS_KEY); } catch (e) { /* storage off */ } }
  var ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  function fixAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute && el.getAttribute(ATTRS[i]);
      if (!v) continue;
      var n = v;
      var whole = lookup(DISPLAY, n.trim());
      if (whole !== undefined) n = whole;
      else if (WORD_RE && looksTranslatable(n)) n = n.replace(WORD_RE, swapWord);
      if (n.indexOf('(') >= 0) n = josa(n);
      if (n !== v) el.setAttribute(ATTRS[i], n);
    }
  }
  function fixTree(root) {
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    fixAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (var n = w.nextNode(); n; n = w.nextNode()) { if (n.nodeType === 3) fixText(n); else fixAttrs(n); }
  }
  function start() {
    fixTree(document.body);
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === 'characterData') fixText(r.target);
        else if (r.type === 'attributes') fixAttrs(r.target);
        else for (var k = 0; k < r.addedNodes.length; k++) fixTree(r.addedNodes[k]);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  // dialogs the game opens itself
  ['alert', 'confirm', 'prompt'].forEach(function (name) {
    var orig = window[name];
    if (typeof orig === 'function') window[name] = function (msg) { var a = Array.prototype.slice.call(arguments); a[0] = josa(String(msg == null ? '' : msg)); return orig.apply(window, a); };
  });

  // ---- patron speech levels (voice.js, made by tools/i18n-voice.mjs + i18n-apply.mjs)
  // The build wraps the places that print patron lines: WML_I18N.voice(line, site, () => [state, speaker]).
  // When the line is exactly a variant set's base text, the speaker's variant is shown instead:
  // 반말(plain) · 존댓말(polite) · 하게체(hage) · 하오체(hao), chosen by who the patron is.
  var VOICE = window.WML_I18N_VOICE || null;
  var VTOKEN = /\{[A-Za-z0-9_$.]+\}|%[pwr]/g;
  var voiceCompiled = {}, voiceByGroup = null;
  function reEscape(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function voiceCompile(id, entry) {
    if (voiceCompiled[id]) return voiceCompiled[id];
    var tokens = [], parts = [], start = 0, m, re = new RegExp(VTOKEN.source, 'g');
    while ((m = re.exec(entry.b))) { parts.push(reEscape(entry.b.slice(start, m.index)), '([\\s\\S]*?)'); tokens.push(m[0]); start = m.index + m[0].length; }
    parts.push(reEscape(entry.b.slice(start)));
    return (voiceCompiled[id] = { re: new RegExp('^' + parts.join('') + (entry.p ? '(?=$| )' : '$')), tokens: tokens });
  }
  // the variant with the line's own names/numbers put back where the base had its slots
  function voiceApply(value, id, level) {
    var entry = VOICE.entries[id];
    if (!entry || typeof value !== 'string' || !entry.v[level]) return value;
    var c = voiceCompile(id, entry), m = c.re.exec(value);
    if (!m) return value;
    var i = 0;
    var out = entry.v[level].replace(new RegExp(VTOKEN.source, 'g'), function (t) { return t === c.tokens[i] ? m[++i] : t; });
    return out + value.slice(m[0].length);
  }
  function find(list, test) { for (var i = 0; i < list.length; i++) if (test(list[i])) return list[i]; return undefined; }
  /** speech level index of a speaker (a patron object, id or name), -1 when it is not a patron */
  function voiceLevel(state, ref) {
    if (!VOICE || !state || ref == null || (typeof ref !== 'object' && typeof ref !== 'string')) return -1;
    var R = VOICE.rules || {}, customers = state.customers || [], records = state.patronRecords || [];
    var key = typeof ref === 'string' ? ref : ref.id;
    var customer = typeof ref === 'object' ? ref : (find(customers, function (p) { return p.id === key; }) || find(customers, function (p) { return p.name === key; }));
    var name = (customer && customer.name) || (typeof ref === 'string' ? ref : ref.customerName);
    var record = find(records, function (p) { return (key != null && p.id === key) || (name != null && p.name === name); });
    var profile = null;
    if (R.collector && ((customer && customer.isCollector) || (record && record.isCollector) || R.collector.names.indexOf(name) >= 0)) profile = R.collector.profile;
    if (!profile && name) {
      var renamed = state.namedPatronNames || {};
      for (var id in R.named || {}) if (R.named[id].names.indexOf(name) >= 0 || renamed[id] === name) { profile = R.named[id].profile; break; }
    }
    if (!profile) profile = (R.types || {})[(record && record.patronType) || (customer && customer.patronType)] || ((customer || record) ? R.fallback : null);
    return profile ? VOICE.profiles.indexOf(profile) : -1;
  }
  function voiceGroups(value, groups, level) {
    if (!voiceByGroup) { voiceByGroup = {}; for (var id in VOICE.entries) (voiceByGroup[VOICE.entries[id].g] = voiceByGroup[VOICE.entries[id].g] || []).push(id); }
    for (var g = 0; g < groups.length; g++) {
      var ids = voiceByGroup[groups[g]] || [];
      for (var j = 0; j < ids.length; j++) { var next = voiceApply(value, ids[j], level); if (next !== value) { value = next; break; } }
    }
    return value;
  }
  function voice(value, site, get) {
    var s = VOICE && VOICE.sites[site];
    if (!s) return value;
    try {
      var who = get(), level = voiceLevel(who[0], who[1]);
      if (level < 0) return value;
      if (s.k === 'say') return voiceApply(value, s.e, level);
      if (s.k === 'result') {
        if (!value || typeof value !== 'object') return value;
        var copy = Object.assign({}, value);
        ['text', 'logText', 'narration'].forEach(function (k) { if (typeof copy[k] === 'string') copy[k] = voiceGroups(copy[k], s.g, level); });
        return copy;
      }
      return typeof value === 'string' ? voiceGroups(value, s.g, level) : value;
    } catch (e) { return value; }   // a place the build wrapped may not have its speaker at hand: keep the line
  }

  // Does a story line mention this person? The story log gives each person's lines a color and a dot; the game looks
  // for the name as an English whole word (\bAldric\b). Korean lines carry the regulars' Korean names ("알드릭이 …"),
  // some names are Korean in the game itself ("수금원"), and \b finds no edge next to Hangul. i18n/ko/code.json routes
  // the game's check here: an English name as before, a Korean one (its own, or how the screen shows it) when no
  // Hangul syllable comes right before it — particles follow a Korean name directly.
  var mentionCache = {};
  function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function mentions(text, name) {
    if (typeof text !== 'string' || typeof name !== 'string' || !name) return false;
    var m = mentionCache[name];
    if (!m) {
      var ko = HANGUL.test(name) ? name : lookup(DISPLAY, name);
      m = mentionCache[name] = {
        en: HANGUL.test(name) ? null : new RegExp('\\b' + reEsc(name) + '\\b'),
        ko: typeof ko === 'string' && HANGUL.test(ko) ? new RegExp('(^|[^가-힣])' + reEsc(ko)) : null,
      };
    }
    return (!!m.en && m.en.test(text)) || (!!m.ko && m.ko.test(text));
  }
  window.WML_I18N_MENTIONS = mentions;

  window.WML_I18N = { lang: 'ko', josa: josa, fix: function (s) { return fixString(String(s)); }, missing: listMissing, clearMissing: clearMissing,
    voice: voice, voiceLevel: function (state, who) { var i = voiceLevel(state, who); return i < 0 ? null : VOICE.profiles[i]; }, mentions: mentions };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
