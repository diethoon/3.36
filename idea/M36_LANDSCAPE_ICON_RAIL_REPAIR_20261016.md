# M36 Landscape Icon Rail Repair — 2026-10-16

Result: **FAIL**

Runtime evidence:
{
  "head": "ff48b3e4b989841881e7815d80a79c367501d693",
  "boot": [
    {
      "ok": true,
      "actions": [
        "age",
        "consent",
        "new game",
        "wife",
        "Elena",
        "continue",
        "Elena",
        "skip prologue"
      ]
    }
  ],
  "views": [],
  "errors": [],
  "verdict": "FAIL",
  "portraitBefore": {
    "layout": {
      "x": 0,
      "y": 75,
      "right": 487,
      "bottom": 1055,
      "width": 487,
      "height": 980
    },
    "panel": {
      "x": 292.19,
      "y": 75,
      "right": 486.98,
      "bottom": 1055,
      "width": 194.8,
      "height": 980
    },
    "choices": {
      "x": 297.78,
      "y": 513.08,
      "right": 481.39,
      "bottom": 1022.41,
      "width": 183.61,
      "height": 509.33
    },
    "viewport": {
      "width": 487,
      "height": 1054,
      "docWidth": 487
    }
  },
  "failure": "page.evaluate: ReferenceError: contrast is not defined\n    at eval (eval at evaluate (:370:30), <anonymous>:13:61)\n    at Array.map (<anonymous>)\n    at controls (eval at evaluate (:370:30), <anonymous>:3:161)\n    at eval (eval at evaluate (:370:30), <anonymous>:17:13)\n    at UtilityScript.evaluate (<anonymous>:372:16)\n    at UtilityScript.<anonymous> (<anonymous>:1:44)\n    at inspect (/tmp/m36-icon-repair.cjs:42:22)\n    at validate (/tmp/m36-icon-repair.cjs:69:17)\n    at main (/tmp/m36-icon-repair.cjs:103:13)",
  "patch": {
    "marker": "m36-landscape-icon-visibility-20261016",
    "bytesBefore": 19674590,
    "bytesAfter": 19676661,
    "insertedBytes": 2071,
    "featureMarkerCountsBefore": {
      "wayward-save-share": 1,
      "m36-mobile-disabled-choice": 16,
      "m36-mobile-pleasure-fixed": 10,
      "M36MobileStoreStatus": 2,
      "물자 채우기": 7,
      "시설 업그레이드": 2,
      "인사하기": 7
    },
    "featureMarkerCountsAfter": {
      "wayward-save-share": 1,
      "m36-mobile-disabled-choice": 16,
      "m36-mobile-pleasure-fixed": 10,
      "M36MobileStoreStatus": 2,
      "물자 채우기": 7,
      "시설 업그레이드": 2,
      "인사하기": 7
    },
    "scope": "landscape toolbar presentation only"
  }
}