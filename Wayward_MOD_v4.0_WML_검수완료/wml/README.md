# WML — Wayward Mod Loader

영문 바닐라 게임 파일은 **건드리지 않고**, 그 위에 모드와 번역을 얹어서 실행 파일을 만들어 주는 틀이에요.
새 버전이 나와도 같은 순서(심볼 이식 → 빌드 → 미번역분 채우기)만 돌리면 돼요.

```
en-wayward-game/
├─ wayward-2026-10-04.html      ← 개발자가 배포한 영문 원본 (수정 금지, 없어도 됨 ↓)
├─ Wayward_WML.html             ← 빌드 결과 (영문 + 모드). 원본을 그대로 품고 있어서 원본 대신 입력으로 쓸 수 있음
├─ Wayward_WML_ko.html          ← 빌드 결과 (한글 + 모드)
└─ wml/
   ├─ runtime/wml-core.js       모드 로더 본체 (게임 전에 실행)
   ├─ symbols/<버전>.json/.js   "의미 이름 → 그 버전의 압축된 이름" 표 (store → ae, wife → _ …)
   ├─ mods/mods.js              켤 모드 목록
   ├─ mods/<모드id>/mod.js      모드 하나 = 폴더 하나
   ├─ i18n/ko/                  한국어 팩 (strings.json, custom.json, runtime.js …)
   ├─ tools/                    빌드·이식·번역 도구 (node)
   ├─ mcp/                      모드 제작용 MCP 서버 원본 (개발 폴더에만 있음 — node mcp/pack.mjs 로 따로 쓰는 배포판 wml-mcp 를 묶어요)
   ├─ player/                   폰 앱(WML 플레이어) 원본과 모바일로_묶기.cmd 원본 (개발 폴더에만 있음 — 아래 "폰 앱")
   └─ docs/                     SDK.md (모드 SDK 설명서), MCP.md (MCP 연결·도구 설명서)
```

> **모드를 만들 거라면** [docs/SDK.md](docs/SDK.md) 를 먼저 보세요. AI와 같이 만들려면 MCP 배포판(`wml-mcp`)을 받아 [docs/MCP.md](docs/MCP.md) 대로 연결하세요.

## 1. 빌드

처음 한 번: `wml` 폴더에서 `npm install`

```bash
node tools/build.mjs            # 영문  → Wayward_WML.html
node tools/build.mjs --lang ko  # 한글  → Wayward_WML_ko.html
```

- `--game <파일>`: 다른 버전 원본을 지정해요(기본은 폴더에서 가장 최신 `wayward-YYYY-MM-DD.html`, 없으면 `Wayward_WML.html`).
- 영문 빌드(`Wayward_WML.html`)는 도구가 읽을 때 원본으로 정확히 되돌려요(바이트 단위 동일). 그래서 배포본에는
  원본을 넣지 않아도 다시 빌드·이식이 돼요. 번역된 빌드는 되돌릴 수 없어서 입력으로 쓰면 거부해요.
- `--style plain`: 한글 서술을 한다체로 만들어요(있는 문장만, 기본은 합니다체).
- 결과 HTML은 `wml/` 폴더와 이미지 팩(`images*.js`, `images/`) 옆에 있어야 해요.

게임 코드에서 바뀌는 곳은 **마지막 render 한 줄**뿐이에요. 그 줄을 감싸서 (1) 모든 최상위 함수/변수를 모드가 읽고
바꿀 수 있게 꺼내 주고(브리지), (2) 첫 화면이 그려지기 전에 모드를 실행해요. 나머지는 전부 별도 `<script>` 파일이에요.

### 폰 앱 (WML 플레이어, 안드로이드)

```bash
node player/build.mjs [--out <폴더>]   # → player/build/wml-player-<버전>.apk
```

