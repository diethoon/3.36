# M36 Landscape Geometry Repair — 2026-10-15

Branch: mobile-migration-v1
Source HEAD: 70dc22f5476231aa0380c675d946073b9b54b63e
Source HTML blob before patch: 1b92fc87e669373d6bad7a3bb48f40a967817703
Result: **FAIL**

JSON evidence:
{
  "branch": "mobile-migration-v1",
  "sourceHead": "70dc22f5476231aa0380c675d946073b9b54b63e",
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
      "steps": 55,
      "textTail": "Wayward\n\n그녀가 누구인지 고르세요. 다음으로 어떤 사람인지 정합니다. 나머지는 플레이하며 알아가게 됩니다.\n\n그녀는 당신에게 어떤 존재인가요?\n아내\n연인준비 중\n의붓여동생준비 중\n친구준비 중\n고용인/종업원준비 중\n\n부부입니다. 당신과 침대를 함께 씁니다.\n\n엘레나\n농가 출신 여성. 19세. 결혼한 지 3주 됨.\n마라\n상인의 딸. 23세. 지금껏 관계를 맺어 본 남자는 한 명뿐.\n피파\n작고 가녀리며 묘하게 사랑스러운 여인. 21세.\n뒤로\n함께할 아내를 선택하세요"
    }
  },
  "cases": [],
  "failures": [
    "Error: baseline-portrait: gameplay did not boot over HTTP: Wayward\n\n그녀가 누구인지 고르세요. 다음으로 어떤 사람인지 정합니다. 나머지는 플레이하며 알아가게 됩니다.\n\n그녀는 당신에게 어떤 존재인가요?\n아내\n연인준비 중\n의붓여동생준비 중\n친구준비 중\n고용인/종업원준비 중\n\n부부입니다. 당신과 침대를 함께 씁니다.\n\n엘레나\n농가 출신 여성. 19세. 결혼한 지 3주 됨.\n마라\n상인의 딸. 23세. 지금껏 관계를 맺어 본 남자는 한 명뿐.\n피파\n작고 가녀리며 묘하게 사랑스러운 여인. 21세.\n뒤로\n함께할 아내를 선택하세요\n    at pageFor ([stdin]:88:27)\n    at async main ([stdin]:130:14)"
  ],
  "verdict": "FAIL"
}
