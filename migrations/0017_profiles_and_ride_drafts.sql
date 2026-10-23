ALTER TABLE users ADD COLUMN profile_photo TEXT;
ALTER TABLE users ADD COLUMN photo_version TEXT;
CREATE TABLE ride_drafts(user_id TEXT PRIMARY KEY REFERENCES users(id),payload TEXT NOT NULL,updated INTEGER NOT NULL);
