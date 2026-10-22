ALTER TABLE notifications ADD COLUMN email_attempts INTEGER NOT NULL DEFAULT 0;
CREATE TRIGGER notify_stop_resubmission AFTER UPDATE OF status ON stop_requests WHEN NEW.status='pending' AND OLD.status!='pending' BEGIN
 INSERT INTO notifications(id,user_id,title,created) SELECT lower(hex(randomblob(16))),owner,'A passenger resubmitted a custom stop request.',unixepoch()*1000 FROM rides WHERE id=NEW.ride_id;
END;

CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires INTEGER NOT NULL);
DROP TRIGGER IF EXISTS notify_booking;
DROP TRIGGER IF EXISTS notify_booking_cancel;
DROP TRIGGER IF EXISTS notify_booking_reactivated;
DROP TRIGGER IF EXISTS notify_ride_cancel;
DROP TRIGGER IF EXISTS notify_message;
DROP TRIGGER IF EXISTS notify_stop_request;
DROP TRIGGER IF EXISTS notify_stop_update;
DROP TRIGGER IF EXISTS route_change_on_cancel;
CREATE TRIGGER notify_booking AFTER INSERT ON bookings BEGIN
 INSERT INTO notifications(id,user_id,title,created,read_at,email_sent) VALUES(lower(hex(randomblob(16))),NEW.user_id,'Your standard seat reservation is confirmed.',unixepoch()*1000,NULL,0);
 INSERT INTO notifications(id,user_id,title,created,read_at,email_sent) SELECT lower(hex(randomblob(16))),owner,'A passenger reserved seats on your ride.',unixepoch()*1000,NULL,0 FROM rides WHERE id=NEW.ride_id;
END;
CREATE TRIGGER notify_booking_cancel AFTER UPDATE OF cancelled ON bookings WHEN OLD.cancelled=0 AND NEW.cancelled=1 BEGIN
 INSERT INTO notifications(id,user_id,title,created,read_at,email_sent) VALUES(lower(hex(randomblob(16))),NEW.user_id,'Your reservation was cancelled.',unixepoch()*1000,NULL,0);
 INSERT INTO notifications(id,user_id,title,created,read_at,email_sent) SELECT lower(hex(randomblob(16))),owner,'A passenger cancelled their reservation.',unixepoch()*1000,NULL,0 FROM rides WHERE id=NEW.ride_id;
END;
CREATE TRIGGER notify_booking_reactivated AFTER UPDATE OF cancelled ON bookings WHEN OLD.cancelled=1 AND NEW.cancelled=0 BEGIN
 INSERT INTO notifications(id,user_id,title,created,read_at,email_sent) VALUES(lower(hex(randomblob(16))),NEW.user_id,'Your seat reservation is confirmed again.',unixepoch()*1000,NULL,0);
 INSERT INTO notifications(id,user_id,title,created,read_at,email_sent) SELECT lower(hex(randomblob(16))),owner,'A passenger booked seats on your ride.',unixepoch()*1000,NULL,0 FROM rides WHERE id=NEW.ride_id;
END;
CREATE TRIGGER notify_ride_cancel AFTER UPDATE OF cancelled ON rides WHEN OLD.cancelled=0 AND NEW.cancelled=1 BEGIN
 INSERT INTO notifications(id,user_id,title,created,read_at,email_sent) SELECT lower(hex(randomblob(16))),user_id,'Your driver cancelled the ride. Open My trips for details.',unixepoch()*1000,NULL,0 FROM bookings WHERE ride_id=NEW.id AND cancelled=0;
END;
CREATE TRIGGER notify_message AFTER INSERT ON messages BEGIN
 INSERT INTO notifications(id,user_id,title,created,read_at,email_sent) SELECT lower(hex(randomblob(16))),CASE WHEN NEW.sender=b.user_id THEN r.owner ELSE b.user_id END,'You have a new private booking message.',unixepoch()*1000,NULL,0 FROM bookings b JOIN rides r ON r.id=b.ride_id WHERE b.id=NEW.booking_id;
END;
CREATE TRIGGER notify_stop_request AFTER INSERT ON stop_requests BEGIN
 INSERT INTO notifications(id,user_id,title,created,read_at,email_sent) SELECT lower(hex(randomblob(16))),owner,'A passenger requested a custom stop. Review it in My listings.',unixepoch()*1000,NULL,0 FROM rides WHERE id=NEW.ride_id;
END;
CREATE TRIGGER notify_stop_update AFTER UPDATE OF status ON stop_requests WHEN OLD.status!=NEW.status BEGIN
 INSERT INTO notifications(id,user_id,title,created,read_at,email_sent) SELECT lower(hex(randomblob(16))),user_id,'Your custom stop request is now '||NEW.status||'. Open My trips for details.',unixepoch()*1000,NULL,0 FROM bookings WHERE id=NEW.booking_id;
 INSERT INTO notifications(id,user_id,title,created,read_at,email_sent) SELECT lower(hex(randomblob(16))),user_id,'Your ride itinerary changed. Review approved stops and timing in My trips.',unixepoch()*1000,NULL,0 FROM bookings WHERE ride_id=NEW.ride_id AND cancelled=0 AND NEW.status='approved';
 UPDATE rides SET route_version=route_version+1,route_seconds=CASE WHEN NEW.status='approved' AND NEW.route_seconds IS NOT NULL THEN NEW.route_seconds ELSE route_seconds END WHERE id=NEW.ride_id;
END;
CREATE TRIGGER route_change_on_cancel AFTER UPDATE OF cancelled ON bookings WHEN OLD.cancelled!=NEW.cancelled BEGIN
 UPDATE rides SET route_version=route_version+1 WHERE id=NEW.ride_id;
END;
