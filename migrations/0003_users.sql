-- Multi-user auth (slice 9): users + per-user scoping on every bag table.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Profile becomes per-user (keep the legacy single row for user 1).
ALTER TABLE profile ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_user ON profile(user_id);
ALTER TABLE threads ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE card_items ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tasks ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE plan_docs ADD COLUMN user_id INTEGER;
ALTER TABLE repos ADD COLUMN user_id INTEGER;
ALTER TABLE contests ADD COLUMN user_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id);
CREATE INDEX IF NOT EXISTS idx_card_items_user ON card_items(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
