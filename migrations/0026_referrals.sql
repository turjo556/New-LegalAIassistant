CREATE TABLE referral_programs(code TEXT PRIMARY KEY,label TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,starts_at INTEGER NOT NULL,ends_at INTEGER,budget_cents INTEGER NOT NULL DEFAULT 0 CHECK(budget_cents>=0),updated INTEGER NOT NULL);
INSERT INTO referral_programs VALUES('ABA01','Aba',1,unixepoch()*1000,NULL,0,unixepoch()*1000);
ALTER TABLE users ADD COLUMN referral_code TEXT REFERENCES referral_programs(code);
ALTER TABLE users ADD COLUMN referred_at INTEGER;
CREATE INDEX users_referral ON users(referral_code,referred_at);
CREATE TRIGGER referral_signup AFTER INSERT ON users WHEN NEW.referral_code IS NOT NULL BEGIN
 UPDATE users SET referred_at=unixepoch()*1000 WHERE id=NEW.id;
END;
CREATE TRIGGER referral_locked BEFORE UPDATE OF referral_code ON users WHEN OLD.referral_code IS NOT NEW.referral_code BEGIN SELECT RAISE(ABORT,'referral_locked'); END;
CREATE TRIGGER referral_date_locked BEFORE UPDATE OF referred_at ON users WHEN OLD.referred_at IS NOT NULL AND OLD.referred_at IS NOT NEW.referred_at BEGIN SELECT RAISE(ABORT,'referral_locked'); END;
ALTER TABLE rides ADD COLUMN published_at INTEGER;
CREATE TRIGGER ride_published_at AFTER INSERT ON rides BEGIN UPDATE rides SET published_at=unixepoch()*1000 WHERE id=NEW.id; END;
CREATE TABLE referral_rewards(event_key TEXT PRIMARY KEY,code TEXT NOT NULL REFERENCES referral_programs(code),kind TEXT NOT NULL CHECK(kind IN ('driver_posted','driver_completed','passenger_first_trip')),user_id TEXT NOT NULL REFERENCES users(id),ride_id TEXT NOT NULL REFERENCES rides(id),amount INTEGER NOT NULL CHECK((kind IN ('driver_posted','driver_completed') AND amount=500) OR (kind='passenger_first_trip' AND amount=300)),status TEXT NOT NULL CHECK(status IN ('approved','paid','rejected')),created INTEGER NOT NULL,updated INTEGER NOT NULL,actor TEXT NOT NULL REFERENCES users(id),note TEXT NOT NULL,payment_reference TEXT,paid_at INTEGER);
CREATE INDEX referral_reward_code ON referral_rewards(code,status);
CREATE TABLE referral_audit(id TEXT PRIMARY KEY,code TEXT NOT NULL REFERENCES referral_programs(code),event_key TEXT,actor TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,created INTEGER NOT NULL);
CREATE TRIGGER referral_budget_insert BEFORE INSERT ON referral_rewards WHEN NEW.status IN ('approved','paid') BEGIN
 SELECT CASE WHEN NEW.amount+COALESCE((SELECT SUM(amount) FROM referral_rewards WHERE code=NEW.code AND status IN ('approved','paid')),0)>(SELECT budget_cents FROM referral_programs WHERE code=NEW.code) THEN RAISE(ABORT,'referral_budget_exhausted') END;
END;
CREATE TRIGGER referral_budget_update BEFORE UPDATE OF status ON referral_rewards WHEN NEW.status IN ('approved','paid') BEGIN
 SELECT CASE WHEN NEW.amount+COALESCE((SELECT SUM(amount) FROM referral_rewards WHERE code=NEW.code AND status IN ('approved','paid') AND event_key!=NEW.event_key),0)>(SELECT budget_cents FROM referral_programs WHERE code=NEW.code) THEN RAISE(ABORT,'referral_budget_exhausted') END;
END;
CREATE TRIGGER referral_budget_lower BEFORE UPDATE OF budget_cents ON referral_programs BEGIN
 SELECT CASE WHEN NEW.budget_cents<COALESCE((SELECT SUM(amount) FROM referral_rewards WHERE code=NEW.code AND status IN ('approved','paid')),0) THEN RAISE(ABORT,'referral_budget_committed') END;
END;
CREATE TRIGGER referral_reward_identity BEFORE UPDATE ON referral_rewards WHEN NEW.event_key!=OLD.event_key OR NEW.code!=OLD.code OR NEW.kind!=OLD.kind OR NEW.user_id!=OLD.user_id OR NEW.ride_id!=OLD.ride_id OR NEW.amount!=OLD.amount OR OLD.status='paid' BEGIN SELECT RAISE(ABORT,'referral_reward_immutable'); END;
CREATE TRIGGER referral_active_signup BEFORE INSERT ON users WHEN NEW.referral_code IS NOT NULL BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM referral_programs WHERE code=NEW.referral_code AND enabled=1 AND starts_at<=unixepoch()*1000 AND (ends_at IS NULL OR ends_at>unixepoch()*1000)) THEN RAISE(ABORT,'referral_not_active') END;
END;
CREATE TRIGGER referral_reward_no_delete BEFORE DELETE ON referral_rewards BEGIN SELECT RAISE(ABORT,'referral_reward_immutable'); END;
