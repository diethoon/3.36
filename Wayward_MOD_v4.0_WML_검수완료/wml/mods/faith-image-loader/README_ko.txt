Faith 이미지팩 로더 v1.3.0

목표
- Faith 개선 로더로 폴더 및 ZIP 이미지팩을 등록합니다.
- 생성형 이미지 설정 감지, 모드별 분기, 감시·전환 코드는 포함하지 않습니다.
- ZIP은 pack.js와 이미지 경로를 검사한 뒤, 실제 표시되는 이미지 파일만 필요할 때 압축 해제해 Blob URL로 연결합니다.

폴더 가져오기
- image-packs 최상위 폴더에서 pack.js를 찾아 게임의 wfPackScanFolder 등록 함수에 전달합니다.
- 이미지 파일 전체를 미리 읽지 않고 pack.js만 전달하므로 대규모 이미지 폴더의 초기 스캔 비용을 줄입니다.
- 단계별 폴더 선택 API를 지원하지 않는 실행 환경에서는 호환용 폴더 선택기를 사용합니다.
- 폴더 등록은 Faith 게임에서 wfPackScanFolder 브리지가 제공되어야 합니다.

ZIP 형식
- 지원 구조: pack.js와 images/*.webp가 같은 팩 루트 아래에 있는 일반 ZIP. 루트에 바로 pack.js/images가 있거나, 그 위에 래퍼 폴더 하나가 있어도 됩니다.
- pack.js는 window.__WF_OUTFIT_PACKS__["key"] = { ... } 형태의 packFormat: 1 JSON 객체를 포함해야 합니다.
- entries의 imagePath는 images/파일명.webp 형식이어야 하며, 해당 파일이 ZIP에 있어야 합니다.
- 지원 압축 방식은 Store(무압축)와 Deflate입니다. 암호화 ZIP, 분할 ZIP, ZIP64는 지원하지 않습니다.
- Deflate 압축은 브라우저의 DecompressionStream('deflate-raw') 지원이 필요합니다. 이 API가 없거나 구현되지 않은 구형 브라우저/WebView에서는 압축 ZIP 이미지가 작동하지 않을 수 있습니다.
- 참조 이미지 총량 600MB 초과, 개별 이미지 20MB 초과, pack.js 4MB 초과는 안전을 위해 거부합니다.
- Chromium 계열에서 File System Access API와 IndexedDB 파일 핸들 저장을 지원하면 선택한 ZIP 파일 핸들을 저장하고, 권한이 이미 허용된 경우 다음 실행에서 자동 복원을 시도합니다.
- 권한이 다시 필요하면 “저장된 ZIP 복원” 버튼을 눌러 승인할 수 있습니다. 원본 ZIP 파일을 이동·삭제했거나 브라우저 데이터/사이트 저장소를 지우면 복원되지 않을 수 있습니다.
- 파일 핸들 API가 없는 브라우저·앱 내 WebView에서는 일반 파일 선택기로 동작하며, 새로고침/재실행 후 ZIP을 다시 선택해야 할 수 있습니다. IndexedDB에는 ZIP 전체 바이트가 아니라 파일 핸들만 저장합니다.

실행 환경 및 검증
- 모드 UI는 브라우저의 폴더 선택 API를 우선 사용하고, 미지원 시 input[webkitdirectory] 호환 경로로 전환합니다.
- ZIP 파일은 File/Blob slice, ArrayBuffer, TextDecoder, Blob URL, MutationObserver를 사용합니다. 일부 구형 앱 내 WebView에서 이 API들이 제한될 수 있습니다.
- 구문 검사와 실제 게임 화면 검증은 별개입니다. 등록 완료 메시지만으로 이미지 출력 성공을 확정하지 말고, 실제 캐릭터/의상 이미지가 표시되는지 확인해야 합니다.
- 현재 구현은 폴더 등록에 원본 wfPackScanFolder를 사용하고 ZIP 등록·이미지 연결에는 별도 로직을 사용합니다. 모든 브라우저 및 앱 포팅 환경에서의 동작은 각 환경에서 실기기 검증이 필요합니다.

사용
1. WML에서 “Faith 이미지팩 로더”를 엽니다.
2. 폴더 가져오기는 image-packs 최상위 폴더를 선택합니다.
3. ZIP 가져오기는 “ZIP 이미지팩 불러오기”를 눌러 호환되는 ZIP을 선택합니다. 지원 브라우저에서는 이후 “저장된 ZIP 복원”으로 접근 권한을 다시 승인할 수 있습니다.
4. 완료 메시지 이후 게임 내에서 해당 팩의 실제 이미지가 출력되는지 확인합니다.
