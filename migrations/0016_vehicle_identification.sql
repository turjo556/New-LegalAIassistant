ALTER TABLE rides ADD COLUMN licence_plate TEXT;
ALTER TABLE rides ADD COLUMN plate_province TEXT;
ALTER TABLE rides ADD COLUMN vehicle_color TEXT;
CREATE TRIGGER notify_vehicle_identification AFTER UPDATE OF licence_plate,plate_province,vehicle_color ON rides WHEN OLD.licence_plate IS NOT NEW.licence_plate OR OLD.plate_province IS NOT NEW.plate_province OR OLD.vehicle_color IS NOT NEW.vehicle_color BEGIN
 INSERT INTO notifications(id,user_id,title,created) SELECT lower(hex(randomblob(16))),user_id,'Your driver updated vehicle identification. Review the car colour and plate in My trips.',unixepoch()*1000 FROM bookings WHERE ride_id=NEW.id AND cancelled=0;
END;
