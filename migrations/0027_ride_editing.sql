ALTER TABLE rides ADD COLUMN edit_version INTEGER NOT NULL DEFAULT 0;
-- A full listing edit and withdrawal of stale requests are one atomic statement.
-- Confirmed bookings are protected by the conditional UPDATE in the shared handler.
CREATE TRIGGER ride_edit_withdraw_requests AFTER UPDATE OF edit_version ON rides
WHEN NEW.edit_version<>OLD.edit_version BEGIN
 UPDATE booking_requests SET status='declined',decided_at=unixepoch()*1000
 WHERE ride_id=NEW.id AND status='pending';
END;
