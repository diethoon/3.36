// Pack the mods as a separate download that is copied over a WML game folder.
//   node tools/pack-mods.mjs [--out <folder>] [--version 1.0.0] [--exclude id,id]
// --exclude: mod folders left out of the pack (their mods.js lines too), e.g. mods you keep for yourself
// Output: <out>/wml-mods-<version>/ (wml/mods, wml/symbols for this game version, README_ko.txt, README_en.txt)
//         and <out>/wml-mods-<version>.zip
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { args } from './lib.mjs';

const WML = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = args();
const version = a.version || '1.0.0';
const OUT = path.resolve(a.out || path.join(WML, '..', '묶기작업', 'mods-release'));
const NAME = `wml-mods-${version}`;
const PKG = path.join(OUT, NAME);
const symbolsFile = fs.readdirSync(path.join(WML, 'symbols')).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop();
const game = symbolsFile.replace('.json', '');
const core = (fs.readFileSync(path.join(WML, 'runtime', 'wml-core.js'), 'utf8').match(/const VERSION = '([^']+)'/) || [])[1];

// ---- mod list (order and default on/off from mods.js, fields from each WML.define)
const EXCLUDE = new Set(String(a.exclude || '').split(',').map(x => x.trim()).filter(Boolean));
const dropExcluded = text => text.split(/\r?\n/).filter(line => { const m = line.match(/^\s*"([^":]+)(:off)?"/); return !(m && EXCLUDE.has(m[1])); }).join('\n');
const modsJs = dropExcluded(fs.readFileSync(path.join(WML, 'mods', 'mods.js'), 'utf8'));
const listed = [...modsJs.matchAll(/^\s*"([^":]+)(:off)?"/gm)].map(m => ({ id: m[1], on: !m[2] }));
const lit = n => (!n ? undefined : n.type === 'Literal' ? n.value : n.type === 'ArrayExpression' ? n.elements.map(lit) : undefined);
function meta(id) {
  const src = fs.readFileSync(path.join(WML, 'mods', id, 'mod.js'), 'utf8');
  let def = null;
  walk.simple(acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script' }), {
    CallExpression(n) { if (!def && n.callee.type === 'MemberExpression' && n.callee.object.name === 'WML' && n.callee.property.name === 'define') def = n.arguments[0]; },
  });
  const m = {};
  for (const p of def.properties) if (p.type === 'Property' && p.key.name !== 'setup') m[p.key.name] = lit(p.value);
  return m;
}
const mods = listed.map(l => ({ ...l, ...meta(l.id) }));
const nameOf = id => (mods.find(m => m.id === id) || {}).name || id;

