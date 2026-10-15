# M36 Landscape Icon Rail Verification — 2026-10-16

Result: **FAIL**

JSON evidence:
{
  "head": "a72b30008b7321e52bd65707812ec30a825b6525",
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
      "viewport": {
        "width": 1600,
        "height": 900,
        "clientWidth": 1600,
        "docWidth": 1600,
        "fullscreen": false
      },
      "launchers": {
        "x": 0,
        "y": 25,
        "right": 28,
        "bottom": 99,
        "width": 28,
        "height": 74,
        "display": "flex",
        "opacity": "1",
        "direction": "column",
        "color": "rgb(245, 245, 244)",
        "background": "rgba(0, 0, 0, 0)"
      },
      "launcherCount": 3,
      "launcherItems": [
        {
          "label": "길드 상점",
          "rect": {
            "x": 3,
            "y": 25,
            "right": 25,
            "bottom": 47,
            "width": 22,
            "height": 22,
            "opacity": "1"
          },
          "color": "rgb(231, 229, 228)",
          "background": "rgb(28, 25, 23)",
          "contrast": 13.93
        },
        {
          "label": "인벤토리",
          "rect": {
            "x": 3,
            "y": 51,
            "right": 25,
            "bottom": 73,
            "width": 22,
            "height": 22,
            "opacity": "1"
          },
          "color": "rgb(231, 229, 228)",
          "background": "rgb(28, 25, 23)",
          "contrast": 13.93
        },
        {
          "label": "Wayward MOD v3.36 치트 에디터",
          "rect": {
            "x": 3,
            "y": 77,
            "right": 25,
            "bottom": 99,
            "width": 22,
            "height": 22,
            "opacity": "1"
          },
          "color": "rgb(251, 191, 36)",
          "background": "rgb(28, 25, 23)",
          "contrast": 10.48
        }
      ],
      "systemTools": {
        "x": 0,
        "y": 104,
        "right": 28,
        "bottom": 256,
        "width": 28,
        "height": 152,
        "display": "flex",
        "opacity": "1",
        "direction": "column",
        "color": "rgb(245, 245, 244)",
        "background": "rgba(0, 0, 0, 0)"
      },
      "systemCount": 6,
      "systemItems": [
        {
          "label": "음악 플레이어",
          "rect": {
            "x": 3,
            "y": 104,
            "right": 25,
            "bottom": 126,
            "width": 22,
            "height": 22,
            "opacity": "1"
          },
          "color": "rgb(231, 229, 228)",
          "background": "rgb(41, 37, 36)",
          "contrast": 12.08
        },
        {
          "label": "테마 선택",
          "rect": {
            "x": 3,
            "y": 130,
            "right": 25,
            "bottom": 152,
            "width": 22,
            "height": 22,
            "opacity": "1"
          },
          "color": "rgb(231, 229, 228)",
          "background": "rgb(41, 37, 36)",
          "contrast": 12.08
        },
        {
          "label": "Wayward 후원하기",
          "rect": {
            "x": 3,
            "y": 156,
            "right": 25,
            "bottom": 178,
            "width": 22,
            "height": 22,
            "opacity": "1"
          },
          "color": "rgb(231, 229, 228)",
          "background": "rgb(41, 37, 36)",
          "contrast": 12.08
        },
        {
          "label": "마지막 행동 되돌리기",
          "rect": {
            "x": 3,
            "y": 182,
            "right": 25,
            "bottom": 204,
            "width": 22,
            "height": 22,
            "opacity": "0.3"
          },
          "color": "rgb(231, 229, 228)",
          "background": "rgb(41, 37, 36)",
          "contrast": 12.08
        },
        {
          "label": "전체화면",
          "rect": {
            "x": 3,
            "y": 208,
            "right": 25,
            "bottom": 230,
            "width": 22,
            "height": 22,
            "opacity": "1"
          },
          "color": "rgb(231, 229, 228)",
          "background": "rgb(41, 37, 36)",
          "contrast": 12.08
        },
        {
          "label": "메뉴 열기",
          "rect": {
            "x": 3,
            "y": 234,
            "right": 25,
            "bottom": 256,
            "width": 22,
            "height": 22,
            "opacity": "1"
          },
          "color": "rgb(231, 229, 228)",
          "background": "rgb(41, 37, 36)",
          "contrast": 12.08
        }
      ],
      "overlaps": []
    }
  ],
  "errors": [],
  "verdict": "FAIL",
  "failure": "Error: 1280x720: icon opacity too low {\"label\":\"마지막 행동 되돌리기\",\"rect\":{\"x\":3,\"y\":182,\"right\":25,\"bottom\":204,\"width\":22,\"height\":22,\"opacity\":\"0.3\"},\"color\":\"rgb(231, 229, 228)\",\"background\":\"rgb(41, 37, 36)\",\"contrast\":12.08}\n    at validate (/tmp/m36-icons.cjs:59:42)\n    at async main (/tmp/m36-icons.cjs:74:133)"
}
