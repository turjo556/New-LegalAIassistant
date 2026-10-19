PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires INTEGER);
 CREATE TABLE IF NOT EXISTS rides(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id),origin TEXT,destination_city TEXT,date TEXT,time TEXT,arrival TEXT,price INTEGER,capacity INTEGER,car TEXT,pickup TEXT,destination TEXT,cancelled INTEGER DEFAULT 0);
 CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),ride_id TEXT REFERENCES rides(id),seats INTEGER,total INTEGER,cancelled INTEGER DEFAULT 0,UNIQUE(user_id,ride_id));
 CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,booking_id TEXT REFERENCES bookings(id),sender TEXT REFERENCES users(id),body TEXT,created INTEGER);
 CREATE INDEX IF NOT EXISTS booking_ride_index ON bookings(ride_id,cancelled);
 CREATE INDEX IF NOT EXISTS messages_booking_index ON messages(booking_id,created);
 CREATE TABLE IF NOT EXISTS favorites(user_id TEXT REFERENCES users(id),ride_id TEXT REFERENCES rides(id),PRIMARY KEY(user_id,ride_id));
CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE TRIGGER IF NOT EXISTS booking_capacity_insert BEFORE INSERT ON bookings WHEN NEW.cancelled=0 BEGIN
 SELECT CASE WHEN (SELECT cancelled FROM rides WHERE id=NEW.ride_id)=1 THEN RAISE(ABORT,'ride_unavailable') END;
 SELECT CASE WHEN NEW.seats+(SELECT COALESCE(SUM(seats),0) FROM bookings WHERE ride_id=NEW.ride_id AND cancelled=0)>(SELECT capacity FROM rides WHERE id=NEW.ride_id) THEN RAISE(ABORT,'capacity_exceeded') END;
END;
CREATE TRIGGER IF NOT EXISTS booking_capacity_update BEFORE UPDATE OF seats,cancelled ON bookings WHEN NEW.cancelled=0 BEGIN
 SELECT CASE WHEN (SELECT cancelled FROM rides WHERE id=NEW.ride_id)=1 THEN RAISE(ABORT,'ride_unavailable') END;
 SELECT CASE WHEN NEW.seats+(SELECT COALESCE(SUM(seats),0) FROM bookings WHERE ride_id=NEW.ride_id AND cancelled=0 AND id!=NEW.id)>(SELECT capacity FROM rides WHERE id=NEW.ride_id) THEN RAISE(ABORT,'capacity_exceeded') END;
END;
