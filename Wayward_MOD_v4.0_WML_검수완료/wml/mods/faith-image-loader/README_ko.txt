Faith 이미지팩 로더 v1.1.0

기능
- imageBackendMode가 auto/custom이면 원본 이미지팩 로더 게이트를 적용하고 이 모드의 등록 UI를 숨깁니다.
- off이면 원본 이미지팩 로더를 그대로 사용합니다.
- 폴더 가져오기는 원본 wfPackScanFolder가 존재하는 경우에만 작동하며, image-packs 아래의 pack.js만 원본 등록기에 전달합니다.
- Faith outfit ZIP 가져오기는 별도 경로입니다. ZIP의 pack.js를 읽어 window.__WF_OUTFIT_PACKS__ 레지스트리에 등록하고, pack.js가 참조하는 images/*.webp를 개별 Blob URL로 연결합니다.
- ZIP 전체를 한 번에 압축 해제하지 않습니다. 중앙 디렉터리를 읽은 뒤 pack.js와 실제 참조된 WebP만 하나씩 처리합니다.

ZIP 형식
- 지원 구조: pack.js와 images/*.webp가 같은 팩 루트 아래에 있는 일반 ZIP. 루트에 바로 pack.js/images가 있거나, 그 위에 래퍼 폴더 하나가 있어도 됩니다.
- pack.js는 window.__WF_OUTFIT_PACKS__["key"] = { ... } 형태의 packFormat: 1 JSON 객체를 포함해야 합니다.
- entries의 imagePath는 images/파일명.webp 형식이어야 하며, 해당 파일이 ZIP에 있어야 합니다.
- 지원 압축 방식은 Store(무압축)와 Deflate입니다. 암호화 ZIP, 분할 ZIP, ZIP64는 지원하지 않습니다. Deflate 해제에는 브라우저의 DecompressionStream('deflate-raw')가 필요합니다.
- 팩은 현재 페이지 실행 세션의 레지스트리에 등록됩니다. 현재 구현에서는 페이지를 새로고침하면 ZIP을 다시 선택해야 합니다. 이미지 Blob URL은 새로고침 뒤 유지되지 않습니다.
- 참조 이미지 총량 600MB 초과, 개별 이미지 20MB 초과, pack.js 4MB 초과는 안전을 위해 거부합니다.

사용
1. 게임에서 이미지 backend 모드를 off로 설정합니다.
2. WML의 “Faith 이미지팩 로더”를 엽니다.
3. “ZIP 이미지팩 불러오기”를 눌러 faith-extra.zip 같은 ZIP을 선택합니다.
4. 완료 메시지에 표시되는 이미지 수와 연결량을 확인합니다. 이후 게임에서 해당 팩의 이미지가 실제로 표시되는지 확인해야 합니다.

주의 / 검증 상태
- ZIP 파일 자체를 GitHub 저장소에 포함하지 않습니다. ZIP은 게임 내에서 사용자가 직접 선택합니다.
- JavaScript 구문 검사는 통과했습니다.
- 현재 자동화된 검사는 ZIP 구조 분석과 레지스트리 연결 코드의 정적 검토까지입니다. 실제 Faith 게임의 팩 선택 UI가 런타임 중 레지스트리 변경을 즉시 반영하는지, Android WebView에서 대용량 ZIP이 안정적으로 처리되는지는 실기기 확인이 필요합니다.
- 이미지팩 로딩은 게임 내부에서 실제로 imagePath를 어떻게 소비하는지에 의존합니다. 완료 메시지만으로 이미지 출력 성공을 확정하지 말고, 게임 화면에서 실제 이미지를 확인하세요.
