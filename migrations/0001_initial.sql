CREATE TABLE IF NOT EXISTS runs (
  request_key TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);

