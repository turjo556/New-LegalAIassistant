ALTER TABLE users ADD COLUMN email_locale TEXT NOT NULL DEFAULT 'en';
CREATE TABLE account_email_outbox(
 event_key TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,reference TEXT NOT NULL,
 created INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at INTEGER NOT NULL DEFAULT 0,locked_until INTEGER NOT NULL DEFAULT 0,sent_at INTEGER,provider_id TEXT,last_error TEXT
);
CREATE INDEX account_email_due ON account_email_outbox(status,next_attempt_at,locked_until);
CREATE TRIGGER email_account_created AFTER INSERT ON users BEGIN
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 VALUES('account-created:'||NEW.id,NEW.id,'account_created',NEW.id,unixepoch()*1000);
END;
CREATE TRIGGER email_address_confirmed AFTER UPDATE OF email_verified ON users WHEN OLD.email_verified=0 AND NEW.email_verified=1 BEGIN
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 VALUES('email-verified:'||NEW.id,NEW.id,'email_verified',NEW.id,unixepoch()*1000);
END;
CREATE TRIGGER email_licence_insert AFTER INSERT ON licence_submissions WHEN NEW.status='pending' BEGIN
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 VALUES('licence-received:'||NEW.id,NEW.user_id,'licence_received',NEW.id,unixepoch()*1000);
END;
CREATE TRIGGER email_licence_replace AFTER UPDATE OF id ON licence_submissions WHEN NEW.id<>OLD.id AND NEW.status='pending' BEGIN
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 VALUES('licence-received:'||NEW.id,NEW.user_id,'licence_received',NEW.id,unixepoch()*1000);
END;
CREATE TRIGGER email_insurance_insert AFTER INSERT ON insurance_submissions WHEN NEW.status='pending' BEGIN
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 VALUES('insurance-received:'||NEW.id,NEW.user_id,'insurance_received',NEW.id,unixepoch()*1000);
END;
CREATE TRIGGER email_insurance_replace AFTER UPDATE OF id ON insurance_submissions WHEN NEW.id<>OLD.id AND NEW.status='pending' BEGIN
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 VALUES('insurance-received:'||NEW.id,NEW.user_id,'insurance_received',NEW.id,unixepoch()*1000);
END;
CREATE TRIGGER email_identity_verified AFTER UPDATE OF identity_status ON driver_checks
 WHEN NEW.identity_status='verified' AND OLD.identity_status<>NEW.identity_status BEGIN
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 VALUES('identity_verified:'||NEW.user_id||':'||COALESCE(NEW.session_id,NEW.attempt),NEW.user_id,'identity_verified',COALESCE(NEW.session_id,NEW.attempt),unixepoch()*1000);
END;
CREATE TRIGGER email_identity_test_verified AFTER UPDATE OF identity_status ON driver_checks
 WHEN NEW.identity_status='test_verified' AND OLD.identity_status<>NEW.identity_status BEGIN
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 VALUES('identity_test_verified:'||NEW.user_id||':'||COALESCE(NEW.session_id,NEW.attempt),NEW.user_id,'identity_test_verified',COALESCE(NEW.session_id,NEW.attempt),unixepoch()*1000);
END;
CREATE TRIGGER email_identity_action_needed AFTER UPDATE OF identity_status ON driver_checks
 WHEN NEW.identity_status='requires_input' AND OLD.identity_status<>NEW.identity_status AND OLD.identity_status='processing' BEGIN
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 VALUES('identity_action_needed:'||NEW.user_id||':'||COALESCE(NEW.session_id,NEW.attempt),NEW.user_id,'identity_action_needed',COALESCE(NEW.session_id,NEW.attempt),unixepoch()*1000);
END;
CREATE TRIGGER email_licence_reviewed AFTER UPDATE OF reviewed_at ON driver_checks
 WHEN NEW.reviewed_at IS NOT OLD.reviewed_at AND NEW.reviewed_at IS NOT NULL AND NEW.reviewed_by IS NOT NULL AND NEW.licence_status IN ('approved','rejected') BEGIN
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 VALUES('licence-review:'||NEW.user_id||':'||NEW.reviewed_at,NEW.user_id,'licence_'||NEW.licence_status,CAST(NEW.reviewed_at AS TEXT),unixepoch()*1000);
END;
CREATE TRIGGER email_insurance_reviewed AFTER UPDATE OF reviewed_at ON driver_checks
 WHEN NEW.reviewed_at IS NOT OLD.reviewed_at AND NEW.reviewed_at IS NOT NULL AND NEW.reviewed_by IS NOT NULL AND NEW.insurance_status IN ('approved','rejected') BEGIN
 INSERT OR IGNORE INTO account_email_outbox(event_key,user_id,kind,reference,created)
 VALUES('insurance-review:'||NEW.user_id||':'||NEW.reviewed_at,NEW.user_id,'insurance_'||NEW.insurance_status,CAST(NEW.reviewed_at AS TEXT),unixepoch()*1000);
END;
CREATE TABLE account_email_retry_log(id TEXT PRIMARY KEY,event_key TEXT NOT NULL REFERENCES account_email_outbox(event_key),operator_id TEXT NOT NULL REFERENCES users(id),created INTEGER NOT NULL);
