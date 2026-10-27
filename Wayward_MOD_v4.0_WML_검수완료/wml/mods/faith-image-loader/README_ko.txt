Faith 원본 이미지팩 로더 v1.0.0

목표
- DOM의 img src/background-image를 Blob URL로 바꾸지 않습니다.
- Faith 게임 본체의 원본 wfPackScanFolder / wfPackValidate 등록 흐름을 호출합니다.
- 이미지 파일을 수천~수만 개 직접 색인하지 않습니다. image-packs 안의 pack.js만 읽고, 이미지 경로는 원본 이미지팩 시스템이 처리합니다.
- 원본 등록기가 등록한 wfImagePacks 목록을 갱신하므로, 캐릭터 이미지팩이 정상 등록되면 “elena 이미지팩이 설치되어 있지 않습니다” 메시지도 원본 로직에 따라 사라져야 합니다.

설치
1. 이 폴더를 wml/mods/faith-image-loader/ 에 둡니다.
2. WML에서 faith-image-loader 모드를 활성화합니다.
3. 게임을 새로고침하고 WML 버튼 줄의 “Faith 원본 이미지팩”을 엽니다.

사용 — 권장 경로
1. “image-packs 폴더 선택 (단계 처리)”를 누릅니다.
2. 게임 HTML 옆에 있는 image-packs 최상위 폴더를 선택합니다.
3. 모드는 디렉터리를 순회하되 이름이 images인 하위 폴더는 건너뛰고 pack.js만 읽습니다. 이미지 파일 내용은 열지 않습니다.
4. 등록 완료 후 원본 게임의 이미지팩 관리 목록에서 팩 이름과 그림 수를 확인하고, Elena 이미지가 표시되는지 확인합니다.

호환용 선택
- 브라우저에서 showDirectoryPicker를 지원하지 않을 때만 “호환용 폴더 선택”을 사용합니다.
- 반드시 image-packs 최상위 폴더를 선택하세요. faith-elena 같은 캐릭터 폴더나 base 폴더를 선택하면 안 됩니다.
- 이 방식은 브라우저가 폴더의 파일 목록을 먼저 만들기 때문에 파일이 아주 많은 기기에서는 목록 생성에 시간이 걸릴 수 있습니다. 가능하면 단계 처리 버튼을 사용하세요.

왜 이 방식인가
- 원본 코드의 wfPackScanFolder는 파일의 webkitRelativePath에서 image-packs/ 경로를 확인하고 pack.js만 읽습니다.
- 각 pack.js는 원본 wfPackValidate를 거치고, 원본 설정 저장소의 wfImagePacks 목록과 원본 이미지팩 카탈로그를 갱신합니다.
- 팩 메타데이터에는 image-packs/<팩>/base/pack.js 같은 경로가 보존됩니다. 이미지 파일을 별도 모드 색인에 복제하지 않습니다.
- 등록된 팩은 원본 로더의 경로 생성과 캐시/설정 흐름을 사용합니다. 새 이미지팩을 추가할 때마다 모드 코드를 수정할 필요가 없습니다.

안전장치 및 한계
- 실행 중인 게임에서 원본 wfPackScanFolder 함수를 찾지 못하면 파일을 읽거나 등록하지 않고 오류를 표시합니다. 다른 게임 HTML에 잘못 적용하지 않기 위한 동작입니다.
- image-packs 폴더가 게임 HTML 옆에 있어야 원본의 상대 경로 image-packs/.../images/...가 실제 파일에 연결됩니다.
- 폴더 이름은 정확히 image-packs여야 합니다. 루트가 아닌 폴더를 고르면 등록 전에 거부합니다.
- 단계 처리 방식은 File System Access API를 지원하는 보안 컨텍스트에서 동작합니다. file:// 또는 일반 HTTP 환경에서 지원되지 않으면 호환용 선택을 사용할 수 있지만, 아주 큰 FileList를 만드는 과정은 브라우저 자체의 제약을 받습니다.
- 정적 JavaScript 구문 검사는 통과했습니다. 실제 Android 기기에서 원본 등록 함수 노출, 이미지팩 목록 갱신, 이미지 표시 및 새로고침 후 복원은 반드시 실기기에서 확인해야 합니다. 실기기 검증 전에는 완성 검증판으로 간주하지 마세요.
