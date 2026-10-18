이부키 캐릭터 애드온 — WML 수정판

기존 모드 ID와 동일: wifeaddon_ibuki
버전: 1.0.5
폴더명: WifeAddon_ibuki
필요한 별도 WML 모드: 없음. 게임의 호환 브리지를 사용합니다.

핵심 수정
- 예전 mod.js의 preload 스크립트 주입과 경고 호출을 제거했습니다.
- WML 게임 호환 브리지의 registerWives()를 setup() 안에서 호출합니다.
- 존재하지 않는 WML 의존성 "addon-compat"를 requires에 등록하지 않습니다.
- 기존 모드와 같은 ID(wifeaddon_ibuki)를 유지하므로, 설치 관리자의 기존 항목과 별도 ID로 충돌 없이 공존시키는 방식이 아닙니다.

설치
1. AWebServer 파일 폴더 방식이라면, 먼저 기존 wml/mods/WifeAddon_ibuki 폴더를 통째로 삭제해 예전 bridge.manifest.json이나 옛 mod.js가 남지 않게 합니다.
2. ZIP을 풀어 WifeAddon_ibuki/mod.js와 README.txt를 둡니다. Addon_Newwife_ibuki.js는 새 mod.js 안에 통합되어 있어 별도 실행할 필요가 없습니다.
3. WML 모드 목록에서 wifeaddon_ibuki를 켜고 게임을 새로고침합니다.
4. WML 관리자에 ZIP으로 설치하는 방식이라면 같은 ID의 기존 항목을 교체한 뒤 새로고침합니다.

이미지 팩
이 mod.js는 images-ibuki-1.js와 images/ 폴더를 직접 불러오지 않습니다. 이미지 팩 파일은 게임 최상위 폴더에 그대로 두세요. 현재 소스에서 확인한 호환 훅은 images-${who}-custom.js를 추가하며, images-ibuki-1.js의 자동 로딩 여부는 게임 본체의 이미지 로더에서 별도로 확인해야 합니다.
