# Wayward Portrait UI (WML)

WML addon ID: `wayward-portrait-ui`

This addon only adds a small responsive CSS layer. It does not patch the game HTML or modify save data, RNG, turn progression, character state, economy, or action handlers.

## Install
1. Put `mod.js` in a folder named `WaywardPortraitUI` under the game's `wml/mods` directory.
2. Reload the game and enable **모바일 세로 UI 개선** in the WML mod manager.

## Current scope
- Reduce vertical padding on choice buttons in narrow/portrait layouts.
- Prevent choice buttons and one-column choice lists from forcing horizontal overflow.

This is an initial, conservative presentation-only version. It does not yet implement disabled-choice collapsing, fixed dialogue/header regions, or moving the support icon into the WML menu.
