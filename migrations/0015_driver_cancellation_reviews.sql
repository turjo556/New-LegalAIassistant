ALTER TABLE rides ADD COLUMN cancelled_by TEXT REFERENCES users(id);
ALTER TABLE rides ADD COLUMN cancellation_case TEXT REFERENCES support_tickets(id);
ALTER TABLE rides ADD COLUMN cancellation_reason TEXT;
CREATE TABLE ride_cancellation_reviews(id INTEGER PRIMARY KEY,ride_id TEXT,operator_id TEXT,case_id TEXT,reason TEXT,created INTEGER);
CREATE TRIGGER operator_ride_cancellation_audit AFTER UPDATE OF cancelled ON rides WHEN OLD.cancelled=0 AND NEW.cancelled=1 AND NEW.cancelled_by IS NOT NULL BEGIN
 INSERT INTO ride_cancellation_reviews(ride_id,operator_id,case_id,reason,created) VALUES(NEW.id,NEW.cancelled_by,NEW.cancellation_case,NEW.cancellation_reason,unixepoch()*1000);
END;