- 안드로이드 스튜디오 없이 SDK의 빌드 도구(aapt2·aapt·d8·zipalign·apksigner)와 JDK로 만들어요. SDK 위치는 `ANDROID_HOME` 또는 `%LOCALAPPDATA%AndroidSdk`.
- 서명 키는 처음 빌드할 때 `../player-keys/`(wml 바깥, 배포판에 안 들어감)에 생겨요. **꼭 백업**하세요. 다른 키로 서명한 앱은 깔린 앱을 업데이트하지 못해서, 앱을 지우고 다시 깔아야 하고 폰의 세이브가 날아가요.
- 앱 버전은 `player/src/wml/player/MainActivity.java`의 `VERSION` 한 곳에서 정해요. `node tools/pack-release.mjs`가 APK를 같이 만들어 배포 폴더에 넣어요(SDK가 없으면 건너뜀).
- 앱은 게임 묶음(tar/zip, 앱 안으로 풀어 넣음)과 그림 묶음(tar/zip, 풀지 않고 그 자리에서 읽음)을 `https://appassets.androidplatform.net/`에서 보여 줘요. 게임 공식 그림 서버(`art.sintention.com/images/…`)로 가는 요청도 그림 묶음에 같은 그림이 있으면 거기서 줘요.
- 페이지 쪽 다리는 `window.WMLHost`(`status`, `pickGame`, `pickImages`, `start`, `menu`, `saveFile`, `takePendingState` …)예요. 로더는 `WML.host`·`WML.back()`·`WML.saveFile()`로 감싸 써요.
- `player/pack-for-mobile.cmd`가 게임 패키지에 `모바일로_묶기.cmd`(한글판)·`pack-for-mobile.cmd`(영문판)로 들어가요. 파일 이름이 한글이면 한국어로 안내해요(모드목록 cmd와 같은 방식).
- 폰 시험: 폰을 USB 디버깅으로 연결하고 `adb install -r`, 묶음은 `adb push` 로 `/sdcard/Android/data/wml.player/files/`에 넣으면 앱의 "앱 폴더에 있는 묶음"에 나와요. 웹뷰는 PC 크롬 `chrome://inspect`나 `adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>`로 볼 수 있어요.

## 2. 새 게임 버전이 나왔을 때

1. 새 원본을 `wayward-YYYY-MM-DD.html` 이름으로 이 폴더에 둬요. (이전 버전 원본이 없으면 아래 `--from`에 `../Wayward_WML.html`)
2. 심볼 표 이식:
   ```bash
   node tools/port-symbols.mjs --from ../wayward-2026-10-04.html --symbols symbols/2026-10-04.json --to ../wayward-새날짜.html
   ```
   함수 모양(구조)으로 찾아가기 때문에 압축 이름이 바뀌어도 따라가요. `CHECK`/`UNMATCHED`/`DUPLICATE`가 나오면 그 항목만
   `symbols/2026-10-04.json`의 `find` 패턴을 보강하면 돼요.
3. `node tools/build.mjs` 와 `node tools/build.mjs --lang ko` (영문 빌드도 새 버전으로 갱신해 둬야 다음 업데이트 때 원본 대신 쓰여요)
   - 바뀌지 않은 문장은 그대로 번역돼요. 새로 생긴 문장은 `i18n/ko/todo-<새날짜>.json`에 `{"영어": ""}`로 나와요.
4. todo 파일의 빈칸을 채우고 → `node tools/i18n-merge.mjs --lang ko i18n/ko/todo-<새날짜>.json` → 다시 빌드.
5. 모드: `game: '>=2026-10-04'`처럼 범위를 적어 두면, 범위 밖 버전에서는 꺼지고 경고가 떠요.

## 3. 모드 만들기

`mods/<id>/mod.js` 하나와 `mods/mods.js` 목록에 id 한 줄이면 끝이에요. (예제: `mods/hello-wml/mod.js`)
전체 API·훅 규칙·예제·주의할 점은 **[docs/SDK.md](docs/SDK.md)** 에 있어요. 아래는 요약이에요.

