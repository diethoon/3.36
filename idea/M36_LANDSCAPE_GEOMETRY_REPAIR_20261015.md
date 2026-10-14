# M36 Landscape Geometry Repair — 2026-10-15

Branch: mobile-migration-v1
Source HEAD: f76ed8e8c2b6b71c9a5e69e96bfe846f44ebcea7
Source HTML blob before patch: 1b92fc87e669373d6bad7a3bb48f40a967817703
Result: **FAIL**

JSON evidence:
{
  "branch": "mobile-migration-v1",
  "sourceHead": "f76ed8e8c2b6b71c9a5e69e96bfe846f44ebcea7",
  "sourceHtmlBlob": "1b92fc87e669373d6bad7a3bb48f40a967817703",
  "bytesBefore": 19674218,
  "featureMarkerCountsBefore": {
    "wayward-save-share": 1,
    "m36-mobile-disabled-choice": 16,
    "m36-mobile-pleasure-fixed": 10,
    "M36MobileStoreStatus": 2,
    "물자 채우기": 7,
    "시설 업그레이드": 2,
    "인사하기": 7
  },
  "patch": {
    "widthRule": "not applied",
    "gridColumnRulesChanged": [],
    "bytesAfter": null
  },
  "browser": "Playwright Chromium via local HTTP",
  "bootEvidence": {
    "baseline-portrait": {
      "started": false,
      "steps": 65,
      "actions": [
        "button 예",
        "consent {\"clicked\":true,\"target\":\"BUTTON\",\"cls\":\"mt-4 w-full px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded text-sm font-medium\"}",
        "button 새 게임",
        "relationship {\"clicked\":true,\"target\":\"BUTTON\",\"cls\":\"px-4 py-2 rounded-full border text-sm font-medium transition-all border-amber-500 bg-amber-700 text-white\"}",
        "Elena {\"clicked\":true,\"target\":\"BUTTON\",\"cls\":\"group w-full text-left rounded-lg border transition-all duration-150 overflow-hidden border-stone-700 bg-stone-800/40 hover:border-stone-500 hover:bg-stone-800/70\"}",
        "button 뒤로",
        "button 새 게임",
        "step 10:  이어가려면 ‘계속하기’ 또는 ‘불러오기’를 선택하세요. / 계속하기 (진행일: 1) / 확인 — 다시 시작 / 불러오기 / 설정 / 업데이트 내역 / v2026-09-30 / 한글 패치 v2026-09-30_ko-v1.4 · MOD v3.0 (기반 안정화)",
        "step 20:  이어가려면 ‘계속하기’ 또는 ‘불러오기’를 선택하세요. / 계속하기 (진행일: 1) / 확인 — 다시 시작 / 불러오기 / 설정 / 업데이트 내역 / v2026-09-30 / 한글 패치 v2026-09-30_ko-v1.4 · MOD v3.0 (기반 안정화)",
        "step 30:  이어가려면 ‘계속하기’ 또는 ‘불러오기’를 선택하세요. / 계속하기 (진행일: 1) / 확인 — 다시 시작 / 불러오기 / 설정 / 업데이트 내역 / v2026-09-30 / 한글 패치 v2026-09-30_ko-v1.4 · MOD v3.0 (기반 안정화)",
        "step 40:  이어가려면 ‘계속하기’ 또는 ‘불러오기’를 선택하세요. / 계속하기 (진행일: 1) / 확인 — 다시 시작 / 불러오기 / 설정 / 업데이트 내역 / v2026-09-30 / 한글 패치 v2026-09-30_ko-v1.4 · MOD v3.0 (기반 안정화)",
        "step 50:  이어가려면 ‘계속하기’ 또는 ‘불러오기’를 선택하세요. / 계속하기 (진행일: 1) / 확인 — 다시 시작 / 불러오기 / 설정 / 업데이트 내역 / v2026-09-30 / 한글 패치 v2026-09-30_ko-v1.4 · MOD v3.0 (기반 안정화)",
        "step 60:  이어가려면 ‘계속하기’ 또는 ‘불러오기’를 선택하세요. / 계속하기 (진행일: 1) / 확인 — 다시 시작 / 불러오기 / 설정 / 업데이트 내역 / v2026-09-30 / 한글 패치 v2026-09-30_ko-v1.4 · MOD v3.0 (기반 안정화)"
      ],
      "textTail": "Wayward MOD\nv3.36\n\n당신과 그녀가 함께 꾸려나가는 중세 선술집!\n\n이미지 팩이 설치되지 않았습니다\n\n이미지 팩이 설치되지 않았습니다. 게임은 실행되지만 초상화와 장면 이미지가 없습니다. Wayward_MOD_v3.36.html이 있는 폴더에 이미지 팩을 풀어주세요. 게임 옆에 images.js 파일과 ‘images’ 폴더가 있어야 합니다.\n\n아트 팩은 별도 다운로드 파일이므로, 게임을 업데이트해도 이미지를 다시 받을 필요가 없습니다.\n\n닫기\n새 게임을 시작하면 자동 저장을 덮어씁니다 (진행일: 1). 진행하려면 ‘새 게임’을 다시 누르세요. 현재 게임을 이어가려면 ‘계속하기’ 또는 ‘불러오기’를 선택하세요.\n계속하기 (진행일: 1)\n확인 — 다시 시작\n불러오기\n설정\n업데이트 내역\nv2026-09-30\n한글 패치 v2026-09-30_ko-v1.4 · MOD v3.0 (기반 안정화)"
    }
  },
  "cases": [],
  "failures": [
    "Error: baseline-portrait: gameplay did not boot over HTTP: Wayward MOD\nv3.36\n\n당신과 그녀가 함께 꾸려나가는 중세 선술집!\n\n이미지 팩이 설치되지 않았습니다\n\n이미지 팩이 설치되지 않았습니다. 게임은 실행되지만 초상화와 장면 이미지가 없습니다. Wayward_MOD_v3.36.html이 있는 폴더에 이미지 팩을 풀어주세요. 게임 옆에 images.js 파일과 ‘images’ 폴더가 있어야 합니다.\n\n아트 팩은 별도 다운로드 파일이므로, 게임을 업데이트해도 이미지를 다시 받을 필요가 없습니다.\n\n닫기\n새 게임을 시작하면 자동 저장을 덮어씁니다 (진행일: 1). 진행하려면 ‘새 게임’을 다시 누르세요. 현재 게임을 이어가려면 ‘계속하기’ 또는 ‘불러오기’를 선택하세요.\n계속하기 (진행일: 1)\n확인 — 다시 시작\n불러오기\n설정\n업데이트 내역\nv2026-09-30\n한글 패치 v2026-09-30_ko-v1.4 · MOD v3.0 (기반 안정화)\n    at pageFor ([stdin]:104:27)\n    at async main ([stdin]:145:14)"
  ],
  "verdict": "FAIL"
}