// English one-liners for README_en (the mods' own text is Korean)
const EN = {
  'addon-compat': 'Compatibility layer the ported add-ons need. Keep it on.',
  'join-in': 'While a patron is with your wife, "join in" turns it into a scene with you in it.',
  'leave-her-there': 'When your wife passes out during service, adds "leave her there".',
  delivery: 'A delivery side job.',
  waitress: 'Hire one waitress (button at the top).',
  pregnancy: 'Pregnancy and birth.',
  'newwife-hina': 'New wife: Hina.',
  'newwife-miyabi': 'New wife: Miyabi.',
  outfit: 'Adds maid dress, bunny girl, reverse bunny, succubus and cat costumes to the shop.',
  imagestudio: 'Image generation studio (button at the bottom right).',
  brothel: 'Run a brothel (cellar rooms, break room).',
  'brothel-pregnancy': 'Brothel + pregnancy link.',
  maid: 'Maid house: hire 1-6 maids, give them work, build a relationship. With the waitress mod on, maids do not serve the hall.',
  slave: 'Slave house. Overlaps with the brothel - only one of the two can be on.',
  editor: 'Game editor.',
  'customer-edit': 'Patron editor. Clashes with the game editor - only one can be on.',
  'cheat-ledger': 'Cheat ledger (button at the top right). Used cheats are recorded.',
  'h-status': 'H Status (situation events, secret tab, sound hooks).',
  'situation-pregnancy': 'H Status + pregnancy link.',
  'character-prompts': 'Fixed appearance tags for Elena, Mara and Pippa (per person in its settings).',
  'image-look': 'Separate pictures while pregnant or when piercings / body fluids are visible.',
  'patron-control': 'Choose which patron approaches, what he does next and how she answers.',
  'debug-decision': 'Force or inspect acceptance checks (for testing).',
  'heroine-debug': "Edit your wife's hidden values (for testing).",
  'prompt-manager': 'Fix the prompt of a bad picture with its thumbs-down button and save the rule.',
  'prompt-autocomplete': 'Tag autocompletion for the prompt manager.',
  hooker: 'Edits the final request sent to the image server (CONFIG at the top of its mod.js).',
  wayworks: 'WAYWORKS: window layout, shortcuts, statistics, achievements, cheats.',
  'layer-fix': 'Stops the brothel / slave-house window frames from covering game popups, lines up top-right mod buttons and moves the WML buttons clear of the WAYWORKS window button.',
  'ww_imagepromptenhancedmod': 'Rewrites the image prompts (outfit, exposure, underwear, see-through, scene tags, bath service…) — Mod v2.65 by its own author. Cannot run next to the prompt manager, and does the same job as the Mod v2.30 mods split out in pack 1.1.0.',
  'ww_imagepromptenhancedmod_savecompressaddon': 'Save compression that comes with the mod above. Same job and same format as the bundled save-compress — keep only one on.',
  'outfitqueue': 'Image workshop: queue and review picture generation per outfit and scene. Open it from its ⚙ settings in the mod manager. Needs an image server.',
  'llm-core': 'Adds short lines written by an LLM after the game\'s own ones (your wife\'s mood, feelings and the patron are described to it). Needs an OpenAI-style endpoint of your own — a local llama.cpp / LM Studio / Ollama, or a cloud key. Without one it does nothing.',
  'llm-night-talk': 'Night talk in the bedroom, written by the LLM (needs llm-core). Also the example for writing your own child mod.',
  'extra-screens': 'Puts the story log in a window of its own, for a second monitor. With WAYWORKS on it becomes a WAYWORKS panel (dock, split, ↗ detach); without it, a plain browser window. PC only.',
  'touch-bar': 'Touch action buttons for phones (wait 1/5/15 min, till a patron, clean, kitchen, work, side job, nap) — the same rules as the game\'s hotkeys. Phones only unless switched on for PC.',
  'guidance-timeout': 'Fixes a game bug: an unanswered "what do you think about him?" talk blocked all later ones; after 30 minutes it counts as "Whatever feels right to you."',
  'ko-log-colors': 'Korean build: story lines get their colours back (they all came out white there). Does nothing in English.',
  'i18n-check': 'Untranslated-text collector for translated builds (does nothing in English).',
  'hello-wml': 'Example mod for mod makers.',
};

// ---- copy
if (fs.existsSync(PKG)) fs.rmSync(PKG, { recursive: true, force: true });
const copyDir = (from, to, top = false) => {
  fs.mkdirSync(to, { recursive: true });
  for (const d of fs.readdirSync(from, { withFileTypes: true })) {
    if (/\.(bak|orig)$/i.test(d.name)) continue;
    if (top && EXCLUDE.has(d.name.replace(/\.zip$/i, ''))) continue;
    const s = path.join(from, d.name), t = path.join(to, d.name);
    if (d.isDirectory()) copyDir(s, t); else fs.copyFileSync(s, t);
  }
};
copyDir(path.join(WML, 'mods'), path.join(PKG, 'wml', 'mods'), true);
if (EXCLUDE.size) fs.writeFileSync(path.join(PKG, 'wml', 'mods', 'mods.js'), modsJs);
fs.mkdirSync(path.join(PKG, 'wml', 'symbols'), { recursive: true });
for (const ext of ['json', 'js']) fs.copyFileSync(path.join(WML, 'symbols', `${game}.${ext}`), path.join(PKG, 'wml', 'symbols', `${game}.${ext}`));
// the loader too: newer loaders add features (0.3.0: install mods by dropping them on the game) and stay compatible
fs.mkdirSync(path.join(PKG, 'wml', 'runtime'), { recursive: true });
fs.copyFileSync(path.join(WML, 'runtime', 'wml-core.js'), path.join(PKG, 'wml', 'runtime', 'wml-core.js'));