```js
WML.define({
  id: 'my-mod',
  name: '내 모드',
  version: '1.0.0',
  game: '>=2026-10-04',          // 맞는 게임 버전 (>=, <=, >, <, = 와 공백으로 여러 개)
  requires: [], loadAfter: [], loadBefore: [], conflicts: [],
  description: '설명',

  setup(api) {
    // 게임 함수에 끼어들기 — 게임 내부에서 부르는 호출에도 전부 적용돼요
    api.hook('imagePrompt', {
      after(result, args) { /* result 고쳐서 */ return result; },
    });
  },
});
```

### api 한눈에 보기

| 이름 | 하는 일 |
|---|---|
| `api.hook(이름, {before, around, after, replace, priority})` | 게임 함수 가로채기. `before(args)` → 새 args 배열 또는 `{cancel:true, value}`, `around(next, ...args)`, `after(result, args)` → 새 결과. `replace`는 한 모드만(충돌 시 에러). 반환값을 부르면 해제 |
| `api.fn(이름)` | 게임 함수/값 가져오기 (`api.fn('log')(state, '문장')`) |
| `api.sym(이름)` / `api.has(이름)` | 의미 이름 → 압축 이름 / 있는지 확인 |
| `api.engine` | 모든 최상위 바인딩 (압축 이름 그대로 — 버전마다 바뀌니 가급적 심볼 표를 쓰세요) |
| `api.store.game()` / `update(s => s)` / `dispatch(action)` / `subscribe(fn)` | 게임 상태 읽기·바꾸기 |
| `api.data.get()` / `set(v 또는 old => new)` | 이 모드 전용 저장 데이터 (`state.mods[id]`, 세이브에 같이 저장) |
| `api.log(문장)` | 이야기 로그에 한 줄 |
| `api.events.onAlert(kind, (state, choiceId) => state)` | 선택지 알림 처리기 등록 (kind는 자동으로 `모드id:kind`) |
| `api.events.alert(state, {kind, title, body, choices})` | 선택지 알림 띄우기 → state 반환 |
| `api.actions.register(type, (state, action) => state)` | 새 액션 (`api.store.dispatch({type})`로 실행) |
| `api.ui.addButton({label, title, onClick})` | 왼쪽 아래 WML 막대에 버튼 |
| `api.ui.window({id, title, width, height, render(body, win)})` | 끌어서 옮기고 크기를 바꿀 수 있는 창. 위치·크기 기억. 같은 id면 앞으로 가져옴. `win.refresh()`, `win.close()`, `win.setTitle()` |
| `api.ui.settings(render(body, win))` | 모드 관리자의 ⚙ 버튼으로 여는 이 모드의 설정 창 |
| `api.ui.h(tag, props, ...children)`, `api.ui.button(label, onClick, {primary})` | 창 안을 만드는 작은 도우미 (WML 창과 같은 모양) |
| `api.settings.get(기본값)` / `set({...})` | 브라우저에 저장되는 이 모드의 설정 (세이브와 따로) |
| `api.lang`, `api.t({en, ko})` | 현재 빌드 언어 / 언어별 문구 고르기 |
| `api.warn(문장)` | WML 패널에 경고 표시 |

쓸 수 있는 의미 이름은 `symbols/<버전>.json`에 설명과 함께 있어요(store, wife, updateWife, log, tick, imagePrompt,
setScene, patronChoice, registerAlert, queueAlert …). 필요한 함수가 표에 없으면 표에 추가하고 `find` 패턴을 붙여 두면
다음 버전에서도 자동으로 찾아가요.

### 켜고 끄기, 로드 순서

