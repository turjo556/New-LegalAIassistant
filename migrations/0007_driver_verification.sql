CREATE TABLE driver_checks(
 user_id TEXT PRIMARY KEY REFERENCES users(id),
 attempt TEXT NOT NULL,
 session_id TEXT UNIQUE,
 identity_status TEXT NOT NULL DEFAULT 'not_started',
 identity_checked INTEGER,
 licence_status TEXT NOT NULL DEFAULT 'pending',
 insurance_status TEXT NOT NULL DEFAULT 'pending',
 licence_expires TEXT,
 insurance_expires TEXT,
 vehicle TEXT NOT NULL DEFAULT '',
 reviewed_by TEXT REFERENCES users(id),
 reviewed_at INTEGER
);
CREATE TABLE driver_review_log(
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),operator_id TEXT NOT NULL REFERENCES users(id),
 licence_status TEXT NOT NULL,insurance_status TEXT NOT NULL,licence_expires TEXT,insurance_expires TEXT,
 vehicle TEXT NOT NULL,evidence_reference TEXT NOT NULL,created INTEGER NOT NULL
);
CREATE TRIGGER driver_booking_gate_insert BEFORE INSERT ON bookings WHEN NEW.cancelled=0 BEGIN
 SELECT CASE WHEN NOT EXISTS(
 SELECT 1 FROM rides r JOIN driver_checks d ON d.user_id=r.owner
 WHERE r.id=NEW.ride_id AND d.identity_status='verified' AND d.licence_status='approved' AND d.insurance_status='approved'
 AND d.licence_expires>=r.date AND d.insurance_expires>=r.date AND d.vehicle=r.car AND d.reviewed_at>=unixepoch()*1000-2592000000
 ) THEN RAISE(ABORT,'driver_not_approved') END;
END;
CREATE TRIGGER driver_booking_gate_update BEFORE UPDATE OF cancelled,seats,ride_id ON bookings WHEN NEW.cancelled=0 BEGIN
 SELECT CASE WHEN NOT EXISTS(
 SELECT 1 FROM rides r JOIN driver_checks d ON d.user_id=r.owner
 WHERE r.id=NEW.ride_id AND d.identity_status='verified' AND d.licence_status='approved' AND d.insurance_status='approved'
 AND d.licence_expires>=r.date AND d.insurance_expires>=r.date AND d.vehicle=r.car AND d.reviewed_at>=unixepoch()*1000-2592000000
 ) THEN RAISE(ABORT,'driver_not_approved') END;
END;
