Faith 이미지팩 로더 — ZIP 직접 등록 실험판

목표
- 게임의 실제 네이티브 이미지 스크립트 등록 경로(WOe → images.js / images-<캐릭터>*.js)에 ZIP에서 추출한 팩을 직접 공급합니다.
- 기존 wfPackScanFolder / pack.js 폴더 선택 경로에 의존하지 않고, ZIP 파일 선택만으로 등록을 시도합니다.
- 생성형 이미지 설정(auto/custom)에서는 네이티브 팩을 반환하지 않아 생성형 이미지 경로를 분리합니다. 이미지 전용 설정(off)에서 ZIP을 등록하세요.
- 원본 이미지팩 목록과 localStorage를 삭제하지 않습니다.

설치
1. 이 폴더를 WML의 mods/faith-image-loader/에 둡니다.
2. WML에서 faith-image-loader 모드를 활성화하고 게임을 새로고침합니다.
3. 이미지 생성 설정을 사용하려면 auto/custom을 유지하고, ZIP 네이티브 이미지팩을 표시하려면 설정을 off로 바꿉니다.
4. “Faith 이미지팩 로더” 버튼에서 “ZIP에서 이미지 직접 불러오기”를 누르고 ZIP을 선택합니다.

지원하는 ZIP 내용
- 이 게임의 네이티브 이미지 스크립트: images.js, images-<캐릭터>.js, images-<캐릭터>-1.js, images-<캐릭터>-2.js 등.
- ZIP 안의 경로가 루트이거나 상위 폴더(예: Wayward_Faith/) 아래인 경우 모두 파일명 기준으로 검색합니다.
- ZIP 내부에서 이미지 스크립트만 추출하고, 각각 격리된 window.__WAYWARD_IMAGE_PACKS__ 레지스트리에서 실행한 뒤 WOe 반환값에 합칩니다.
- 이미지 파일이 별도로 들어 있는 것만으로는 등록되지 않습니다. 게임 네이티브 스크립트가 참조하는 이미지 데이터/경로가 해당 스크립트에 포함되어 있어야 합니다.
- image-packs/<팩>/.../pack.js만 포함하는 구형/별도 포맷 ZIP은 지원하지 않습니다. 현재 대상 HTML은 wfPackScanFolder 심볼을 노출하지 않으며, 해당 포맷은 이 로더가 직접 처리하지 않습니다.

호환성 및 제한
- ZIP 선택은 표준 input[type=file]을 사용하므로 showDirectoryPicker와 webkitdirectory를 요구하지 않습니다. file://, 일반 브라우저, Android 브라우저, WebView 기반 앱에서 파일 선택 UI를 사용할 수 있는 환경을 대상으로 합니다.
- Store(압축 안 함) ZIP은 브라우저의 ZIP 압축 API 없이 처리합니다.
- Deflate ZIP은 DecompressionStream('deflate-raw') 지원이 필요합니다. 이를 지원하지 않는 구형 브라우저/WebView에서는 “압축 안 함(Store)” 방식으로 다시 압축해야 합니다. 따라서 모든 구형 WebView 호환성이 아직 보장된 것은 아닙니다.
- 분할 ZIP, ZIP64, 암호화 ZIP은 지원하지 않습니다.
- ZIP 중앙 디렉터리는 최대 128MB, 개별 이미지 스크립트는 압축 해제 후 최대 96MB까지 허용합니다. 모바일 메모리가 부족하면 더 작은 ZIP/스크립트 묶음으로 나누세요.
- 각 스크립트는 실행 가능한 JavaScript입니다. 출처를 신뢰하는 ZIP만 불러오세요.
- 실제 Android 브라우저/APK WebView에서 이미지가 출력되는지, 이미지 캐시가 갱신되는지 아직 실기기 검증이 필요합니다. 성공 메시지는 팩 데이터가 등록됐다는 뜻이며, 모든 이미지가 실제로 렌더링됐음을 보증하지 않습니다.

생성형 이미지 모드와 공존
- imageBackendMode=auto/custom이면 WOe 게이트가 빈 목록을 반환합니다.
- imageBackendMode=off이면 ZIP에서 등록한 팩과 원본 네이티브 팩을 packId 기준으로 합칩니다.
- ZIP 등록 뒤 qD()와 m312ImageChanged()를 호출해 게임의 팩/이미지 캐시를 무효화합니다.
