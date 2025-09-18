// Generated from fitlog_schema.sql for Metro compatibility
const schema = `PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT,display_name TEXT,unit TEXT NOT NULL DEFAULT 'lb',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS exercises (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,modality TEXT,muscle_groups TEXT NOT NULL,is_compound INTEGER NOT NULL DEFAULT 0,default_increment REAL NOT NULL DEFAULT 2.5,notes TEXT,is_archived INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_exercises_user ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_user_name ON exercises(user_id, name);
CREATE TABLE IF NOT EXISTS workouts (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,date TEXT NOT NULL,split TEXT,notes TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);
CREATE TABLE IF NOT EXISTS sets (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,workout_id TEXT NOT NULL,exercise_id TEXT NOT NULL,set_index INTEGER NOT NULL,weight REAL,reps INTEGER,rir REAL,tempo TEXT,is_warmup INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE,FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_sets_user_workout ON sets(user_id, workout_id);
CREATE INDEX IF NOT EXISTS idx_sets_user_exercise ON sets(user_id, exercise_id);
CREATE TABLE IF NOT EXISTS metrics (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,date TEXT NOT NULL,exercise_id TEXT NOT NULL,est_1rm REAL,top_set_weight REAL,top_set_reps INTEGER,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_metrics_user_date ON metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_metrics_user_ex ON metrics(user_id, exercise_id);
CREATE TABLE IF NOT EXISTS weekly_volume (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,week_start TEXT NOT NULL,muscle_group TEXT NOT NULL,hard_sets INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(user_id, week_start, muscle_group),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_weekly_volume_user_week ON weekly_volume(user_id, week_start);
CREATE TABLE IF NOT EXISTS programs (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,is_active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_programs_user ON programs(user_id);
CREATE TABLE IF NOT EXISTS program_days (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,program_id TEXT NOT NULL,day_order INTEGER NOT NULL,split TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(program_id) REFERENCES programs(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_progdays_user_prog ON program_days(user_id, program_id);
CREATE TABLE IF NOT EXISTS program_day_exercises (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,program_day_id TEXT NOT NULL,exercise_id TEXT NOT NULL,target_reps_min INTEGER,target_reps_max INTEGER,target_sets INTEGER,target_rir REAL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(program_day_id) REFERENCES program_days(id) ON DELETE CASCADE,FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_progdayex_user_day ON program_day_exercises(user_id, program_day_id);
CREATE TABLE IF NOT EXISTS settings (user_id TEXT NOT NULL,key TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY (user_id, key),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL);
INSERT OR IGNORE INTO app_meta(key,value) VALUES ('schema_version','1');`;

export default schema;

