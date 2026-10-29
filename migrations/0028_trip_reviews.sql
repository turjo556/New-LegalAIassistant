-- Two-way trip reviews. Only the account owner sees submitted-but-unpublished
-- content; release happens after both sides submit or the fixed window ends.
CREATE TABLE trip_reviews(
 id TEXT PRIMARY KEY,
 booking_id TEXT NOT NULL REFERENCES bookings(id),
 reviewer_id TEXT NOT NULL REFERENCES users(id),
 target_id TEXT NOT NULL REFERENCES users(id),
 target_role TEXT NOT NULL CHECK(target_role IN('driver','passenger')),
 punctuality INTEGER NOT NULL CHECK(punctuality BETWEEN 1 AND 5),
 communication INTEGER NOT NULL CHECK(communication BETWEEN 1 AND 5),
 respect INTEGER NOT NULL CHECK(respect BETWEEN 1 AND 5),
 specific INTEGER NOT NULL CHECK(specific BETWEEN 1 AND 5),
 comment TEXT NOT NULL DEFAULT '' CHECK(length(comment)<=500),
 created INTEGER NOT NULL,
 deadline INTEGER NOT NULL,
 published_at INTEGER,
 UNIQUE(booking_id,reviewer_id),
 CHECK(reviewer_id<>target_id)
);
CREATE INDEX trip_reviews_recipient ON trip_reviews(target_id,target_role,published_at);
CREATE INDEX trip_reviews_pending ON trip_reviews(deadline) WHERE published_at IS NULL;
CREATE TRIGGER trip_review_published AFTER UPDATE OF published_at ON trip_reviews
WHEN OLD.published_at IS NULL AND NEW.published_at IS NOT NULL BEGIN
 INSERT INTO notifications(id,user_id,title,created)
 VALUES(lower(hex(randomblob(16))),NEW.target_id,'New trip review available in your account.',NEW.published_at);
END;
