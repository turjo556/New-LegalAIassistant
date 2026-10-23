ALTER TABLE bookings ADD COLUMN credit_cycle INTEGER NOT NULL DEFAULT 0;
CREATE TABLE promo_credit_ledger(
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),
 amount INTEGER NOT NULL CHECK(typeof(amount)='integer' AND amount!=0 AND amount BETWEEN -100 AND 100),
 kind TEXT NOT NULL CHECK(kind IN ('welcome','grant','purchase','reversal','booking','refund')),
 reversal_of TEXT UNIQUE REFERENCES promo_credit_ledger(id),
 booking_id TEXT REFERENCES bookings(id),
 operation_key TEXT NOT NULL UNIQUE,reason TEXT NOT NULL CHECK(length(reason) BETWEEN 5 AND 300),
 actor TEXT REFERENCES users(id),created INTEGER NOT NULL,
 CHECK((kind IN ('welcome','grant','purchase','refund') AND amount>0) OR (kind IN ('reversal','booking') AND amount<0))
);
CREATE INDEX promo_credit_user ON promo_credit_ledger(user_id,created);
CREATE UNIQUE INDEX promo_welcome_once ON promo_credit_ledger(user_id) WHERE kind='welcome';
CREATE TRIGGER promo_credit_reversal BEFORE INSERT ON promo_credit_ledger WHEN NEW.kind='reversal' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM promo_credit_ledger WHERE id=NEW.reversal_of AND kind='grant' AND user_id=NEW.user_id AND amount=-NEW.amount) THEN RAISE(ABORT,'invalid_credit_reversal') END;
END;
CREATE TRIGGER promo_credit_nonnegative BEFORE INSERT ON promo_credit_ledger BEGIN
 SELECT CASE WHEN COALESCE((SELECT SUM(amount) FROM promo_credit_ledger WHERE user_id=NEW.user_id),0)+NEW.amount<0 THEN RAISE(ABORT,'insufficient_promo_credit') END;
END;
CREATE TRIGGER promo_credit_immutable_update BEFORE UPDATE ON promo_credit_ledger BEGIN SELECT RAISE(ABORT,'credit_ledger_immutable'); END;
CREATE TRIGGER promo_credit_immutable_delete BEFORE DELETE ON promo_credit_ledger BEGIN SELECT RAISE(ABORT,'credit_ledger_immutable'); END;
INSERT INTO promo_credit_ledger(id,user_id,amount,kind,operation_key,reason,created)
 SELECT lower(hex(randomblob(16))),id,2,'welcome','welcome:'||id,'Your two free pilot booking credits',unixepoch()*1000 FROM users;
CREATE TRIGGER promo_welcome_user AFTER INSERT ON users BEGIN
 INSERT INTO promo_credit_ledger(id,user_id,amount,kind,operation_key,reason,created) VALUES(lower(hex(randomblob(16))),NEW.id,2,'welcome','welcome:'||NEW.id,'Your two free pilot booking credits',unixepoch()*1000);
END;
CREATE TRIGGER promo_booking_insert AFTER INSERT ON bookings WHEN NEW.cancelled=0 AND COALESCE((SELECT SUM(amount) FROM promo_credit_ledger WHERE user_id=NEW.user_id),0)>0 BEGIN
 INSERT INTO promo_credit_ledger(id,user_id,amount,kind,booking_id,operation_key,reason,created) VALUES(lower(hex(randomblob(16))),NEW.user_id,-1,'booking',NEW.id,'booking:'||NEW.id||':'||NEW.credit_cycle,'One free booking credit applied',unixepoch()*1000);
END;
CREATE TRIGGER promo_booking_rebook AFTER UPDATE OF cancelled ON bookings WHEN OLD.cancelled=1 AND NEW.cancelled=0 AND COALESCE((SELECT SUM(amount) FROM promo_credit_ledger WHERE user_id=NEW.user_id),0)>0 BEGIN
 INSERT INTO promo_credit_ledger(id,user_id,amount,kind,booking_id,operation_key,reason,created) VALUES(lower(hex(randomblob(16))),NEW.user_id,-1,'booking',NEW.id,'booking:'||NEW.id||':'||NEW.credit_cycle,'One free booking credit applied',unixepoch()*1000);
END;
CREATE TRIGGER promo_booking_cancel AFTER UPDATE OF cancelled ON bookings WHEN OLD.cancelled=0 AND NEW.cancelled=1 BEGIN
 INSERT OR IGNORE INTO promo_credit_ledger(id,user_id,amount,kind,booking_id,operation_key,reason,created)
 SELECT lower(hex(randomblob(16))),NEW.user_id,1,'refund',NEW.id,'refund:'||NEW.id||':'||NEW.credit_cycle,'Booking cancelled: free credit restored',unixepoch()*1000
 WHERE EXISTS(SELECT 1 FROM promo_credit_ledger WHERE operation_key='booking:'||NEW.id||':'||NEW.credit_cycle);
END;
CREATE TRIGGER promo_ride_cancel AFTER UPDATE OF cancelled ON rides WHEN OLD.cancelled=0 AND NEW.cancelled=1 BEGIN
 INSERT OR IGNORE INTO promo_credit_ledger(id,user_id,amount,kind,booking_id,operation_key,reason,created)
 SELECT lower(hex(randomblob(16))),b.user_id,1,'refund',b.id,'refund:'||b.id||':'||b.credit_cycle,'Driver cancelled: free credit restored',unixepoch()*1000 FROM bookings b
 WHERE b.ride_id=NEW.id AND b.cancelled=0 AND EXISTS(SELECT 1 FROM promo_credit_ledger WHERE operation_key='booking:'||b.id||':'||b.credit_cycle);
END;
CREATE TRIGGER promo_booking_require_insert BEFORE INSERT ON bookings WHEN NEW.cancelled=0 BEGIN
 SELECT CASE WHEN COALESCE((SELECT SUM(amount) FROM promo_credit_ledger WHERE user_id=NEW.user_id),0)<1 THEN RAISE(ABORT,'booking_credit_required') END;
END;
CREATE TRIGGER promo_booking_require_rebook BEFORE UPDATE OF cancelled ON bookings WHEN OLD.cancelled=1 AND NEW.cancelled=0 BEGIN
 SELECT CASE WHEN COALESCE((SELECT SUM(amount) FROM promo_credit_ledger WHERE user_id=NEW.user_id),0)<1 THEN RAISE(ABORT,'booking_credit_required') END;
END;

CREATE TABLE credit_orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 10),amount INTEGER NOT NULL CHECK(amount>0),session_id TEXT UNIQUE,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid')),created INTEGER NOT NULL,paid_at INTEGER);
