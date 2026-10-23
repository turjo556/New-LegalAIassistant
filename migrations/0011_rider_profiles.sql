CREATE TABLE rider_private_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id),ciphertext TEXT,iv TEXT,adult_declared INTEGER NOT NULL DEFAULT 0,policy_version TEXT NOT NULL,updated_at INTEGER NOT NULL,expires_at INTEGER NOT NULL);
CREATE INDEX rider_profile_expiry ON rider_private_profiles(expires_at) WHERE ciphertext IS NOT NULL;
CREATE TABLE rider_incident_access_log(id TEXT PRIMARY KEY,operator_id TEXT NOT NULL REFERENCES users(id),rider_id TEXT NOT NULL REFERENCES users(id),booking_id TEXT NOT NULL REFERENCES bookings(id),case_id TEXT NOT NULL,purpose TEXT NOT NULL,created INTEGER NOT NULL);
CREATE TRIGGER rider_profile_booking_insert BEFORE INSERT ON bookings WHEN NEW.cancelled=0 BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users u JOIN rider_private_profiles p ON p.user_id=u.id WHERE u.id=NEW.user_id AND u.email_verified=1 AND u.phone_verified=1 AND p.adult_declared=1 AND p.ciphertext IS NOT NULL AND p.expires_at>unixepoch()*1000) THEN RAISE(ABORT,'rider_profile_required') END;
END;
CREATE TRIGGER rider_profile_booking_update BEFORE UPDATE OF cancelled,seats,ride_id ON bookings WHEN NEW.cancelled=0 BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users u JOIN rider_private_profiles p ON p.user_id=u.id WHERE u.id=NEW.user_id AND u.email_verified=1 AND u.phone_verified=1 AND p.adult_declared=1 AND p.ciphertext IS NOT NULL AND p.expires_at>unixepoch()*1000) THEN RAISE(ABORT,'rider_profile_required') END;
END;
