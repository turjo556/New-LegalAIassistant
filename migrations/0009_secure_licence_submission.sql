CREATE TABLE licence_submissions(
 user_id TEXT PRIMARY KEY REFERENCES users(id),id TEXT NOT NULL UNIQUE,province TEXT NOT NULL,
 ciphertext TEXT,iv TEXT,consented_at INTEGER NOT NULL,submitted_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending'
);
CREATE TABLE licence_access_log(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),actor_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,submission_id TEXT NOT NULL,created INTEGER NOT NULL);
CREATE TRIGGER licence_submission_insert AFTER INSERT ON licence_submissions WHEN NEW.status='pending' BEGIN
 UPDATE driver_checks SET licence_status='pending',authority_source='',authority_checked_at=NULL,licence_class_confirmed=0,restrictions_confirmed=0 WHERE user_id=NEW.user_id;
END;
CREATE TRIGGER licence_submission_replace AFTER UPDATE OF id ON licence_submissions WHEN NEW.status='pending' BEGIN
 UPDATE driver_checks SET licence_status='pending',authority_source='',authority_checked_at=NULL,licence_class_confirmed=0,restrictions_confirmed=0 WHERE user_id=NEW.user_id;
END;
CREATE TRIGGER licence_submission_reviewed AFTER UPDATE OF licence_status ON driver_checks WHEN NEW.licence_status IN ('approved','rejected') BEGIN
 UPDATE licence_submissions SET ciphertext=NULL,iv=NULL,status='reviewed' WHERE user_id=NEW.user_id AND status='pending';
END;
CREATE TRIGGER licence_submission_withdrawn AFTER UPDATE OF status ON licence_submissions WHEN NEW.status='withdrawn' BEGIN
 UPDATE driver_checks SET licence_status='pending',eligibility_consent_at=NULL,authority_source='',authority_checked_at=NULL,licence_class_confirmed=0,restrictions_confirmed=0 WHERE user_id=NEW.user_id;
END;
CREATE INDEX licence_submission_expiry ON licence_submissions(expires_at) WHERE ciphertext IS NOT NULL;
ALTER TABLE driver_review_log ADD COLUMN licence_submission_id TEXT;
ALTER TABLE driver_review_log ADD COLUMN licence_holder_confirmed INTEGER NOT NULL DEFAULT 0;
