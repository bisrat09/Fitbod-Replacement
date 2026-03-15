const sql = `
CREATE TABLE IF NOT EXISTS body_weight (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  weight REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_body_weight_user_date ON body_weight(user_id, date);
`;
export default sql;
