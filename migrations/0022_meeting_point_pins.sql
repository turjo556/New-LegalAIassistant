CREATE TABLE meeting_point_pins(point_id TEXT PRIMARY KEY,lat REAL NOT NULL,lng REAL NOT NULL,source_url TEXT NOT NULL,confirmed_by TEXT NOT NULL REFERENCES users(id),confirmed_at INTEGER NOT NULL);
CREATE TABLE meeting_point_pin_log(id TEXT PRIMARY KEY,point_id TEXT NOT NULL,lat REAL NOT NULL,lng REAL NOT NULL,source_url TEXT NOT NULL,operator_id TEXT NOT NULL REFERENCES users(id),created INTEGER NOT NULL);
CREATE TABLE meeting_point_pin_attempts(point_id TEXT PRIMARY KEY,attempted_at INTEGER NOT NULL);
