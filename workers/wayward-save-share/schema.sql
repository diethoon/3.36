-- Existing one-time share table (preserved).
CREATE TABLE IF NOT EXISTS save_shares (
  code TEXT PRIMARY KEY NOT NULL CHECK(length(code) = 6),
  object_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_save_shares_expires_at
ON save_shares(expires_at);

-- Account credentials: passwords are salted PBKDF2-SHA-256 hashes, never plaintext.
CREATE TABLE IF NOT EXISTS cloud_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL,
  username_norm TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Only a SHA-256 hash of the opaque bearer token is stored.
CREATE TABLE IF NOT EXISTS cloud_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY(account_id) REFERENCES cloud_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cloud_sessions_expiry
ON cloud_sessions(expires_at);

-- Fixed slots 1-5 make the per-account quota enforceable in the database.
CREATE TABLE IF NOT EXISTS cloud_saves (
  account_id TEXT NOT NULL,
  slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 5),
  object_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  saved_at INTEGER NOT NULL,
  byte_length INTEGER NOT NULL DEFAULT 0 CHECK(byte_length >= 0),
  PRIMARY KEY(account_id, slot),
  FOREIGN KEY(account_id) REFERENCES cloud_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cloud_saves_account
ON cloud_saves(account_id);

-- Rate-limit signup and login attempts without storing raw IP addresses.
CREATE TABLE IF NOT EXISTS cloud_auth_limits (
  key TEXT PRIMARY KEY NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL CHECK(count >= 0)
);
