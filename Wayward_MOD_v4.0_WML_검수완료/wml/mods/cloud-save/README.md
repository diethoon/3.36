# 클라우드세이브 — 개인 Google Drive 실험 버전

이 브랜치는 기존 공개 Cloudflare Worker 방식 대신, 브라우저에서 Google Drive API를 직접 호출하는 **개인용 프로토타입**입니다. 기본 wml 브랜치와 별도로 테스트하세요.

## 바뀐 점

- 게임 시작 화면의 **클라우드 불러오기**와 게임 메뉴의 **클라우드세이브** 진입 버튼을 유지합니다.
- Google OAuth로 본인 Google 계정에 연결합니다.
- 계정당 별도 서버 슬롯 대신, Google Drive의 앱 전용 appDataFolder에 최대 5개 슬롯을 저장합니다.
- 세이브는 브라우저에서 **PBKDF2-SHA-256 + AES-256-GCM**으로 암호화한 뒤 Drive에 올립니다. 암호화 비밀번호는 서버나 Google API로 전송하지 않습니다.
- 암호화된 JSON 파일을 내보내고 다시 가져올 수 있습니다. 이 방식이 기존 1회성 코드를 대체합니다.
- 모드가 실행 중인 동안 Google 액세스 토큰은 메모리에만 보관합니다. 페이지를 새로 열면 Google Drive에 다시 연결해야 합니다.
- 이 모드는 기존 Cloudflare Worker API를 호출하지 않습니다.

## 먼저 알아둘 제한

1. **OAuth 설정이 필요합니다.** 이 모드를 처음 쓰기 전에 Google Cloud 프로젝트와 OAuth 클라이언트 ID를 직접 만들어야 합니다. 이 모드가 네 대신 Google 계정 설정을 할 수는 없습니다.
2. Google Drive의 appDataFolder는 앱 전용의 숨겨진 공간입니다. 일반 Google Drive 화면에서 세이브 파일을 직접 찾아볼 수 없습니다. 파일 내보내기 기능으로 별도 백업을 보관하세요.
3. **모든 기기에서 동일한 OAuth 클라이언트 ID를 사용해야 합니다.** 앱 전용 저장 공간은 OAuth 앱별로 분리됩니다. 클라이언트 ID를 바꾸면 기존 저장 목록이 보이지 않을 수 있습니다.
4. 게임은 Google OAuth에서 허용되는 웹 출처로 열어야 합니다. file:// 실행은 지원하지 않습니다. Google은 localhost 예외를 제외하면 원시 IP 주소를 JavaScript 출처로 허용하지 않습니다. AWebServer를 실행한 바로 그 휴대전화의 브라우저라면 http://localhost:포트 또는 http://127.0.0.1:포트로 접속해 테스트하세요(서버가 loopback 연결을 허용해야 합니다). 다른 기기에서 http://192.168.x.x:포트로 접속하는 방식은 Google OAuth에서 거부되므로, 그 경우에는 Google Cloud에 등록 가능한 HTTPS 도메인이 필요합니다.
5. 테스트용 OAuth 앱에서 Google은 확인 경고를 보여줄 수 있습니다. 개인용으로만 사용하고, 다른 사람을 위한 공개 앱으로 배포하지 마세요.
6. 세이브 암호화 비밀번호를 잊으면 복구할 수 없습니다. 비밀번호 관리자 등 안전한 곳에 보관하세요.
7. 버전 정보가 다른 게임은 불러오기를 거부합니다. 서로 다른 HTML 파일이라도 내부 게임 버전 정보가 같으면 호환될 수 있지만, 모든 버전 조합을 보장하지는 않습니다.

## Google Cloud 초기 설정

### 1. Google Cloud 프로젝트 만들기

1. [Google Cloud Console](https://console.cloud.google.com/)에서 개인 프로젝트를 만듭니다.
2. API 라이브러리에서 **Google Drive API**를 활성화합니다.
3. Google Auth Platform / OAuth 동의 화면을 설정합니다.
4. 개인 테스트라면 사용자 유형을 External로 설정한 뒤 게시 상태를 Testing으로 두고, **Test users**에 본인의 Google 계정을 추가합니다.

### 2. OAuth 클라이언트 ID 만들기

1. Credentials에서 **OAuth client ID**를 만듭니다.
2. 애플리케이션 유형은 **Web application**을 사용합니다.
3. 모드를 실행할 웹 출처를 **Authorized JavaScript origins**에 등록합니다. 경로가 아니라 출처(프로토콜 + 호스트 + 포트)를 등록해야 합니다.
4. 생성된 클라이언트 ID를 복사합니다. **Client Secret은 필요하지 않으며, 모드에 입력하거나 저장소에 올리지 마세요.**

Google의 안내:
- [Google Identity Services - 웹에서 OAuth 사용](https://developers.google.com/identity/oauth2/web/guides/overview)
- [Google OAuth JavaScript 출처 규칙](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#origin-validation-rules)
- [Drive API - 앱 전용 데이터 저장](https://developers.google.com/workspace/drive/api/guides/appdata)

### 3. 게임에서 연결

1. 이 브랜치의 모드를 설치하고 WML 모드 목록에서 cloud-save를 활성화합니다.
2. 게임의 클라우드세이브 창을 열고 Google OAuth 클라이언트 ID를 입력합니다.
3. **Google Drive 연결 / 재연결**을 눌러 본인 계정으로 승인합니다.
4. 저장 슬롯에서 저장, 덮어쓰기, 불러오기, 삭제를 사용합니다.
5. 각 저장마다 10자 이상의 암호화 비밀번호를 설정합니다. 같은 저장을 다른 기기에서 열 때도 동일한 비밀번호가 필요합니다.

## 보안 및 서버 관련 참고

- Drive로 가기 전 세이브는 기기에서 암호화됩니다. Drive에는 암호문이 저장됩니다.
- 암호화 비밀번호와 AES 키를 이 모드가 서버로 보내지 않도록 설계했습니다. 다만 악의적으로 변조된 게임/모드가 입력을 가로채는 위험까지 막아 주는 것은 아닙니다.
- Google은 Google Drive/API 사용 및 계정 활동을 처리합니다. “별도 게임 서버를 사용하지 않는다”는 뜻이지, 네트워크 활동이 어디에도 기록되지 않는다는 뜻은 아닙니다.
- **이 변경은 기존 Cloudflare Worker를 삭제하거나 중지하지 않습니다.** 현재 배포된 wayward-save-share 서비스가 공개 상태라면 별도로 Cloudflare 대시보드에서 비활성화하거나 접근을 제한해야 합니다. 이 모드가 Worker를 호출하지 않는 것과 Worker 자체가 중지된 것은 다릅니다.
- 이번 실험 버전은 기존 Cloudflare 계정 저장이나 1회성 코드 데이터를 자동 이전하지 않습니다. 기존 데이터는 기존 방식에서 별도로 백업해야 합니다.

## 설치 파일

이 모드가 사용하는 핵심 파일:
- wml/mods/cloud-save/mod.js
- wml/mods/cloud-save/crypto.js

기존 opaque-client.bundle.js 파일은 남아 있을 수 있지만 이 실험 버전에서는 사용하지 않습니다. 운영 전에는 반드시 개인 기기에서 Google OAuth 연결, 저장, 불러오기, 새로고침 후 재연결, 파일 내보내기/가져오기까지 테스트하세요.

이 버전은 개인용 기능을 시험하는 프로토타입이며, 모든 기기·브라우저에서 동작이 확인된 정식 배포 버전은 아닙니다.
