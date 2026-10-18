이부키 캐릭터 애드온 — WML 수정판

WML 모드 ID: wifeaddon_ibuki
버전: 1.0.6
폴더명: wifeaddon_ibuki (반드시 ID와 동일하게 소문자)
필요한 별도 WML 모드: 없음

이번 수정에서 확인·수정한 문제
- 구버전 mod.js가 출력하던 "legacy preload registration executed before the game module" 경고를 내는 preload 경로를 제거했습니다.
- WML setup()에서 게임의 호환 브리지 registerWives()를 호출합니다.
- 존재하지 않는 WML 의존성 addon-compat를 요구하지 않습니다.
- 폴더 이름을 WML ID와 똑같은 소문자 wifeaddon_ibuki로 맞췄습니다. AWebServer가 URL 경로의 대소문자를 구분하면 대문자 WifeAddon_ibuki 폴더와 ID wifeaddon_ibuki가 서로 다른 주소가 됩니다.

설치 절차 (가장 안전한 방법)
1. 기존 WML 모드 관리자에서 wifeaddon_ibuki 구버전이 브라우저에 설치돼 있다면 관리자 안에서 그 항목을 삭제합니다. 브라우저에 저장된 모드는 디스크 폴더보다 우선 적용될 수 있습니다.
2. 이 ZIP을 WML 모드 관리자에서 가져옵니다.
3. 목록에 ID wifeaddon_ibuki, 버전 1.0.6이 표시되는지 확인하고 켭니다.
4. 게임을 새로고침합니다.

AWebServer 폴더에 직접 설치할 경우
1. 기존 wml/mods/WifeAddon_ibuki 폴더를 통째로 삭제합니다.
2. ZIP을 풀고 내부의 wifeaddon_ibuki 폴더를 wml/mods/ 아래에 둡니다. 경로가 wml/mods/wifeaddon_ibuki/mod.js인지 확인합니다.
3. WML 브라우저 관리자에 같은 ID로 구버전이 별도 설치돼 있지 않도록 삭제한 뒤 새로고침합니다.

이미지 팩
- images-ibuki-1.js 및 images/ 폴더는 게임 최상위 폴더에 그대로 두세요. 이 애드온의 mod.js가 그 파일을 직접 불러오는 구조는 아닙니다.
- 현재 확인된 호환 훅은 images-${who}-custom.js 패턴을 추가합니다. images-ibuki-1.js의 자동 로딩 여부는 게임 본체의 이미지 로더에서 별도 확인이 필요하며, 이 애드온 수정만으로 7GB 이미지 팩이 연결됐다고 단정하지 않습니다.
