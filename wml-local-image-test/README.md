# 신캐 이미지 로컬 경로 테스트 모드

## 목적
HTTPS 게임에서 다음과 같은 이미지 URL을 요청할 때,

`https://art.sintention.com/images/illustrious/characters/mika/...`

현재 게임과 같은 origin의 로컬 경로로 바꾸는 진단용 WML 모드입니다.

`https://현재-게임-호스트/images/illustrious/characters/mika/...`

## 설치
1. WML 모드 폴더 ID를 `mika_local_image_path_test`로 만듭니다.
2. 이 폴더 안에 `mod.js`를 넣습니다.
3. WML 모드 관리자를 통해 모드를 불러오고 활성화한 뒤 게임을 새로고침합니다.

## 테스트
브라우저 개발자 콘솔에서 다음을 실행합니다.

```js
window.__WML_LOCAL_IMAGE_PATH_TEST__?.getStatus()
```

- `rewrites`가 증가하면 외부 이미지 URL을 로컬 경로로 바꾸고 있는 것입니다.
- Network 탭에서 같은 origin의 `/images/...` 요청을 확인합니다.
- 해당 요청이 404이면 이미지 파일이 현재 게임 origin의 `/images/` 경로에서 제공되지 않는 것입니다. 이 모드는 파일을 복사하거나 서버에 업로드하지 않습니다.

## 제한
- 진단용 모드이며 게임 본체는 수정하지 않습니다.
- `<img src>` 경로를 대상으로 합니다. CSS 배경 이미지나 별도 API가 직접 요청하는 이미지는 가로채지 못할 수 있습니다.
- 브라우저의 보안 정책 때문에 HTTPS 페이지가 휴대폰 파일 관리자 안의 임의 파일 경로를 직접 읽을 수는 없습니다. 로컬 이미지가 게임 서버/모드 로더에서 제공되는 경로에 있어야 합니다.
- 테스트 후 모드를 비활성화하거나 제거하면 원상복구됩니다.
