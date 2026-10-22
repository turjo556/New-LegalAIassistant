// Local test fixtures only. Never imported by application code.
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
export function testDatabase(t){const dir=mkdtempSync(join(tmpdir(),'ridely-driver-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return join(dir,'test.sqlite')}
export function approveTestDriver(dbPath,email='driver@example.com'){const db=new DatabaseSync(dbPath);try{const user=db.prepare('SELECT id FROM users WHERE email=?').get(email);db.prepare("INSERT INTO driver_checks(user_id,attempt,identity_status,licence_status,insurance_status,licence_expires,insurance_expires,vehicle,reviewed_at) VALUES(?,?,'verified','approved','approved','2099-12-31','2099-12-31','Toyota',?) ON CONFLICT(user_id) DO UPDATE SET identity_status='verified',licence_status='approved',insurance_status='approved',licence_expires='2099-12-31',insurance_expires='2099-12-31',vehicle='Toyota',reviewed_at=excluded.reviewed_at").run(user.id,crypto.randomUUID(),Date.now());db.prepare("UPDATE driver_checks SET licence_province='QC',eligibility_consent_at=?,authority_source='saaq',authority_checked_at=?,licence_class_confirmed=1,restrictions_confirmed=1 WHERE user_id=?").run(Date.now(),Date.now()-1000,user.id)}finally{db.close()}}
