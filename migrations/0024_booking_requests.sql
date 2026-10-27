CREATE TABLE booking_requests(
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),ride_id TEXT NOT NULL REFERENCES rides(id),
 seats INTEGER NOT NULL CHECK(seats BETWEEN 1 AND 4),price INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','expired','withdrawn')),
 created INTEGER NOT NULL,expires_at INTEGER NOT NULL,remind_at INTEGER NOT NULL,reminded INTEGER NOT NULL DEFAULT 0,
 booking_id TEXT REFERENCES bookings(id),decided_at INTEGER
);
CREATE UNIQUE INDEX one_pending_ride_request ON booking_requests(user_id,ride_id) WHERE status='pending';
CREATE INDEX due_booking_requests ON booking_requests(status,expires_at);
-- The booking and its credit debit happen in the same SQLite statement as acceptance.
-- Existing capacity, rider and driver approval triggers remain authoritative.
CREATE TRIGGER accept_booking_request AFTER UPDATE OF status ON booking_requests WHEN OLD.status='pending' AND NEW.status='accepted' BEGIN
 SELECT CASE WHEN NEW.seats+COALESCE((SELECT SUM(seats) FROM bookings WHERE ride_id=NEW.ride_id AND cancelled=0),0)>(SELECT capacity FROM rides WHERE id=NEW.ride_id) THEN RAISE(ABORT,'capacity_exceeded') END;
 SELECT CASE WHEN NEW.expires_at<=unixepoch()*1000 THEN RAISE(ABORT,'request_expired') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM rides WHERE id=NEW.ride_id AND cancelled=0 AND completed_at IS NULL AND price=NEW.price) THEN RAISE(ABORT,'ride_changed') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM bookings WHERE ride_id=NEW.ride_id AND user_id=NEW.user_id AND cancelled=0) THEN RAISE(ABORT,'already_booked') END;
 INSERT INTO bookings(id,user_id,ride_id,seats,total) VALUES(lower(hex(randomblob(16))),NEW.user_id,NEW.ride_id,NEW.seats,NEW.seats*NEW.price)
 ON CONFLICT(user_id,ride_id) DO UPDATE SET seats=excluded.seats,total=excluded.total,cancelled=0,credit_cycle=bookings.credit_cycle+1,
 cancelled_by=NULL,cancellation_case=NULL,cancellation_reason=NULL,passenger_completed_at=NULL,
 pickup_mode='standard',pickup_status='standard',pickup_address=NULL,pickup_lat=NULL,pickup_lng=NULL,pickup_distance=NULL;
 UPDATE booking_requests SET booking_id=(SELECT id FROM bookings WHERE user_id=NEW.user_id AND ride_id=NEW.ride_id) WHERE id=NEW.id;
END;
CREATE TRIGGER request_created_emails AFTER INSERT ON booking_requests BEGIN
 INSERT INTO account_email_outbox(event_key,user_id,kind,reference,created) VALUES('request-passenger:'||NEW.id,NEW.user_id,'request_pending',NEW.id,NEW.created);
 INSERT INTO account_email_outbox(event_key,user_id,kind,reference,created) SELECT 'request-driver:'||NEW.id,owner,'request_received',NEW.id,NEW.created FROM rides WHERE id=NEW.ride_id;
 INSERT INTO notifications(id,user_id,title,created) VALUES(lower(hex(randomblob(16))),NEW.user_id,'Seat request sent. Waiting for driver approval; not booked yet.',NEW.created);
 INSERT INTO notifications(id,user_id,title,created) SELECT lower(hex(randomblob(16))),owner,'New seat request. Review it in My listings before the response deadline.',NEW.created FROM rides WHERE id=NEW.ride_id;
END;
CREATE TRIGGER request_decision_emails AFTER UPDATE OF status ON booking_requests WHEN OLD.status='pending' AND NEW.status!='pending' BEGIN
 INSERT INTO account_email_outbox(event_key,user_id,kind,reference,created) VALUES('request-decision-passenger:'||NEW.id,NEW.user_id,'request_'||NEW.status,NEW.id,unixepoch()*1000);
 INSERT INTO account_email_outbox(event_key,user_id,kind,reference,created) SELECT 'request-decision-driver:'||NEW.id,owner,'request_driver_'||NEW.status,NEW.id,unixepoch()*1000 FROM rides WHERE id=NEW.ride_id;
 INSERT INTO notifications(id,user_id,title,created) VALUES(lower(hex(randomblob(16))),NEW.user_id,'Seat request: '||NEW.status||'. Check My trips for details.',unixepoch()*1000);
 INSERT INTO notifications(id,user_id,title,created) SELECT lower(hex(randomblob(16))),owner,'Seat request: '||NEW.status||'. Check My listings for details.',unixepoch()*1000 FROM rides WHERE id=NEW.ride_id;
END;
CREATE TRIGGER request_ride_cancel AFTER UPDATE OF cancelled ON rides WHEN NEW.cancelled=1 AND OLD.cancelled=0 BEGIN
 UPDATE booking_requests SET status='declined',decided_at=unixepoch()*1000 WHERE ride_id=NEW.id AND status='pending';
END;
CREATE TRIGGER request_reminder AFTER UPDATE OF reminded ON booking_requests WHEN OLD.reminded=0 AND NEW.reminded=1 AND NEW.status='pending' BEGIN
 INSERT INTO account_email_outbox(event_key,user_id,kind,reference,created) SELECT 'request-reminder:'||NEW.id,owner,'request_reminder',NEW.id,unixepoch()*1000 FROM rides WHERE id=NEW.ride_id;
 INSERT INTO notifications(id,user_id,title,created) SELECT lower(hex(randomblob(16))),owner,'Reminder: a seat request is waiting in My listings.',unixepoch()*1000 FROM rides WHERE id=NEW.ride_id;
END;
