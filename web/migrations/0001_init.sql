-- Foster Parent Navigator, initial schema.
--
-- D1 has no row-level security, so the access rules that Postgres would
-- enforce in the database live in app/lib/db.server.ts instead, and are
-- covered by access.test.mjs. Read that file before changing any query here.

CREATE TABLE profiles (
  user_id     TEXT PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('parent', 'specialist')),
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE specialists (
  user_id     TEXT PRIMARY KEY REFERENCES profiles(user_id),
  agency_name TEXT NOT NULL,
  work_email  TEXT NOT NULL
);

CREATE TABLE parent_profiles (
  user_id             TEXT PRIMARY KEY REFERENCES profiles(user_id),
  specialist_user_id  TEXT NOT NULL REFERENCES specialists(user_id),
  county              TEXT
);

CREATE TABLE questions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES profiles(user_id),
  body        TEXT NOT NULL,
  verdict     TEXT,          -- yes | no | conditional | insufficient
  match_tier  TEXT,          -- exact | related | none
  headline    TEXT,
  statement   TEXT,
  citations   TEXT,          -- json array
  gate_failures TEXT,        -- json array; non-empty means the answer was never shown
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX questions_user ON questions(user_id, created_at DESC);

CREATE TABLE escalations (
  id                 TEXT PRIMARY KEY,
  question_id        TEXT NOT NULL REFERENCES questions(id),
  parent_user_id     TEXT NOT NULL REFERENCES profiles(user_id),

  -- snapshot, deliberately not a live lookup through parent_profiles:
  -- when reassignment exists, the record of who actually received and
  -- answered each escalation must survive.
  specialist_user_id TEXT NOT NULL REFERENCES specialists(user_id),

  -- frozen at send time: the literal record of what was disclosed,
  -- which is what makes the "what will be shared" screen a guarantee.
  shared_payload     TEXT NOT NULL,

  reference_code     TEXT NOT NULL UNIQUE,
  reason             TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'answered', 'closed_offline')),
  response_body      TEXT,
  responded_at       TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX escalations_specialist ON escalations(specialist_user_id, status, created_at);
CREATE INDEX escalations_parent ON escalations(parent_user_id, created_at DESC);
