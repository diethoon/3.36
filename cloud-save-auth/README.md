# Wayward Google login bridge

This is a small HTTPS OAuth bridge for the WML Google Drive cloud-save mod. The game opens this bridge in one popup. After the user clicks Google connect, that same popup navigates to Google's authorization page and returns to the callback endpoint; it does not ask Google Identity Services to open a second popup. The bridge exchanges the authorization code on the server and sends only the short-lived access token to the exact opener window identified by a signed state and one-time nonce. Save files and passphrases never pass through this service, and tokens are not stored.

## Vercel deployment

Create a separate Vercel project using this repository and set its Root Directory to cloud-save-auth. Use the project domain https://wayward-cloud-auth.vercel.app if available; the WML mod defaults to this exact origin. If another domain is used, set AUTH_BRIDGE_ORIGIN to that origin in Vercel and update AUTH_BRIDGE_URL in wml/mods/cloud-save/mod.js to match.

Set these Vercel environment variables for Production (and Preview only if testing previews deliberately):

- GOOGLE_CLIENT_ID: the public OAuth Web application client ID.
- GOOGLE_CLIENT_SECRET: the matching OAuth client secret. This is server-side only and must never be committed or bundled into the mod ZIP.
- OAUTH_STATE_SECRET: recommended, a random secret of at least 32 characters used to sign and validate OAuth state. If omitted, the code falls back to GOOGLE_CLIENT_SECRET.
- AUTH_BRIDGE_ORIGIN: optional; defaults to https://wayward-cloud-auth.vercel.app. Use only an HTTPS origin without a path or trailing slash.

Generate a state secret locally, for example with openssl rand -base64 48; do not post it in GitHub, issues, or chat. Redeploy after setting environment variables.

## One-time Google Cloud setup

1. Create one Google Cloud project for the mod (not one project per player) and enable the Google Drive API.
2. Configure the OAuth consent screen with the application name and support/contact details.
3. Create an OAuth client of type Web application.
4. Add this exact Authorized redirect URI: https://wayward-cloud-auth.vercel.app/api/oauth/callback. It must match the deployed bridge origin and callback path exactly. If you use a different bridge domain, register that domain's /api/oauth/callback URL instead.
5. Request only the https://www.googleapis.com/auth/drive.appdata scope.
6. Put the client ID and client secret in the Vercel environment variables above. The client secret must remain on the server.
7. For public use, publish the OAuth consent configuration and complete any Google verification that Google requires. If the app is still in testing mode, only configured test users can authorize it.

This server-side authorization-code flow does not require an Authorized JavaScript origin for GIS token popups; it uses the exact registered redirect URI instead.

## Execution environments and trust

- The same WML mod works from known HTTPS Wayward addresses, localhost, private-LAN HTTP, and file:// when the browser permits it. Public HTTP game origins are rejected. Custom HTTPS or non-standard local origins require explicit confirmation in the bridge.
- For file://, browsers expose an opaque origin (null), so the callback must use postMessage('*'). The mod checks the bridge origin, exact popup window, and high-entropy one-time nonce before accepting a response. This has weaker origin isolation than HTTPS; only confirm local-file mode when you directly opened the intended Wayward HTML yourself.
- Browser restrictions on popups, file://, WebCrypto, or CORS can still differ. JavaScript tests cannot guarantee every embedded mobile browser works; test in the target browser. If local-file restrictions block Drive calls, use localhost, AWebServer, or HTTPS.
- The game popup first opens this bridge from a user gesture. The Google authorization page then replaces the contents of that same popup, avoiding the previous nested-popup failure (Failed to open popup window).
- OAuth state is HMAC-signed, expires after 10 minutes, and binds the nonce and game origin. The callback validates the state before exchanging a code or returning a token.
- Access tokens remain in game-page memory only and expire. Reopening the game requires another user gesture to connect; account selection/consent may be remembered by Google, but the mod stores no refresh token.
- Save data is encrypted in the game page and written directly to the user's Drive appDataFolder; this bridge does not store or write save data.
