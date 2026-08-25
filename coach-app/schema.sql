-- Hoop Heroes Coach Portal — Cloudflare D1 schema
-- Replaces the retired Firebase/Firestore backend.
--
-- Flexible document shapes (activities arrays, sessionTimes maps, comments,
-- history) are preserved in a JSON `data` column so the app's data model
-- carries over unchanged; the promoted columns exist only for filtering.

CREATE TABLE IF NOT EXISTS users (
  email       TEXT PRIMARY KEY,          -- lowercased email = identity from Cloudflare Access
  name        TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'HEAD_COACH', -- OWNER | ADMINISTRATOR | HEAD_COACH | ASSISTANT_COACH
  phone       TEXT,
  hourly_rate REAL,
  locations   TEXT NOT NULL DEFAULT '[]' -- JSON array of location codes/names
);

CREATE TABLE IF NOT EXISTS locations (
  id   TEXT PRIMARY KEY,
  name TEXT,
  data TEXT NOT NULL DEFAULT '{}'        -- full location document as JSON
);

CREATE TABLE IF NOT EXISTS session_plans (
  id          TEXT PRIMARY KEY,
  term        TEXT,
  week        INTEGER,
  age_group   TEXT,
  location_id TEXT,
  data        TEXT NOT NULL DEFAULT '{}' -- full session plan document (incl. activities)
);
CREATE INDEX IF NOT EXISTS idx_session_plans_twa ON session_plans (term, week, age_group);

CREATE TABLE IF NOT EXISTS drills (
  id   TEXT PRIMARY KEY,
  name TEXT,
  data TEXT NOT NULL DEFAULT '{}'        -- full drill document (types, comments, history, ratings)
);

CREATE TABLE IF NOT EXISTS drill_ratings (
  id          TEXT PRIMARY KEY,          -- `${drillName}_${locationId}` (spaces -> _)
  drill_name  TEXT,
  location_id TEXT,
  rating      REAL,
  updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  id   TEXT PRIMARY KEY,                 -- e.g. 'schedule'
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS reports (
  id         TEXT PRIMARY KEY,
  type       TEXT,
  location   TEXT,
  age_group  TEXT,
  coach_name TEXT,
  coach_email TEXT,
  timestamp  TEXT,
  data       TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_reports_ts ON reports (timestamp);

CREATE TABLE IF NOT EXISTS coach_profiles (
  id        TEXT PRIMARY KEY,
  user_id   TEXT,
  user_name TEXT,
  timestamp TEXT,
  data      TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_coach_profiles_user ON coach_profiles (user_id, timestamp);
