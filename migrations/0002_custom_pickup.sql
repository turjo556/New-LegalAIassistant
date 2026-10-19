ALTER TABLE rides ADD COLUMN custom_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rides ADD COLUMN pickup_lat REAL;
ALTER TABLE rides ADD COLUMN pickup_lng REAL;
ALTER TABLE rides ADD COLUMN pickup_fee INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN pickup_mode TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE bookings ADD COLUMN pickup_status TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE bookings ADD COLUMN pickup_address TEXT;
ALTER TABLE bookings ADD COLUMN pickup_lat REAL;
ALTER TABLE bookings ADD COLUMN pickup_lng REAL;
ALTER TABLE bookings ADD COLUMN pickup_distance REAL;
CREATE TRIGGER custom_pickup_insert BEFORE INSERT ON bookings WHEN NEW.cancelled=0 AND NEW.pickup_mode='custom' AND NEW.pickup_status IN ('pending','approved') BEGIN
 SELECT CASE WHEN NEW.seats+(SELECT COALESCE(SUM(seats),0) FROM bookings WHERE ride_id=NEW.ride_id AND cancelled=0 AND pickup_mode='custom' AND pickup_status IN ('pending','approved'))>(SELECT custom_limit FROM rides WHERE id=NEW.ride_id) THEN RAISE(ABORT,'custom_capacity_exceeded') END;
END;
CREATE TRIGGER custom_pickup_update BEFORE UPDATE ON bookings WHEN NEW.cancelled=0 AND NEW.pickup_mode='custom' AND NEW.pickup_status IN ('pending','approved') BEGIN
 SELECT CASE WHEN NEW.seats+(SELECT COALESCE(SUM(seats),0) FROM bookings WHERE ride_id=NEW.ride_id AND id!=NEW.id AND cancelled=0 AND pickup_mode='custom' AND pickup_status IN ('pending','approved'))>(SELECT custom_limit FROM rides WHERE id=NEW.ride_id) THEN RAISE(ABORT,'custom_capacity_exceeded') END;
END;
