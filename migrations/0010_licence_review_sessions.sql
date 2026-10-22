CREATE TABLE licence_review_sessions(token TEXT PRIMARY KEY REFERENCES sessions(token) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id),unlocked_until INTEGER NOT NULL);
CREATE TABLE licence_session_log(id TEXT PRIMARY KEY,operator_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,created INTEGER NOT NULL,unlocked_until INTEGER NOT NULL);
