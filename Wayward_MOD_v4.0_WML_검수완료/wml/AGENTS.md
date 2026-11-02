# AGENTS.md — WML 폴더에서 일하는 AI 에이전트용 안내

이 폴더는 Wayward 게임의 모드 로더(WML)예요. 사용자는 **한국어(해요체)** 설명을 원해요.

## 먼저 읽을 것
- 모드 만들기: `docs/SDK.md`
- 도구 서버(MCP): `docs/MCP.md`
- 빌드·번역·옛 모드 옮기기: `README.md`

## MCP 도구가 연결돼 있으면
`wml` 서버 도구를 쓰세요. `wml_status` → `docs_read`(작업 순서) 순서로 시작해요.

모드를 만들 때의 흐름:
1. 게임 함수 찾기: `game_find` → `game_source` → `symbols_list` / `symbol_add { mod }` (모드 전용 의미 이름)
2. 모드 작성: `mod_create` → `mod_write_file`
3. 정적 검사: `mod_check`
4. 실제 게임에서 시험: `play_start` → `play_eval` · `play_auto` → `play_stop`

## MCP 없이 일할 때
- 모드는 `mods/<id>/mod.js` 하나, 그리고 `mods/mods.js` 목록에 한 줄을 넣어요.
- 모드만 고쳤으면 빌드할 필요가 없어요. 게임을 새로고침하면 바로 반영돼요.
- 아래를 고쳤을 때만 `node tools/build.mjs --lang ko`로 빌드해요.
  - 번역: `i18n/ko/custom.json`
  - 심볼 표: `symbols/`
- 정적 검사와 브라우저 시험은 MCP 서버로 해요.
  - 따로 받는 배포판(`wml-mcp`): `node selftest.mjs --wml <게임 폴더>`
  - 개발 폴더: `npm run mcp:test`

## 지킬 것
- 아래 파일은 손으로 고치지 않아요. 바꾸려면 원본을 고친 뒤 도구로 다시 만들어요.
  - 게임 원본 `../wayward-*.html`
  - 빌드 결과 `../Wayward_WML*.html`
  - 생성 파일: `i18n/ko/display.js`, `symbols/*.js`
- 도구로 옮긴 모드(머리말에 "이 파일은 tools/….mjs 로 만들었어요"라고 적힌 파일)는 손으로 고치지 않고 다시 만들어요.
  - 바꿀 곳은 `port/<id>.fixes.json` / `.prelude.js` / `.post.js`에 두고 `node tools/port-regen.mjs <id>`로 다시 만들어요.
  - 만드는 명령은 `port/regen.json`에 있어요. `node tools/port-regen.mjs --check`는 모든 모드가 기록대로 나오는지 확인해요.
- 게임 상태는 새 객체로 바꿔요(`api.store.update`).
- 이미 있는 모드와 같은 일을 하는 모드면 `role`을 적어요(예: `'hotkeys'`). 막지는 않고, 둘 다 켜지면 모드 관리자가 알려 줘요. 이름은 `docs/SDK.md`의 역할 표를 보세요.
- 오래 열어 두는 패널에는 `role="dialog"`를 쓰지 마세요. WAYWORKS가 막는 창으로 보고 모든 단축키를 막아요.
- 화면 구석에 버튼을 직접 붙이지 마세요. `api.ui.addButton`으로 WML 버튼 줄에 한 개만 넣고, 나머지는 그 버튼으로 여는 창이나 ⚙ 설정에 둬요.
  (이미 만든 요소는 `api.ui.adopt(el)`로 그 줄에 태울 수 있어요. 줄은 한 줄에 5개씩 차고 넘치면 윗줄이 생겨요.)
- 키보드 단축키만 있는 모드처럼 폰에서 쓸모없는 모드면 `platform: 'pc'`를 적어요. 폰 앱(WML 플레이어)도 생각해서: 파일 저장은 `api.saveFile`, 열어 둔 패널은 `api.onBack`으로 뒤로 가기에 닫히게, 폴더 고르기 대신 파일 여러 개 고르기를 써요.
- `location.protocol === 'file:'`로 기기를 가리지 마세요. 폰 앱에서는 게임이 https 주소로 열려요. `api.host`를 써요.
- 게임 글자로 비교하지 않아요. 한글판에서는 게임 코드 안의 문장도 한글이에요.
- 압축 이름(`r8`, `_`) 대신 의미 이름(`imagePrompt`, `wife`)을 써요.
- `release/` 폴더는 사용자가 시험하는 곳이에요. 동기화할 때 그림·소리 파일은 건드리지 않아요.
