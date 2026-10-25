# Wayward Google OAuth popup page

This directory contains static HTML for the Wayward Google Drive cloud-save mod.

- `index.html`: informational landing page.
- `popup.html`: Google Identity Services token popup used by the WML mod.

## Deployment

Deploy this directory as the root of the existing Vercel project `wayward-cloud-auth`, keeping the production origin `https://wayward-cloud-auth.vercel.app`. The WML mod opens `https://wayward-cloud-auth.vercel.app/popup.html` for authentication. This is a static page; it does not store saves or exchange tokens through a backend.

The Google OAuth Web client must list `https://wayward-cloud-auth.vercel.app` under Authorized JavaScript origins. No redirect URI or client secret is required for this static GIS popup flow. Never put a client secret in the mod or static HTML.

The popup asks Google for the `drive.appdata` scope, then posts the short-lived access token to the original game window. The game validates the sender origin, popup reference, and nonce/state. Save contents are encrypted in the game and sent directly to Google Drive `appDataFolder`.

The popup flow is intended to allow the game itself to run from `file://`, localhost, LAN HTTP, or HTTPS. Real-device verification is still required because browser popup and opener behavior can differ.
