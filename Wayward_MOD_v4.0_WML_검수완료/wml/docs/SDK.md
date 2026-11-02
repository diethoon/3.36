# WML 모드 SDK 설명서

Wayward Mod Loader(WML)로 Wayward 모드를 만드는 방법을 정리한 설명서예요.
로더 버전 0.2.0, 게임 2026-10-04 기준이에요.

- 처음이라면 **1장(5분 만에 첫 모드)** 과 **10장(예제)** 부터 보세요.
- AI(Claude 등)와 같이 만들 거라면 [MCP.md](MCP.md)의 모드 제작 도구를 연결하세요.
  게임 함수 찾기 → 모드 뼈대 → 검사 → 실제 게임에서 시험까지 도구로 할 수 있어요.

---

## 목차

1. [5분 만에 첫 모드](#1-5분-만에-첫-모드)
2. [모드 파일의 모양](#2-모드-파일의-모양)
3. [api 전체](#3-api-전체)
4. [훅 — 게임 함수에 끼어들기](#4-훅--게임-함수에-끼어들기)
5. [게임 상태(state) 기초](#5-게임-상태state-기초)
6. [의미 이름(심볼 표)](#6-의미-이름심볼-표)
7. [게임 화면 다루기](#7-게임-화면-다루기)
8. [번역과 모드 글자](#8-번역과-모드-글자)
9. [저장 · 다른 모드와 함께 쓰기 · 새 게임 버전](#9-저장--다른-모드와-함께-쓰기--새-게임-버전)
10. [예제](#10-예제)
11. [시험과 디버깅](#11-시험과-디버깅)
12. [자주 하는 실수](#12-자주-하는-실수)
13. [옛 모드 옮기기](#13-옛-모드-옮기기)

---

## 1. 5분 만에 첫 모드

모드 하나는 **폴더 하나 + `mod.js` 파일 하나**예요.

```
wml/
  mods/
    mods.js            ← 어떤 모드를 어떤 순서로 켤지 적는 목록
    my-first/
      mod.js           ← 내 모드
```

**① `wml/mods/my-first/mod.js`**

```js
WML.define({
  id: 'my-first',                 // 폴더 이름과 같아야 해요
  name: '내 첫 모드',
  version: '1.0.0',
  game: '>=2026-10-04',
  description: '왼쪽 아래 버튼을 누르면 이야기 창에 한 줄을 남겨요.',

  setup(api) {
    api.ui.addButton({
      label: '★',
      title: '내 첫 모드',
      onClick: () => api.log(api.t({ ko: '모드가 인사합니다.', en: 'Hello from a mod.' })),
    });
  },
});
```

**② `wml/mods/mods.js` 목록에 한 줄 넣기**

```js
WML.enable([
  "addon-compat",
  …
  "my-first",          // 내 첫 모드
  "i18n-check",
]);
```

> 손으로 고치기 싫으면 모드 폴더를 넣은 뒤 `wml/mods/모드목록_자동갱신.cmd`를 더블클릭하세요. 목록에 알아서 들어가요.
> (브라우저는 보안 때문에 폴더 안을 직접 볼 수 없어서 이 목록 파일이 필요해요.)
> 폴더에 넣지 않고 **모드 폴더를 게임 화면에 끌어다 놓아도** 돼요. 브라우저에 설치돼서 목록이 필요 없어요 (2장 "배포하기").

**③ 게임(`Wayward_WML_ko.html`)을 새로고침해요.**

왼쪽 아래 `WML` 버튼 옆에 ★ 버튼이 생겨요. 모드 관리자(`WML` 버튼)에 "내 첫 모드 · 작동 중"이 보이면 성공이에요.

> 모드는 게임을 실행할 때 읽혀요. **모드만 고쳤다면 빌드할 필요 없이 새로고침만 하면 돼요.**
> 빌드(`node tools/build.mjs --lang ko`)는 번역이나 심볼 표를 바꿨을 때만 해요.

---

## 2. 모드 파일의 모양

```js
WML.define({
  id, name, version, game, description,
  requires, loadAfter, loadBefore, conflicts, role, platform,
  setup(api) { … },             // async setup(api) 도 돼요
});
```

| 필드 | 뜻 |
|---|---|
| `id` | **필수.** 소문자로 시작하고 소문자·숫자·`.` `-` `_` 만 써요. 폴더 이름과 같아야 해요 (로더가 `mods/<id>/mod.js`를 읽어요). |
| `name` | 모드 관리자에 보일 이름 |
| `version` | 모드 버전 (`"1.0.0"`) |
| `game` | 맞는 게임 버전. `">=2026-10-04"`, `"2026-10-04"`, `">=2026-10-04 <2026-12-01"`. 안 맞으면 경고만 하고 로드는 해요. |
| `description` | 모드 관리자에 보일 설명 |
| `requires` | 꼭 있어야 하는 모드 id 목록. 없거나 꺼져 있으면 이 모드는 실행되지 않고 "오류"로 표시돼요. 그 모드보다 뒤에 로드돼요. |
| `loadAfter` | 켜져 있으면 그 모드 **뒤에** 로드돼요 (없어도 괜찮음) |
| `loadBefore` | 켜져 있으면 그 모드 **앞에** 로드돼요 |
| `conflicts` | 같이 켤 수 없는 모드. 둘 다 켜져 있으면 이 모드가 실행되지 않아요. |
| `role` | 이 모드가 하는 일 (낱말 하나 또는 목록, 예: `'hotkeys'`). 같은 일을 하는 모드가 둘 이상 켜지면 둘 다 실행되지만, 모드 관리자가 "하나만 켜는 걸 권해요"라고 알려 줘요. 아래 표의 이름을 쓰면 관리자에 한국어로 보여요. (모드 로더 0.5.0부터) |
| `platform` | 이 모드가 쓸모 있는 기기: `'pc'` 또는 `'mobile'` (목록도 돼요). 다른 기기에서 켜져도 막지는 않고, 모드 관리자에 "PC 전용"처럼 표시하고 알려 줘요. 키보드 단축키만 있는 모드에 `'pc'`를 적어요. (모드 로더 0.6.0부터) |
| `setup(api)` | **필수.** 게임이 처음 그려지기 직전에 한 번 불려요. 여기서 훅·버튼·행동을 등록해요. |

#### 역할(`role`) 이름

같은 기능을 디자인·취향에 따라 여러 모드로 만들 수 있어요. 막지는 않고, 같은 역할 모드가 함께 켜지면 알려서 플레이어가 고르게 해요.
`conflicts`는 "같이 켜면 깨진다"(한쪽이 안 켜짐), `role`은 "같은 일을 해서 겹친다"(둘 다 켜지고 안내만)예요.

| role | 뜻 | 지금 쓰는 모드 |
|---|---|---|
| `hotkeys` | 게임 단축키를 가로챔 | wayworks, kknd-hotkeys |
| `hall-staff` | 홀에서 손님을 응대하는 직원 | waitress, staff-grandma |
| `custom-guests` | 사용자 손님을 방문 손님에 끼워 넣음 | editor, guest-templates |
| `character-look` | 아내 외형 태그를 바꿈 | character-prompts, hooker, wife-look-garu |
| `scene-prompt` | 장면·의상 태그 표를 바꿈 | prompt-tags, scene-prompt-override |
| `aftermath-look` | 정사 후 모습을 그림에 넣음 | image-look, aftermath-look |
| `image-variants` | 장면별 그림 수를 바꿈 | image-ext |
| `theme` · `music` · `save-format` · `stats` · `cheat-editor` | 화면 테마 · 배경음악 · 세이브 저장 방식 · 통계 · 수치 편집 | themes · music-player · save-compress · … |

### 로드 과정

1. `mods.js`의 `WML.enable([...])`가 목록의 모든 `mod.js`를 읽어요.
   - 꺼진 모드도 파일은 읽어요. `WML.define`으로 이름을 올리기만 하고 `setup`은 부르지 않아요.
2. 게임 모듈이 준비되면 `WML.boot()`가 돌아요.
3. 켜진 모드 가운데 `requires`나 `conflicts`가 안 맞는 모드를 빼요.
4. `requires`·`loadAfter`·`loadBefore`에 맞게 순서를 고쳐요.
   - 고친 내용은 모드 관리자에 "↳ … 뒤로 옮겼어요"로 표시돼요.
5. 순서대로 `setup(api)`를 불러요. `async setup`이면 끝날 때까지 기다린 뒤 다음 모드로 넘어가요.
6. 게임 첫 화면을 그려요.

`setup`에서 오류가 나면 그 모드만 "오류"로 표시되고 나머지는 계속 돌아요.

### 배포하기 · 설치하기

- **만드는 사람**: 모드 폴더(`<id>/mod.js` + 보조 파일)를 zip으로 묶어서 올리면 끝이에요. 목록 파일은 건드리지 않아요.
- **모드는 폴더가 기준이에요.** `wml/mods/<id>/` 폴더가 있으면 설치된 것이고, 지우면 사라져요.
  - 목록 파일(`mods.js`)에 남아 있어도 폴더가 없으면 오류 없이 조용히 건너뛰어요.
- **받는 사람**이 새 모드를 넣는 법
  1. 압축을 풀어 모드 폴더를 `wml/mods`에 넣어요.
  2. 그 폴더를 게임 화면에 한 번 끌어다 놓아요 → **폴더 등록** (브라우저는 이름만 기억하고 코드는 폴더에서 읽어요).
     - 끌어다 놓는 대신 `wml/mods/모드목록_자동갱신.cmd` 더블클릭, 또는 `mods.js`에 한 줄을 넣어도 돼요.
     - 모드팩처럼 `mods.js`가 같이 들어 있는 압축은 `wml` 폴더를 덮어쓰기만 하면 끝이에요.
  - 브라우저는 보안 때문에 폴더 안을 볼 수 없어서, 새 폴더는 이렇게 한 번 알려 줘야 해요.
- **지우기**: 폴더를 지우면 끝이에요.
  - 모드 관리자의 **삭제** 버튼은 한 번 더 물어본 뒤 그 모드의 남은 설정(켜짐 상태·순서·모드 설정 `wml.mod.<id>`·창 위치)을 웹 저장소에서 지워요.
  - 폴더 모드는 브라우저가 파일을 지울 수 없어서 끄기만 하고, 폴더를 지우라고 알려 줘요.
- **폴더 없이 쓰기 (선택)**: `wml/mods` 밖의 zip·`mod.js`를 끌어다 놓거나, 모드 관리자의 **파일 고르기**·**폴더 고르기**로 고르면 브라우저 저장소(IndexedDB)에 넣어 둬요.
  - 파일로 연 게임(`file://`)에서는 브라우저가 끌어다 놓은 폴더 안을 읽지 못해요. 그래서 끌어다 놓은 폴더는 이름만 보고 `wml/mods/<이름>/`이 있으면 등록해요. 다른 곳의 폴더는 zip으로 묶거나 폴더 고르기를 써요.
  - "설치본" 표시가 붙고, 삭제 버튼으로 완전히 지워요. 같은 id의 폴더 모드보다 우선해요.
  - 세이브처럼 그 브라우저 안에만 있어요. zip 안의 `mods.js`가 있으면 그 순서와 `:off` 기본값을 따라요.
- 보조 파일은 `api.loadScript('files/a.js')`, 그림·데이터는 `api.fileUrl('pic.png')`로 읽어요. 어느 방법으로 넣었든 똑같이 돼요.
  - `fetch('wml/mods/<id>/…')`처럼 경로를 직접 쓰면 브라우저 설치본에서는 못 읽어요.
- 끌어다 놓기는 모드 로더 0.3.0, 폴더 등록과 삭제 버튼은 0.3.1부터 있어요. 파일로 연 게임에서 끌어다 놓기가 실패하던 문제는 0.3.2에서 고쳤어요.
- **zip 안의 심볼 표 (0.5.0부터)**: 끌어다 놓은 zip에 `symbols/<게임버전>.json`(공용 심볼 표 모양)이 같이 들어 있으면, 공용 표를 덮어쓰지 않아요.
  - 우리 공용 표와 다른 이름만 골라 그 zip에 든 모드의 전용 이름으로 넣어요.
  - 그래서 공용 표를 고쳐서 만든 모드도 zip 그대로 돌아가고, 다른 모드에는 그 이름이 보이지 않아요.
  - 앞으로 만드는 모드는 `mod.js` 안 `symbols` 블록(아래 "모드 전용 의미 이름")을 쓰세요. 폴더로만 넣는 경우에도 돼요.

### 켜고 끄기

- `mods.js`의 `"id:off"`는 목록에는 있지만 기본으로 꺼진 모드예요.
- 플레이어가 모드 관리자에서 바꾼 켜짐·순서는 브라우저에 따로 저장되고, `mods.js`보다 우선해요.
  - 저장 키: `wml.toggles`, `wml.order`
  - 모드 관리자의 "기본값으로" 버튼을 누르면 `mods.js`대로 돌아가요.

---

## 3. api 전체

`setup(api)`가 받는 `api` 객체예요. 모드마다 따로 만들어져요.

### 기본 정보

| 이름 | 뜻 |
|---|---|
| `api.id` | 이 모드의 id |
| `api.wml` | 로더 버전 (`"0.2.0"`) |
| `api.game` | 게임 버전 (`"2026-10-04"`) |
| `api.lang` | 지금 빌드의 언어 (`"ko"`, `"en"`) |
| `api.t({ ko, en })` | 언어에 맞는 글자를 골라 줘요. 그 언어가 없으면 `en`, 그것도 없으면 첫 값. |
| `api.warn(msg)` | 모드 관리자의 "알림"에 경고를 남겨요 |
| `api.host` | 게임이 도는 곳: `{ kind, app, platform }`. 폰 앱(WML 플레이어)이면 `kind`가 `'player'`, `app`은 앱 버전, `platform`은 `'mobile'`. PC 브라우저면 `'browser'`·`'pc'`. (0.6.0) |

### 게임 함수와 값

| 이름 | 뜻 |
|---|---|
| `api.fn(name)` | 게임의 최상위 값(함수·상수)을 돌려줘요. `name`은 **의미 이름**(`'wife'`) 또는 압축 이름(`'_'`). |
| `api.sym(name)` | 의미 이름 → 지금 게임의 압축 이름 (`api.sym('wife') === '_'`) |
| `api.has(name)` | 그 이름이 있는지 (`true`/`false`) |
| `api.engine` | 모든 최상위 값에 바로 접근하는 객체 (`api.engine._`). 읽기는 자유롭게 하되, 직접 대입은 피하세요(4장 참고). |
| `api.hook(name, spec)` | 게임 함수에 끼어들어요 → **4장**. 돌려주는 함수를 부르면 훅이 풀려요. |

```js
const wife = api.fn('wife')(api.store.game());      // 지금 주 아내
const room = api.fn('wifeLocation')(api.store.game());
```

### 게임 상태 — `api.store`

게임 상태는 하나의 커다란 객체(state)예요. **직접 고치지 말고 새 객체를 만들어서 바꿔요.**

| 이름 | 뜻 |
|---|---|
| `api.store.game()` | 지금 게임 상태(state). 게임 시작 전에는 `null`일 수 있어요. |
| `api.store.update(state => newState)` | 상태를 바꿔요 (가장 많이 씀) |
| `api.store.dispatch(action)` | 게임 행동을 실행해요 (`{ type: 'wait', minutes: 15 }` 같은 게임 행동, 또는 모드가 등록한 행동) |
| `api.store.subscribe(listener)` | 상태가 바뀔 때마다 불려요. 돌려주는 함수를 부르면 그만 받아요. |
| `api.store.get()` / `api.store.set(updater)` | 바깥 저장소 전체(`{ state, started, dispatch … }`)를 읽고 써요 (거의 안 씀) |

```js
api.store.update(s => ({ ...s, economy: { ...s.economy, gold: s.economy.gold + 50 } }));
```

### 이야기 창 한 줄 — `api.log(text)`

```js
api.log('[내 모드] 무슨 일이 있었어요.');
```

상태를 바꾸는 함수 안에서는 `api.fn('log')(state, text)`를 써요. 바뀐 state를 돌려줘요.

### 세이브에 같이 저장 — `api.data`

| 이름 | 뜻 |
|---|---|
| `api.data.get()` | 이 모드의 자료 (`state.mods[id]`). 없으면 `undefined`. |
| `api.data.set(value 또는 old => new)` | 자료를 바꿔요. 세이브·불러오기·내보내기와 같이 움직여요. |

### 브라우저 설정 — `api.settings`

세이브와 상관없는 **이 모드의 설정**이에요. 브라우저의 `wml.mod.<id>` 칸에 저장돼요.

| 이름 | 뜻 |
|---|---|
| `api.settings.get(기본값)` | `{ ...기본값, ...저장된 값 }` |
| `api.settings.set(obj)` | 일부만 바꿔 저장 |

### 새 행동 — `api.actions.register(type, handler)`

```js
api.actions.register('my-first/tip', (state, action) => {
  const gold = state.economy.gold + (action.amount || 10);
  return api.fn('log')({ ...state, economy: { ...state.economy, gold } }, '팁을 받았어요.');
});
// 어디서든
api.store.dispatch({ type: 'my-first/tip', amount: 20 });
```

- `type`은 다른 모드와 겹치지 않게 `<모드id>/<이름>` 꼴을 권해요. 같은 `type`을 둘이 등록하면 오류가 나요.
- `handler(state, action)`는 새 state를 돌려줘요.
- 세 번째 인자로 `{ label: '팁 받기' }`를 주면 다른 모드(단축키 만드는 모드 등)가 이 이름으로 보여 줘요. (모드 로더 0.6.1부터)

다른 모드의 행동을 찾아 쓰기 (모드 로더 0.6.1부터):

```js
api.actions.list();          // [{ type, owner, label }] — 모드들이 등록한 행동
const stop = api.actions.observe(({ type, owner, label, action }) => {
  // 모든 행동이 끝난 뒤 불려요. owner 는 등록한 모드 id, 게임 자체 행동이면 'game'
  // 예: "한 번 해 보면 그 행동을 단축키로 등록"
});
stop();                       // 그만 듣기
```

### 선택지가 있는 알림 — `api.events`

| 이름 | 뜻 |
|---|---|
| `api.events.onAlert(kind, (state, choiceId) => state)` | 알림 종류를 등록하고, 실제 종류 이름(`"<id>:<kind>"`)을 돌려줘요 |
| `api.events.alert(state, { kind, title, body, choices })` | 알림을 줄에 세운 새 state를 돌려줘요. 다른 사건이 없을 때 화면에 떠요. |

```js
const kind = api.events.onAlert('offer', (s, choice) =>
  choice === 'yes' ? api.fn('log')(s, '받아들였어요.') : s);
api.store.update(s => api.events.alert(s, {
  kind, title: '제안', body: '손님이 제안을 해요.',
  choices: [{ id: 'yes', label: '받는다' }, { id: 'no', label: '거절한다' }],
}));
```

### 화면 부품 — `api.ui`

| 이름 | 뜻 |
|---|---|
| `api.ui.addButton({ label, title, onClick })` | **WML 버튼 줄**에 버튼 하나. 모든 모드가 같이 쓰는 줄이에요 — 화면 구석에 버튼을 직접 붙이지 말고 여기에 넣으세요. 돌려주는 손잡이로 `remove()`, `update({ label, title })` |
| `api.ui.adopt(element, { proxy, label, title })` | 이미 만든 버튼(요소)을 그 줄에 태우기. `proxy: true` 면 요소는 제자리에 숨기고 줄에는 눌러 주는 버튼만 둬요(게임 화면 안 React 요소용). 되돌리는 함수를 돌려줘요 |
| `api.ui.window({ id, title, width, height, render(body, win), onClose })` | 움직이고 크기를 바꿀 수 있는 창. 같은 `id`로 다시 열면 앞으로 와요. 위치·크기는 기억돼요. |
| `api.ui.settings(render(body, win))` | 모드 관리자에서 이 모드의 ⚙ 버튼으로 여는 설정 창 |
| `api.ui.h(tag, props, ...children)` | DOM 요소를 만드는 도우미. `class`, `style`(문자열), `onclick` 같은 `on…` 이벤트를 받아요. |
| `api.ui.button(label, onClick, { primary, icon, title, disabled })` | WML 모양 버튼 |

창 손잡이(`win`): `el`, `body`, `close()`, `focus()`, `setTitle(text)`, `refresh()`(`render`를 다시 불러 다시 그림).

**버튼은 한 줄에 모아요 (0.7.0).** 모드마다 화면 구석에 버튼을 붙이면 금세 겹치고 가려져요. WML 버튼 줄은
플레이어가 손잡이로 끌어 옮기고, `‹` 로 접어 작은 `WML ›` 만 남길 수 있어요. 버튼은 한 줄에 5개씩(설정에서 1~12개)
들어가고, 넘으면 윗줄이 하나 더 생겨요. 그래서 모드는 **버튼 하나만** 넣고, 나머지는 그 버튼으로 여는 창
(`api.ui.window`)이나 모드 관리자의 ⚙ 설정(`api.ui.settings`)에 두는 게 좋아요.
옛 모드처럼 꼭 자기 자리에 둬야 하는 UI(화면에 늘 떠 있어야 하는 표시 같은 것)는 그대로 둬도 돼요 — 모아 두는 것은
`layer-fix` 모드가 하고, 플레이어가 그 설정에서 끌 수 있어요.

쓸 수 있는 CSS 클래스: `wml-btn`, `wml-primary`, `wml-muted`, `wml-small`, `wml-note`, `wml-grid`(표), `wml-section`, `wml-chip`.

### 보조 파일 — `api.loadScript(file)`

모드 폴더 안의 다른 스크립트를 읽어요. `async setup`에서 `await`해요.

```js
async setup(api) {
  await api.loadScript('files/big-table.js');   // wml/mods/<id>/files/big-table.js
}
```

### 보조 파일의 주소 — `api.fileUrl(file)`, `api.installed`

- `api.fileUrl('pic.png')`: 모드 폴더 안 파일의 주소예요. `<img src>`나 `fetch`에 써요.
  - 폴더 모드면 `wml/mods/<id>/pic.png`, 끌어다 놓아 설치한 모드면 브라우저 안의 주소를 돌려줘요.
- `api.installed`: 끌어다 놓아 브라우저에 설치한 모드면 `true`예요.

### 파일 저장과 뒤로 가기 — `api.saveFile`, `api.onBack` (0.6.0)

- `api.saveFile('기록.json', text, 'application/json')`: 플레이어에게 파일을 줘요. PC 브라우저에서는 다운로드, 폰 앱에서는 `다운로드/WML` 폴더에 저장돼요.
  - `data`는 글자·`Blob`·`ArrayBuffer`예요. 실패하면 오류가 나는 Promise를 돌려줘요.
  - 이미 `<a download>` 링크(blob:·data: 주소)로 저장하는 모드도 폰 앱에서는 로더가 알아서 `다운로드/WML`로 보내요. 고칠 필요 없어요.
- `api.onBack(() => { …; return true; })`: 폰의 뒤로 가기 버튼이에요. 모드가 연 패널을 닫았으면 `true`를 돌려줘요.
  - 나중에 등록한 것부터 물어봐요. 아무도 처리하지 않으면 WML이 맨 위 창을 닫고, 그것도 없으면 플레이어 메뉴가 떠요.
  - 돌려받은 함수를 부르면 등록이 풀려요. WML 창(`api.ui.window`)과 확인 창은 등록하지 않아도 뒤로 가기로 닫혀요.

### 모드끼리 기능 주고받기 — `api.provide`, `api.use` (0.6.1)

부모 모드가 기능 묶음을 내주고, 자식 모드가 받아 써요.

```js
// 부모 (id: 'my-base')
api.provide({ hello: name => api.log(`${name}에게 인사했어요.`) });

// 자식: requires에 부모를 넣어야 부모가 먼저 준비돼요
WML.define({ id: 'my-child', requires: ['my-base'], setup(api) {
  api.use('my-base').hello('마라');
} });
```

- `api.use(id)`는 그 모드가 꺼져 있거나 아직 `api.provide`를 하지 않았으면 오류를 내요.
- 콘솔에서는 `WML.use(id)`로 볼 수 있어요.
- 실제 예: LLM 이야기 기반(`llm-core`)과 그 자식 모드 → [LLM.md](LLM.md)

### 비밀 값 — `api.secret` (0.6.1)

API 키 같은 값을 저장해요. 브라우저의 `wml.secret.<id>` 칸에 들어가고, "옮기기·백업" 파일에는 들어가지 않아요.

| 이름 | 뜻 |
|---|---|
| `api.secret.get()` | 저장된 값 (없으면 `''`) |
| `api.secret.set(value)` | 저장. 빈 값이면 지워요 |

---

## 4. 훅 — 게임 함수에 끼어들기

게임의 최상위 함수는 모두 바꿔 낄 수 있게 열려 있어요. `api.hook(name, spec)`으로 그 함수가 불릴 때 끼어들어요.

```js
const unhook = api.hook('imagePrompt', {
  before(args) { … },               // 부르기 전
  around(next, ...args) { … },      // 감싸기
  after(result, args) { … },        // 부른 뒤
  replace(...args) { … },           // 통째로 바꾸기 (한 모드만)
  priority: 0,                      // 클수록 먼저 (before/after), 안쪽 (around)
});
```

| 종류 | 받는 것 | 돌려주면 |
|---|---|---|
| `before(args)` | 인자 배열 | **배열** → 인자를 그걸로 바꿈 · `{ cancel: true, value }` → 원래 함수를 부르지 않고 `value`를 결과로 · 그 밖 → 그대로 진행 |
| `around(next, ...args)` | 다음 단계 함수와 인자 | 그 값이 결과. `next(...args)`를 부르지 않으면 원래 함수가 안 불려요. |
| `after(result, args)` | 결과와 인자 배열 | `undefined`가 **아닌** 값 → 결과를 그걸로 바꿈 |
| `replace(...args)` | 인자 | 원래 함수 대신 실행. **같은 함수를 두 모드가 replace하면 두 번째 모드가 오류**로 멈춰요. |

### 순서

- 같은 함수에 여러 모드가 끼어들면 **`priority`가 큰 것 먼저, 같으면 로드 순서대로** 돌아요.
- `before`/`after`는 그 순서대로 하나씩 돌아요. 앞 훅이 바꾼 결과를 뒤 훅이 받아요.
- `around`는 나중 것이 바깥쪽이에요 (먼저 등록된 것이 원래 함수에 가까워요).
- 다른 모드보다 먼저 결과를 고쳐야 하면 `priority: 10` 처럼 올려요.
  - 예: `image-look`이 프롬프트에 묶음을 넣고, 그다음에 `prompt-manager`가 규칙을 적용해요.

### 오류

- 훅 안에서 오류가 나면 그 훅만 건너뛰고 게임은 계속 돌아요. 오류는 콘솔에 남아요.
  - 같은 훅이 세 번 넘게 오류를 내면 그 뒤로는 경고 하나만 남아요.
  - `around`가 오류를 내면 `next`로 넘어가요.

### 걸 수 없는 것

- `const`로 선언된 값(상수·`const X = () => …`)은 훅을 걸 수 없어요.
  - `api.hook`이 "is a const and cannot be hooked" 오류를 내요.
  - MCP의 `game_source` 결과에 `hookable`로 나와요.
- 함수 **한가운데**에는 끼어들 수 없어요. 대신 이렇게 해요.
  - 결과에 필요한 정보가 있으면 `after`에서 결과를 고쳐요.
    - 예: 프롬프트 조립 함수는 `parts`를 돌려주므로, `after`에서 묶음을 더하고 프롬프트를 다시 만들어요 (`image-look`).
  - 그 함수가 부르는 **작은 함수**에 훅을 걸어요.
  - 정말 필요하면 `replace`로 함수 전체를 다시 써요. 다른 모드와 충돌하기 쉬우니 마지막 수단이에요.

### `api.engine.X = …` 직접 대입은 피하세요

- 직접 대입하면 그 함수에 걸린 다른 모드들의 훅이 사라질 수 있어요.
  - 이미 훅이 걸린 함수는 "훅 분배기"로 바뀌어 있는데, 대입하면 분배기가 통째로 덮여요.
- 옛 모드를 옮긴 코드에는 직접 대입이 남아 있기도 해요. 새로 만드는 모드는 `api.hook`을 쓰세요.

### 화면 부품(React 컴포넌트)에 훅 걸기

화면 부품도 함수라서 훅을 걸 수 있어요 → **7장**.

---

## 5. 게임 상태(state) 기초

`api.store.game()`이 돌려주는 객체에서 자주 쓰는 것들이에요. 전체 모양은 시험 화면에서 `play_eval`로 직접 보세요.

| 칸 | 뜻 |
|---|---|
| `day` | 며칠째 (1부터) |
| `slot` | 게임 시각 (분 단위로 계속 늘어나는 수) |
| `phase` | `prep`(영업 전) · `service`(영업 중) · `last_call` · `closed` · `bedroom`(밤) |
| `characters` | 등장인물 `{ id: 인물 }`. 주 아내는 `characters[primaryCharacterId]` (= `api.fn('wife')(state)`) |
| `primaryCharacterId` | 주 아내의 id |
| `player` | 플레이어 (`stats.energy`, `stats.mood`, `stats.arousal` …) |
| `customers` | 지금 가게에 있는 손님들 |
| `patronRecords` | 다녀간 손님 기록 |
| `economy` | `gold`, `debt`, `weeklyRent` |
| `supplies` | 물자 `food`, `beer`, `wine` |
| `tavernReputation` | `service`, `notoriety`, `renown` |
| `tavernCleanliness`, `readyFood` | 청결, 준비된 음식 |
| `log` | 이야기 창 줄 `[{ text, slot, … }]` |
| `pendingEvent` | 지금 떠 있는 사건(선택지). 있으면 대부분의 행동이 막혀요. |
| `activeScene` | 진행 중인 장면 `{ patron, sex, … }` |
| `mods` | 모드 자료 (`api.data`) |

인물(아내) 쪽에서 자주 쓰는 칸:
- 이름·상태: `name`, `stats`(`mood`, `arousal` …), `attributes`
- 옷: `outfit`, `exposure`
- 하는 일·장면: `currentTask`, `sceneOverride`, `intoxication.level`

### 상태를 바꾸는 규칙

- 원래 객체를 고치지 말고 **바뀐 부분만 새로 만든 객체**를 돌려줘요.
  - 게임이 바뀐 객체를 보고 화면을 다시 그려요.
- 인물을 바꿀 때는 도우미를 써요.
  - `api.fn('updateWife')(state, w => ({ ...w, … }))`
  - `api.fn('updateCharacter')(state, id, c => …)`

```js
api.store.update(s => api.fn('updateWife')(s, w => ({ ...w, stats: { ...w.stats, mood: Math.min(100, w.stats.mood + 10) } })));
```

---

## 6. 의미 이름(심볼 표)

게임 코드는 압축돼 있어서 함수 이름이 `_`, `r8`, `RDe`처럼 뜻이 없어요. 게임 버전이 바뀌면 이 이름도 모두 바뀌어요.

**심볼 표**는 이 압축 이름에 **뜻 있는 이름**(의미 이름)을 붙여 둔 표예요.
- 파일: `wml/symbols/<게임버전>.json` 과 `.js`
- 모드는 `api.fn('wife')`, `api.hook('imagePrompt', …)`처럼 의미 이름을 써요.
- 새 게임 버전이 나오면 `tools/port-symbols.mjs`가 같은 함수를 구조로 찾아 이름을 옮겨 줘요. 그래서 의미 이름만 쓴 모드는 손대지 않아도 돌아가요.

### 지금 있는 의미 이름 (2026-10-04)

| 이름 | 설명 |
|---|---|
| `store` | 게임 저장소: `getState().state` / `.dispatch(action)` (`api.store`가 감싸고 있어요) |
| `settingsStore` | 게임 설정 저장소 (근접 모드, 그림 생성 설정 등) |
| `React`, `jsx` | React 이름공간, JSX 실행기(`jsx.jsx` / `jsx.jsxs` / `jsx.Fragment`) |
| `ActionButton` | 행동 버튼 부품 `{label, time, description, onClick, primary, disabled}` |
| `ActionPanel` | 행동 패널 부품 |
| `wife(state)` | 주 아내 |
| `updateWife(state, fn)` / `updateCharacter(state, id, fn)` | 인물 바꾸기 |
| `log(state, text)` | 이야기 창에 한 줄 |
| `tick(state)` | 1분 진행 |
| `intoxLabel(level)` | 취기 단계 이름 |
| `playerId`, `wifeId` | 위치 표에서 플레이어·아내의 id |
| `locationOf(state, id)`, `wifeLocation(state)`, `playerLocation(state)` | 있는 곳 |
| `moveOccupant(state, id, room)` | 옮기기 |
| `patronScene(state)`, `playerSexScene(state)`, `setScene(state, slot, value)` | 장면 |
| `patronSceneLocation`, `isSexualStage` | 손님 장면 장소, 성행위 단계인지 |
| `sceneDef(id)`, `sceneOutfitState(scene)` | 장면 정의, 장면이 뜻하는 옷 상태 |
| `garmentWorn(outfit, exposure, part)`, `exposureSummary(char)` | 옷을 입고 있는지, 노출 요약 |
| `patronWatchChoices`, `patronChoice(state, choiceId)` | 손님 장면을 지켜볼 때의 선택지와 처리 |
| `startPlayerSex(state, type, id)`, `playerSexEvent` | 플레이어 장면 시작, 그 선택지 |
| `ensureHusbandLed`, `addJoinedPatron`, `joinSlots` | 여럿이 하는 장면 |
| `registerAlert`, `queueAlert`, `drainAlerts` | 알림 (`api.events`가 감싸고 있어요) |
| `imagePrompt(char, room, …)` | 그림 프롬프트 조립 → `{key, prompt, negativePrompt, parts, genParams}` |
| `imageKey(char, room, …)` | 그림 이름(키) |
| `imageKeyOf`, `imageDescriptor` | 그림 이름 만들기 단계 |
| `imageBackend()` | 게임이 찾아 둔 그림 서버 `{ baseUrl, comfyui, images, version, error }`. `baseUrl`이 있으면 서버가 있고, `comfyui`가 true면 그림을 그릴 수 있어요 (ComfyUI가 다른 컴퓨터에 있거나 NovelAI여도) |
| `imageBackendProbe({ mode, url, allowAutoProbe }, force)` | 그림 서버 찾기. 게임은 세션마다 한 번 찾고 기억해요. 서버를 나중에 켜거나 연결이 끊겼다 붙는 걸 따라가려면 `force: true`로 다시 찾아요. 설정은 `settingsStore`의 `imageBackendMode`·`imageBackendUrl` |
| `imageBackendForget()`, `imagePackReset()`, `imageAutoProbeAllowed()` | 찾아 둔 서버 잊기, 그림 목록 다시 읽게 비우기, 이 페이지가 서버를 저절로 찾아도 되는 곳인지 |
| `makeCustomer(slot, names, records, reputation, state)` | 손님 만들기 |
| `addCustomer(state, customer, room)` | 손님 들이기 |
| `carryToBed`, `talkToWife` | 행동 처리 함수 |
| `actionTimes` | 행동별 걸리는 분 `{ carry_to_bed: 10, wait: 5, … }` |
| `promptJoin`, `promptRoomFilter`, `promptGenParams` | 그림 태그 합치기(중복 빼기), 방에 안 맞는 태그 거르기, 태그로 생성 설정 정하기 |
| `outfitById(id)` | 옷 정의 (id나 별칭으로) |
| `wifePortraits` | 아내 선택 화면 초상화 표 `{ 짧은이름: 그림 주소 }`. 새 아내 모드는 키 하나를 더하면 돼요 |
| `saveSlotInfo(slot)`, `listDayStarts()`, `saveDayStart(state, day)` | 저장 칸 정보, 하루 시작 복원본 목록·저장 |
| `minuteTick`, `reduceGameAction`, `moveWife`, `addFeeling`, `evaluateIntimacy`, `endPatronInteraction` … | 손님 응대·관계 처리 함수들 (다른 제작자가 늘려 둔 이름 97개를 받아들였어요) |

최신 목록(170개)은 MCP `symbols_list`로 보세요.

그림 생성 요청(`/api/image/generate`)을 직접 보내는 모드는 `imageBackend().comfyui`가 true일 때만 보내고, 이미지 생성 도구에서 게임 중 생성을 꺼 뒀으면(`globalThis.__WW_STUDIO_OFFLINE_ONLY__ === true`) 보내지 마세요. 서버를 못 찾았다고 기본 주소(127.0.0.1:8189)로 보내면 안 돼요.

### 모드 전용 의미 이름 (모드 제작자는 이걸 쓰세요)

공용 표에 없는 함수가 필요하면 **모드 안에** 의미 이름을 넣어요. WML 쪽에 요청하고 다음 배포를 기다릴 필요가 없어요. (모드 로더 0.4.0부터)

```js
WML.define({
  id: 'badguest',
  name: 'Bad Guest',
  // mod symbols (tools/mod-symbols.mjs / MCP symbol_add keep this block; data only)
  symbols: {
    "addFeeling": {"raw":{"2026-10-04":"we"},"find":{"all":["triggeredAtSlot:"],"len":917,"any":[".shaped", …]},"doc":"감정·기억 추가"},
    "moveWife": {"raw":{"2026-10-04":"pt"},"find":{"all":[".skipModestyCheck"],"len":531,"any":[…]},"doc":"부인 이동"}
  },
  setup(api) {
    const addFeeling = api.fn('addFeeling');
    api.hook('moveWife', { after: (s) => s });
  },
});
```

- `raw`: 게임 버전마다 그 함수의 압축 이름이에요.
- `find`: 찾는 기준이에요. 그 함수에만 있는 코드 특징(속성 이름, 비교하는 id 글자, 숫자)으로 같은 함수를 다시 찾아요.
  - **직접 쓰지 마세요.** 도구가 만들고, 영어판·한글판에서 정확히 그 함수 하나만 찾는지 확인해요.
  - 화면 글자는 기준에 넣지 않아서 한글판에서도 똑같이 찾아요.
- `doc`: 설명이에요.
- `optional: true`: 못 찾아도 모드를 켜요. 그 이름을 쓰는 기능만 빠지니, 모드에서 `api.has('이름')`으로 확인하세요.
- `aliases: ["heroineMoveTo"]`: 같은 대상을 다른 이름으로도 불러요. 명령줄에서는 `moveWife|heroineMoveTo=pt`처럼 써요.
- 이 이름은 **그 모드 안에서만** 통해요. 공용 표와 같은 이름이면 그 모드 안에서는 모드 쪽이 우선이에요.
- 함수가 아닌 것(목록·표·상수)도 넣을 수 있어요. 도구가 알맞은 기준을 골라요.
  - 목록·표: 게임 코드에서 그 값을 만드는 줄의 모양(`decl`)으로 찾아요. 예: 옷 목록, 장소 이름 표
  - 숫자·글자 하나: 그 값 자체(`value`)로 찾아요. 같은 값이 여러 개면 찾는 기준 없이 `raw`만 기록해요.
  - 읽을 때는 함수와 같이 `api.fn('outfitList')`로 받아요. 훅은 함수에만 걸 수 있어요.
- 짧은 함수(한 줄짜리 포장 함수)는 특징이 적어서, "이 함수가 부르는 다른 함수"를 함께 기준(`refs`)으로 써요. 도구가 알아서 만들어요.

**넣는 법** (게임을 먼저 빌드해 두세요. 영어판·한글판 둘 다 있으면 둘 다 확인해요)
- MCP: `symbol_add { mod: "badguest", name: "addFeeling", raw: "we", doc: "감정·기억 추가" }`
  - 여러 개는 `items: [{ name, raw, doc }, …]`로 한 번에 넣어요.
- 명령줄: `node tools/mod-symbols.mjs --mod badguest --add "addFeeling=we,moveWife=pt" --doc "…"`
- 도구가 mod.js의 `symbols` 블록을 고쳐 써요. 이 블록은 자료만 두는 곳이라 코드를 넣으면 안 돼요.

**확인**: MCP `symbols_check { mod }` 또는 `--check`로 해요. `mod_check`도 같이 확인하고, 압축 이름을 그대로 쓰는 곳도 알려 줘요.

**게임이 업데이트되면**
- 로더가 `find`로 새 게임에서 같은 함수를 찾아서 브라우저에 기억해요.
- 못 찾으면 모드 관리자에 "이 게임에서 모드 전용 의미 이름 X를 찾지 못했어요"가 뜨고, 그 모드는 켜지지 않아요. 엉뚱한 함수에 붙어서 조용히 깨지는 것보다 나아요.
- 제작자는 새 버전으로 빌드한 뒤 `symbols_port { mod }`(또는 `--port`)로 새 이름을 mod.js에 기록해 배포하면 돼요. 그러면 플레이어 브라우저가 찾을 필요가 없어요.
- 10-04에서 만든 기준으로 9-30 게임을 찾아보니, 정답을 아는 함수 273개 중 272개를 찾았어요. 다른 함수를 잘못 잡은 건 0개였어요.

**공용 표로 올리기**: 여러 모드가 쓸 만한 이름이면 `symbols_request { mod }`(또는 `--request 파일.md`)로 요청서를 만들어 WML 쪽에 보내요. 압축 이름, 설명, 확인된 찾는 기준이 들어가요.

### 공용 표 늘리기 (WML 개발용)

1. 그 함수의 압축 이름을 찾아요.
   - 화면에 나오는 문장으로 찾기: MCP `game_find` (한글 문장은 `lang: "ko"`)
   - 내용 확인: `game_source`, 누가 부르는지: `game_refs`
2. MCP `symbol_add { name: "carryToBed", raw: "RDe", doc: "carry_to_bed action" }` 로 표에 올려요(`mod` 없이).
   - 손으로 고친다면 `symbols/<버전>.json` 의 `symbols` 에 `{ "name": "RDe", "kind": "function", "doc": "…" }` 를 넣어요.
   - 같은 내용이 `.js` 파일에도 들어가야 해요. `.js` 는 `file://`로 열 때 쓰는 사본이에요.
3. 모드에서 `api.hook('carryToBed', …)` 처럼 써요.

압축 이름을 바로 써도 동작은 해요. 하지만 게임 버전이 바뀌면 깨지니, 오래 쓸 모드라면 의미 이름을 붙여 두세요.

---

## 7. 게임 화면 다루기

게임 화면은 React로 그려져요. 모드가 화면을 바꾸는 방법은 세 가지예요.

### ① WML 부품 쓰기 (가장 쉬움)

- `api.ui.addButton`: WML 버튼 줄의 버튼
- `api.ui.window`: 움직이는 창
- `api.ui.settings`: 설정 창

게임 화면과 따로 놀아서 깨질 일이 없어요.

### ② 화면 부품에 훅 걸기 (게임 화면 안에 자연스럽게)

화면 부품도 함수예요. 부품 함수에 `around` 훅을 걸고, 원래 결과 옆에 React 요소를 하나 더 돌려줘요.

예: `leave-her-there`는 행동 버튼(`ActionButton`) 옆에 버튼을 하나 더 그려요.

```js
const RT = api.fn('jsx');                       // jsx.jsx / jsx.jsxs / jsx.Fragment
api.hook('ActionButton', {
  around(next, props, ...rest) {
    // 우리가 추가한 버튼은 표시를 떼고 그대로 그림
    if (props && props.__mine) { const { __mine, ...own } = props; return next(own, ...rest); }
    // 조건에 맞는 버튼일 때만
    if (!props || !props.primary || props.time !== api.fn('actionTimes').carry_to_bed) return next(props, ...rest);
    return RT.jsxs(RT.Fragment, { children: [
      next(props, ...rest),
      RT.jsx(api.fn('ActionButton'), { __mine: true, label: '새 버튼', onClick: () => api.store.dispatch({ type: '…' }) }, 'my-extra'),
    ] });
  },
});
```

**주의할 점**
- 부품 안에서 `next(...)`는 **매번 정확히 한 번** 불러요.
  - React 훅을 쓰는 부품을 두 번 부르거나, 조건에 따라 부르는 횟수가 바뀌면 React 오류가 나요.
  - 하나 더 그릴 때는 직접 부르지 말고 `RT.jsx(부품, props)`로 **새 요소**를 만들어요.
- 버튼을 찾을 때 화면 글자 대신 **글자가 아닌 값**(`time`, `primary` 같은 props)으로 찾으면 영어판·한글판 모두에서 돌아가요.

### ③ DOM 직접 고치기 (마지막 수단)

- `MutationObserver`로 화면을 지켜보다가 요소에 표시를 달거나, 스타일을 바꾸는 정도로만 써요.
  - 예: `layer-fix`, `brothel` 보정
- React가 그린 곳에 요소를 끼워 넣으면 다시 그릴 때 사라지거나 React 오류가 날 수 있어요.

### 모드 화면 요소 표시

- 모드가 만든 화면 요소 바깥에 `data-wml-ui` 속성을 달면 WML 도구 화면으로 취급돼요.
  - 자동 시험이 누르지 않고, 미번역 검사에서도 빠져요.
- 미번역 검사에서만 빼려면 `data-i18n-skip` 속성을 달아요.

### 오른쪽 위 헤더 버튼

- 게임 오른쪽 위에는 게임 버튼(☰ ↶ ♡ ?)과 WAYWORKS 창 메뉴가 있어요. 모드가 여기 고정 위치 버튼을 달면 겹치기 쉬워요.
- `layer-fix` 모드(창 겹침 보정, 1.1.0)가 켜져 있으면, 이 줄에 붙은 모드 버튼들을 게임 버튼 왼쪽에 한 줄로 늘어세워요(넓은 화면에서만).
- 새 모드는 가능하면 헤더 대신 WML 독 버튼(`api.ui.button`)이나 설정 창을 쓰세요.

### 화면 너비

- 게임은 창이 좁으면(데스크톱 기준 미만) 모바일 배치로 바뀌어요.
  - 데스크톱용 패널은 숨겨지고, 탭으로 나뉜 모바일 패널이 나와요.
- 부품 훅은 두 배치 모두에서 돌지만, DOM을 찾는 코드는 둘 다 시험해 보세요.

### 폰에서 (WML 플레이어)

- 게임이 `https://appassets.androidplatform.net/` 주소로 열려요. `location.protocol === 'file:'`로 "PC에서 파일로 열었는지" 가리는 코드는 폰에서 다르게 돌아요. 기기는 `api.host`로 가리세요.
  - 이때 게임은 그림 주소를 게임 공식 그림 서버로 만들어요. 플레이어가 그 요청을 가로채 그림 묶음에서 같은 그림을 줘요. 모드는 신경 쓰지 않아도 돼요.
- 폴더 고르기(`webkitdirectory`, `showDirectoryPicker`)는 안 돼요. 파일 여러 개 고르기(`<input type=file multiple>`)는 돼요.
- 끌어다 놓기·키보드·마우스 오른쪽 버튼이 없어요. 단축키만 있는 기능은 화면 버튼도 같이 주거나 `platform: 'pc'`를 적어요.
- 화면이 좁아요(가로 400~500px 안팎). WML 창은 폭 640px 아래에서 화면에 꽉 차게 열려요.
- 폰을 USB 디버깅으로 연결하면 PC 크롬의 `chrome://inspect`에서 플레이어의 웹뷰를 직접 볼 수 있어요(콘솔·요소 검사).

---

## 8. 번역과 모드 글자

- 게임 문장은 **빌드할 때** 번역돼요. 한글판(`Wayward_WML_ko.html`)의 게임 코드 안 문장은 이미 한글이에요.
- 모드의 글자는 `api.t({ ko: '…', en: '…' })`로 두 언어를 같이 적는 게 기본이에요.
- 한국어 조사는 화면에서 고를 수 있어요.
  - 이름 뒤에 `이(가)`, `은(는)`, `을(를)`, `와(과)`, `(으)로`처럼 둘 다 적으면 알맞은 쪽이 골라져요.
  - 예: `` `${name}이(가) 웃어요` ``
  - 새 영어 이름의 받침은 `i18n/ko/finals.js`에 적어요.

### ⚠ 게임 글자로 비교하지 마세요

- 한글판에서는 게임 코드 안의 글자 자체가 한글이에요.
  - 프롬프트 조립 결과의 `parts[].label`은 영어판에서 `"Base"`, 한글판에서 `"기본"`이에요.
- 그래서 `label === 'Base'` 같은 비교는 한쪽에서만 맞아요.
  - id·종류 같은 **번역되지 않는 값**으로 비교해요.
  - 꼭 글자로 비교해야 하면 두 언어를 모두 적어요: `['기본', 'Base'].includes(label)`.

### 미번역 확인

- 한글판에서 왼쪽 아래 🔤 버튼(`i18n-check` 모드)이 화면에 나온 영어를 모아 보여 줘요.
- 게임 문장 번역을 고칠 때는 `i18n/ko/custom.json`을 고치고 다시 빌드해요.
  - MCP `i18n_lookup` / `i18n_set` + `build`
  - 자세한 내용은 `wml/README.md` 4장을 보세요.

---

## 9. 저장 · 다른 모드와 함께 쓰기 · 새 게임 버전

### 무엇을 어디에 저장할까

| 저장할 것 | 쓸 곳 |
|---|---|
| 그 세이브에 딸린 진행 상황 (모드 안 돈, 관계, 수치) | `api.data` (세이브와 같이 다님) |
| 플레이어 취향 (켜기/끄기, 숫자 설정) | `api.settings` (`wml.mod.<id>`) |
| 꼭 `localStorage`를 직접 써야 한다면 | 키를 `<모드id>.` 로 시작하게 |

- 두 모드가 같은 저장 키를 쓰면 설정이 섞여요.
  - 실제 사례: 노예관과 창관이 같은 칸을 써서, 창관 설정을 노예관이 읽다가 깨졌어요.
- MCP `mod_check`가 다른 모드와 겹치는 저장 키를 알려 줘요.

### 다른 모드와 함께

- 순서가 중요하면 `loadAfter`, 꼭 필요하면 `requires`, 같이 못 쓰면 `conflicts`, 같은 일을 하는 다른 모드가 있으면 `role`을 적어요.
- 같은 함수에 여럿이 훅을 걸어도 돼요. 순서는 4장을 보세요.
  - `replace`만은 한 모드만 할 수 있어요.
- 옛 9-30 한글판 이름으로 게임 값을 읽는 옮긴 모드들은 `addon-compat` 모드의 `globalThis.__WML_LEGACY__`를 써요.
  - `name(옛이름)` → 지금 이름, `get(옛이름)` → 지금 값
  - 새 모드는 의미 이름을 쓰세요.

### 새 게임 버전이 나오면

1. 개발자 새 판을 `wayward-YYYY-MM-DD.html`로 넣어요.
2. `tools/port-symbols.mjs`로 심볼 표를 옮겨요.
3. 빌드해요.
   - 순서는 `wml/README.md`의 "새 버전" 장을 따라요.
4. 의미 이름만 쓴 모드는 그대로 돌아가요.
   - 공용 표의 이름은 `port-symbols`가 새 버전으로 옮겨요.
   - 모드 전용 이름은 로더가 찾는 기준(`find`)으로 새 버전에서 다시 찾아요. 모드 제작자는 `symbols_port`로 새 이름을 기록해 배포하면 돼요.
5. 압축 이름을 바로 쓴 곳은 MCP `names_map`으로 새 이름을 찾아 고쳐요.
6. 모드의 `game` 필드를 새 버전에 맞게 고쳐요.
7. 옮긴 모드(머리말에 "이 파일은 tools/….mjs 로 만들었어요")는 `node tools/port-regen.mjs --all`로 다시 만들고 `--check`로 확인해요.

### 저장 공간과 압축 세이브

- 브라우저 저장 공간(localStorage)은 약 5MB예요. 모드 관리자의 "저장 공간"에서 무엇이 큰지 볼 수 있어요.
- `save-compress` 모드는 큰 저장 칸을 압축해요(값이 `wwlz1`로 시작). 모드 로더 0.5.0부터는 로더가 `localStorage.getItem`에서 늘 풀어 주기 때문에, 그 모드를 꺼도 세이브를 그대로 읽어요.
  - 저장된 글자 그대로가 필요하면(크기 재기 등) `WML.rawGetItem(key)`를 써요.
- 모드 관리자의 "옮기기·백업"은 세이브·게임 설정·모드 설정(`wml.*`, 모드 이름이 든 키)·브라우저에 설치한 모드를 파일 하나(`wml-state-….json`)로 내보내고 가져와요. (0.6.0)
  - 코드에서는 `await WML.exportState({ saves, game, mods, other, installed })`(빼려면 `false`), `WML.importState(obj).done`.
  - 모드 설정을 `api.settings`(→ `wml.mod.<id>`)에 두면 저절로 같이 옮겨져요. 직접 localStorage 키를 만든다면 키 이름에 모드 id를 넣어 주세요.

---

## 10. 예제

### 예제 1 — 버튼 + 새 행동 + 세이브 자료

```js
WML.define({
  id: 'tip-jar', name: '팁 항아리', version: '1.0.0', game: '>=2026-10-04',
  setup(api) {
    api.actions.register('tip-jar/empty', state => {
      const jar = (state.mods && state.mods['tip-jar']) || { coins: 0, emptied: 0 };
      const next = { ...state,
        economy: { ...state.economy, gold: state.economy.gold + jar.coins },
        mods: { ...(state.mods || {}), 'tip-jar': { coins: 0, emptied: jar.emptied + 1 } } };
      return api.fn('log')(next, api.t({ ko: `팁 항아리를 비워 ${jar.coins}골드를 챙겼어요.`, en: `You empty the tip jar: ${jar.coins} gold.` }));
    });
    // 손님이 들어올 때마다 항아리에 1골드
    api.hook('addCustomer', {
      after(state) {
        const jar = (state.mods && state.mods['tip-jar']) || { coins: 0, emptied: 0 };
        return { ...state, mods: { ...(state.mods || {}), 'tip-jar': { ...jar, coins: jar.coins + 1 } } };
      },
    });
    api.ui.addButton({ label: '🫙', title: '팁 항아리 비우기', onClick: () => api.store.dispatch({ type: 'tip-jar/empty' }) });
  },
});
```

> `addCustomer` 훅의 `after`는 바뀐 state를 돌려주면 그게 결과가 돼요.
> 상태를 돌려주는 함수에 건 `after`에서 state를 고치면, 게임의 다른 처리와 같은 흐름 안에서 바뀌어요.

### 예제 2 — 매일 아침 알림

```js
setup(api) {
  const kind = api.events.onAlert('morning', (s, choice) =>
    choice === 'rest' ? api.fn('updateWife')(s, w => ({ ...w, stats: { ...w.stats, mood: Math.min(100, w.stats.mood + 5) } })) : s);
  let lastDay = null;
  api.store.subscribe(() => {
    const s = api.store.game();
    if (!s || s.day === lastDay) return;
    const first = lastDay === null;
    lastDay = s.day;
    if (first) return;                                      // 불러온 직후는 건너뜀
    api.store.update(st => api.events.alert(st, {
      kind, title: api.t({ ko: '아침', en: 'Morning' }), body: api.t({ ko: `${s.day}일째 아침이에요.`, en: `Day ${s.day}.` }),
      choices: [{ id: 'rest', label: api.t({ ko: '잠깐 쉬게 한다', en: 'Let her rest' }) }, { id: 'go', label: api.t({ ko: '바로 일한다', en: 'Get to work' }) }],
    }));
  });
}
```

### 예제 3 — 그림 프롬프트에 태그 더하기

```js
api.hook('imagePrompt', {
  after(result, [char, room]) {
    if (!result || !Array.isArray(result.parts) || room !== 'bedroom') return result;
    const parts = [...result.parts, { label: api.t({ ko: '분위기', en: 'Mood' }), tags: 'candlelight, warm tones' }];
    return { ...result, parts, prompt: `${result.prompt}, candlelight, warm tones` };
  },
});
```

- 실제 모드(`image-look`)는 게임과 같은 방식으로 프롬프트를 다시 조립하고 그림 이름(`imageKey`)도 바꿔요.
  - 그림 이름이 같으면 이미 있는 그림이 다시 쓰여요. 다른 그림을 만들려면 그림 이름도 바꿔야 해요.

### 예제 4 — 설정 창이 있는 모드

`wml/mods/hello-wml/mod.js`를 보세요. 행동·알림·훅·버튼·설정 창이 한 파일에 다 들어 있어요.

### 예제 5 — 게임 버튼 옆에 버튼 더하기

`wml/mods/leave-her-there/mod.js`를 보세요 (7장 ②).

---

## 11. 시험과 디버깅

### 브라우저 콘솔

```js
localStorage.setItem('wml.dev', 'true');   // 한 번 하고 새로고침
WML.dev().store.game()                     // 지금 상태
WML.dev().fn('wife')(WML.dev().store.game())
WML.dev().hooks                            // 훅이 걸린 함수들
WML.status()                               // 로드된 모드, 실패, 경고, 순서 메모
WML.storage()                              // 로컬 스토리지 사용량 (글자 수, 한도 약 524만 자)
```

- `WML.dev()`는 `api`와 같은 객체예요 (id가 `dev`).
- 모드 관리자(`WML` 버튼)의 "알림" 칸에 실패 이유와 경고가 나와요.
- 모드 관리자 아래쪽 "저장 공간"에서 로컬 스토리지(약 5MB)를 얼마나 쓰는지, 무엇이 큰지 볼 수 있어요.
  - 게임 세이브와 같은 공간이라, 모드는 `localStorage`에 꼭 필요한 것만 저장해 주세요.

### MCP로 시험하기 ([MCP.md](MCP.md))

| 도구 | 하는 일 |
|---|---|
| `mod_check` | 실행 없이 검사 |
| `play_start` | 보이지 않는 브라우저로 게임을 켬. 켤 모드를 고를 수 있고, 매번 빈 저장소에서 시작해요. |
| `play_eval` | 그 화면에서 코드를 실행 |
| `play_auto` | 무작위로 눌러서 여러 날 진행. 새로 생긴 오류를 스택과 함께 보여 줘요. |
| `play_screenshot` | 화면 사진 |
| `play_reload` | 모드를 고친 뒤 다시 불러오기 |

- 시험 중에는 그림 생성 요청과 바깥 연결이 모두 막혀요.
- **창 너비**: 시험 화면은 기본 1500×950이에요. 좁게 시험하려면 `play_start`에 `width`를 주세요.

---

## 12. 자주 하는 실수

| 실수 | 바르게 |
|---|---|
| `state.economy.gold += 10` 처럼 상태를 직접 고침 | 새 객체를 만들어 `api.store.update`로 |
| `id`와 폴더 이름이 다름 | 같게 (로더는 폴더 이름으로 읽어요) |
| `mods.js`에 안 넣음 | 목록에 넣어야 로드돼요 (MCP `mods_order`) |
| `const`에 훅을 검 | 그 값을 쓰는 함수에 걸거나, 값 자체를 읽어서 사용 |
| 압축 이름을 그대로 씀 | 모드 전용 의미 이름을 붙여서 사용 (`symbol_add { mod }`) |
| 1분마다 불리는 함수(`tick`)에서 무거운 일 | 날이 바뀔 때만 하거나 결과를 기억해 두기 |
| 게임 글자로 비교 (`label === 'Base'`) | id로 비교, 아니면 두 언어 다 |
| 다른 모드와 같은 `localStorage` 키 | `<모드id>.` 로 시작하는 키, 또는 `api.settings` |
| `api.engine.X = 새함수` | `api.hook(X, { replace })` 또는 `around` |
| React 부품 훅에서 `next`를 조건에 따라 0번/2번 부름 | 항상 한 번 부르고, 추가 요소는 `jsx`로 만들기 |
| 게임 시작 전 `api.store.game()`이 `null`인 걸 잊음 | `const s = api.store.game(); if (!s) return;` |

---

## 13. 옛 모드 옮기기

9-30 한글판(옛 모드 관리자)용 모드는 모양에 따라 도구가 있어요.

| 옛 모드 모양 | 도구 |
|---|---|
| 모드 관리자용 애드온 (`__WAYWARD_ADDON_API__`) | `tools/wrap-addon.mjs` (MCP `port_wrap_addon`) |
| 혼자 도는 스크립트 | `wrap-addon.mjs --standalone` |
| 게임 모듈 안에 붙여 넣던 코드 | `tools/port-inline.mjs` (MCP `port_inline`, `report`로 애매한 이름 확인) |

- 원본은 고치지 않고, 바꿀 곳은 `port/<id>.fixes.json`에, 보정 코드는 `port/<id>.prelude.js` / `.post.js`에 둬요.
- 자세한 옵션은 `wml/README.md`의 "9-30 한글판용 모드를 옮기는 도구"를 보세요.
- 지금까지 옮긴 모드(`wml/mods/*`)가 모두 예제예요.
