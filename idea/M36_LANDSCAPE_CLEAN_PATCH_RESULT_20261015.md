# M36 Landscape Geometry Forensics and Clean CSS Patch

- Target branch: mobile-migration-v1
- Original HTML blob: 1b92fc87e669373d6bad7a3bb48f40a967817703
- Verdict: **FAIL: fullscreen-off 1280x720: game did not reach prep/gameplay state; fullscreen-off 1280x720: required gameplay layout node missing; fullscreen-off 1280x720: grid resolved to 0 tracks, not four; fullscreen-off 1280x720: layout right edge error null; fullscreen-off 1280x720: action panel does not end at layout right edge: null; fullscreen-off 1280x720: narration does not end at column 4 start: null; fullscreen-off 1280x720: choices do not start at column 4: null; fullscreen-off 1280x720: choices do not fill column 4 to the right edge: null; fullscreen-on 1280x720: game did not reach prep/gameplay state; fullscreen-on 1280x720: required gameplay layout node missing; fullscreen-on 1280x720: grid resolved to 0 tracks, not four; fullscreen-on 1280x720: layout right edge error null; fullscreen-on 1280x720: action panel does not end at layout right edge: null; fullscreen-on 1280x720: narration does not end at column 4 start: null; fullscreen-on 1280x720: choices do not start at column 4: null; fullscreen-on 1280x720: choices do not fill column 4 to the right edge: null; fullscreen-off 915x412: game did not reach prep/gameplay state; fullscreen-off 915x412: required gameplay layout node missing; fullscreen-off 915x412: grid resolved to 0 tracks, not four; fullscreen-off 915x412: layout right edge error null; fullscreen-off 915x412: action panel does not end at layout right edge: null; fullscreen-off 915x412: narration does not end at column 4 start: null; fullscreen-off 915x412: choices do not start at column 4: null; fullscreen-off 915x412: choices do not fill column 4 to the right edge: null; fullscreen-on 915x412: game did not reach prep/gameplay state; fullscreen-on 915x412: required gameplay layout node missing; fullscreen-on 915x412: grid resolved to 0 tracks, not four; fullscreen-on 915x412: layout right edge error null; fullscreen-on 915x412: action panel does not end at layout right edge: null; fullscreen-on 915x412: narration does not end at column 4 start: null; fullscreen-on 915x412: choices do not start at column 4: null; fullscreen-on 915x412: choices do not fill column 4 to the right edge: null; fullscreen-off 720x360: game did not reach prep/gameplay state; fullscreen-off 720x360: required gameplay layout node missing; fullscreen-off 720x360: grid resolved to 0 tracks, not four; fullscreen-off 720x360: layout right edge error null; fullscreen-off 720x360: action panel does not end at layout right edge: null; fullscreen-off 720x360: narration does not end at column 4 start: null; fullscreen-off 720x360: choices do not start at column 4: null; fullscreen-off 720x360: choices do not fill column 4 to the right edge: null; fullscreen-on 720x360: game did not reach prep/gameplay state; fullscreen-on 720x360: required gameplay layout node missing; fullscreen-on 720x360: grid resolved to 0 tracks, not four; fullscreen-on 720x360: layout right edge error null; fullscreen-on 720x360: action panel does not end at layout right edge: null; fullscreen-on 720x360: narration does not end at column 4 start: null; fullscreen-on 720x360: choices do not start at column 4: null; fullscreen-on 720x360: choices do not fill column 4 to the right edge: null**

