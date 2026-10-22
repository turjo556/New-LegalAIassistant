ALTER TABLE driver_checks ADD COLUMN licence_province TEXT NOT NULL DEFAULT '';
ALTER TABLE driver_checks ADD COLUMN eligibility_consent_at INTEGER;
ALTER TABLE driver_checks ADD COLUMN authority_source TEXT NOT NULL DEFAULT '';
ALTER TABLE driver_checks ADD COLUMN authority_checked_at INTEGER;
ALTER TABLE driver_checks ADD COLUMN licence_class_confirmed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE driver_checks ADD COLUMN restrictions_confirmed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE driver_review_log ADD COLUMN licence_province TEXT NOT NULL DEFAULT '';
ALTER TABLE driver_review_log ADD COLUMN authority_source TEXT NOT NULL DEFAULT '';
ALTER TABLE driver_review_log ADD COLUMN authority_checked_at INTEGER;
ALTER TABLE driver_review_log ADD COLUMN licence_class_confirmed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE driver_review_log ADD COLUMN restrictions_confirmed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE driver_review_log ADD COLUMN authority_reference TEXT NOT NULL DEFAULT '';
CREATE TRIGGER driver_authority_gate_insert BEFORE INSERT ON bookings WHEN NEW.cancelled=0 BEGIN
 SELECT CASE WHEN NOT EXISTS(
 SELECT 1 FROM rides r JOIN driver_checks d ON d.user_id=r.owner
 WHERE r.id=NEW.ride_id AND d.eligibility_consent_at IS NOT NULL
 AND ((d.licence_province='QC' AND d.authority_source='saaq') OR (d.licence_province='ON' AND d.authority_source='ontario'))
 AND d.authority_checked_at>=unixepoch()*1000-2592000000 AND d.authority_checked_at<=unixepoch()*1000
 AND d.licence_class_confirmed=1 AND d.restrictions_confirmed=1
 ) THEN RAISE(ABORT,'driver_not_approved') END;
END;
CREATE TRIGGER driver_authority_gate_update BEFORE UPDATE OF cancelled,seats,ride_id ON bookings WHEN NEW.cancelled=0 BEGIN
 SELECT CASE WHEN NOT EXISTS(
 SELECT 1 FROM rides r JOIN driver_checks d ON d.user_id=r.owner
 WHERE r.id=NEW.ride_id AND d.eligibility_consent_at IS NOT NULL
 AND ((d.licence_province='QC' AND d.authority_source='saaq') OR (d.licence_province='ON' AND d.authority_source='ontario'))
 AND d.authority_checked_at>=unixepoch()*1000-2592000000 AND d.authority_checked_at<=unixepoch()*1000
 AND d.licence_class_confirmed=1 AND d.restrictions_confirmed=1
 ) THEN RAISE(ABORT,'driver_not_approved') END;
END;
