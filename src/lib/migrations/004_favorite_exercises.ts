const sql = `
CREATE TABLE IF NOT EXISTS user_favorite_exercises(
  user_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  PRIMARY KEY(user_id, exercise_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);
`;
export default sql;

