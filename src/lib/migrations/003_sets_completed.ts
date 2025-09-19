const sql = `
ALTER TABLE sets ADD COLUMN is_completed INTEGER NOT NULL DEFAULT 0;
UPDATE sets SET is_completed = 0 WHERE is_completed IS NULL;
`;
export default sql;

