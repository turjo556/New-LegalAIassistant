-- Cancellation notices are essential transactional messages, independent of
-- optional trip-update preferences. Keep the in-app events, without sending a
-- second generic email to members who opted into optional updates.
DROP TRIGGER IF EXISTS notify_booking_cancel;
DROP TRIGGER IF EXISTS notify_ride_cancel;
CREATE TRIGGER notify_booking_cancel AFTER UPDATE OF cancelled ON bookings WHEN OLD.cancelled=0 AND NEW.cancelled=1 BEGIN
 INSERT INTO notifications(id,user_id,title,created,read_at,email_sent) VALUES(lower(hex(randomblob(16))),NEW.user_id,'Your reservation was cancelled.',unixepoch()*1000,NULL,1);
 INSERT INTO notifications(id,user_id,title,created,read_at,email_sent) SELECT lower(hex(randomblob(16))),owner,'A passenger cancelled their reservation.',unixepoch()*1000,NULL,1 FROM rides WHERE id=NEW.ride_id;
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 VALUES('booking-cancelled-passenger:'||NEW.id||':'||NEW.credit_cycle,NEW.user_id,'booking_cancelled',NEW.id||':'||NEW.credit_cycle,unixepoch()*1000);
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 SELECT 'booking-cancelled-driver:'||NEW.id||':'||NEW.credit_cycle,owner,'booking_driver_cancelled',NEW.id||':'||NEW.credit_cycle,unixepoch()*1000 FROM rides WHERE id=NEW.ride_id;
END;
CREATE TRIGGER notify_ride_cancel AFTER UPDATE OF cancelled ON rides WHEN OLD.cancelled=0 AND NEW.cancelled=1 BEGIN
 INSERT INTO notifications(id,user_id,title,created,read_at,email_sent) SELECT lower(hex(randomblob(16))),user_id,'Your driver cancelled the ride. Open My trips for details.',unixepoch()*1000,NULL,1 FROM bookings WHERE ride_id=NEW.id AND cancelled=0;
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 SELECT 'ride-cancelled-passenger:'||NEW.id||':'||user_id,user_id,'ride_cancelled',NEW.id,unixepoch()*1000 FROM bookings WHERE ride_id=NEW.id AND cancelled=0;
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 VALUES('ride-cancelled-driver:'||NEW.id,NEW.owner,'ride_driver_cancelled',NEW.id,unixepoch()*1000);
END;