~~~json
{
  "targetBranch": "mobile-migration-v1",
  "sourceHeadBeforePatch": "a08834225fc8c44da10291e49c306171bff9402a",
  "htmlBlobBeforePatch": "1b92fc87e669373d6bad7a3bb48f40a967817703",
  "htmlBytesBeforePatch": 19674218,
  "baselineEvidence": {
    "note": "Previous static report was not available."
  },
  "patch": {
    "status": "REVERTED_AFTER_FAILED_BROWSER_VALIDATION",
    "removedDuplicateRules": {
      ".mobile-action-panel": 1,
      ".mobile-action-panel>.m36-landscape-info-scroll": 1,
      ".mobile-action-panel>.flex-1.min-h-0.flex.flex-col": 1,
      ".mobile-action-panel .mobile-action-scroll": 1
    },
    "removedTailOverride": true,
    "additionalLegacyGeometryRulesRemoved": {
      "panel": 0,
      "info": 0,
      "wrapper": 0,
      "choices": 0
    },
    "htmlBytesAfterPatch": 79474,
    "bytesDelta": -19594744,
    "oldSplitGeometryRulesRemoved": 4,
    "workingSourceRestored": true
  },
  "browser": "Playwright Chromium",
  "cases": [
    {
      "label": "fullscreen-off",
      "viewport": {
        "width": 1280,
        "height": 720,
        "screenWidth": 1280,
        "screenHeight": 720,
        "fullscreen": false,
        "documentWidth": 1280
      },
      "selectors": {
        "layout": false,
        "panel": false,
        "narration": false,
        "choices": false
      },
      "layout": null,
      "tracks": [],
      "gridTemplateColumns": null,
      "column4": null,
      "actionPanel": null,
      "narration": null,
      "choices": null,
      "panelRightError": null,
      "layoutRightError": null,
      "narrationRightError": null,
      "choicesLeftError": null,
      "choicesRightError": null,
      "choiceParent": null,
      "gameTextTail": "",
      "screen": {
        "width": 1280,
        "height": 720
      },
      "httpStatus": 200,
      "gameSetup": {
        "started": false,
        "steps": 45,
        "bodyTail": ""
      },
      "pageErrors": [],
      "failures": [
        "game did not reach prep/gameplay state",
        "required gameplay layout node missing",
        "grid resolved to 0 tracks, not four",
        "layout right edge error null",
        "action panel does not end at layout right edge: null",
        "narration does not end at column 4 start: null",
        "choices do not start at column 4: null",
        "choices do not fill column 4 to the right edge: null"
      ]
    },
    {
      "label": "fullscreen-on",
      "viewport": {
        "width": 1280,
        "height": 720,
        "screenWidth": 1280,
        "screenHeight": 720,
        "fullscreen": true,
        "documentWidth": 1280
      },
      "selectors": {
        "layout": false,
        "panel": false,
        "narration": false,
        "choices": false
      },
      "layout": null,
      "tracks": [],
      "gridTemplateColumns": null,
      "column4": null,
      "actionPanel": null,
      "narration": null,
      "choices": null,
      "panelRightError": null,
      "layoutRightError": null,
      "narrationRightError": null,
      "choicesLeftError": null,
      "choicesRightError": null,
      "choiceParent": null,
      "gameTextTail": "",
      "screen": {
        "width": 1280,
        "height": 720
      },
      "httpStatus": 200,
      "gameSetup": {
        "started": false,
        "steps": 45,
        "bodyTail": ""
      },
      "pageErrors": [],
      "failures": [
        "game did not reach prep/gameplay state",
        "required gameplay layout node missing",
        "grid resolved to 0 tracks, not four",
        "layout right edge error null",
        "action panel does not end at layout right edge: null",
        "narration does not end at column 4 start: null",
        "choices do not start at column 4: null",
        "choices do not fill column 4 to the right edge: null"
      ]
    },
    {
      "label": "fullscreen-off",
      "viewport": {
        "width": 915,
        "height": 412,
        "screenWidth": 915,
        "screenHeight": 412,
        "fullscreen": false,
        "documentWidth": 915
      },
      "selectors": {
        "layout": false,
        "panel": false,
        "narration": false,
        "choices": false
      },
      "layout": null,
      "tracks": [],
      "gridTemplateColumns": null,
      "column4": null,
      "actionPanel": null,
      "narration": null,
      "choices": null,
      "panelRightError": null,
      "layoutRightError": null,
      "narrationRightError": null,
      "choicesLeftError": null,
      "choicesRightError": null,
      "choiceParent": null,
      "gameTextTail": "",
      "screen": {
        "width": 915,
        "height": 412
      },
      "httpStatus": 200,
      "gameSetup": {
        "started": false,
        "steps": 45,
        "bodyTail": ""
      },
      "pageErrors": [],
      "failures": [
        "game did not reach prep/gameplay state",
        "required gameplay layout node missing",
        "grid resolved to 0 tracks, not four",
        "layout right edge error null",
        "action panel does not end at layout right edge: null",
        "narration does not end at column 4 start: null",
        "choices do not start at column 4: null",
        "choices do not fill column 4 to the right edge: null"
      ]
    },
    {
      "label": "fullscreen-on",
      "viewport": {
        "width": 915,
        "height": 412,
        "screenWidth": 915,
        "screenHeight": 412,
        "fullscreen": true,
        "documentWidth": 915
      },
      "selectors": {
        "layout": false,
        "panel": false,
        "narration": false,
        "choices": false
      },
      "layout": null,
      "tracks": [],
      "gridTemplateColumns": null,
      "column4": null,
      "actionPanel": null,
      "narration": null,
      "choices": null,
      "panelRightError": null,
      "layoutRightError": null,
      "narrationRightError": null,
      "choicesLeftError": null,
      "choicesRightError": null,
      "choiceParent": null,
      "gameTextTail": "",
      "screen": {
        "width": 915,
        "height": 412
      },
      "httpStatus": 200,
      "gameSetup": {
        "started": false,
        "steps": 45,
        "bodyTail": ""
      },
      "pageErrors": [],
      "failures": [
        "game did not reach prep/gameplay state",
        "required gameplay layout node missing",
        "grid resolved to 0 tracks, not four",
        "layout right edge error null",
        "action panel does not end at layout right edge: null",
        "narration does not end at column 4 start: null",
        "choices do not start at column 4: null",
        "choices do not fill column 4 to the right edge: null"
      ]
    },
    {
      "label": "fullscreen-off",
      "viewport": {
        "width": 720,
        "height": 360,
        "screenWidth": 720,
        "screenHeight": 360,
        "fullscreen": false,
        "documentWidth": 720
      },
      "selectors": {
        "layout": false,
        "panel": false,
        "narration": false,
        "choices": false
      },
      "layout": null,
      "tracks": [],
      "gridTemplateColumns": null,
      "column4": null,
      "actionPanel": null,
      "narration": null,
      "choices": null,
      "panelRightError": null,
      "layoutRightError": null,
      "narrationRightError": null,
      "choicesLeftError": null,
      "choicesRightError": null,
      "choiceParent": null,
      "gameTextTail": "",
      "screen": {
        "width": 720,
        "height": 360
      },
      "httpStatus": 200,
      "gameSetup": {
        "started": false,
        "steps": 45,
        "bodyTail": ""
      },
      "pageErrors": [],
      "failures": [
        "game did not reach prep/gameplay state",
        "required gameplay layout node missing",
        "grid resolved to 0 tracks, not four",
        "layout right edge error null",
        "action panel does not end at layout right edge: null",
        "narration does not end at column 4 start: null",
        "choices do not start at column 4: null",
        "choices do not fill column 4 to the right edge: null"
      ]
    },
    {
      "label": "fullscreen-on",
      "viewport": {
        "width": 720,
        "height": 360,
        "screenWidth": 720,
        "screenHeight": 360,
        "fullscreen": true,
        "documentWidth": 720
      },
      "selectors": {
        "layout": false,
        "panel": false,
        "narration": false,
        "choices": false
      },
      "layout": null,
      "tracks": [],
      "gridTemplateColumns": null,
      "column4": null,
      "actionPanel": null,
      "narration": null,
      "choices": null,
      "panelRightError": null,
      "layoutRightError": null,
      "narrationRightError": null,
      "choicesLeftError": null,
      "choicesRightError": null,
      "choiceParent": null,
      "gameTextTail": "",
      "screen": {
        "width": 720,
        "height": 360
      },
      "httpStatus": 200,
      "gameSetup": {
        "started": false,
        "steps": 45,
        "bodyTail": ""
      },
      "pageErrors": [],
      "failures": [
        "game did not reach prep/gameplay state",
        "required gameplay layout node missing",
        "grid resolved to 0 tracks, not four",
        "layout right edge error null",
        "action panel does not end at layout right edge: null",
        "narration does not end at column 4 start: null",
        "choices do not start at column 4: null",
        "choices do not fill column 4 to the right edge: null"
      ]
    }
  ],
  "failures": [
    "fullscreen-off 1280x720: game did not reach prep/gameplay state",
    "fullscreen-off 1280x720: required gameplay layout node missing",
    "fullscreen-off 1280x720: grid resolved to 0 tracks, not four",
    "fullscreen-off 1280x720: layout right edge error null",
    "fullscreen-off 1280x720: action panel does not end at layout right edge: null",
    "fullscreen-off 1280x720: narration does not end at column 4 start: null",
    "fullscreen-off 1280x720: choices do not start at column 4: null",
    "fullscreen-off 1280x720: choices do not fill column 4 to the right edge: null",
    "fullscreen-on 1280x720: game did not reach prep/gameplay state",
    "fullscreen-on 1280x720: required gameplay layout node missing",
    "fullscreen-on 1280x720: grid resolved to 0 tracks, not four",
    "fullscreen-on 1280x720: layout right edge error null",
    "fullscreen-on 1280x720: action panel does not end at layout right edge: null",
    "fullscreen-on 1280x720: narration does not end at column 4 start: null",
    "fullscreen-on 1280x720: choices do not start at column 4: null",
    "fullscreen-on 1280x720: choices do not fill column 4 to the right edge: null",
    "fullscreen-off 915x412: game did not reach prep/gameplay state",
    "fullscreen-off 915x412: required gameplay layout node missing",
    "fullscreen-off 915x412: grid resolved to 0 tracks, not four",
    "fullscreen-off 915x412: layout right edge error null",
    "fullscreen-off 915x412: action panel does not end at layout right edge: null",
    "fullscreen-off 915x412: narration does not end at column 4 start: null",
    "fullscreen-off 915x412: choices do not start at column 4: null",
    "fullscreen-off 915x412: choices do not fill column 4 to the right edge: null",
    "fullscreen-on 915x412: game did not reach prep/gameplay state",
    "fullscreen-on 915x412: required gameplay layout node missing",
    "fullscreen-on 915x412: grid resolved to 0 tracks, not four",
    "fullscreen-on 915x412: layout right edge error null",
    "fullscreen-on 915x412: action panel does not end at layout right edge: null",
    "fullscreen-on 915x412: narration does not end at column 4 start: null",
    "fullscreen-on 915x412: choices do not start at column 4: null",
    "fullscreen-on 915x412: choices do not fill column 4 to the right edge: null",
    "fullscreen-off 720x360: game did not reach prep/gameplay state",
    "fullscreen-off 720x360: required gameplay layout node missing",
    "fullscreen-off 720x360: grid resolved to 0 tracks, not four",
    "fullscreen-off 720x360: layout right edge error null",
    "fullscreen-off 720x360: action panel does not end at layout right edge: null",
    "fullscreen-off 720x360: narration does not end at column 4 start: null",
    "fullscreen-off 720x360: choices do not start at column 4: null",
    "fullscreen-off 720x360: choices do not fill column 4 to the right edge: null",
    "fullscreen-on 720x360: game did not reach prep/gameplay state",
    "fullscreen-on 720x360: required gameplay layout node missing",
    "fullscreen-on 720x360: grid resolved to 0 tracks, not four",
    "fullscreen-on 720x360: layout right edge error null",
    "fullscreen-on 720x360: action panel does not end at layout right edge: null",
    "fullscreen-on 720x360: narration does not end at column 4 start: null",
    "fullscreen-on 720x360: choices do not start at column 4: null",
    "fullscreen-on 720x360: choices do not fill column 4 to the right edge: null"
  ],
  "verdict": "FAIL: fullscreen-off 1280x720: game did not reach prep/gameplay state; fullscreen-off 1280x720: required gameplay layout node missing; fullscreen-off 1280x720: grid resolved to 0 tracks, not four; fullscreen-off 1280x720: layout right edge error null; fullscreen-off 1280x720: action panel does not end at layout right edge: null; fullscreen-off 1280x720: narration does not end at column 4 start: null; fullscreen-off 1280x720: choices do not start at column 4: null; fullscreen-off 1280x720: choices do not fill column 4 to the right edge: null; fullscreen-on 1280x720: game did not reach prep/gameplay state; fullscreen-on 1280x720: required gameplay layout node missing; fullscreen-on 1280x720: grid resolved to 0 tracks, not four; fullscreen-on 1280x720: layout right edge error null; fullscreen-on 1280x720: action panel does not end at layout right edge: null; fullscreen-on 1280x720: narration does not end at column 4 start: null; fullscreen-on 1280x720: choices do not start at column 4: null; fullscreen-on 1280x720: choices do not fill column 4 to the right edge: null; fullscreen-off 915x412: game did not reach prep/gameplay state; fullscreen-off 915x412: required gameplay layout node missing; fullscreen-off 915x412: grid resolved to 0 tracks, not four; fullscreen-off 915x412: layout right edge error null; fullscreen-off 915x412: action panel does not end at layout right edge: null; fullscreen-off 915x412: narration does not end at column 4 start: null; fullscreen-off 915x412: choices do not start at column 4: null; fullscreen-off 915x412: choices do not fill column 4 to the right edge: null; fullscreen-on 915x412: game did not reach prep/gameplay state; fullscreen-on 915x412: required gameplay layout node missing; fullscreen-on 915x412: grid resolved to 0 tracks, not four; fullscreen-on 915x412: layout right edge error null; fullscreen-on 915x412: action panel does not end at layout right edge: null; fullscreen-on 915x412: narration does not end at column 4 start: null; fullscreen-on 915x412: choices do not start at column 4: null; fullscreen-on 915x412: choices do not fill column 4 to the right edge: null; fullscreen-off 720x360: game did not reach prep/gameplay state; fullscreen-off 720x360: required gameplay layout node missing; fullscreen-off 720x360: grid resolved to 0 tracks, not four; fullscreen-off 720x360: layout right edge error null; fullscreen-off 720x360: action panel does not end at layout right edge: null; fullscreen-off 720x360: narration does not end at column 4 start: null; fullscreen-off 720x360: choices do not start at column 4: null; fullscreen-off 720x360: choices do not fill column 4 to the right edge: null; fullscreen-on 720x360: game did not reach prep/gameplay state; fullscreen-on 720x360: required gameplay layout node missing; fullscreen-on 720x360: grid resolved to 0 tracks, not four; fullscreen-on 720x360: layout right edge error null; fullscreen-on 720x360: action panel does not end at layout right edge: null; fullscreen-on 720x360: narration does not end at column 4 start: null; fullscreen-on 720x360: choices do not start at column 4: null; fullscreen-on 720x360: choices do not fill column 4 to the right edge: null"
}
~~~
