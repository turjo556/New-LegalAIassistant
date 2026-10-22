ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN phone_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN email_updates INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rides ADD COLUMN luggage TEXT NOT NULL DEFAULT 'Ask the driver';
ALTER TABLE rides ADD COLUMN vehicle_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE rides ADD COLUMN cancellation_policy TEXT NOT NULL DEFAULT 'flexible';
ALTER TABLE rides ADD COLUMN route_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rides ADD COLUMN route_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stop_requests ADD COLUMN route_seconds INTEGER;
CREATE TABLE notifications(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,created INTEGER NOT NULL,read_at INTEGER,email_sent INTEGER NOT NULL DEFAULT 0);
CREATE INDEX notifications_user ON notifications(user_id,created);
CREATE TABLE blocks(user_id TEXT REFERENCES users(id),blocked_id TEXT REFERENCES users(id),PRIMARY KEY(user_id,blocked_id));
CREATE TABLE reports(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),target_id TEXT,reason TEXT,created INTEGER,status TEXT NOT NULL DEFAULT 'open');
CREATE TABLE support_tickets(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),email TEXT,subject TEXT,body TEXT,created INTEGER,status TEXT NOT NULL DEFAULT 'open');
CREATE TABLE verification_challenges(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),kind TEXT,target TEXT,digest TEXT,expires INTEGER,attempts INTEGER NOT NULL DEFAULT 0,created INTEGER);
CREATE TABLE route_quotes(id TEXT PRIMARY KEY,request_id TEXT REFERENCES stop_requests(id),ride_id TEXT REFERENCES rides(id),version INTEGER,seconds INTEGER,minutes INTEGER,geometry TEXT,created INTEGER,expires INTEGER);
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
