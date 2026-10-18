# WML MCP — AI와 같이 Wayward 모드 만들기

**WML MCP**는 Claude·Codex·Cursor 같은 AI 에이전트가 **Wayward 모드를 직접 만들고 시험할 수 있게** 해 주는 도구 서버예요.
MCP(Model Context Protocol)는 AI 앱에 도구를 연결하는 공통 규격이에요. 그래서 서버 하나로 여러 앱에서 써요.

연결하면 AI가 아래 일을 스스로 해요.

- 게임 코드에서 함수 찾기 (화면에 나오는 문장으로도), 내용 보기, 누가 부르는지 보기
- 의미 이름(심볼 표) 보기 · 올리기
- 모드 뼈대 만들기 → 작성 → **검사**
- 모드 목록(`mods.js`) 고치기, 번역 고치기, 옛 모드 옮기기, 게임 빌드
- **보이지 않는 브라우저로 게임을 켜서** 모드를 켜고, 코드를 실행하고, 자동으로 여러 날 플레이하고, 화면 찍기

> 게임을 **하기만** 하는 사람에게는 필요 없어요. 모드를 만드는 사람용이에요.

버전 0.2.0 · 게임 2026-10-04 · 모드 로더(WML) 0.2.0 기준

---

## 목차

1. [필요한 것](#1-필요한-것)
2. [설치](#2-설치)
3. [잘 되는지 확인](#3-잘-되는지-확인)
4. [AI 에이전트에 연결하기](#4-ai-에이전트에-연결하기)
5. [이렇게 시키면 돼요](#5-이렇게-시키면-돼요)
6. [도구 목록](#6-도구-목록)
7. [앱마다 다른 점](#7-앱마다-다른-점)
8. [안전](#8-안전)
9. [문제가 생기면](#9-문제가-생기면)
10. [파일 구성](#10-파일-구성)

---

## 1. 필요한 것

| 무엇 | 왜 |
|---|---|
| **Node.js 20 이상** ([nodejs.org](https://nodejs.org)) | 서버를 돌려요. 설치하면 `node`와 `npm`이 같이 생겨요. |
| **WML 게임 폴더** | 모드를 만들 대상이에요. `Wayward_WML.html`, `Wayward_WML_ko.html`, `wml\` 폴더가 들어 있는 폴더예요 (한글판 배포 폴더 그대로). |
| **크롬 또는 엣지** | 게임 시험(`play_*` 도구)에 써요. 컴퓨터에 깔린 걸 그대로 써서 따로 받을 건 없어요. 윈도우에는 엣지가 기본으로 있어요. |
| **MCP를 지원하는 AI 앱** | Claude Code, Claude Desktop, Codex, Cursor, VS Code(코파일럿), Gemini CLI, Windsurf 등 |

---

## 2. 설치

### ① 압축 풀기

`wml-mcp` 폴더를 원하는 곳에 풀어요. 예: `D:\tools\wml-mcp`

- 경로에 한글이 있어도 괜찮아요.

### ② 필요한 부품 받기 (처음 한 번)

`wml-mcp` 폴더에서 명령 창(터미널)을 열고 실행해요.

```bash
npm install
```

- 윈도우에서는 폴더 주소창에 `cmd`를 치고 엔터를 누르면 그 폴더에서 명령 창이 열려요.
- 브라우저 본체는 받지 않아서 금방 끝나요.

### ③ 게임 폴더 알려 주기

서버가 어떤 게임 폴더를 다룰지 알아야 해요. 방법은 둘 중 하나예요.

- **(보통) 실행 인자로**: 서버를 실행할 때 `--wml "<게임 폴더>"`를 붙여요.
  - 4장의 연결 설정에 들어가요.
  - `<게임 폴더>`는 `Wayward_WML_ko.html`이 있는 폴더예요. 그 안의 `wml` 폴더를 가리켜도 돼요.
- **게임 폴더 안에 넣기**: `wml-mcp` 폴더 통째로 게임의 `wml` 폴더 안에 `mcp`라는 이름으로 넣어요 (`게임 폴더\wml\mcp\server.mjs`).
  - 그러면 `--wml` 없이 알아서 찾아요.

> 환경 변수 `WML_DIR`에 게임 폴더를 넣어도 돼요 (`--wml`이 우선).

### ④ (선택) 빌드·옮기기 도구까지 쓰려면

`build`, `port_wrap_addon`, `port_inline`은 게임 폴더에 들어 있는 명령줄 도구를 실행해요.

- 이 세 도구를 쓸 거라면 **게임의 `wml` 폴더에서도** `npm install`을 한 번 해요.
- 모드 만들기·검사·시험만 할 거라면 필요 없어요.

---

## 3. 잘 되는지 확인

`wml-mcp` 폴더에서:

```bash
node selftest.mjs --wml "D:/games/wayward"
```

- 서버를 실제로 켜서 도구를 하나씩 불러 봐요.
- 시험용 모드를 잠깐 만들었다가 지워요. 게임 폴더에 흔적이 남지 않아요.

브라우저 시험까지 확인하려면 `--play`를 붙여요.

```bash
node selftest.mjs --wml "D:/games/wayward" --play
```

마지막에 **"모두 통과"** 가 나오면 준비 끝이에요.

---

## 4. AI 에이전트에 연결하기

모든 앱이 같은 방식이에요. 앱이 `node <wml-mcp>\server.mjs --wml <게임 폴더>`를 실행하고, 표준 입출력(stdio)으로 대화해요. **설정을 적는 곳과 모양만 앱마다 달라요.**

### 내 컴퓨터용 설정을 자동으로 만들기 (추천)

```bash
node config.mjs --wml "D:/games/wayward"
```

- 앱별로 **경로가 다 채워진 설정**을 화면에 보여 줘요. 그대로 복사해서 붙이면 돼요.
- 앱 하나만 보려면 이름을 붙여요.
  - 쓸 수 있는 이름: `claude-code`, `claude-desktop`, `codex`, `cursor`, `vscode`, `gemini`, `windsurf`, `generic`
  - 예: `node config.mjs codex --wml "D:/games/wayward"`
- 아무 파일도 고치지 않아요. 보여 주기만 해요.

아래 예시는 `wml-mcp`가 `D:/tools/wml-mcp`, 게임이 `D:/games/wayward`에 있다고 가정해요.

> 윈도우 경로는 `/`로 적는 게 편해요. JSON에 `\`를 쓰려면 `\\`로 두 번 적어야 해요.

### Claude Code (터미널 · 데스크톱 앱의 Code)

```bash
claude mcp add wml -- node "D:/tools/wml-mcp/server.mjs" --wml "D:/games/wayward"
```

- 확인: `claude mcp list`
- 지금 프로젝트에서만 쓰고, 그 폴더를 여는 사람과 같이 쓰려면 `--scope project`를 붙여요. 그러면 `.mcp.json` 파일이 생겨요.

### Claude Desktop (채팅 앱)

설정 → 개발자 → 설정 편집으로 `claude_desktop_config.json`을 열고 넣은 뒤, 앱을 완전히 껐다 켜요.

```json
{
  "mcpServers": {
    "wml": {
      "command": "node",
      "args": ["D:/tools/wml-mcp/server.mjs", "--wml", "D:/games/wayward"]
    }
  }
}
```

### Codex (OpenAI — 앱과 CLI가 같은 설정을 써요)

`C:/Users/<이름>/.codex/config.toml`(맥·리눅스는 `~/.codex/config.toml`) 맨 아래에 붙이고 Codex를 다시 켜요.

```toml
[mcp_servers.wml]
command = "node"
args = ["D:/tools/wml-mcp/server.mjs", "--wml", "D:/games/wayward"]
startup_timeout_sec = 30
tool_timeout_sec = 120
```

- Codex CLI가 있다면 이렇게 해도 돼요: `codex mcp add wml -- node "D:/tools/wml-mcp/server.mjs" --wml "D:/games/wayward"`
- 작업 폴더를 게임의 `wml` 폴더로 열면, Codex가 그 안의 `AGENTS.md`(에이전트용 안내)도 읽어요.

### Cursor

모든 프로젝트에 쓰려면 `~/.cursor/mcp.json`, 한 프로젝트만이면 `<프로젝트>/.cursor/mcp.json`에 넣어요.

```json
{
  "mcpServers": {
    "wml": { "command": "node", "args": ["D:/tools/wml-mcp/server.mjs", "--wml", "D:/games/wayward"] }
  }
}
```

넣은 뒤 Cursor 설정 → MCP에서 `wml`이 켜져 있는지 확인해요.

### VS Code (GitHub Copilot 에이전트 모드)

`<프로젝트>/.vscode/mcp.json`에 넣어요. 모든 프로젝트에 쓰려면 명령 팔레트 → "MCP: Add Server"를 써요.

```json
{
  "servers": {
    "wml": { "type": "stdio", "command": "node", "args": ["D:/tools/wml-mcp/server.mjs", "--wml", "D:/games/wayward"] }
  }
}
```

채팅을 "에이전트" 모드로 두고, 도구 목록에서 `wml`을 켜요.

### Gemini CLI

`~/.gemini/settings.json`에 넣어요.

```json
{
  "mcpServers": {
    "wml": { "command": "node", "args": ["D:/tools/wml-mcp/server.mjs", "--wml", "D:/games/wayward"], "timeout": 120000 }
  }
}
```

### Windsurf · Cline · 그 밖의 앱

- 대부분 Claude Desktop과 같은 `mcpServers` 모양이에요. Windsurf는 `~/.codeium/windsurf/mcp_config.json`에 넣어요.
- 앱 설명서에서 "stdio MCP 서버 추가"를 찾아 넣으면 돼요.
  - 명령: `node`
  - 인자: `<wml-mcp>/server.mjs --wml <게임 폴더>`

### 환경 변수 (선택)

| 이름 | 뜻 |
|---|---|
| `WML_DIR` | 게임 폴더 (`--wml` 대신) |
| `WML_BROWSER` | 크롬·엣지가 기본 위치에 없을 때 실행 파일 경로 |

---

## 5. 이렇게 시키면 돼요

연결한 뒤 AI에게 평소 말투로 부탁하면 돼요.

- "손님이 들어올 때마다 1골드씩 모아 두는 팁 항아리 모드 만들어 줘. 버튼 누르면 비우게. 시험까지 해 줘."
- "아내가 많이 취하면 그림 프롬프트에 볼 빨간 태그를 넣는 모드 만들어 줘."
- "'그녀를 침대로 안아 옮기기' 버튼을 만드는 함수가 뭐야?"
- "모든 모드 검사해서 문제 있는 것만 알려 줘."
- "image-look 모드 켜고 3일 정도 자동으로 돌려서 오류 나는지 봐 줘."
- "이 옛 애드온을 WML 모드로 옮겨 줘: D:/old/Addon_Something.js"

AI가 처음이면 스스로 `wml_status` → `docs_read`(작업 순서)를 부르고 시작해요.

앱이 MCP **프롬프트**를 지원하면 고르기만 해도 돼요.
- `new_mod`: 아이디어 → 설계 → 작성 → 검사 → 시험
- `port_old_mod`: 옛 모드 옮기기

---

## 6. 도구 목록

### 프로젝트 · 게임 코드 (읽기만 함)

| 도구 | 하는 일 |
|---|---|
| `wml_status` | 게임 버전, 최상위 이름 수, 심볼 표, 만들어진 빌드, 모드 수, 시험 브라우저 |
| `docs_read` | 작업 순서 요약, 또는 SDK·MCP 설명서 (장 하나만도) |
| `symbols_list` | 의미 이름 목록 (검색 가능) |
| `symbols_check` | 모드 전용 의미 이름이 지금 빌드(영어판·한글판)에서 정확히 한 대상(함수·목록·표·상수)을 가리키는지 확인 |
| `game_find` | 게임 코드에서 글자·정규식 찾기 → 들어 있는 함수와 앞뒤 코드. 한글 문장은 `lang: "ko"` |
| `game_source` | 함수 내용을 정렬해서 보기 (`hookable`: 훅을 걸 수 있는지) |
| `game_refs` | 그 함수를 쓰는 곳 / 그 함수가 쓰는 것 |
| `names_map` | 옛 게임 빌드의 이름 → 지금 이름 (옛 모드 옮길 때) |
| `i18n_lookup` | 번역표에서 원문·번역문 찾기 |
| `mod_list` / `mod_get` | 모드 목록과 순서 / 모드 하나의 정보·파일·내용 |

### 고치는 도구

| 도구 | 하는 일 | 쓰는 곳 |
|---|---|---|
| `mod_create` | 뼈대가 들어간 새 모드 + 목록 등록 | `wml/mods/<id>/` |
| `mod_write_file` | 모드 폴더 안 파일 쓰기 (js는 문법 확인) | `wml/mods/<id>/` 안만 |
| `mods_order` | 모드 목록 넣기·빼기·기본 켜짐·순서 | `wml/mods/mods.js` |
| `symbol_add` | 압축 이름에 의미 이름 붙이기. `mod`를 주면 **모드 전용**(찾는 기준을 만들어 확인한 뒤 mod.js의 `symbols` 블록에 씀), 없으면 공용 표 | `wml/mods/<id>/mod.js` 또는 `wml/symbols/` |
| `symbols_port` | 게임 업데이트 뒤: 모드 전용 의미 이름의 새 버전 이름을 찾는 기준으로 찾아 기록 | `wml/mods/<id>/mod.js` |
| `symbols_request` | 모드 전용 의미 이름을 공용 표에 넣어 달라는 요청서(마크다운) 만들기 | `wml/mods/<id>/` (file을 줄 때) |
| `i18n_set` | 번역 한 줄 넣기·고치기 (반영은 `build`) | `wml/i18n/<언어>/custom.json` |
| `port_wrap_addon` | 옛 애드온을 모드로 감싸기 | `wml/mods/<id>/` |
| `port_inline` | 게임 안에 끼워 넣던 옛 코드 옮기기 | `wml/mods/<id>/`, `wml/port/` |
| `build` | 영문판·한글판 다시 만들기 | `Wayward_WML*.html` |

### 검사 · 시험

| 도구 | 하는 일 |
|---|---|
| `mod_check` | 실행하지 않고 검사 (아래). id를 비우면 모든 모드 |
| `play_start` | 보이지 않는 브라우저로 게임 켜기. `mods: {"id": true/false}`로 켤 모드 지정, 빈 저장소에서 시작 |
| `play_eval` | 그 화면에서 자바스크립트 실행 (`WML.dev()` 사용 가능) |
| `play_auto` | 버튼을 무작위로 눌러 진행 (한 번에 45초) → 새 오류(스택 포함)·진행한 날·미번역 |
| `play_status` | 로드 결과·날짜·오류·미번역 |
| `play_screenshot` | 화면 사진 (`file: true`면 jpg 파일로 저장하고 경로만) |
| `play_reload` | 모드를 고친 뒤 다시 불러오기 (저장소 유지) |
| `play_stop` | 닫기 (마지막이면 브라우저와 임시 서버도 끔) |

**`mod_check`가 보는 것**

- 기본 검사
  - 문법 오류
  - `WML.define` 필드: `id`가 폴더 이름과 같은지, `setup`이 있는지
- 이름 검사
  - `api.hook` / `api.fn`에 쓴 이름이 실제로 있는지
  - 옛 이름(`__WML_LEGACY__`)이 이름 표에 있는지
  - `const` 값에 훅을 걸지 않았는지
- 다른 모드와의 관계
  - `requires` 대상 모드가 있는지
  - 같은 함수를 `replace` 하는 모드가 또 있는지
  - **같은 브라우저 저장 키를 쓰는 모드**가 있는지 (설정이 섞이는 원인)
  - 같은 함수에 끼어드는 다른 모드 (참고용)
  - 같은 `role`(하는 일)을 가진 다른 모드 (참고용, 같이 켜면 모드 관리자가 하나만 켜라고 알려 줘요)
  - `platform` 값이 `'pc'`·`'mobile'`이 아닌 것 (MCP 0.4.1)

### 자료(resources) · 프롬프트

- 자료 (앱이 지원하면)
  - `wml://docs/sdk`: SDK 설명서
  - `wml://docs/mcp`: 이 문서
  - `wml://symbols/current`: 심볼 표
  - `wml://examples/hello-wml`: 예제 모드
- 프롬프트: `new_mod`, `port_old_mod`
- 자료를 못 읽는 앱은 `docs_read` 도구로 같은 설명서를 읽어요.

---

## 7. 앱마다 다른 점

| | 도구 | 자료 | 프롬프트 | 그림 결과 | 한 번 호출 시간 |
|---|---|---|---|---|---|
| Claude Code / Desktop | ✓ | ✓ | ✓ | ✓ | 넉넉함 (`MCP_TOOL_TIMEOUT`로 조절) |
| Codex | ✓ | 앱에 따라 | 앱에 따라 | 앱에 따라 | 기본 60초 → `tool_timeout_sec` |
| Cursor / VS Code / Gemini | ✓ | 일부 | 일부 | 대부분 ✓ | 앱 설정 |

어느 앱에서나 똑같이 쓰이도록 이렇게 맞춰 뒀어요.

- 설명서는 `docs_read` **도구로도** 읽혀요.
- 그림을 못 받는 앱은 `play_screenshot { file: true }`로 파일을 받아요.
- 자동 플레이는 한 번에 45초가 기본이라 대부분의 시간 제한(60초)에 걸리지 않아요. 오래 돌리려면 여러 번 불러요.

---

## 8. 안전

- **쓰는 곳은 정해져 있어요.** 그 밖의 경로는 거절해요.
  - 게임의 `wml/mods/<id>/` (모드 폴더 안만)
  - `wml/mods/mods.js`, `wml/i18n/<언어>/custom.json`, `wml/symbols/`
  - 빌드·옮기기 도구가 만드는 파일
  - 이 서버의 `shots/`
- 모드 파일을 지우는 도구는 없어요. 지울 때는 직접 지우세요.
- **브라우저 시험**
  - 컴퓨터 안의 임시 서버(127.0.0.1)로만 게임을 열어요.
  - **그림 생성 요청과 바깥 인터넷 연결은 모두 막아요.**
  - 시험마다 따로 된 빈 저장소를 써서, 평소에 하던 세이브에는 손대지 않아요.
- `play_eval`은 그 시험 화면 안에서만 코드를 실행해요.
- 고치기 전에 게임 폴더를 백업해 두면 마음이 편해요. 특히 `wml/mods`, `wml/i18n/ko/custom.json`이요.

---

## 9. 문제가 생기면

| 증상 | 해결 |
|---|---|
| 앱에 `wml` 도구가 안 보여요 | 설정 경로 확인 → 앱 완전히 재시작. 서버 폴더에서 `npm install` 했는지, `node selftest.mjs --wml …`이 통과하는지 확인 |
| "WML 게임 폴더를 찾지 못했어요" | `--wml` 경로가 `Wayward_WML.html`과 `wml\runtime\wml-core.js`가 있는 폴더인지 확인 |
| "node 를 찾을 수 없음" (GUI 앱) | 설정의 `command`에 node 실행 파일 전체 경로를 넣어요. `node config.mjs` 출력 맨 위에 나와요. |
| `play_start`가 브라우저를 못 찾아요 | 크롬/엣지 설치, 또는 `WML_BROWSER`에 실행 파일 경로 |
| "Wayward_WML_ko.html 이(가) 없어요" | 게임 폴더가 맞는지, 또는 `build` 도구로 만들기 |
| 빌드·옮기기 도구가 "npm install" 하라고 해요 | 게임의 `wml` 폴더에서 `npm install` (2장 ④) |
| 도구가 시간 초과로 끊겨요 | 앱의 도구 시간 제한을 늘려요. Codex는 `tool_timeout_sec`, Claude Code는 `MCP_TOOL_TIMEOUT`. `play_auto`는 짧게 여러 번. |
| 자동 플레이가 날짜를 못 넘겨요 | 창이 좁으면 모바일 배치가 돼요. `play_start`의 `width`를 1300 이상으로 (기본 1500) |
| 모드를 고쳤는데 그대로예요 | `play_reload` |

---

## 10. 파일 구성

```
wml-mcp/
  README.md          이 설명서
  README_en.md       이 설명서의 영어판
  package.json       필요한 부품 목록 (npm install)
  server.mjs         MCP 서버 — 앱이 실행하는 파일
  config.mjs         앱별 연결 설정 만들기 (node config.mjs [앱] --wml <게임 폴더>)
  selftest.mjs       자체 시험 (node selftest.mjs --wml <게임 폴더> [--play])
  lib/
    util.mjs         경로 찾기(--wml), 공통 도우미
    game.mjs         게임 코드 색인: 최상위 이름, 소스, 검색, 참조, 심볼 표
    mods.mjs         모드 목록·정보·뼈대·파일 쓰기·mods.js 편집
    check.mjs        정적 검사
    play.mjs         보이지 않는 브라우저 시험 (크롬/엣지)
    run.mjs          게임 폴더의 빌드·옮기기 도구 실행, 번역표
    vendor/          게임 코드 읽기 도우미 (WML tools 에서 복사)
  docs/
    SDK.md           모드 SDK 설명서 (모드 파일 모양, api 전체, 훅, 예제, 주의할 점)
    MCP.md           이 설명서와 같은 내용
    SDK_en.md, MCP_en.md  위 두 설명서의 영어판
  shots/             play_screenshot { file: true } 사진 (최근 20장만, 실행하면 생김)
```

### 업데이트

새 판을 받으면 이렇게 해요.

1. `wml-mcp` 폴더를 통째로 바꿔요.
2. `npm install`을 다시 해요.
3. 앱 설정은 경로가 같으면 그대로 둬도 돼요.

### 만든 곳

- 이 서버는 WML 개발 폴더의 `wml/mcp`에서 만들어 묶은 거예요. 묶는 명령은 `node mcp/pack.mjs`예요.
- 게임 쪽 모드 SDK 설명서는 게임 폴더의 `wml/docs/SDK.md`에도 같은 판이 들어 있어요.
