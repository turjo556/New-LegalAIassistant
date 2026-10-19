CREATE TRIGGER cancel_booking_stop_requests AFTER UPDATE OF cancelled ON bookings WHEN NEW.cancelled=1 BEGIN
 UPDATE stop_requests SET status='declined',minutes=0 WHERE booking_id=NEW.id;
END;
