# Wayward Google login bridge

This is a static OAuth popup bridge deployed on a fixed HTTPS Vercel origin. WML opens it from the game, the user authorizes Google there, and the short-lived access token is posted only to the opener window. Save files and passphrases never pass through this site. The bridge does not store tokens.

## Vercel deployment

Create a separate Vercel project using this repository and set its Root Directory to \`cloud-save-auth\`. Use the project domain \`wayward-cloud-auth.vercel.app\` if available; the mod uses that fixed address. Configure the project environment variable \`GOOGLE_CLIENT_ID\` to the public OAuth client ID described below. This variable is not a Client Secret.

## One-time maintainer setup

1. Create one Google Cloud project for the mod (not one project per player).
2. Enable the Google Drive API.
3. Configure the OAuth consent screen for the application name and support/contact details.
4. Create a Web application OAuth client.
5. Add the deployed bridge's origin (for example \`https://wayward-cloud-auth.vercel.app\`) under **Authorized JavaScript origins**. Do not add user's local IPs.
6. Declare only the \`https://www.googleapis.com/auth/drive.appdata\` scope.
7. Set the returned client ID as Vercel's \`GOOGLE_CLIENT_ID\` environment variable and redeploy.
8. For use by non-test users, publish the OAuth consent configuration and complete any Google verification requested for the app. Do not leave public use restricted to a small test-user list.

The client ID is intentionally public browser configuration; never create or ship a Client Secret for this token-based browser flow.

## Operation and trust

- Game origins accepted by the bridge are loopback hosts, RFC1918 private IPv4 addresses, and a short explicit list of public Wayward origins.
- A one-time random nonce pairs the popup response with the open game tab; the bridge checks the opener referrer origin before initiating OAuth.
- The access token is sent by \`postMessage\` to the launcher's exact origin. The mod verifies the sender origin, popup window, and nonce before accepting it.
- Tokens remain in WML memory only. Reopening the game requires another user gesture to request a fresh token; the browser may remember the Google account/consent. No refresh token is stored.
- Save data is encrypted in the game page and written directly to that user's Google Drive \`appDataFolder\`; this bridge has no Drive-writing code or storage database.
- The bridge still handles an OAuth token in the browser. Use only the published version you trust, and do not approve a login that you did not start.
