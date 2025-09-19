// SQL for schema version 2 (Iteration 1)
const sql = `
CREATE TABLE IF NOT EXISTS user_equipment(
  user_id TEXT NOT NULL,
  item TEXT NOT NULL,
  PRIMARY KEY(user_id, item)
);

ALTER TABLE exercises ADD COLUMN required_equipment TEXT;
ALTER TABLE exercises ADD COLUMN tags TEXT;
ALTER TABLE exercises ADD COLUMN video_url TEXT;

CREATE TABLE IF NOT EXISTS workout_blocks(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workout_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  notes TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_blocks_user_workout ON workout_blocks(user_id, workout_id, order_index);

CREATE TABLE IF NOT EXISTS block_exercises(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  block_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(block_id) REFERENCES workout_blocks(id) ON DELETE CASCADE,
  FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_block_ex_user_block ON block_exercises(user_id, block_id, order_index);

ALTER TABLE sets ADD COLUMN block_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sets_user_block ON sets(user_id, block_id);
`;

export default sql;