// ---- readmes
const pad = (s, n) => s + ' '.repeat(Math.max(1, n - [...s].length));
const rel = (m, ko) => [
  m.requires && m.requires.length ? `${ko ? '필요' : 'needs'}: ${m.requires.map(r => (ko ? nameOf(r) : r)).join(', ')}` : '',
  m.conflicts && m.conflicts.length ? `${ko ? '같이 못 켬' : 'cannot run with'}: ${m.conflicts.map(r => (ko ? nameOf(r) : r)).join(', ')}` : '',
].filter(Boolean).join(' / ');
const kb = id => { let n = 0; const w = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) w(p); else n += fs.statSync(p).size; } }; w(path.join(PKG, 'wml', 'mods', id)); return n; };
const size = n => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);
const total = mods.reduce((s, m) => s + kb(m.id), 0);

const ko = `Wayward WML 모드팩 ${version} (게임 ${game} 용)
==========================================

WML(Wayward Mod Loader)에서 돌아가는 모드 ${mods.length}개를 따로 모은 파일이에요.
9-30 한글판용으로 나왔던 모드들을 WML에서 돌도록 옮기고 고친 것과, WML용으로 새로 만든 모드가 들어 있어요.
게임 파일 없이 모드만 들어 있어서, 이미 WML 게임(한글판·영문판)을 받은 사람이 모드만 새로 바꿀 때 써요.


■ 필요한 것
------------------------------------------

  - WML 게임 폴더 (게임 ${game} 기준, 모드 로더 v${core})
    Wayward_WML_ko.html(한글판) 또는 Wayward_WML.html(영문판)과 wml 폴더가 있는 폴더예요.
  - 처음이라면 이 모드팩이 아니라 게임 배포본(한글판/영문판)을 먼저 받으세요. 거기에도 같은 모드가 들어 있어요.


■ 설치
------------------------------------------

  ▶ 방법 1 — 덮어쓰기 (권장: 폴더로 관리해요. 모드 폴더를 지우면 그 모드가 사라져요)
  1. 게임을 닫아요.
  2. 이 압축 안의 wml 폴더를 게임 폴더에 그대로 덮어써요.
       (게임 폴더)\\wml\\mods\\...        ← 모드 (폴더 하나가 모드 하나)
       (게임 폴더)\\wml\\symbols\\...     ← 게임 함수 이름표 (몇몇 모드가 써요)
       (게임 폴더)\\wml\\runtime\\...     ← 모드 로더 v${core} (끌어다 놓기·폴더 등록·삭제 버튼 포함)
  3. 게임을 다시 열어요. 왼쪽 아래 WML 버튼 → 모드 관리자에서 켜고 꺼요.
  ▶ 모드 지우기: wml\\mods 에서 그 모드 폴더를 지우면 끝이에요. (모드 관리자의 "삭제" 버튼은 남은 설정을 지워 줘요)

  ▶ 방법 2 — 끌어다 놓기 (폴더 없이 브라우저에 보관)
    이 zip 파일을 압축 그대로 게임 화면에 끌어다 놓고 새로고침하세요.
    모드가 한 번에 브라우저에 들어가고, 기본으로 꺼 둘 모드는 꺼진 채로, 순서도 그대로 들어가요.
    ※ 세이브처럼 그 브라우저 안에만 있어요. 지울 때는 모드 관리자의 "삭제" 버튼을 쓰세요.

  ※ 덮어쓰기 전에 wml 폴더를 한 번 백업해 두면 마음이 편해요.
  ※ 모드 관리자에서 바꾼 켜기/끄기·순서는 브라우저에 저장돼 있어서 덮어써도 그대로예요.
  ※ wml\\mods\\mods.js(기본 목록)도 바뀌어요. 직접 추가한 모드가 있었다면 덮어쓴 뒤
     wml\\mods\\모드목록_자동갱신.cmd 를 더블클릭하세요. 폴더에 있는 모드가 다시 목록에 들어가요.
  ※ 앞으로 모드 폴더를 넣거나 뺄 때도 모드목록_자동갱신.cmd 를 더블클릭하면 목록이 맞춰져요.
  ※ 세이브는 브라우저에 저장돼 있어서 손대지 않아요. 그래도 게임 안 설정 → 내보내기로 백업해 두세요.


■ 들어 있는 모드 (${mods.length}개, 합계 ${size(total)})
------------------------------------------

  기본 = 처음부터 켜져 있음 / 끔 = 목록에는 있지만 기본으로 꺼져 있음
  순서는 기본 로드 순서예요 (모드 관리자에서 바꿀 수 있어요).

${mods.map((m, i) => `  ${String(i + 1).padStart(2)}. ${pad(m.name || m.id, 22)} [${m.on ? '기본' : '끔'}] v${m.version || '?'}  (${m.id}, ${size(kb(m.id))})
      ${m.description || ''}${rel(m, true) ? `\n      ${rel(m, true)}` : ''}`).join('\n')}


■ 꼭 알아둘 것
------------------------------------------

  - 애드온 호환층(addon-compat)은 옮긴 모드 대부분이 필요로 해요. 끄지 마세요.
  - 같이 켤 수 없는 조합(노예관 ↔ 창관, 손님 편집 ↔ 게임 에디터)은 둘 다 켜면 한쪽이 실행되지 않고
    모드 관리자에 이유가 빨갛게 나와요.
  - 필요한 모드가 꺼져 있어도 그 이유가 모드 관리자에 나와요.
  - 메이드관·노예관 같은 큰 모드는 새 게임에서 시작하는 걸 권해요.
  - 옮긴 모드의 창·문구는 원작 그대로 한국어예요.


■ 원작
------------------------------------------

  옮긴 모드들은 원작 모드 제작자분들의 작품이에요. 내용은 원작 그대로 두고,
  지금 게임에서 돌도록 연결하고 오류만 고쳤어요. (각 mod.js 맨 위에 원본 파일 이름이 적혀 있어요)


■ 문제가 생기면
------------------------------------------

  - 화면이 까맣거나 이상해요 → WML 버튼에서 의심 가는 모드를 끄고 새로고침해 보세요.
  - 모드 관리자에 "오류"가 떠요 → 그 줄에 이유가 적혀 있어요 (필요한 모드, 같이 못 켜는 모드 등).
  - 원래대로 돌리고 싶어요 → 백업해 둔 wml 폴더로 되돌리거나, 게임 배포본의 wml 폴더를 다시 덮어써요.


■ 모드를 직접 만들거나 고치고 싶으면
------------------------------------------

  - 게임 폴더의 wml\\docs\\SDK.md (모드 SDK 설명서)
  - AI와 같이 만들기: MCP 배포판(wml-mcp)
  - 모드 하나 = wml\\mods\\<이름>\\mod.js 파일 하나 + mods.js 에 한 줄


이 게임은 성인용(18세 이상) 콘텐츠이며 NTR 소재를 다룹니다.
`;

