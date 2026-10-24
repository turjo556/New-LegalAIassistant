CREATE TABLE boarding_checks(booking_id TEXT PRIMARY KEY REFERENCES bookings(id),code_digest TEXT NOT NULL,issued_at INTEGER NOT NULL,confirmed_at INTEGER);
CREATE TABLE trip_share_links(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),ride_id TEXT NOT NULL REFERENCES rides(id),booking_id TEXT REFERENCES bookings(id),expires_at INTEGER NOT NULL,revoked_at INTEGER,created INTEGER NOT NULL);
CREATE INDEX share_owner ON trip_share_links(user_id,ride_id);
ALTER TABLE reports ADD COLUMN booking_id TEXT REFERENCES bookings(id);
ALTER TABLE reports ADD COLUMN category TEXT NOT NULL DEFAULT 'member';
ALTER TABLE reports ADD COLUMN urgent INTEGER NOT NULL DEFAULT 0;
CREATE TABLE trip_safety_feedback(booking_id TEXT PRIMARY KEY REFERENCES bookings(id),user_id TEXT NOT NULL REFERENCES users(id),comfortable INTEGER NOT NULL,vehicle_matched INTEGER NOT NULL,conduct_concern INTEGER NOT NULL,details TEXT NOT NULL,report_id TEXT,created INTEGER NOT NULL);
CREATE TRIGGER safety_feedback_report AFTER INSERT ON trip_safety_feedback WHEN NEW.report_id IS NOT NULL BEGIN
 INSERT INTO reports(id,user_id,target_id,reason,created,booking_id,category,urgent) SELECT NEW.report_id,NEW.user_id,r.owner,'Confidential post-trip safety feedback. Comfortable: '||NEW.comfortable||'; driver/vehicle matched: '||NEW.vehicle_matched||'; conduct concern: '||NEW.conduct_concern||'. '||NEW.details,NEW.created,NEW.booking_id,'post_trip_safety',CASE WHEN NEW.conduct_concern=1 OR NEW.vehicle_matched=0 THEN 1 ELSE 0 END FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE b.id=NEW.booking_id;
END;
CREATE TRIGGER safety_cancel_booking AFTER UPDATE OF cancelled ON bookings WHEN NEW.cancelled=1 BEGIN
 DELETE FROM boarding_checks WHERE booking_id=NEW.id;
 UPDATE trip_share_links SET revoked_at=unixepoch()*1000 WHERE booking_id=NEW.id AND revoked_at IS NULL;
END;
CREATE TRIGGER safety_cancel_ride AFTER UPDATE OF cancelled ON rides WHEN NEW.cancelled=1 BEGIN
 DELETE FROM boarding_checks WHERE booking_id IN(SELECT id FROM bookings WHERE ride_id=NEW.id);
 UPDATE trip_share_links SET revoked_at=unixepoch()*1000 WHERE ride_id=NEW.id AND revoked_at IS NULL;
END;
