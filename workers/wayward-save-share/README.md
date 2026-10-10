# Wayward Save Share Worker

Cloudflare Worker backend for the Wayward 3.36 optional save-sharing feature.

## Cloudflare bindings

- D1 binding: `DB` → `wayward-save-share-db`
- R2 binding: `SAVE_OBJECTS` → `wayward-save-share-files`

## D1 schema

The production D1 database should contain the `save_shares` table. The SQL is in `schema.sql`.

## Deploy

The Worker currently uses Dashboard-managed deployment. In Cloudflare Dashboard, open **Workers & Pages → wayward-save-share → Edit code**, replace the starter Hello World source with `index.js`, save/deploy, and check `GET /api/health`.

The repo file is the version-controlled source of truth; it is not automatically deployed unless the Worker is later connected to this repository.

## API

### Health check

`GET /api/health`

Returns `{"ok":true,"service":"wayward-save-share","storage":"D1+R2"}` if the D1 query and both bindings are present.

### Create a share

`POST /api/share?title=<URL-encoded title>`

Body: the raw UTF-8 JSON bytes of one save slot (not a wrapper object). Send with `Content-Type: application/json; charset=utf-8`.

Success (201):

```json
{
  "ok": true,
  "code": "aB3xY7",
  "title": "Before the night",
  "createdAt": 1791600000,
  "expiresAt": 1792204800,
  "expiresInSeconds": 604800
}
```

The server stores the raw body in private R2 and metadata in D1. Maximum body size: 20 MiB.

### Import/consume a share

`POST /api/import`

Body:

```json
{"code":"aB3xY7"}
```

On success, the response body is the raw save JSON. The title is supplied in the percent-encoded `X-Share-Title` response header. The code is atomically consumed and cannot be redeemed again.

## Expiration

D1 enforces a seven-day code expiry regardless of background object cleanup. In the R2 bucket dashboard, add an Object Lifecycle Rule:

- Rule name: `Expire shared saves after 7 days`
- Prefix: `shares/`
- Action: delete objects after 7 days

R2 lifecycle cleanup is asynchronous; the API rejects expired codes exactly based on the D1 timestamp.

## CORS and offline files

The Worker permits unauthenticated, credential-free cross-origin requests because the game may run from a local `file://` URL (origin `null`). Shared saves are not publicly exposed from R2; all access goes through this Worker.

The six-character code is a bearer secret. Anyone who obtains an unused code can import that save, so users should only share it with the intended recipient.