const en = `Wayward WML mod pack ${version} (for game ${game})
==========================================

${mods.length} mods for the Wayward Mod Loader (WML), packed on their own: add-ons from the Korean community,
ported to run on WML, plus mods made for WML. There is no game file in here - use it to update the mods of a
WML game folder you already have.

NOTE: most of these mods come from Korean add-ons. Their windows, buttons and messages are in Korean.


* Requirements
------------------------------------------

  - A WML game folder (game ${game}, mod loader v${core}): the folder with Wayward_WML.html and the wml folder.
  - New here? Get the game package first - it already contains these mods.


* Installation
------------------------------------------

  > Way 1 - copy over (recommended: managed as folders - delete a mod's folder and the mod is gone)
  1. Close the game.
  2. Copy the wml folder from this archive over the game folder:
       (game folder)\\wml\\mods\\...      <- the mods (one folder = one mod)
       (game folder)\\wml\\symbols\\...   <- game function name table (some mods use it)
       (game folder)\\wml\\runtime\\...   <- mod loader v${core} (drag and drop, folder registration, delete button)
  3. Open the game again. Use the WML button at the bottom left (mod manager) to switch mods on and off.
  > Removing a mod: delete its folder in wml\\mods. (The "삭제" / delete button in the mod manager clears its leftovers.)

  > Way 2 - drag and drop (kept in the browser, no folders)
    Drag this zip file, still zipped, onto the game window and reload.
    All mods go into the browser at once, off-by-default mods stay off, and the order is kept.
    * Like saves, they live in that browser only. Remove them with the "삭제" / delete button in the mod manager.

  * Back up the wml folder first if you like.
  * On/off choices and load order made in the mod manager are stored in the browser and survive the copy.
  * wml\\mods\\mods.js (the default list) is replaced too. If you added mods of your own, double-click
    wml\\mods\\update-mod-list.cmd afterwards - every mod folder goes back on the list.
  * Whenever you add or remove a mod folder later, double-click update-mod-list.cmd to update the list.
  * Saves live in the browser and are not touched. Still, back up with Settings -> Export in the game.


* Mods (${mods.length}, ${size(total)} in total)
------------------------------------------

  on = on by default / off = listed but off by default. Listed in the default load order.

${mods.map((m, i) => `  ${String(i + 1).padStart(2)}. ${pad(m.id, 22)} [${m.on ? 'on' : 'off'}] v${m.version || '?'}  ${size(kb(m.id))}
      ${EN[m.id] || ''}${rel(m, false) ? `\n      ${rel(m, false)}` : ''}`).join('\n')}


* Good to know
------------------------------------------

  - addon-compat is needed by most ported mods. Keep it on.
  - Pairs that cannot run together (slave <-> brothel, customer-edit <-> editor): with both on, one does not run
    and the mod manager shows why in red. Missing required mods are reported the same way.
  - Start a new game for big mods such as maid and slave.


* Credits
------------------------------------------

  The ported mods are the work of their original authors. Their content is unchanged; they were only connected
  to the current game and fixed where they broke. (The original file name is noted at the top of each mod.js.)


* Making or changing mods
------------------------------------------

  - wml\\docs\\SDK.md in the game folder (mod SDK guide)
  - With an AI agent: the MCP package (wml-mcp)
  - One mod = one wml\\mods\\<name>\\mod.js file + one line in mods.js


This game contains adult (18+) content and explores NTR / cuckold themes.
`;
fs.writeFileSync(path.join(PKG, 'README_ko.txt'), ko.replace(/\n/g, '\r\n'));
fs.writeFileSync(path.join(PKG, 'README_en.txt'), en.replace(/\n/g, '\r\n'));

// ---- zip
const zip = path.join(OUT, `${NAME}.zip`);
fs.rmSync(zip, { force: true });
if (process.platform === 'win32') execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${PKG}' -DestinationPath '${zip}' -Force`], { stdio: 'inherit' });
else execFileSync('zip', ['-rq', zip, NAME], { cwd: OUT, stdio: 'inherit' });
console.log(JSON.stringify({ version, game, loader: core, mods: mods.length, on: mods.filter(m => m.on).length, size: size(total), folder: PKG, zip, zipMB: +(fs.statSync(zip).size / 1024 / 1024).toFixed(1) }, null, 1));
