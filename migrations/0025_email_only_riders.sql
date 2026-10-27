DROP TRIGGER IF EXISTS rider_profile_booking_insert;
DROP TRIGGER IF EXISTS rider_profile_booking_update;
CREATE TRIGGER rider_profile_booking_insert BEFORE INSERT ON bookings WHEN NEW.cancelled=0 BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users u JOIN rider_private_profiles p ON p.user_id=u.id WHERE u.id=NEW.user_id AND u.email_verified=1 AND p.adult_declared=1 AND p.ciphertext IS NOT NULL AND p.expires_at>unixepoch()*1000) THEN RAISE(ABORT,'rider_profile_required') END;
END;
CREATE TRIGGER rider_profile_booking_update BEFORE UPDATE OF cancelled,seats,ride_id ON bookings WHEN NEW.cancelled=0 BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users u JOIN rider_private_profiles p ON p.user_id=u.id WHERE u.id=NEW.user_id AND u.email_verified=1 AND p.adult_declared=1 AND p.ciphertext IS NOT NULL AND p.expires_at>unixepoch()*1000) THEN RAISE(ABORT,'rider_profile_required') END;
END;

DELETE FROM verification_challenges WHERE kind='phone';
