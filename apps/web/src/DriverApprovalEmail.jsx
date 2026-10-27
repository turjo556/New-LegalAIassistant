import React,{useState} from 'react';
import {Mail} from 'lucide-react';
export default function DriverApprovalEmail({driver,eligible,emailAvailable,api}){
 const [busy,B]=useState(false),[status,S]=useState(''),[error,E]=useState('');
 async function send(){B(true);E('');try{const result=await api('admin/emails/driver-approval',{id:driver.id});S(result.status);if(result.status==='failed')E('This email failed. Open Email delivery to retry it.')}catch(e){E(e.message)}finally{B(false)}}
 const queued=['pending','sending'].includes(status),accepted=status==='sent';
 return <section className="op-approval-email"><div><h3>Driver approval confirmation</h3><p>Send a branded confirmation with a link to post a ride.</p></div><button type="button" className="op-primary" disabled={busy||!eligible||!emailAvailable||queued||accepted||status==='failed'} onClick={send}><Mail size={17}/>{busy?'Queuing email…':accepted?'Approval email accepted':queued?'Approval email queued':'Send driver approval email'}</button>{!eligible&&<p className="op-small">Available after all required driver checks are current.</p>}{!emailAvailable&&<p className="op-small">Email delivery needs to be configured first.</p>}{queued&&<p className="op-success" role="status">Approval email queued. Check Email delivery for its status.</p>}{accepted&&<p className="op-success" role="status">Approval email accepted by the email provider.</p>}{error&&<p className="op-error" role="alert">{error}</p>}<a className="op-external" href="/operator?section=emails">View email delivery status →</a></section>
}
