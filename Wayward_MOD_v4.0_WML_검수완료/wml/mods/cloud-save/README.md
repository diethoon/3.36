# 클라우드세이브 — Google Drive 로그인 간소화 버전

이 모드는 Google Drive의 앱 전용 저장 공간에 세이브를 직접 기록하는 WML 모드입니다. 게임 세이브는 Cloudflare Worker나 로그인 중계 페이지에 업로드하지 않습니다.

## 사용자 입장

1. cloud-save 폴더를 wml/mods/에 넣고 기존 wml/mods/mods.js의 WML.enable([...])에 'cloud-save'를 추가합니다(이미 있으면 중복 추가하지 않습니다).
2. 게임에서 클라우드세이브를 열고 Google 계정으로 연결을 누릅니다.
3. 열린 로그인 창 안에서 Google 계정을 선택하고 이 모드의 Google Drive 앱 데이터 접근을 승인합니다. Google 인증 후 같은 창이 게임으로 결과를 전달합니다.
4. 슬롯을 선택해 저장/불러오기를 합니다. 서로 다른 기기에서는 같은 Google 계정과 같은 세이브 암호화 비밀번호를 사용하세요.

사용자마다 Google Cloud 프로젝트, OAuth 클라이언트 ID, API 키를 만들거나 입력할 필요가 없습니다. 브라우저가 첫 번째 로그인 창을 차단하면 팝업을 허용해야 할 수 있습니다.

## 개발자 1회 설정

Google OAuth는 앱 개발자가 소유하는 클라이언트 등록 정보를 요구합니다. 사용자 모두는 동일한 앱 클라이언트를 사용하며 개인 클라우드 프로젝트를 만들 필요가 없습니다.

1. 별도 Vercel 프로젝트의 Root Directory를 cloud-save-auth로 설정합니다. 기본 도메인은 https://wayward-cloud-auth.vercel.app 입니다.
2. Vercel 환경 변수에 GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET을 설정합니다. OAUTH_STATE_SECRET에는 32자 이상의 무작위 값을 설정하는 것이 좋습니다. 비밀값은 GitHub나 모드 ZIP에 넣지 않습니다.
3. Google Cloud에서 Google Drive API를 활성화하고 OAuth 동의 화면을 구성한 뒤 Web application OAuth 클라이언트를 만듭니다.
4. 승인된 리디렉션 URI에 https://wayward-cloud-auth.vercel.app/api/oauth/callback 을 정확히 추가합니다. 브리지 도메인을 변경했다면 해당 도메인의 /api/oauth/callback URI를 등록하고 AUTH_BRIDGE_ORIGIN 및 모드의 AUTH_BRIDGE_URL도 맞춥니다.
5. Google Drive의 appDataFolder에 해당하는 https://www.googleapis.com/auth/drive.appdata 권한만 요청합니다. 공개 배포 전에는 OAuth 동의 화면 게시 및 Google이 요구하는 검증을 완료합니다.

## 저장 및 보안

- 세이브는 기기에서 PBKDF2-SHA-256 및 AES-256-GCM으로 암호화한 뒤 Google Drive appDataFolder에 직접 기록합니다.
- 세이브 암호화 비밀번호와 복호화 키는 로그인 중계 서버나 Google API로 보내지 않습니다.
- 액세스 토큰은 인증 중계 서버에서 코드 교환 후 같은 창을 통해 게임에 전달되며, 서버에 저장하지 않습니다. 게임 페이지 메모리에서만 보관하고 만료 후 다시 연결해야 합니다.
- 세이브 암호화 비밀번호를 잊으면 복구할 수 없습니다. 다른 기기에서 같은 세이브를 열 때도 같은 비밀번호가 필요합니다.
- 슬롯 수 제한을 두지. 암호화된 JSON 파일 내보내기/가져오기로 별도 백업도 만들 수 있습니다. 각 슬롯에 선택적 메모를 붙일 수 있으며, 목록에서 한 줄로 잘라 표시하고 누르면 전체 메모를 볼 수 있습니다. 진행 정보와 저장 시각도 표시합니다.
- 기존 Cloudflare Worker에 저장했던 계정 세이브와 1회성 코드는 자동 이관되지 않습니다.

## 문제 해결

- 팝업이 열리지 않으면 브라우저에서 팝업을 허용하고 다시 시도하세요. Google 인증 자체는 열린 로그인 창 안에서 리디렉션으로 진행되어 중첩 팝업을 사용하지 않습니다.
- file:// 실행은 지원 경로로 추가했지만, 브라우저가 로컬 파일의 출처를 고유하게 검증할 수 없어 HTTPS보다 출처 보호가 약합니다. 브리지에서 로컬 파일 실행 확인란을 체크해야 합니다. WebCrypto, 팝업 또는 Drive CORS가 차단되는 브라우저에서는 localhost/AWebServer/HTTPS로 실행하세요.
- 로그인 서비스가 설정되지 않았다고 나오면 Vercel의 GOOGLE_CLIENT_ID 및 GOOGLE_CLIENT_SECRET 설정과 배포 상태를 확인하세요.
- redirect_uri_mismatch 오류가 나면 Google OAuth 클라이언트에 등록한 /api/oauth/callback 주소가 실제 브리지 주소와 정확히 일치하는지 확인하세요.
- 저장 목록이 보이지 않으면 동일한 Google 계정인지 확인하세요. Google Drive appDataFolder는 OAuth 앱 단위로 분리됩니다.
