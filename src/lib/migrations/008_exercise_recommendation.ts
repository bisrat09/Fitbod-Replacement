const sql = `
ALTER TABLE exercises ADD COLUMN recommendation TEXT NOT NULL DEFAULT 'normal';
`;
export default sql;
