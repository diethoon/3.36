# M36 Landscape Geometry Repair — 2026-10-16

Result: **FAIL**

JSON evidence:
{
  "branch": "mobile-migration-v1",
  "sourceHead": "54c646d4de863dd2211d56191b1e18169db4acbe",
  "sourceHtmlBlob": "1b92fc87e669373d6bad7a3bb48f40a967817703",
  "sourceBytes": 19674218,
  "boot": [
    {
      "label": "portrait baseline",
      "ok": false,
      "actions": [
        "confirmed age",
        "accepted content notice",
        "started new game",
        "selected wife relationship",
        "selected Elena",
        "continued saved game",
        "selected Elena"
      ],
      "tail": "웨이워드는 번듯한 곳이라면 어디서든 말을 타고 이틀은 와야 닿는 곳에 있습니다. 지붕은 두 군데서 새고, 문 위의 종에는 종추가 없습니다. 벌이는 임대료를 겨우 낼 정도입니다. 납부일은 매주 일요일입니다.\n\n건너뛰기\n다음\n오류 보고서 복사\n⚠ 10\n✕"
    }
  ],
  "portraitBefore": null,
  "measurements": [],
  "patch": null,
  "failures": [
    "SyntaxError: Unexpected token '<'",
    "SyntaxError: Unexpected token '<'",
    "SyntaxError: Unexpected token '<'",
    "SyntaxError: Unexpected token '<'",
    "SyntaxError: Unexpected token '<'",
    "SyntaxError: Unexpected token '<'",
    "SyntaxError: Unexpected token '<'",
    "SyntaxError: Unexpected token '<'",
    "SyntaxError: Unexpected token '<'",
    "SyntaxError: Unexpected token '<'",
    "Error: portrait baseline: game UI selectors not reached; actions=[\"confirmed age\",\"accepted content notice\",\"started new game\",\"selected wife relationship\",\"selected Elena\",\"continued saved game\",\"selected Elena\"]; page tail=웨이워드는 번듯한 곳이라면 어디서든 말을 타고 이틀은 와야 닿는 곳에 있습니다. 지붕은 두 군데서 새고, 문 위의 종에는 종추가 없습니다. 벌이는 임대료를 겨우 낼 정도입니다. 납부일은 매주 일요일입니다.\n\n건너뛰기\n다음\n오류 보고서 복사\n⚠ 10\n✕\n    at enterGame (/tmp/m36-runtime-test.cjs:53:9)\n    at async main (/tmp/m36-runtime-test.cjs:96:7)"
  ],
  "verdict": "FAIL"
}