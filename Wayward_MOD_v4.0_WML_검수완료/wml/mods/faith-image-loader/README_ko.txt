Faith 이미지팩 로더 v2.0.0 — 로컬 경로 방식

목표
- 이미지팩을 게임 HTML 옆의 image-packs 폴더에 압축 해제해 두면, 게임 시작 때 pack.js를 자동으로 읽습니다.
- 폴더 선택기나 전체 파일 목록(input.files)을 사용하지 않습니다.
- pack.js의 이미지 경로를 게임의 실제 imageManifest에 연결합니다.
- 이미지 파일은 게임 화면에서 요청될 때 해당 이미지팩 폴더의 URL로 직접 읽습니다. 이미지 전체를 미리 메모리로 올리지 않습니다.
- 기존 게임 로직·세이브·RNG·ID는 변경하지 않습니다.

설치
1. ZIP을 풉니다.
2. 안의 faith-image-loader 폴더를 게임의 wml/mods/ 폴더에 넣습니다.
3. WML에서 faith-image-loader 모드를 활성화합니다.
4. 게임 HTML과 같은 폴더에 image-packs 폴더를 둡니다.
5. 이미지팩 ZIP은 image-packs 안에서 아래 구조가 되도록 압축 해제합니다.
6. 게임을 새로고침합니다. 모드가 알려진 pack.js 경로를 자동으로 확인합니다.

기본 지원 경로
- image-packs/faith-elena/base/pack.js
- image-packs/faith-mara/base/pack.js
- image-packs/faith-pippa/base/pack.js
- image-packs/faith-extra/pack.js
- image-packs/ssff-denia/base/pack.js
- image-packs/ssff-hitori/base/pack.js
- image-packs/ssff-kaguya/base/pack.js
- image-packs/ssff-phoebe/base/pack.js
- image-packs/ssff-roxy/base/pack.js
- image-packs/ssff-viper/base/pack.js

예시
게임 폴더/
  Wayward_WML_ko.html
  image-packs/
    faith-elena/
      base/
        pack.js
        images/
          *.webp
    faith-extra/
      pack.js
      images/
        *.webp
    ssff-denia/
      base/
        pack.js
        images/
          *.webp
    ...

추가 팩 경로
기본 목록에 없는 팩은 image-packs/index.js 파일을 만들고 다음처럼 경로를 지정할 수 있습니다.
경로는 image-packs 폴더를 기준으로 한 상대 경로입니다.

window.__WF_IMAGE_PACK_PATHS__ = [
  "faith-elena/base/pack.js",
  "faith-extra/pack.js",
  "새제작자-새캐릭터/base/pack.js"
];

동작 원리
1. 모드가 image-packs/index.js(있으면)를 먼저 읽고, 없으면 기본 경로 목록을 사용합니다.
2. 각 pack.js를 script 요소로 실행해 Faith 팩 데이터를 가져옵니다. 이미지 파일은 열거하지 않습니다.
3. WML의 imageManifest 훅에서 팩 항목을 게임의 실제 이미지 조회 목록에 합칩니다.
4. 게임이 이미지를 표시할 때 생성하는 가상 경로(wfil-folder)를 실제 image-packs 하위 이미지 URL로 바꿉니다.
5. 이미지 데이터는 브라우저가 표시 시점에 직접 요청하고 캐시합니다.

실행 환경 제한
- file://, HTTP, HTTPS에서 같은 문서 기준 상대 경로로 image-packs 파일에 접근할 수 있어야 합니다.
- HTTPS로 원격 서버에서 게임을 연다면 image-packs 폴더도 그 서버의 같은 경로로 제공되어야 합니다. 브라우저가 기기 외부 저장소의 임의 폴더를 자동으로 읽게 만드는 우회 기능은 아닙니다.
- WML 플레이어에서는 앱이 게임 HTML 옆의 image-packs 폴더를 웹 경로로 제공하는 경우에만 사용할 수 있습니다.
- 기본 목록에 없는 새 팩은 index.js에 경로를 추가해야 합니다. 브라우저 폴더 목록을 자동 열거하는 방식은 아닙니다.
- ZIP 가져오기는 기존 단일 pack.js ZIP 경로를 유지합니다. 여러 pack.js가 들어 있는 통합 ZIP은 로컬 image-packs 경로 방식으로 압축 해제해 사용하세요.

검증 상태
- mod.js 구문 검사: 통과.
- 실제 게임의 imageManifest 함수(Wb)와 imagePackReset 함수(qD) 존재를 원본 HTML 및 WML 심볼 표에서 확인했습니다.
- 실제 Android Firefox 및 WML 플레이어에서 로컬 경로 이미지가 출력되는 런타임 테스트는 아직 수행하지 않았습니다.