- `mods/mods.js`의 목록이 기본 순서예요. `"id:off"`로 적으면 목록에는 보이지만 기본으로 꺼져 있어요.
- 게임 안 왼쪽 아래 **WML** 버튼 → **모드 관리자 창**:
  - 표에서 체크로 켜고 끄기, ⠿를 끌거나 ↑↓로 **로드 순서** 바꾸기, ⚙로 모드 설정 창 열기
  - 상태: 작동 중 / 꺼짐 / 오류(이유 표시) / 버전 확인 / 새로고침 필요
  - 모드의 `requires`·`loadAfter`·`loadBefore`가 순서와 어긋나면 자동으로 맞추고 "↳ … 그 뒤로 옮겼어요"로 알려 줘요.
    `requires`의 모드가 꺼져 있으면 그 모드는 실행되지 않고 오류로 표시돼요. `conflicts`끼리는 같이 켜지지 않아요.
  - **mods.js로 복사**: 지금 순서와 켜짐 상태를 mods.js 내용으로 복사 (배포할 때 기본값으로 쓰기)
  - 바꾼 내용은 브라우저에 저장되고, **새로고침해서 적용**을 누르면 반영돼요.
- 같은 함수에 여러 모드가 끼어들면 **로드 순서대로** 실행돼요(나중에 로드된 모드가 바깥쪽). 순서가 중요하면 `loadAfter`를 적어 두세요.
- 콘솔에서: `localStorage.setItem('wml.dev','true')` 후 새로고침 → `WML.dev()`로 상태/엔진 확인.

### 기존 모드 옮겨 오기 요령

| 기존 방식 | WML에서는 |
|---|---|
| HTML 안의 함수를 직접 고쳐 씀 | 그 함수를 심볼 표에 올리고 `api.hook(...)`의 `around`/`after`로 같은 동작 |
| 함수 전체를 갈아 끼움 | `replace` (같은 함수를 둘이 갈아 끼우면 로더가 충돌을 알려 줌) |
| 새 알림/선택지 | `api.events.onAlert` + `api.events.alert` |
| 새 버튼·행동 | `api.actions.register` + 게임 UI 훅 또는 `api.ui.addButton` |
| 전역 변수에 저장 | `api.data` (세이브와 함께 다님) |
| 영어/한글판 따로 배포 | 한 파일에서 `api.t({en, ko})` |

#### 9-30 한글판용 모드를 옮기는 도구 (`tools/`, `port/`)

| 옛 모드 모양 | 도구 | 하는 일 |
|---|---|---|
| 모드 관리자용 애드온 (`__WAYWARD_ADDON_API__` 사용) | `wrap-addon.mjs` | 원본 코드를 그대로 `setup()` 안에서 실행. 게임 함수 연결은 `addon-compat`이 해 줌 |
| 브리지 없이 혼자 도는 스크립트 | `wrap-addon.mjs --standalone` | 위와 같지만 `addon-compat`을 요구하지 않음 |
| 게임 모듈 안에 끼워 넣던 코드 (압축 이름 직접 사용) | `port-inline.mjs` | 옛 게임 이름을 찾아 지금 게임 이름(`__E.이름`)으로 바꿈. `--report`로 애매한 짝 확인 |
| 모드 매니저 매니페스트가 딸린 애드온 (`bridge.manifest.json`의 find/replace 패치) | `port-manifest.mjs` | 패치를 게임 사본에 적용해 **바뀌는 게임 함수만** 뽑아, 게임 이름이 보이는 자리에서 다시 만들어 `api.hook(…, { replace })`로 끼움. 게임 파일은 안 고침 |

- 공통 옵션: `--fixes port/<id>.fixes.json` — `[["원문 그대로", "바꿀 글자"], …]` 를 원본에 적용(한 번만 맞아야 함,
  세 번째 칸에 `"all"`을 적으면 전부). `--prelude`/`--post` — 원본 앞/뒤에 붙일 보정 코드. `--requires`, `--after`, `--conflicts`.
- 옮긴 모드마다 만드는 명령이 `port/regen.json`에 있어요. 고친 뒤 `node tools/port-regen.mjs <id>`(전부는 `--all`)로 다시 만들고,
  `--check`로 지금 파일이 기록대로 나오는지(손으로 고친 곳이 없는지) 확인해요.
