# M36 Landscape Geometry Repair — 2026-10-15

Result: **FAIL**

```json
{
  "branch": "mobile-migration-v1",
  "sourceHead": "3141d9776120a2ead50225f42ccdb41a6cf5ec57",
  "sourceHtmlBlob": "1b92fc87e669373d6bad7a3bb48f40a967817703",
  "bytesBefore": 19674218,
  "boot": [
    {
      "label": "portrait baseline",
      "ok": false,
      "actions": [],
      "tail": "Wayward MOD\nv3.36\n\n당신과 그녀가 함께 꾸려나가는 중세 선술집!\n\n연령 확인\n\n본 게임에는 노골적인 성인 콘텐츠가 포함되어 있습니다. 만 18세를 넘었거나 거주 국가의 법정 성인 연령에 도달하셨습니까?\n\n예\n아니오"
    }
  ],
  "measurements": [],
  "patch": null,
  "failures": [
    "Error: portrait baseline: failed to enter gameplay; actions=[]\n    at boot ([stdin]:29:9)\n    at async main ([stdin]:49:112)"
  ],
  "verdict": "FAIL"
}
```
