# Landscape column-three and original-icon repair — 2026-10-16

Runtime result: PASS
Exact pre-patch HEAD: e6a4222bfb4f701d91b1ba178a3fc3de0016bb3c
Feature marker counts unchanged: True
Prior contrast override removed: True
Landscape viewports: 1280x720, 915x412, 720x360
Portrait geometry unchanged: True
Browser errors: 0

Original header controls and artwork retained; only small text labels are hidden. Third-column content is constrained to the left slot; choice controls stay in the right slot.

Patch evidence:
{
  "bytesBefore": 19677083,
  "bytesAfter": 19677368,
  "oldContrastOverrideRemoved": true,
  "singleReplacementBlock": true,
  "featureMarkersUnchanged": true,
  "featureCountsBefore": {
    "wayward-save-share": 1,
    "m36-mobile-disabled-choice": 16,
    "m36-mobile-pleasure-fixed": 10,
    "M36MobileStoreStatus": 2,
    "물자 채우기": 7,
    "시설 업그레이드": 2,
    "인사하기": 7
  },
  "featureCountsAfter": {
    "wayward-save-share": 1,
    "m36-mobile-disabled-choice": 16,
    "m36-mobile-pleasure-fixed": 10,
    "M36MobileStoreStatus": 2,
    "물자 채우기": 7,
    "시설 업그레이드": 2,
    "인사하기": 7
  }
}

Runtime evidence:
{
  "head": "e6a4222bfb4f701d91b1ba178a3fc3de0016bb3c",
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
  "views": [
    {
      "label": "1280x720",
      "innerWidth": 1280,
      "innerHeight": 720,
      "clientWidth": 1280,
      "docWidth": 1280,
      "oldOverride": false,
      "newOverride": true,
      "layout": {
        "x": 28,
        "right": 1280,
        "y": 20,
        "bottom": 720,
        "width": 1252,
        "height": 700
      },
      "panel": {
        "x": 793.63,
        "right": 1280,
        "y": 20,
        "bottom": 720,
        "width": 486.38,
        "height": 700
      },
      "choices": {
        "x": 1035.81,
        "right": 1279,
        "y": 20,
        "bottom": 720,
        "width": 243.19,
        "height": 700
      },
      "choiceParent": {
        "x": 1036.31,
        "right": 1279,
        "y": 20,
        "bottom": 720,
        "width": 242.69,
        "height": 700
      },
      "contentChildren": [
        {
          "tag": "DIV",
          "cls": "m36-landscape-info-scroll",
          "box": {
            "x": 793.63,
            "right": 1035.81,
            "y": 20,
            "bottom": 720,
            "width": 242.19,
            "height": 700
          },
          "position": "absolute",
          "text": "침실\n현재 위치\n당신\n준비 중\n기력\n엘레나\n대기 중\n평온\n기력\n기분\n신뢰도\n주목도\n흥분도\n오후 영업 준비\n50골드\n식재료\n3/12 (+9)\n−\n12\n+\n맥주\n3/12 (+9)\n−\n"
        }
      ],
      "toolbarButtonCount": 9,
      "smallVisible": 0,
      "failures": []
    },
    {
      "label": "915x412",
      "innerWidth": 915,
      "innerHeight": 412,
      "clientWidth": 915,
      "docWidth": 915,
      "oldOverride": false,
      "newOverride": true,
      "layout": {
        "x": 28,
        "right": 915,
        "y": 20,
        "bottom": 412,
        "width": 887,
        "height": 392
      },
      "panel": {
        "x": 567.31,
        "right": 915,
        "y": 20,
        "bottom": 412,
        "width": 347.69,
        "height": 392
      },
      "choices": {
        "x": 740.16,
        "right": 914,
        "y": 20,
        "bottom": 28,
        "width": 173.84,
        "height": 8
      },
      "choiceParent": {
        "x": 740.16,
        "right": 914,
        "y": 20,
        "bottom": 20,
        "width": 173.84,
        "height": 0
      },
      "contentChildren": [],
      "toolbarButtonCount": 9,
      "smallVisible": 0,
      "failures": []
    },
    {
      "label": "720x360",
      "innerWidth": 720,
      "innerHeight": 360,
      "clientWidth": 720,
      "docWidth": 720,
      "oldOverride": false,
      "newOverride": true,
      "layout": {
        "x": 28,
        "right": 720,
        "y": 20,
        "bottom": 360,
        "width": 692,
        "height": 340
      },
      "panel": {
        "x": 446.41,
        "right": 720,
        "y": 20,
        "bottom": 360,
        "width": 273.59,
        "height": 340
      },
      "choices": {
        "x": 582.2,
        "right": 719,
        "y": 20,
        "bottom": 28,
        "width": 136.8,
        "height": 8
      },
      "choiceParent": {
        "x": 582.2,
        "right": 719,
        "y": 20,
        "bottom": 20,
        "width": 136.8,
        "height": 0
      },
      "contentChildren": [],
      "toolbarButtonCount": 9,
      "smallVisible": 0,
      "failures": []
    }
  ],
  "errors": [],
  "verdict": "PASS",
  "portraitBefore": {
    "layout": {
      "x": 0,
      "right": 390,
      "y": 75,
      "bottom": 844,
      "width": 390,
      "height": 769
    },
    "panel": {
      "x": 234,
      "right": 390,
      "y": 75,
      "bottom": 844,
      "width": 156,
      "height": 769
    },
    "choices": {
      "x": 239.59,
      "right": 384.41,
      "y": 530.89,
      "bottom": 811.41,
      "width": 144.81,
      "height": 280.52
    },
    "clientWidth": 390,
    "docWidth": 390
  },
  "portraitAfter": {
    "layout": {
      "x": 0,
      "right": 390,
      "y": 75,
      "bottom": 844,
      "width": 390,
      "height": 769
    },
    "panel": {
      "x": 234,
      "right": 390,
      "y": 75,
      "bottom": 844,
      "width": 156,
      "height": 769
    },
    "choices": {
      "x": 239.59,
      "right": 384.41,
      "y": 530.89,
      "bottom": 811.41,
      "width": 144.81,
      "height": 280.52
    },
    "clientWidth": 390,
    "docWidth": 390
  },
  "portraitUnchanged": true
}
