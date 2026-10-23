import React,{useEffect,useState} from 'react';
export function LicenceAccessSessionProvider({children}){return <><section className="licence-access review-session"><h4>Private licence review</h4><p>Your verified operator login provides access. No separate key or password is needed. View numbers only for authorised issuing-authority checks; every access is logged.</p></section>{children}</>}
export default function LicenceReviewAccess({driver,api,refresh}){
 const [number,N]=useState(''),[error,E]=useState(''),[busy,B]=useState(false),[removed,R]=useState(false);
 const submission=driver.licenceSubmission;
 useEffect(()=>{N('');R(false)},[submission?.id]);
 useEffect(()=>{if(!number)return;const timer=setTimeout(()=>N(''),60000);const hide=()=>{if(document.hidden)N('')};document.addEventListener('visibilitychange',hide);return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',hide)}},[number]);
 if(!submission)return <p className="notice">No secure licence number submitted. Arrange an authorised check before approving driving privileges.</p>;
 if(removed||submission.status!=='pending')return <p className="notice">Licence number: {removed?'deleted':submission.status}. Numbers are removed after review or expiry. Request a new submission if needed.</p>;
 async function reveal(){B(true);E('');N('');try{const result=await api('admin/licence/reveal',{id:driver.id,purpose:'authority_check',confirmed:true});N(result.number)}catch(err){E(err.message)}finally{B(false)}}
 async function remove(){B(true);E('');N('');try{await api('admin/licence/delete',{id:driver.id});R(true);await refresh()}catch(err){E(err.message)}finally{B(false)}}
 return <section className="licence-access"><h4>Private licence submission</h4><p>Available until {new Date(submission.expiresAt).toLocaleDateString('en-CA')}, or until the licence review is recorded. Access is logged.</p>{error&&<p className="error-banner" role="alert">{error}</p>}{number?<><p className="licence-revealed"><b>Licence number</b><output aria-label="Revealed licence number">{number}</output><small>Hides after 60 seconds or when this tab is hidden.</small></p><button className="ride-button" onClick={()=>N('')}>Hide number</button></>:<><button className="ride-button" disabled={busy} onClick={reveal}>View number for authority check</button></>}<button className="text-button" disabled={busy} onClick={remove}>Delete stored number</button><p>Use the number only in the authorised government service. Do not copy it into review notes or email.</p></section>
}
