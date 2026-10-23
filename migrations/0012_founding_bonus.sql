ALTER TABLE rides ADD COLUMN completed_at INTEGER;
ALTER TABLE rides ADD COLUMN completion_eligible INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN passenger_completed_at INTEGER;
CREATE TABLE bonus_campaign(id TEXT PRIMARY KEY, starts_at INTEGER NOT NULL);
INSERT INTO bonus_campaign VALUES('founding-25',unixepoch()*1000);
CREATE TABLE bonus_claims(
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
 recipient_email TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','paid','rejected')),
 amount INTEGER NOT NULL DEFAULT 2500 CHECK(amount=2500),
 created INTEGER NOT NULL, updated INTEGER NOT NULL, actor TEXT REFERENCES users(id),
 terms_version TEXT NOT NULL, review_note TEXT NOT NULL DEFAULT '', payment_reference TEXT UNIQUE,
 paid_at INTEGER
);
CREATE TABLE bonus_claim_trips(claim_id TEXT REFERENCES bonus_claims(id),ride_id TEXT REFERENCES rides(id),PRIMARY KEY(claim_id,ride_id));
CREATE TABLE bonus_audit(id INTEGER PRIMARY KEY,claim_id TEXT,actor TEXT,status TEXT,created INTEGER);
CREATE TRIGGER bonus_cap BEFORE UPDATE OF status ON bonus_claims WHEN NEW.status IN ('approved','paid') AND OLD.status NOT IN ('approved','paid') BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM bonus_claims WHERE status IN ('approved','paid'))>=25 THEN RAISE(ABORT,'bonus_budget_exhausted') END;
END;
CREATE TRIGGER bonus_insert_pending BEFORE INSERT ON bonus_claims WHEN NEW.status!='pending' BEGIN SELECT RAISE(ABORT,'bonus_claim_must_start_pending'); END;
CREATE TRIGGER bonus_paid_immutable BEFORE UPDATE ON bonus_claims WHEN OLD.status='paid' BEGIN SELECT RAISE(ABORT,'bonus_paid_immutable'); END;
CREATE TRIGGER bonus_no_delete BEFORE DELETE ON bonus_claims BEGIN SELECT RAISE(ABORT,'bonus_ledger_retained'); END;
CREATE TRIGGER bonus_audit_insert AFTER INSERT ON bonus_claims BEGIN INSERT INTO bonus_audit(claim_id,actor,status,created) VALUES(NEW.id,NEW.user_id,NEW.status,NEW.created); END;
CREATE TRIGGER bonus_audit_update AFTER UPDATE ON bonus_claims BEGIN INSERT INTO bonus_audit(claim_id,actor,status,created) VALUES(NEW.id,NEW.actor,NEW.status,NEW.updated); END;