- `port-manifest.mjs --dir <애드온 폴더>`: 매니페스트의 패치마다 이 게임에 꼭 한 번 맞는 변형을 골라요. 패치가 모듈 맨 위에 더하는
  코드는 그 자리에서 쓸 수 있는 새 이름이 되거나(`const …`) setup 때 한 번 실행돼요. 패치 글자가 그 게임판 코드라서 만든 모드도
  그 판 전용이에요 — 게임이 올라가면 다시 만들어야 하고, 다른 판에서는 모드가 알리고 아무것도 하지 않아요.
  바꾸는 것이 게임 상수(`const`)면 WML이 바꿀 수 없어서 도구가 멈춰요. (예: `prompt-manager` = 패치 54군데 → 함수 8개)
- `port-inline.mjs`의 이름 짝이 틀렸으면 `--map-overrides port/<id>.overrides.json` 에 `{"옛이름": "새이름"}`.
  지금 게임에 없는 한글판 전용 함수는 `"옛이름": "local:대신쓸이름"` 으로 `--prelude`에 만든 것을 쓰게 할 수 있어요.
- 옛 모드가 게임 함수 한가운데에 한 줄 끼워 넣던 것은, 그 함수가 돌려주는 값을 `after` 훅에서 고치는 식으로 옮겨요
  (예: `prompt-manager`, `image-look`은 그림 프롬프트 조립 함수의 결과를 고침).
- 다른 옮긴 모드가 옛 이름으로 게임 값을 읽을 때는 `globalThis.__WML_LEGACY__` (`name(옛이름)`, `get(옛이름)`)를 써요.
  이름 표는 `port/addon-compat.post.js` 의 `MAPS`에 게임 버전별로 있어요.

## 4. 번역 (i18n)

번역은 **빌드할 때** 게임 코드의 영어 문장(문자열·템플릿)을 표대로 바꿔 넣는 방식이에요. 그래서 게임 실행 중에
번역 표를 들고 다니지 않고, 파일 크기도 원본과 거의 같아요(한글판 약 3.7MB).

| 파일 | 내용 |
|---|---|
| `i18n/ko/strings.json` | 기본 번역표 `{"영어": "한글"}` + 위치별 예외(contexts/extra) + 한다체(plain). 처음엔 기존 한글판에서 자동 추출 |
| `i18n/ko/custom.json` | **사람이 고치는 곳.** strings.json보다 우선. 사용법은 파일 맨 위 `_readme` 참고 |
| `i18n/ko/todo-<버전>.json` | 빌드 때마다 생성: 아직 번역 없는 문장 목록 |
| `i18n/ko/runtime.js` | 화면에서 조사 고르기 + display/words 치환 |
| `i18n/ko/display.js` | 빌드가 생성. 게임이 id를 그대로 찍는 곳("sex" → 성관계)을 게임 데이터의 `{id, name}` 쌍에서 자동으로 만들고, custom.json의 display/words를 더함 |
| `i18n/ko/finals.js` | 영어 이름의 받침 표 (Aldric→이, Pippa→가) — 이름 추가 가능 |
| `i18n/ko/voice.json` | 손님 말투: 손님 대사를 반말·존댓말·하게체·하오체로 바꾼 문장과, 그 대사가 나오는 자리(152곳). `tools/i18n-voice.mjs`가 만듦 |
| `i18n/ko/voice.js` | 빌드가 voice.json에서 생성. 화면에 낼 때 `runtime.js`가 말하는 손님에 맞는 말투를 골라요 |
| `mods/i18n-check` | 🔤 버튼: 플레이 중 화면에 나온 영어를 모아 보여 줌 (번역 확인용) |

