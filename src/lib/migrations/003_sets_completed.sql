-- Iteration 2 follow-up: mark sets as completed (schema_version -> 3)
ALTER TABLE sets ADD COLUMN is_completed INTEGER NOT NULL DEFAULT 0;
UPDATE sets SET is_completed = 0 WHERE is_completed IS NULL;

