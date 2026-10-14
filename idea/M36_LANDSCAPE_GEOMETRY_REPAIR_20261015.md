# M36 Landscape Geometry Repair — 2026-10-15

Branch: mobile-migration-v1
Source HEAD: e214e25633834faf5185a532ca991c4914bb505f
Source HTML blob before patch: 1b92fc87e669373d6bad7a3bb48f40a967817703
Result: **FAIL**

JSON evidence:
{
  "branch": "mobile-migration-v1",
  "sourceHead": "e214e25633834faf5185a532ca991c4914bb505f",
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
        "button: 예",
        "step 10: 세 선술집! /  / 성인 콘텐츠 안내 /  / 본 게임은 노골적인 성적 묘사가 포함된 성인 게임입니다. 아내와 다른 남자의 관계를 다루는 커컬드/NTR 소재가 등장합니다. /  / 이해하고 동의합니다",
        "step 20: 세 선술집! /  / 성인 콘텐츠 안내 /  / 본 게임은 노골적인 성적 묘사가 포함된 성인 게임입니다. 아내와 다른 남자의 관계를 다루는 커컬드/NTR 소재가 등장합니다. /  / 이해하고 동의합니다",
        "step 30: 세 선술집! /  / 성인 콘텐츠 안내 /  / 본 게임은 노골적인 성적 묘사가 포함된 성인 게임입니다. 아내와 다른 남자의 관계를 다루는 커컬드/NTR 소재가 등장합니다. /  / 이해하고 동의합니다",
        "step 40: 세 선술집! /  / 성인 콘텐츠 안내 /  / 본 게임은 노골적인 성적 묘사가 포함된 성인 게임입니다. 아내와 다른 남자의 관계를 다루는 커컬드/NTR 소재가 등장합니다. /  / 이해하고 동의합니다",
        "step 50: 세 선술집! /  / 성인 콘텐츠 안내 /  / 본 게임은 노골적인 성적 묘사가 포함된 성인 게임입니다. 아내와 다른 남자의 관계를 다루는 커컬드/NTR 소재가 등장합니다. /  / 이해하고 동의합니다",
        "step 60: 세 선술집! /  / 성인 콘텐츠 안내 /  / 본 게임은 노골적인 성적 묘사가 포함된 성인 게임입니다. 아내와 다른 남자의 관계를 다루는 커컬드/NTR 소재가 등장합니다. /  / 이해하고 동의합니다"
      ],
      "textTail": "Wayward MOD\nv3.36\n\n당신과 그녀가 함께 꾸려나가는 중세 선술집!\n\n성인 콘텐츠 안내\n\n본 게임은 노골적인 성적 묘사가 포함된 성인 게임입니다. 아내와 다른 남자의 관계를 다루는 커컬드/NTR 소재가 등장합니다.\n\n이해하고 동의합니다"
    }
  },
  "cases": [],
  "failures": [
    "Error: baseline-portrait: gameplay did not boot over HTTP: Wayward MOD\nv3.36\n\n당신과 그녀가 함께 꾸려나가는 중세 선술집!\n\n성인 콘텐츠 안내\n\n본 게임은 노골적인 성적 묘사가 포함된 성인 게임입니다. 아내와 다른 남자의 관계를 다루는 커컬드/NTR 소재가 등장합니다.\n\n이해하고 동의합니다\n    at pageFor ([stdin]:121:27)\n    at async main ([stdin]:161:14)"
  ],
  "verdict": "FAIL"
}
