# M36 Landscape Geometry Forensics

- Target branch: mobile-migration-v1
- Target source SHA: f841f7dc548de3666df5b4adfe68d3cd7f368219
- Verdict: **FAIL: fullscreen-off 1600px: layout extends 28px right of viewport; fullscreen-on 1280px: layout extends 28px right of viewport; fullscreen-off 1143px: layout extends 28px right of viewport; fullscreen-on 915px: layout extends 28px right of viewport; fullscreen-off 900px: layout extends 28px right of viewport; fullscreen-on 720px: layout extends 28px right of viewport**

~~~json
{
  "target_source_commit": "f841f7dc548de3666df5b4adfe68d3cd7f368219",
  "html_blob_sha": "1b92fc87e669373d6bad7a3bb48f40a967817703",
  "browser": "Playwright Chromium",
  "cases": [
    {
      "label": "fullscreen-off",
      "viewport": {
        "innerWidth": 1600,
        "innerHeight": 900,
        "screenWidth": 1280,
        "screenHeight": 720,
        "scrollWidth": 1600,
        "bodyScrollWidth": 1600,
        "fullscreen": false
      },
      "selectors": {
        "layout": 1,
        "main": 1,
        "panel": 1,
        "info": 1,
        "choices": 1
      },
      "layout": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-layout lg:hidden flex-1 min-h-0",
        "rect": {
          "x": 28,
          "y": 20,
          "left": 28,
          "right": 1628,
          "top": 20,
          "bottom": 900,
          "width": 1600,
          "height": 880
        },
        "position": "relative",
        "display": "grid",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "hidden",
        "offsetParent": "."
      },
      "gridTemplateColumns": "586.656px 473.344px 270px 270px",
      "gridTracksPx": [
        586.656
      ],
      "column4": null,
      "gridChildren": [
        {
          "tag": "DIV",
          "id": null,
          "cls": "mobile-main-panel flex-1 min-w-0 flex flex-col min-h-0 border-r border-stone-700",
          "rect": {
            "x": 0,
            "y": 0,
            "left": 0,
            "right": 0,
            "top": 0,
            "bottom": 0,
            "width": 0,
            "height": 0
          },
          "position": "static",
          "display": "contents",
          "gridColumn": "auto",
          "overflowX": "visible",
          "overflowY": "visible",
          "offsetParent": null
        },
        {
          "tag": "DIV",
          "id": null,
          "cls": "mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-right)]",
          "rect": {
            "x": 1088,
            "y": 20,
            "left": 1088,
            "right": 1358,
            "top": 20,
            "bottom": 900,
            "width": 270,
            "height": 880
          },
          "position": "relative",
          "display": "flex",
          "gridColumn": "3",
          "overflowX": "hidden",
          "overflowY": "hidden",
          "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
        }
      ],
      "actionPanel": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-right)]",
        "rect": {
          "x": 1088,
          "y": 20,
          "left": 1088,
          "right": 1358,
          "top": 20,
          "bottom": 900,
          "width": 270,
          "height": 880
        },
        "position": "relative",
        "display": "flex",
        "gridColumn": "3",
        "overflowX": "hidden",
        "overflowY": "hidden",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "infoPane": {
        "tag": "DIV",
        "id": null,
        "cls": "m36-landscape-info-scroll",
        "rect": {
          "x": 1088,
          "y": 20,
          "left": 1088,
          "right": 1217.11,
          "top": 20,
          "bottom": 900,
          "width": 129.11,
          "height": 880
        },
        "position": "absolute",
        "display": "flex",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-r"
      },
      "choices": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-action-scroll flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]",
        "rect": {
          "x": 1222.5,
          "y": 20,
          "left": 1222.5,
          "right": 1492.5,
          "top": 20,
          "bottom": 900,
          "width": 270,
          "height": 880
        },
        "position": "absolute",
        "display": "block",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".flex-1 min-h-0 flex flex-col"
      },
      "choiceParent": {
        "tag": "DIV",
        "id": null,
        "cls": "flex-1 min-h-0 flex flex-col",
        "rect": {
          "x": 1222.5,
          "y": 20,
          "left": 1222.5,
          "right": 1357,
          "top": 20,
          "bottom": 900,
          "width": 134.5,
          "height": 880
        },
        "position": "absolute",
        "display": "flex",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "hidden",
        "offsetParent": ".mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-r"
      },
      "choiceIntersectionWithColumn4": null,
      "infoChoiceGap": 5.39,
      "infoChoiceOverlapPx": 0,
      "rightOverflow": 28,
      "documentHorizontalOverflow": false,
      "http_status": 200,
      "gameSetup": {
        "started": true,
        "steps": 7,
        "bodyEnd": "수 있습니다.\n시설 업그레이드\n4개 남음\n▸\n오후 영업 준비\n영업 전에 가게를 준비하세요.\n침실\n\n당신은 엘레나와 함께 위층 침실에 있습니다. 오후 햇빛이 비치고, 아래층 선술집은 조용합니다.\n\n엘레나\n그녀가 위층에 함께 있습니다. 대화하거나 키스, 스킨십을 나눌 수 있습니다.\n홀로 내려가기\n1분\n바 카운터로 돌아갑니다."
      },
      "pageErrors": []
    },
    {
      "label": "fullscreen-on",
      "viewport": {
        "innerWidth": 1280,
        "innerHeight": 720,
        "screenWidth": 1280,
        "screenHeight": 720,
        "scrollWidth": 1280,
        "bodyScrollWidth": 1280,
        "fullscreen": true
      },
      "selectors": {
        "layout": 1,
        "main": 1,
        "panel": 1,
        "info": 1,
        "choices": 1
      },
      "layout": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-layout lg:hidden flex-1 min-h-0",
        "rect": {
          "x": 28,
          "y": 20,
          "left": 28,
          "right": 1308,
          "top": 20,
          "bottom": 720,
          "width": 1280,
          "height": 700
        },
        "position": "relative",
        "display": "grid",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "hidden",
        "offsetParent": "."
      },
      "gridTemplateColumns": "466.656px 326.969px 243.188px 243.188px",
      "gridTracksPx": [
        466.656
      ],
      "column4": null,
      "gridChildren": [
        {
          "tag": "DIV",
          "id": null,
          "cls": "mobile-main-panel flex-1 min-w-0 flex flex-col min-h-0 border-r border-stone-700",
          "rect": {
            "x": 0,
            "y": 0,
            "left": 0,
            "right": 0,
            "top": 0,
            "bottom": 0,
            "width": 0,
            "height": 0
          },
          "position": "static",
          "display": "contents",
          "gridColumn": "auto",
          "overflowX": "visible",
          "overflowY": "visible",
          "offsetParent": null
        },
        {
          "tag": "DIV",
          "id": null,
          "cls": "mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-right)]",
          "rect": {
            "x": 821.63,
            "y": 20,
            "left": 821.63,
            "right": 1064.81,
            "top": 20,
            "bottom": 720,
            "width": 243.19,
            "height": 700
          },
          "position": "relative",
          "display": "flex",
          "gridColumn": "3",
          "overflowX": "hidden",
          "overflowY": "hidden",
          "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
        }
      ],
      "actionPanel": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-right)]",
        "rect": {
          "x": 821.63,
          "y": 20,
          "left": 821.63,
          "right": 1064.81,
          "top": 20,
          "bottom": 720,
          "width": 243.19,
          "height": 700
        },
        "position": "relative",
        "display": "flex",
        "gridColumn": "3",
        "overflowX": "hidden",
        "overflowY": "hidden",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "infoPane": {
        "tag": "DIV",
        "id": null,
        "cls": "m36-landscape-info-scroll",
        "rect": {
          "x": 821.63,
          "y": 20,
          "left": 821.63,
          "right": 937.88,
          "top": 20,
          "bottom": 720,
          "width": 116.25,
          "height": 700
        },
        "position": "absolute",
        "display": "flex",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-r"
      },
      "choices": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-action-scroll flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]",
        "rect": {
          "x": 942.72,
          "y": 20,
          "left": 942.72,
          "right": 1185.91,
          "top": 20,
          "bottom": 720,
          "width": 243.19,
          "height": 700
        },
        "position": "absolute",
        "display": "block",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".flex-1 min-h-0 flex flex-col"
      },
      "choiceParent": {
        "tag": "DIV",
        "id": null,
        "cls": "flex-1 min-h-0 flex flex-col",
        "rect": {
          "x": 942.72,
          "y": 20,
          "left": 942.72,
          "right": 1063.81,
          "top": 20,
          "bottom": 720,
          "width": 121.09,
          "height": 700
        },
        "position": "absolute",
        "display": "flex",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "hidden",
        "offsetParent": ".mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-r"
      },
      "choiceIntersectionWithColumn4": null,
      "infoChoiceGap": 4.84,
      "infoChoiceOverlapPx": 0,
      "rightOverflow": 28,
      "documentHorizontalOverflow": false,
      "http_status": 200,
      "gameSetup": {
        "started": true,
        "steps": 7,
        "bodyEnd": "수 있습니다.\n시설 업그레이드\n4개 남음\n▸\n오후 영업 준비\n영업 전에 가게를 준비하세요.\n침실\n\n당신은 엘레나와 함께 위층 침실에 있습니다. 오후 햇빛이 비치고, 아래층 선술집은 조용합니다.\n\n엘레나\n그녀가 위층에 함께 있습니다. 대화하거나 키스, 스킨십을 나눌 수 있습니다.\n홀로 내려가기\n1분\n바 카운터로 돌아갑니다."
      },
      "pageErrors": []
    },
    {
      "label": "fullscreen-off",
      "viewport": {
        "innerWidth": 1143,
        "innerHeight": 515,
        "screenWidth": 915,
        "screenHeight": 412,
        "scrollWidth": 1143,
        "bodyScrollWidth": 1143,
        "fullscreen": false
      },
      "selectors": {
        "layout": 1,
        "main": 1,
        "panel": 1,
        "info": 1,
        "choices": 1
      },
      "layout": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-layout lg:hidden flex-1 min-h-0",
        "rect": {
          "x": 28,
          "y": 20,
          "left": 28,
          "right": 1171,
          "top": 20,
          "bottom": 515,
          "width": 1143,
          "height": 495
        },
        "position": "relative",
        "display": "grid",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "hidden",
        "offsetParent": "."
      },
      "gridTemplateColumns": "330px 378.688px 217.156px 217.156px",
      "gridTracksPx": [
        330
      ],
      "column4": null,
      "gridChildren": [
        {
          "tag": "DIV",
          "id": null,
          "cls": "mobile-main-panel flex-1 min-w-0 flex flex-col min-h-0 border-r border-stone-700",
          "rect": {
            "x": 0,
            "y": 0,
            "left": 0,
            "right": 0,
            "top": 0,
            "bottom": 0,
            "width": 0,
            "height": 0
          },
          "position": "static",
          "display": "contents",
          "gridColumn": "auto",
          "overflowX": "visible",
          "overflowY": "visible",
          "offsetParent": null
        },
        {
          "tag": "DIV",
          "id": null,
          "cls": "mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-right)]",
          "rect": {
            "x": 736.69,
            "y": 20,
            "left": 736.69,
            "right": 953.84,
            "top": 20,
            "bottom": 515,
            "width": 217.16,
            "height": 495
          },
          "position": "relative",
          "display": "flex",
          "gridColumn": "3",
          "overflowX": "hidden",
          "overflowY": "hidden",
          "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
        }
      ],
      "actionPanel": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-right)]",
        "rect": {
          "x": 736.69,
          "y": 20,
          "left": 736.69,
          "right": 953.84,
          "top": 20,
          "bottom": 515,
          "width": 217.16,
          "height": 495
        },
        "position": "relative",
        "display": "flex",
        "gridColumn": "3",
        "overflowX": "hidden",
        "overflowY": "hidden",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "infoPane": {
        "tag": "DIV",
        "id": null,
        "cls": "m36-landscape-info-scroll",
        "rect": {
          "x": 736.69,
          "y": 20,
          "left": 736.69,
          "right": 840.44,
          "top": 20,
          "bottom": 515,
          "width": 103.75,
          "height": 495
        },
        "position": "absolute",
        "display": "flex",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-r"
      },
      "choices": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-action-scroll flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]",
        "rect": {
          "x": 844.77,
          "y": 20,
          "left": 844.77,
          "right": 1061.92,
          "top": 20,
          "bottom": 515,
          "width": 217.16,
          "height": 495
        },
        "position": "absolute",
        "display": "block",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".flex-1 min-h-0 flex flex-col"
      },
      "choiceParent": {
        "tag": "DIV",
        "id": null,
        "cls": "flex-1 min-h-0 flex flex-col",
        "rect": {
          "x": 844.77,
          "y": 20,
          "left": 844.77,
          "right": 952.84,
          "top": 20,
          "bottom": 515,
          "width": 108.08,
          "height": 495
        },
        "position": "absolute",
        "display": "flex",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "hidden",
        "offsetParent": ".mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-r"
      },
      "choiceIntersectionWithColumn4": null,
      "infoChoiceGap": 4.33,
      "infoChoiceOverlapPx": 0,
      "rightOverflow": 28,
      "documentHorizontalOverflow": false,
      "http_status": 200,
      "gameSetup": {
        "started": true,
        "steps": 7,
        "bodyEnd": "수 있습니다.\n시설 업그레이드\n4개 남음\n▸\n오후 영업 준비\n영업 전에 가게를 준비하세요.\n침실\n\n당신은 엘레나와 함께 위층 침실에 있습니다. 오후 햇빛이 비치고, 아래층 선술집은 조용합니다.\n\n엘레나\n그녀가 위층에 함께 있습니다. 대화하거나 키스, 스킨십을 나눌 수 있습니다.\n홀로 내려가기\n1분\n바 카운터로 돌아갑니다."
      },
      "pageErrors": []
    },
    {
      "label": "fullscreen-on",
      "viewport": {
        "innerWidth": 915,
        "innerHeight": 412,
        "screenWidth": 915,
        "screenHeight": 412,
        "scrollWidth": 915,
        "bodyScrollWidth": 915,
        "fullscreen": true
      },
      "selectors": {
        "layout": 1,
        "main": 1,
        "panel": 1,
        "info": 1,
        "choices": 1
      },
      "layout": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-layout lg:hidden flex-1 min-h-0",
        "rect": {
          "x": 28,
          "y": 20,
          "left": 28,
          "right": 943,
          "top": 20,
          "bottom": 412,
          "width": 915,
          "height": 392
        },
        "position": "relative",
        "display": "grid",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "hidden",
        "offsetParent": "."
      },
      "gridTemplateColumns": "261.328px 305.984px 173.844px 173.844px",
      "gridTracksPx": [
        261.328
      ],
      "column4": null,
      "gridChildren": [
        {
          "tag": "DIV",
          "id": null,
          "cls": "mobile-main-panel flex-1 min-w-0 flex flex-col min-h-0 border-r border-stone-700",
          "rect": {
            "x": 0,
            "y": 0,
            "left": 0,
            "right": 0,
            "top": 0,
            "bottom": 0,
            "width": 0,
            "height": 0
          },
          "position": "static",
          "display": "contents",
          "gridColumn": "auto",
          "overflowX": "visible",
          "overflowY": "visible",
          "offsetParent": null
        },
        {
          "tag": "DIV",
          "id": null,
          "cls": "mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-right)]",
          "rect": {
            "x": 595.31,
            "y": 20,
            "left": 595.31,
            "right": 769.16,
            "top": 20,
            "bottom": 412,
            "width": 173.84,
            "height": 392
          },
          "position": "static",
          "display": "flex",
          "gridColumn": "3",
          "overflowX": "hidden",
          "overflowY": "auto",
          "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
        }
      ],
      "actionPanel": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-right)]",
        "rect": {
          "x": 595.31,
          "y": 20,
          "left": 595.31,
          "right": 769.16,
          "top": 20,
          "bottom": 412,
          "width": 173.84,
          "height": 392
        },
        "position": "static",
        "display": "flex",
        "gridColumn": "3",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "infoPane": {
        "tag": "DIV",
        "id": null,
        "cls": "m36-landscape-info-scroll",
        "rect": {
          "x": 599.31,
          "y": 23,
          "left": 599.31,
          "right": 764.16,
          "top": 23,
          "bottom": 409,
          "width": 164.84,
          "height": 386
        },
        "position": "static",
        "display": "flex",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "choices": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-action-scroll flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]",
        "rect": {
          "x": 769.16,
          "y": 20,
          "left": 769.16,
          "right": 943,
          "top": 20,
          "bottom": 412,
          "width": 173.84,
          "height": 392
        },
        "position": "absolute",
        "display": "block",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "choiceParent": {
        "tag": "DIV",
        "id": null,
        "cls": "flex-1 min-h-0 flex flex-col",
        "rect": {
          "x": 599.31,
          "y": 409,
          "left": 599.31,
          "right": 764.16,
          "top": 409,
          "bottom": 409,
          "width": 164.84,
          "height": 0
        },
        "position": "static",
        "display": "flex",
        "gridColumn": "auto",
        "overflowX": "visible",
        "overflowY": "visible",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "choiceIntersectionWithColumn4": null,
      "infoChoiceGap": 5,
      "infoChoiceOverlapPx": 0,
      "rightOverflow": 28,
      "documentHorizontalOverflow": false,
      "http_status": 200,
      "gameSetup": {
        "started": true,
        "steps": 7,
        "bodyEnd": "수 있습니다.\n시설 업그레이드\n4개 남음\n▸\n오후 영업 준비\n영업 전에 가게를 준비하세요.\n침실\n\n당신은 엘레나와 함께 위층 침실에 있습니다. 오후 햇빛이 비치고, 아래층 선술집은 조용합니다.\n\n엘레나\n그녀가 위층에 함께 있습니다. 대화하거나 키스, 스킨십을 나눌 수 있습니다.\n홀로 내려가기\n1분\n바 카운터로 돌아갑니다."
      },
      "pageErrors": []
    },
    {
      "label": "fullscreen-off",
      "viewport": {
        "innerWidth": 900,
        "innerHeight": 450,
        "screenWidth": 720,
        "screenHeight": 360,
        "scrollWidth": 900,
        "bodyScrollWidth": 900,
        "fullscreen": false
      },
      "selectors": {
        "layout": 1,
        "main": 1,
        "panel": 1,
        "info": 1,
        "choices": 1
      },
      "layout": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-layout lg:hidden flex-1 min-h-0",
        "rect": {
          "x": 28,
          "y": 20,
          "left": 28,
          "right": 928,
          "top": 20,
          "bottom": 450,
          "width": 900,
          "height": 430
        },
        "position": "relative",
        "display": "grid",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "hidden",
        "offsetParent": "."
      },
      "gridTemplateColumns": "286.656px 271.344px 171px 171px",
      "gridTracksPx": [
        286.656
      ],
      "column4": null,
      "gridChildren": [
        {
          "tag": "DIV",
          "id": null,
          "cls": "mobile-main-panel flex-1 min-w-0 flex flex-col min-h-0 border-r border-stone-700",
          "rect": {
            "x": 0,
            "y": 0,
            "left": 0,
            "right": 0,
            "top": 0,
            "bottom": 0,
            "width": 0,
            "height": 0
          },
          "position": "static",
          "display": "contents",
          "gridColumn": "auto",
          "overflowX": "visible",
          "overflowY": "visible",
          "offsetParent": null
        },
        {
          "tag": "DIV",
          "id": null,
          "cls": "mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-right)]",
          "rect": {
            "x": 586,
            "y": 20,
            "left": 586,
            "right": 757,
            "top": 20,
            "bottom": 450,
            "width": 171,
            "height": 430
          },
          "position": "static",
          "display": "flex",
          "gridColumn": "3",
          "overflowX": "hidden",
          "overflowY": "auto",
          "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
        }
      ],
      "actionPanel": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-right)]",
        "rect": {
          "x": 586,
          "y": 20,
          "left": 586,
          "right": 757,
          "top": 20,
          "bottom": 450,
          "width": 171,
          "height": 430
        },
        "position": "static",
        "display": "flex",
        "gridColumn": "3",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "infoPane": {
        "tag": "DIV",
        "id": null,
        "cls": "m36-landscape-info-scroll",
        "rect": {
          "x": 590,
          "y": 23,
          "left": 590,
          "right": 752,
          "top": 23,
          "bottom": 447,
          "width": 162,
          "height": 424
        },
        "position": "static",
        "display": "flex",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "choices": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-action-scroll flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]",
        "rect": {
          "x": 757,
          "y": 20,
          "left": 757,
          "right": 928,
          "top": 20,
          "bottom": 450,
          "width": 171,
          "height": 430
        },
        "position": "absolute",
        "display": "block",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "choiceParent": {
        "tag": "DIV",
        "id": null,
        "cls": "flex-1 min-h-0 flex flex-col",
        "rect": {
          "x": 590,
          "y": 447,
          "left": 590,
          "right": 752,
          "top": 447,
          "bottom": 447,
          "width": 162,
          "height": 0
        },
        "position": "static",
        "display": "flex",
        "gridColumn": "auto",
        "overflowX": "visible",
        "overflowY": "visible",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "choiceIntersectionWithColumn4": null,
      "infoChoiceGap": 5,
      "infoChoiceOverlapPx": 0,
      "rightOverflow": 28,
      "documentHorizontalOverflow": false,
      "http_status": 200,
      "gameSetup": {
        "started": true,
        "steps": 7,
        "bodyEnd": "빚 999골드\n시설 업그레이드\n4개 남음\n▸\n오후 영업 준비\n영업 전에 가게를 준비하세요.\n침실\n\n당신은 엘레나와 함께 위층 침실에 있습니다. 오후 햇빛이 비치고, 아래층 선술집은 조용합니다.\n\n엘레나\n그녀가 위층에 함께 있습니다. 대화하거나 키스, 스킨십을 나눌 수 있습니다.\n홀로 내려가기\n1분\n바 카운터로 돌아갑니다."
      },
      "pageErrors": []
    },
    {
      "label": "fullscreen-on",
      "viewport": {
        "innerWidth": 720,
        "innerHeight": 360,
        "screenWidth": 720,
        "screenHeight": 360,
        "scrollWidth": 720,
        "bodyScrollWidth": 720,
        "fullscreen": true
      },
      "selectors": {
        "layout": 1,
        "main": 1,
        "panel": 1,
        "info": 1,
        "choices": 1
      },
      "layout": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-layout lg:hidden flex-1 min-h-0",
        "rect": {
          "x": 28,
          "y": 20,
          "left": 28,
          "right": 748,
          "top": 20,
          "bottom": 360,
          "width": 720,
          "height": 340
        },
        "position": "relative",
        "display": "grid",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "hidden",
        "offsetParent": "."
      },
      "gridTemplateColumns": "226.656px 219.75px 136.797px 136.797px",
      "gridTracksPx": [
        226.656
      ],
      "column4": null,
      "gridChildren": [
        {
          "tag": "DIV",
          "id": null,
          "cls": "mobile-main-panel flex-1 min-w-0 flex flex-col min-h-0 border-r border-stone-700",
          "rect": {
            "x": 0,
            "y": 0,
            "left": 0,
            "right": 0,
            "top": 0,
            "bottom": 0,
            "width": 0,
            "height": 0
          },
          "position": "static",
          "display": "contents",
          "gridColumn": "auto",
          "overflowX": "visible",
          "overflowY": "visible",
          "offsetParent": null
        },
        {
          "tag": "DIV",
          "id": null,
          "cls": "mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-right)]",
          "rect": {
            "x": 474.41,
            "y": 20,
            "left": 474.41,
            "right": 611.2,
            "top": 20,
            "bottom": 360,
            "width": 136.8,
            "height": 340
          },
          "position": "static",
          "display": "flex",
          "gridColumn": "3",
          "overflowX": "hidden",
          "overflowY": "auto",
          "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
        }
      ],
      "actionPanel": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-action-panel w-full max-w-[13rem] desk:w-[16rem] desk:max-w-none shrink-0 flex flex-col min-h-0  pr-[env(safe-area-inset-right)]",
        "rect": {
          "x": 474.41,
          "y": 20,
          "left": 474.41,
          "right": 611.2,
          "top": 20,
          "bottom": 360,
          "width": 136.8,
          "height": 340
        },
        "position": "static",
        "display": "flex",
        "gridColumn": "3",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "infoPane": {
        "tag": "DIV",
        "id": null,
        "cls": "m36-landscape-info-scroll",
        "rect": {
          "x": 478.41,
          "y": 23,
          "left": 478.41,
          "right": 606.2,
          "top": 23,
          "bottom": 357,
          "width": 127.8,
          "height": 334
        },
        "position": "static",
        "display": "flex",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "choices": {
        "tag": "DIV",
        "id": null,
        "cls": "mobile-action-scroll flex-1 min-h-0 overflow-y-auto py-1 text-[0.72rem]",
        "rect": {
          "x": 611.2,
          "y": 20,
          "left": 611.2,
          "right": 748,
          "top": 20,
          "bottom": 360,
          "width": 136.8,
          "height": 340
        },
        "position": "absolute",
        "display": "block",
        "gridColumn": "auto",
        "overflowX": "hidden",
        "overflowY": "auto",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "choiceParent": {
        "tag": "DIV",
        "id": null,
        "cls": "flex-1 min-h-0 flex flex-col",
        "rect": {
          "x": 478.41,
          "y": 357,
          "left": 478.41,
          "right": 606.2,
          "top": 357,
          "bottom": 357,
          "width": 127.8,
          "height": 0
        },
        "position": "static",
        "display": "flex",
        "gridColumn": "auto",
        "overflowX": "visible",
        "overflowY": "visible",
        "offsetParent": ".mobile-layout lg:hidden flex-1 min-h-0"
      },
      "choiceIntersectionWithColumn4": null,
      "infoChoiceGap": 5,
      "infoChoiceOverlapPx": 0,
      "rightOverflow": 28,
      "documentHorizontalOverflow": false,
      "http_status": 200,
      "gameSetup": {
        "started": true,
        "steps": 7,
        "bodyEnd": "빚 999골드\n시설 업그레이드\n4개 남음\n▸\n오후 영업 준비\n영업 전에 가게를 준비하세요.\n침실\n\n당신은 엘레나와 함께 위층 침실에 있습니다. 오후 햇빛이 비치고, 아래층 선술집은 조용합니다.\n\n엘레나\n그녀가 위층에 함께 있습니다. 대화하거나 키스, 스킨십을 나눌 수 있습니다.\n홀로 내려가기\n1분\n바 카운터로 돌아갑니다."
      },
      "pageErrors": []
    }
  ],
  "notes": [],
  "verdict": "FAIL: fullscreen-off 1600px: layout extends 28px right of viewport; fullscreen-on 1280px: layout extends 28px right of viewport; fullscreen-off 1143px: layout extends 28px right of viewport; fullscreen-on 915px: layout extends 28px right of viewport; fullscreen-off 900px: layout extends 28px right of viewport; fullscreen-on 720px: layout extends 28px right of viewport"
}
~~~
