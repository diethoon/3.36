# 클라우드세이브 — Google Drive 로그인 간소화 버전

이 모드는 Google Drive의 앱 전용 저장 공간에 세이브를 직접 기록하는 WML 모드입니다. 게임 세이브는 Cloudflare Worker나 이 모드의 로그인 중계 페이지에 업로드하지 않습니다.

## 사용자 입장

1. cloud-save 폴더를 wml/mods/에 넣고 기존 wml/mods/mods.js의 WML.enable([...])에 'cloud-save'를 추가합니다(이미 있으면 중복 추가하지 않습니다).
2. 게임에서 **클라우드세이브**를 열고 **Google 계정으로 연결**을 누릅니다.
3. 새 로그인 창에서 Google 계정을 선택하고 이 모드의 Google Drive 앱 데이터 접근을 승인합니다.
4. 슬롯을 선택해 저장/불러오기를 합니다. 서로 다른 기기에서 같은 Google 계정과 같은 세이브 암호화 비밀번호를 사용하세요.

사용자마다 Google Cloud 프로젝트, OAuth 클라이언트 ID, API 키를 만들거나 입력할 필요가 없습니다. 브라우저 팝업은 허용해야 할 수 있습니다.

## 개발자 1회 설정이 필요한 이유

Google OAuth는 앱 개발자가 소유하는 클라이언트 등록 정보를 요구합니다. 이 ZIP은 공용 OAuth 클라이언트 ID를 사용자에게 입력시키지 않으며, 별도의 HTTPS 로그인 브리지에 설정된 **하나의 앱 클라이언트 ID**를 모든 이용자가 공유하는 구조입니다. 개발자는 해당 앱을 한 번 등록하고 서비스 운영자가 호스팅 설정을 완료해야 합니다.

로그인 브리지는 cloud-save-auth/에 있습니다. 별도 Vercel 프로젝트의 Root Directory를 이 폴더로 지정하고, GOOGLE_CLIENT_ID 환경 변수에 개발자 앱의 공개 OAuth 클라이언트 ID를 설정합니다. 프로젝트 도메인은 https://wayward-cloud-auth.vercel.app/이어야 합니다(이 이름을 사용할 수 없으면 다른 고정 도메인을 확보하고 mod.js의 AUTH_BRIDGE_URL을 일치시켜야 합니다). Google OAuth의 **Authorized JavaScript origins**에도 브리지의 정확한 HTTPS origin을 등록해야 합니다. 구체적인 절차는 cloud-save-auth/README.md에 있습니다.

Google OAuth 앱이 테스트 전용으로 남아 있으면 등록된 테스트 사용자만 로그인할 수 있습니다. 더 넓게 배포하기 전에는 게시 상태와 Google의 필요한 앱 확인 절차를 개발자가 완료해야 합니다.

## 저장 및 보안

- 요청 권한은 https://www.googleapis.com/auth/drive.appdata 하나뿐입니다. 일반 Drive 파일 전체에 대한 권한을 요구하지 않습니다.
- 저장 데이터는 브라우저에서 PBKDF2-SHA-256 및 AES-256-GCM으로 암호화한 뒤 Google Drive로 직접 전송됩니다.
- 세이브 암호화 비밀번호와 복호화 키는 로그인 브리지나 Google API로 전송하지 않습니다.
- Google 액세스 토큰은 게임 페이지 메모리에만 보관하며, 로그인 브리지는 토큰을 저장하지 않습니다. 브라우저를 다시 열면 연결 버튼을 눌러 새 토큰을 요청해야 합니다. Google 계정 선택/동의는 브라우저에서 기억될 수 있지만 자동 재인증은 보장되지 않습니다.
- Google 로그인 토큰은 브리지에서 게임 창으로 postMessage로 전달됩니다. 본인이 시작하지 않은 로그인 팝업은 승인하지 마세요.
- 세이브 암호화 비밀번호를 잊으면 복구할 수 없습니다. 다른 기기에서 같은 저장을 열 때도 같은 비밀번호가 필요합니다.
- 최대 5개 슬롯을 지원합니다. 암호화된 JSON 파일 내보내기/가져오기로 별도 백업도 만들 수 있습니다.
- 기존 Cloudflare Worker에 있던 계정 세이브와 1회성 코드는 자동 이관되지 않습니다. 이 모드는 Worker를 호출하지 않지만, 기존 Worker 서비스를 자동으로 비활성화하지도 않습니다.

## 문제 해결

- 알려진 Wayward 주소와 localhost/개인 LAN 주소는 바로 연결할 수 있습니다. 다른 HTTPS 게임 주소는 로그인 브리지에서 실제 주소를 보여 주고 사용자의 확인을 요구합니다. 공개 HTTP 주소는 보안상 거부합니다.

- 팝업이 열리지 않으면 브라우저에서 팝업을 허용하고 다시 시도합니다.
- file:// 실행은 지원 경로로 추가했습니다. 브리지에서 '게임 출처 연결 확인'을 체크해야 하며, 브라우저는 로컬 파일의 출처를 고유하게 검증할 수 없어 HTTPS보다 출처 보호가 약합니다. 해당 브라우저에서 WebCrypto, 팝업 또는 Google Drive CORS가 차단되면 localhost/AWebServer/HTTPS로 실행하세요.
- 로그인이 거부되면 브리지 앱 도메인이 Google OAuth 클라이언트의 Authorized JavaScript origins에 등록됐는지, OAuth 앱 게시/테스트 사용자 설정이 올바른지 확인해야 합니다.
- 저장 목록이 보이지 않으면 동일한 Google 계정으로 연결했는지 확인합니다. Google Drive appDataFolder는 OAuth 앱 단위로 분리됩니다.
