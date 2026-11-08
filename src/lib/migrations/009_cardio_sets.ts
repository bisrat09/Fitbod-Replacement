// Cardio sets: time, machine level and machine-reported calories
const sql = `
ALTER TABLE sets ADD COLUMN duration_sec INTEGER;
ALTER TABLE sets ADD COLUMN level REAL;
ALTER TABLE sets ADD COLUMN calories REAL;
`;
export default sql;
