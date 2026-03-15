const sql = `
ALTER TABLE workouts ADD COLUMN duration_seconds INTEGER;
`;
export default sql;
