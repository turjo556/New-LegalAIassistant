const day=86400000;
export function driverReviewState(d,now=Date.now()){
 const today=new Date(now).toISOString().slice(0,10);
 if(!d.eligibility_consent_at)return {key:'consent',label:'Consent needed',tone:'muted'};
 if(d.identity_status==='test_verified')return {key:'identity',label:'Sandbox identity only',tone:'warning'};
 if(d.identity_status!=='verified')return {key:'identity',label:'Identity needed',tone:'muted'};
 if(d.licence_status==='rejected'||d.insurance_status==='rejected')return {key:'rejected',label:'Review rejected',tone:'danger'};
 if(d.licence_status!=='approved'||d.insurance_status!=='approved')return {key:'review',label:'Ready for review',tone:'warning'};
 const source=d.licence_province==='QC'?'saaq':d.licence_province==='ON'?'ontario':null;
 const fresh=d.authority_checked_at>=now-30*day&&d.authority_checked_at<=now&&d.reviewed_at>=now-30*day;
 if(!d.licence_expires||!d.insurance_expires||!source||d.authority_source!==source||!fresh||d.licence_class_confirmed!==1||d.restrictions_confirmed!==1||d.licence_expires<today||d.insurance_expires<today)return {key:'renewal',label:'Renewal needed',tone:'warning'};
 return {key:'current',label:'Checks current',tone:'good'};
}
export function filterDrivers(drivers,query='',filter='attention',now=Date.now()){
 const q=query.trim().toLowerCase();return drivers.filter(d=>{const state=driverReviewState(d,now);return (!q||[d.name,d.email,d.vehicle,d.proposedVehicle].some(v=>String(v||'').toLowerCase().includes(q)))&&(filter==='all'||filter==='attention'&&state.key!=='current'||filter===state.key);}).sort((a,b)=>{const order={review:0,renewal:1,rejected:2,identity:3,consent:4,current:5};return order[driverReviewState(a,now).key]-order[driverReviewState(b,now).key]||String(a.name).localeCompare(String(b.name));});
}
export function filterCases(rows,query='',filter='open'){
 const q=query.trim().toLowerCase();return rows.filter(r=>(filter==='all'||r.status===filter)&&(!q||[r.subject,r.body,r.reason,r.email,r.id,r.booking_id].some(v=>String(v||'').toLowerCase().includes(q)))).sort((a,b)=>(b.urgent||0)-(a.urgent||0)||b.created-a.created);
}
export const statusLabel=value=>({verified:'Identity confirmed',test_verified:'Sandbox test',requires_input:'Action needed',not_started:'Not started',processing:'Processing',canceled:'Closed',approved:'Approved',rejected:'Rejected',pending:'Pending',open:'Open',resolved:'Resolved'}[value]||value||'Not recorded');
