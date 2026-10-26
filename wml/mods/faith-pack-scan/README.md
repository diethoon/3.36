# Faith 이미지팩 등록 개선 모드

## v0.3.0 변경점

- 원본 `image-packs` 폴더처럼 파일이 2,000개를 초과하는 선택은 즉시 중단합니다. 6만여 파일을 다시 훑다가 모바일 브라우저가 멈추는 상황을 피하기 위한 안전장치입니다.
- 등록용 `image-packs-index` 폴더에서 `pack.js`만 찾아 게임의 기존 등록기에 전달합니다.
- 이미지 파일 자체는 이동하거나 복사하지 않습니다.
- Android 기기에서 실제 등록 및 이미지 출력까지 성공했는지는 아직 검증되지 않았습니다.

## 등록용 폴더 만들기

이미지팩 원본은 그대로 유지합니다. 파일 관리자에서 별도의 폴더를 만들고, 각 팩의 `base/pack.js`만 복사합니다. 아래처럼 경로 안에 `image-packs/` 디렉터리가 유지되어야 합니다.

```text
Wayward_Faith/
├── image-packs/                         # 기존 이미지 전체: 변경하지 않음
│   ├── faith-elena-basic/base/pack.js
│   ├── faith-elena-basic/base/images/   # 원본 이미지들
│   └── ...
└── image-packs-index/                   # 새로 만드는 등록 전용 폴더
    └── image-packs/
        ├── faith-elena-basic/base/pack.js
        ├── faith-extra/base/pack.js
        ├── faith-mara-basic/base/pack.js
        ├── faith-pippa-basic/base/pack.js
        ├── ssff-denia-basic/base/pack.js
        ├── ssff-hitori-basic/base/pack.js
        ├── ssff-kaguya-basic/base/pack.js
        ├── ssff-phoebe-basic/base/pack.js
        ├── ssff-roxy-basic/base/pack.js
        └── ssff-viper-basic/base/pack.js
```

**중요:** 위 목록은 예시입니다. 실제 폴더 이름과 각 팩의 상대 경로를 그대로 유지하고, 보유한 각 팩의 실제 `pack.js`를 복사하세요. `images` 폴더는 복사하지 마세요. `pack.js`를 임의로 새로 만들면 안 됩니다.

## 실행

1. 모드를 `wml/mods/faith-pack-scan/mod.js` 위치에 설치하고 WML에서 활성화합니다.
2. 게임의 이미지팩 관리 화면에서 **`image-packs-index` 폴더 자체**를 선택합니다. 원본 `image-packs` 폴더는 선택하지 마세요.
3. 상태 메시지를 확인합니다.
4. 등록 결과와 실제 캐릭터 이미지 출력을 별도로 확인합니다.

## 상태 메시지 해석

- **활성화 문구가 없음:** 모드가 로드되지 않았거나 선택기 입력 요소를 찾지 못했습니다.
- **선택 파일이 2,000개를 초과하여 처리를 중단:** 등록 전용 폴더 대신 원본 대형 폴더를 선택했습니다.
- **pack.js를 찾지 못함:** 등록용 폴더 구조 또는 선택한 폴더가 올바르지 않습니다.
- **pack.js를 전달했지만 등록되지 않음:** 원래 게임 등록기의 경로 검증/이벤트 처리와 호환되는지 추가 조사가 필요합니다.
- **선택 직후 검은 화면이 발생하고 상태 문구가 바뀌지 않음:** 브라우저/파일 선택기 단계에서 멈췄을 가능성이 있습니다.

이 모드는 원본 게임 HTML과 main 브랜치를 수정하지 않습니다.
