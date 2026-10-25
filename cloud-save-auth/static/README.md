# 정적 Google Drive 인증 페이지

이 디렉터리는 Wayward WML 클라우드세이브용 **정적 페이지**입니다. Vercel Functions, OAuth 콜백 API, 토큰 교환 서버 또는 세이브 저장 백엔드를 사용하지 않습니다. 브라우저에서 Google Identity Services를 호출하고, 짧은 수명의 액세스 토큰을 게임 팝업에 직접 전달합니다.

## 배포

GitHub Pages가 저장소 루트의 브랜치를 게시하도록 설정되어 있다면 이 파일은 다음 경로에서 제공됩니다.

`https://diethoon.github.io/3.36/cloud-save-auth/static/`

GitHub 저장소 Settings → Pages에서 게시 소스가 이 저장소의 해당 브랜치 루트를 가리키는지 확인하세요. Pages가 다른 게시 방식을 사용 중이면 이 디렉터리를 포함하도록 해당 게시 설정을 조정해야 합니다. 배포가 실제로 완료되기 전에는 위 URL이 작동한다고 간주하지 마세요.

## Google OAuth 설정

1. `config.js`의 `REPLACE_WITH_GOOGLE_OAUTH_WEB_CLIENT_ID.apps.googleusercontent.com`를 Google Cloud Console에서 발급한 **웹 애플리케이션 OAuth 클라이언트 ID**로 바꿉니다.
2. OAuth 클라이언트의 승인된 JavaScript 출처에 `https://diethoon.github.io`가 등록되어 있는지 확인합니다.
3. Google Drive API가 활성화되어 있고 `https://www.googleapis.com/auth/drive.appdata` 범위에 대한 사용자 동의가 가능한지 확인합니다.
4. 정적 페이지를 HTTPS로 배포한 뒤, 게임의 `mod.js`가 가리키는 주소에서 로그인 → 토큰 전달 → Drive 슬롯 조회/저장/불러오기를 실제 테스트합니다.

OAuth 클라이언트 ID는 공개 값이므로 정적 설정 파일에 둘 수 있습니다. **클라이언트 비밀키나 다른 비밀값은 절대로 넣지 마세요.**

## 제한 및 보안

- 이 페이지는 세이브 파일을 받거나 저장하지 않습니다. 게임이 Google Drive API를 직접 호출하며 기존 암호화 로직을 유지합니다.
- 액세스 토큰은 게임 페이지 메모리에만 보관합니다.
- `file://` 게임 창은 opaque origin(`null`)이므로 결과 메시지는 와일드카드 target origin으로 전달됩니다. 게임 쪽은 인증 페이지의 정확한 출처, 팝업 WindowProxy, 일회성 nonce를 모두 확인해야 합니다.
- Google OAuth 웹 출처 정책은 이 정적 페이지가 HTTPS로 실행되는 것에 적용됩니다. 이 변경은 Google 인증 자체를 외부 서비스 없이 수행하는 것이 아니라, **별도의 인증 중계 서버를 제거**하는 변경입니다.
