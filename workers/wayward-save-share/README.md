# Wayward Save Share Worker

Cloudflare Worker backend for one-time save-sharing codes and WML account saves using OPAQUE authentication and client-side encryption.

## Security model

- Account registration/login uses the pinned dependency @serenity-kit/opaque@1.1.0. The client does not submit the user's password to the Worker. D1 stores an OPAQUE registration record rather than a password hash derived from the user's password.
- Account saves are encrypted on the user's device using AES-256-GCM. The key is derived locally from OPAQUE's client-only exportKey using HKDF-SHA-256. The Worker receives and stores only the encrypted envelope, not plaintext game state or the encryption key.
- The WML mod pins the OPAQUE server public key and refuses account registration/login while the key is unset or mismatched.
- This does not protect against a deliberately modified game/mod bundle that captures typed input before the OPAQUE client sees it. Users should install the trusted release.
- One-time codes deliberately remain a separate convenience mode: six mixed-case letters/numbers, seven-day expiry, and deletion after a successful first load. They are not end-to-end encrypted. Anyone who obtains a code before its first successful use can redeem it, so do not publish it openly.

## Bindings and private server setup

Cloudflare bindings:
- D1: DB → wayward-save-share-db
- R2: SAVE_OBJECTS → wayward-save-share-files

Generate an OPAQUE server setup once on a trusted local computer using the CLI included with the pinned package. Use the package's create-server-setup command, then derive its public key with get-server-public-key.

1. Store the complete server setup only as the Cloudflare Worker secret OPAQUE_SERVER_SETUP. Never commit or share this value.
2. Put only the derived public key in the WML mod's OPAQUE_SERVER_PUBLIC_KEY constant, replacing SET_AFTER_GENERATING_OPAQUE_SERVER_SETUP. This public key is meant to be public.
3. Keep the private setup secret stable and backed up securely. Replacing it will invalidate existing OPAQUE credentials.
4. Apply schema.sql to the existing D1 database before deploying the Worker. The script is additive and does not delete existing save_shares rows or R2 objects.
5. Run npm install and npm run build in this directory, then deploy the generated index.js (not index.src.js) to the Worker.
6. Check GET /api/health for accountSchema: "ready" and opaqueAuth: "ready".

Never generate a production setup secret in a public workflow or commit it to the repository. Automated tests generate an ephemeral test setup.

## Build and test

The GitHub Actions workflow pins the OPAQUE dependency and bundles:
- index.src.js → standalone index.js
- wml/mods/cloud-save/opaque-client-entry.js → wml/mods/cloud-save/opaque-client.bundle.js

It then runs JavaScript syntax checks, schema checks and integration tests against in-memory SQLite and R2 test doubles.

The integration test covers OPAQUE registration/login, incorrect passwords, proof that the old password-forwarding endpoints are disabled, AES-GCM encrypt/decrypt and tamper detection, authenticated slot CRUD and the five-slot limit, and preserved one-time-code behavior.

## API

- POST /api/opaque/register/start and /api/opaque/register/finish
- POST /api/opaque/login/start and /api/opaque/login/finish
- POST /api/account/logout
- GET /api/account/saves
- GET|PUT|DELETE /api/account/saves/:slot (slots 1–5)
- POST /api/share and /api/import (existing one-time-code flow)

The old password-forwarding endpoints POST /api/account/register and POST /api/account/login return HTTP 410.

## Limits and recovery

- Maximum five account slots; each encrypted request is limited by the Worker request-body cap.
- Account saves remain until the user deletes or overwrites them.
- Sessions expire after 30 days.
- No email-based password reset exists. Forgetting the password means the OPAQUE export key cannot be recreated, so existing encrypted account saves cannot be decrypted.
