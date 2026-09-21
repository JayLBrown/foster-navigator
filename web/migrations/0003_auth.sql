-- Passwordless sign-in: a 6-digit code sent to a known email address.
--
-- Codes and session tokens are stored hashed. A leaked database read should
-- not let anyone sign in as a foster parent and read their question history.
--
-- Only seeded emails can sign in. There is no self-registration, which is
-- what stops someone registering as a specialist and receiving real
-- families' escalations.

CREATE TABLE otp_codes (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  consumed_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX otp_email ON otp_codes(email, created_at DESC);

CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES profiles(user_id),
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX sessions_user ON sessions(user_id);
