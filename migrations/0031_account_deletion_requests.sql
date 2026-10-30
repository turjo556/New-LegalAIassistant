CREATE TABLE account_deletion_requests (
 user_id TEXT PRIMARY KEY REFERENCES users(id),
 requested_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed'))
);
