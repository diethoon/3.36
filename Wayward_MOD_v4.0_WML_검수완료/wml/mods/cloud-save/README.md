# 클라우드세이브 — 직접 Google Drive 인증 버전

이 WML 모드는 Google 로그인과 Drive API를 게임에서 직접 호출합니다. 별도 로그인 도우미 페이지, Vercel/Cloudflare 인증 서버, 세이브 중계 서버는 사용하지 않습니다. 외부 연결은 Google 로그인 서비스와 Google Drive API에만 필요합니다.

## 설치 및 사용

1. `cloud-save` 폴더를 게임의 `wml/mods/`에 둡니다.
2. 기존 `wml/mods/mods.js`의 `WML.enable([...])` 목록에 `'cloud-save'`를 추가합니다. 이미 있으면 중복으로 추가하지 않습니다.
3. HTTPS 또는 지원되는 localhost HTTP 주소에서 게임을 엽니다.
4. 게임의 `클라우드세이브` 메뉴에서 **Google 계정으로 직접 로그인**을 선택하고 Drive 앱 전용 데이터 접근을 승인합니다.
5. 슬롯에서 저장, 불러오기, 삭제를 이용합니다. 저장 메모는 선택 사항입니다.

## 개발자 1회 설정

Google Identity Services의 웹 OAuth 클라이언트 ID는 공개 식별자이므로 모드에 포함할 수 있습니다. 각 사용자에게 별도 Google Cloud 프로젝트나 API 키를 만들게 할 필요는 없습니다.

1. Google Cloud에서 기존 Google OAuth 웹 클라이언트를 사용하거나 새 웹 클라이언트를 준비합니다.
2. Google Drive API와 OAuth 동의 화면을 설정하고 `https://www.googleapis.com/auth/drive.appdata` 범위를 허용합니다.
3. OAuth 웹 클라이언트의 **승인된 JavaScript 출처**에 실제 게임 실행 출처를 등록합니다. HTTPS를 권장합니다. HTTP는 `localhost` 계열 개발 주소에서만 지원됩니다.
4. `mod.js` 상단의 `GOOGLE_CLIENT_ID` 값을 공개 OAuth 클라이언트 ID로 교체합니다. `GOOGLE_CLIENT_SECRET`이나 다른 비밀값은 모드에 절대 넣지 않습니다.

Google OAuth는 HTTPS 또는 localhost HTTP 출처를 권장합니다. AWebServer에서 `http://192.168.x.x:포트/` 같은 LAN IP 주소로 접속하면 Google이 직접 인증을 거부할 수 있습니다. 모드는 이 주소에서도 로그인을 시도하지만 실패하면 HTTPS 또는 localhost 주소를 사용해야 합니다. 실제 OAuth 클라이언트에 등록된 출처와 게임 주소도 일치해야 합니다.

## 실행 주소 제한

- `file://`: 클라우드 저장·불러오기는 의도적으로 비활성화됩니다. 로컬 저장과 게임 자체 기능은 영향을 받지 않습니다.
- `https://`: OAuth 클라이언트에 해당 출처가 등록되어 있으면 지원합니다.
- `http://localhost`, `http://127.0.0.1` 등: OAuth 클라이언트 설정이 해당 출처를 허용하면 지원합니다.
- 일반 LAN IP의 HTTP 주소: 로그인 시도는 가능하지만 Google OAuth가 출처를 거부할 수 있습니다. 실패하면 HTTPS 또는 localhost 주소를 사용하세요.

## 저장 및 보안

- 세이브는 게임 안에서 암호화한 뒤 Google Drive의 `appDataFolder`에 직접 전송합니다. 별도 세이브 서버를 거치지 않습니다.
- 액세스 토큰은 현재 게임 페이지 메모리에만 보관하며, 페이지를 다시 열면 다시 로그인해야 할 수 있습니다.
- Drive 권한은 이 모드의 앱 전용 데이터 공간으로 제한됩니다.
- 새 세이브는 자동으로 암호화·복호화됩니다. 이전 암호화 형식의 세이브도 기존 비밀번호를 입력해 불러오고 새 형식으로 변환할 수 있습니다.
- 모드에 포함된 복호화 키는 코드를 분석하면 추출할 수 있으므로, 강한 기밀성이 필요한 자료를 보관하지 마세요.
- 슬롯 수는 별도로 제한하지 않으며, 각 슬롯에 선택 메모와 진행 정보가 표시됩니다.

## 문제 해결

- 로그인 창이 열리지 않으면 브라우저의 팝업 설정을 확인하고 다시 시도하세요.
- Google 로그인 기능을 불러오지 못하면 인터넷 연결과 Google Identity Services 스크립트 접근을 확인하세요.
- 출처/원본( origin ) 오류가 나면 게임의 실제 HTTPS 또는 localhost 주소가 Google OAuth 클라이언트의 승인된 JavaScript 출처에 등록되어 있는지 확인하세요.
- `file://`에서 클라우드 기능이 비활성화되는 것은 의도된 동작입니다. HTTP(S) 서버 주소로 게임을 열어 주세요.
- 슬롯이 비어 보이면 로그인한 Google 계정이 맞는지 확인하세요. `appDataFolder`는 OAuth 앱 단위로 분리됩니다.
