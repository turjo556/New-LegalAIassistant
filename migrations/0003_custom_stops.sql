ALTER TABLE rides ADD COLUMN allow_pickup INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rides ADD COLUMN allow_dropoff INTEGER NOT NULL DEFAULT 0;
ALTER TABLE rides ADD COLUMN dropoff_lat REAL;
ALTER TABLE rides ADD COLUMN dropoff_lng REAL;
ALTER TABLE rides ADD COLUMN dropoff_fee INTEGER NOT NULL DEFAULT 0;
CREATE TABLE stop_requests(id TEXT PRIMARY KEY,booking_id TEXT NOT NULL REFERENCES bookings(id),ride_id TEXT NOT NULL REFERENCES rides(id),kind TEXT NOT NULL CHECK(kind IN ('pickup','dropoff')),address TEXT NOT NULL,lat REAL NOT NULL,lng REAL NOT NULL,distance REAL NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','declined')),minutes INTEGER NOT NULL DEFAULT 0,fee INTEGER NOT NULL,UNIQUE(booking_id,kind));
CREATE TRIGGER stop_budget_insert BEFORE INSERT ON stop_requests WHEN NEW.status='approved' BEGIN
 SELECT CASE WHEN NEW.minutes<1 OR NEW.minutes+(SELECT COALESCE(SUM(s.minutes),0) FROM stop_requests s JOIN bookings b ON b.id=s.booking_id WHERE s.ride_id=NEW.ride_id AND s.status='approved' AND b.cancelled=0)>15 THEN RAISE(ABORT,'detour_budget_exceeded') END;
END;
CREATE TRIGGER stop_budget_update BEFORE UPDATE ON stop_requests WHEN NEW.status='approved' BEGIN
 SELECT CASE WHEN NEW.minutes<1 OR NEW.minutes+(SELECT COALESCE(SUM(s.minutes),0) FROM stop_requests s JOIN bookings b ON b.id=s.booking_id WHERE s.ride_id=NEW.ride_id AND s.id!=NEW.id AND s.status='approved' AND b.cancelled=0)>15 THEN RAISE(ABORT,'detour_budget_exceeded') END;
END;