규칙:
- `{0}`, `{1}` = 게임이 채워 넣는 부분. 한국어 어순에 맞게 옮겨도 돼요. `{p}`, `{w}`, `%w` 같은 게임 토큰은 그대로.
- 이름·숫자 뒤 조사는 `이(가)`, `은(는)`, `을(를)`, `와(과)`, `(으)로`로 적으면 화면에서 알맞게 골라져요.
- 코드가 비교에 쓰는 단어(예: 상태 id)는 자동으로 보호돼서, 번역 때문에 게임 로직이 깨지지 않아요.
- 바뀐 결과는 빌드 보고서(`translated`, `uniqueMissing`, `coverage`)로 확인해요.
- 게임이 **id를 그대로 화면에 찍는 곳**(감정 devotion, 하는 일 bathing, 요일 monday …)은 문장 표로는 못 잡아요.
  `custom.json`의 `labels`(종류별 id→한글)에 넣으면 화면 글자 전체든 문장 속 단어든 바뀌어요.
  id에 번호나 이름이 붙어 나오면(`moment contradiction 12 16975 오스릭`) `patterns`에 [정규식, 바꿀 글자]로 적어요.
  `node tools/i18n-ids.mjs --lang ko --verbose` 가 화면에 찍히는 id 목록과 빠진 것(`todo-ids-<버전>.json`)을 알려 줘요.
- `{0}` 자리에 영어 문법 조각만 들어가는 경우(a/an, 복수 s, is/are)는 번역할 때 자동으로 빠져요(`grammarDropped`).
- 플레이 테스트는 🔤 버튼(`i18n-check` 모드)으로: 화면에 나온 영어를 모아서 복사할 수 있어요.
  일부러 영어를 같이 쓰는 도구 창(예: 치트 장부)은 바깥 요소에 `data-i18n-skip` 속성을 달면 목록에서 빠져요.

기존 번역 빌드에서 번역표를 처음 뽑을 때(같은 게임 버전 기준):

```bash
node tools/i18n-seed.mjs --en ../wayward-2026-10-04.html --tr ../Wayward_MOD_v3.41.html --lang ko
```

다른 압축 빌드여도 함수 구조로 짝을 맞추고, 그 안의 문장을 순서대로 맞춰서 영어↔한글 쌍을 만들어요. 치트·추가
기능 코드는 가져오지 않고 문장만 가져와요. (`custom.json`은 건드리지 않아요.)
`--out <폴더>`를 붙이면 우리 팩 대신 그 폴더에 써요. 다른 번역을 비교·참고용으로 뽑을 때 써요.
압축판(큰 표를 gzip으로 넣어 둔 빌드)도 그대로 읽어요.

### 손님 말투 (voice)

손님 대사는 손님 종류에 따라 말투가 바뀌어요.

| 손님 | 말투 |
|---|---|
| 술꾼(drunk_bold), 건달(rogue) | 반말 |
| 단골(regular), 바람둥이(charmer), 그 밖의 손님 | 존댓말 |
| 귀족(nobleman) | 하게체 |
| 돈 많은 변태(wealthy_pervert), 수금원 | 하오체 |

- 이름 있는 손님(Aldric, Tormund, Rolf, Magnus, Lord Cedric)은 정해진 말투를 써요.
- 빌드가 손님 대사가 나오는 자리를 `WML_I18N.voice(대사, 자리 번호, () => [상태, 말하는 손님])`로 감싸요.
- 화면에 낼 때 대사가 기준 문장과 똑같으면 그 손님 말투의 문장으로 바꿔요. 다르면(직접 고친 문장 등) 그대로 둬요.
- 말투 자료는 이 기능이 있는 한글 빌드에서 가져와요.

```bash
node tools/i18n-seed.mjs --en ../wayward-2026-10-04.html --tr <한글 빌드> --lang ko --out <참고 폴더>
node tools/i18n-voice.mjs --en ../wayward-2026-10-04.html --tr <한글 빌드> --ref <참고 폴더> --lang ko
```

- `mismatch`가 0이 아니면 우리 번역이 기준 문장과 달라서 그 대사의 말투가 안 바뀌어요.
  `--adopt`를 붙이면 그 문장을 기준 문장으로 맞춰요.
- 대사 자리는 그 게임 버전(`voice.json`의 `game`)에서만 써요. 새 게임 버전이 나오면 그 버전용 한글 빌드에서 다시 뽑아요.
- 빌드 보고서의 `voice`에 감싼 자리 수(`wrappedSay`, `text`, `result`)와 못 찾은 수(`notFound`)가 나와요.
