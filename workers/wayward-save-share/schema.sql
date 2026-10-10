-- Wayward Save Share metadata table.
-- The actual save payload is stored privately in R2; D1 stores only metadata.

CREATE TABLE IF NOT EXISTS save_shares (
  code TEXT PRIMARY KEY NOT NULL CHECK(length(code) = 6),
  object_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_save_shares_expires_at
ON save_shares(expires_at);
