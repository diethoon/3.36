# Wayward Save Share Worker

Cloudflare Worker backend for Wayward's optional one-time save sharing and WML account cloud saves.

## Bindings

- D1: DB → wayward-save-share-db
- R2: SAVE_OBJECTS → wayward-save-share-files

## Deploy safely

1. Apply schema.sql to the existing production D1 database first. It uses CREATE TABLE IF NOT EXISTS and keeps the original save_shares table and codes intact.
2. Then deploy index.js as the Worker source.
3. Check GET /api/health. The expected fields include schema: "ready" and accountSchema: "ready".
4. Confirm both one-time sharing and a test account's save/list/load/delete round-trip before announcing the feature.

Do not deploy the Worker account routes before applying schema.sql: existing one-time routes remain compatible, but account routes require the new tables.

## One-time code API (existing behavior)

- POST /api/share?title=... with the raw JSON save payload. Returns a six-character mixed-case alphanumeric code. Code metadata expires after seven days.
- POST /api/import with {"code":"aB3xY7"} returns the raw save JSON and consumes the code atomically. A code is accepted only once.
- Maximum payload is 20 MiB.

## Account API (new)

- POST /api/account/register — JSON {"username":"...","password":"..."}; creates an account and starts a session.
- POST /api/account/login — returns a bearer token with a 30-day expiry.
- POST /api/account/logout — revokes the current session.
- GET /api/account/saves — returns metadata for the account's 1–5 slots.
- GET /api/account/saves/1 — downloads the snapshot for slot 1.
- PUT /api/account/saves/1?title=... — creates/replaces slot 1 with a JSON snapshot.
- DELETE /api/account/saves/1 — deletes slot 1.

Slot numbers are restricted by both route validation and the database CHECK constraint. The table has a primary key on (account_id, slot), so an account cannot have more than five slots.

## Security

- Passwords are stored as a per-account random salt plus PBKDF2-HMAC-SHA-256 hash; plaintext passwords are not stored.
- Login/signup attempts are rate-limited by a 15-minute window using a hash of the request IP rather than the raw IP address.
- Session tokens are random 256-bit bearer secrets. Only SHA-256 token hashes are stored in D1.
- Account requests require Authorization: Bearer. All requests use no-store cache headers.
- R2 objects stay private; they are served only through authenticated Worker handlers. Account saves use the accounts/ prefix, distinct from the shares/ prefix with its seven-day R2 lifecycle policy.
- No email recovery flow exists in this version; users who forget their password cannot recover the account.
