# 클라우드세이브 WML 모드

## 기능

- 게임 삼선 메뉴의 **클라우드세이브**에서 진입하며, 메뉴 구조가 다른 빌드에는 WML 도크 버튼을 보조 진입점으로 제공합니다.
- 시작 화면에서도 **새 게임 / 불러오기**와 함께 **클라우드 불러오기** 버튼을 제공해, 새 게임을 시작하지 않고 기존 세이브를 가져올 수 있습니다.
- 첫 화면: **로그인 / 1회성 코드**.
- 계정: OPAQUE 비밀번호 비공개 인증, 계정당 5개 슬롯, 저장·덮어쓰기·불러오기·삭제.
- 계정 세이브는 기기에서 AES-256-GCM으로 암호화됩니다. Worker에는 암호문만 저장되고 복호화 키는 전송되지 않습니다.
- 1회성 코드: 6자리 영문·숫자 코드, 7일 만료, 첫 로드 성공 시 서버에서 삭제. 하지만 첫 사용 전에 코드를 확보한 사람은 불러올 수 있으므로 공개 게시물에 올리지 말고 신뢰하는 상대에게만 전달하세요. 계정 저장과 달리 이 기능은 종단 간 암호화가 아닙니다.
- 동일한 게임 엔진 버전의 세이브만 불러옵니다.

## 설치 파일

wml/mods/cloud-save/ 폴더에 다음 파일이 필요합니다.

- mod.js
- crypto.js
- opaque-client.bundle.js
- README.md

wml/mods/mods.js의 WML.enable([...]) 목록에 "cloud-save"가 포함되어 있어야 합니다.

## 계정 기능 활성화 전 필수 설정

1. 신뢰할 수 있는 로컬 PC에서 @serenity-kit/opaque@1.1.0 CLI의 create-server-setup 명령으로 서버 비밀 설정을 생성합니다.
2. 전체 출력값은 Cloudflare Worker Secret OPAQUE_SERVER_SETUP에만 넣습니다. GitHub 저장소, 이슈, 채팅에는 올리지 마세요.
3. 같은 CLI의 get-server-public-key 명령으로 공개키를 구합니다.
4. 공개키만 이 모드의 OPAQUE_SERVER_PUBLIC_KEY 상수에 입력하고 커밋합니다. SET_AFTER_GENERATING_OPAQUE_SERVER_SETUP 상태에서는 로그인과 가입이 의도적으로 차단됩니다.
5. 운영 D1에 workers/wayward-save-share/schema.sql을 적용하고, 빌드된 workers/wayward-save-share/index.js를 Worker에 배포합니다. index.src.js는 npm 의존성이 있는 원본이므로 Dashboard에 직접 붙여넣지 마세요.

서버 비밀 설정은 한 번 만들고 안전하게 보관해야 합니다. 이 설정을 교체하면 기존 OPAQUE 인증 기록을 사용할 수 없습니다.

## 보안 및 계정 복구

- 아이디: 영문자·숫자·밑줄 3~24자. 비밀번호: 10~128자.
- 비밀번호 원문은 Worker로 보내지 않습니다. 서버에는 OPAQUE 인증 기록만 저장됩니다.
- 복호화 키는 OPAQUE의 클라이언트 exportKey에서 기기 안에서 파생되며 서버로 보내지 않습니다.
- 로그인 세션과 exportKey는 WML 비밀 저장소에 보관됩니다.
- 비밀번호를 잊으면 암호화 세이브를 복구할 수 없습니다. 이메일 복구 기능은 없습니다.
- 악의적으로 변조된 모드가 입력 시점에 비밀번호를 훔치는 공격까지 OPAQUE가 막아 주지는 않습니다. 모드는 신뢰할 수 있는 배포 경로에서 받으세요.
