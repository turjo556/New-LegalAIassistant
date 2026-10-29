-- Per-participant thread read watermarks. Message contents stay in messages;
-- read receipts are private to the account and never exposed to its partner.
CREATE TABLE message_reads (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
 last_read_rowid INTEGER NOT NULL DEFAULT 0 CHECK(last_read_rowid>=0),
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,booking_id)
);
