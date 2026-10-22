import React,{createContext,useContext,useEffect,useState} from 'react';
const AccessContext=createContext(null);
export function LicenceAccessSessionProvider({api,children}){
 const [until,U]=useState(0),[now,T]=useState(Date.now()),[password,P]=useState(''),[confirmed,C]=useState(false),[busy,B]=useState(false),[error,E]=useState('');
 const unlocked=until>now;
 async function sync(){try{const r=await api('admin/licence/status',{});U(r.unlockedUntil);T(Date.now())}catch{U(0)}}
 useEffect(()=>{sync();const tick=setInterval(()=>T(Date.now()),1000);const focus=()=>sync();window.addEventListener('focus',focus);return()=>{clearInterval(tick);window.removeEventListener('focus',focus)}},[]);
 async function unlock(e){e.preventDefault();B(true);E('');try{const r=await api('admin/licence/unlock',{password,purpose:'authority_check',confirmed});U(r.unlockedUntil);T(Date.now());C(false)}catch(err){E(err.message)}finally{P('');B(false)}}
 async function lock(){U(0);B(true);E('');try{await api('admin/licence/lock',{})}catch(err){E('Access is hidden here, but the server lock could not be confirmed. Retry Lock access.')}finally{B(false)}}
 const seconds=Math.max(0,Math.ceil((until-now)/1000));
 return <AccessContext.Provider value={{unlocked,lockLocal:()=>U(0)}}><section className="licence-access review-session"><h4>Licence review session</h4>{error&&<p className="error-banner" role="alert">{error}</p>}{unlocked?<><p>Access unlocked · {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')} remaining. You can reveal different drivers’ numbers without entering your password again. Each access is logged.</p><button className="ride-button" disabled={busy} onClick={lock}>Lock access</button></>:<><p>Confirm your password once to unlock licence access for 10 minutes in this signed-in session.</p><form className="auth-form" onSubmit={unlock}><label>Your operator password<input type="password" autoComplete="current-password" required value={password} onChange={e=>P(e.target.value)}/></label><label className="check-label"><input type="checkbox" required checked={confirmed} onChange={e=>C(e.target.checked)}/> I will use licence numbers only for authorised checks through the appropriate issuing-authority service.</label><button className="ride-button" disabled={busy||!confirmed}>Unlock for 10 minutes</button></form><button className="text-button" disabled={busy} onClick={lock}>Lock access</button></>}</section>{children}</AccessContext.Provider>;
}
export default function LicenceReviewAccess({driver,api,refresh}){
 const access=useContext(AccessContext);
 const [number,N]=useState(''),[error,E]=useState(''),[busy,B]=useState(false),[removed,R]=useState(false);
 const submission=driver.licenceSubmission;
 useEffect(()=>{N('');R(false)},[submission?.id]);
 useEffect(()=>{if(!access?.unlocked)N('')},[access?.unlocked]);
 useEffect(()=>{if(!number)return;const timer=setTimeout(()=>N(''),60000);const hide=()=>{if(document.hidden)N('')};document.addEventListener('visibilitychange',hide);return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',hide)}},[number]);
 if(!submission)return <p className="notice">No secure licence number submitted. Arrange an authorised check before approving driving privileges.</p>;
 if(removed||submission.status!=='pending')return <p className="notice">Licence number: {removed?'deleted':submission.status}. Numbers are removed after review or expiry. Request a new submission if needed.</p>;
 async function reveal(){B(true);E('');N('');try{const result=await api('admin/licence/reveal',{id:driver.id,purpose:'authority_check',confirmed:true});N(result.number)}catch(err){E(err.message);access?.lockLocal()}finally{B(false)}}
 async function remove(){B(true);E('');N('');try{await api('admin/licence/delete',{id:driver.id});R(true);await refresh()}catch(err){E(err.message)}finally{B(false)}}
 return <section className="licence-access"><h4>Private licence submission</h4><p>Available until {new Date(submission.expiresAt).toLocaleDateString('en-CA')}, or until the licence review is recorded. Access is logged.</p>{error&&<p className="error-banner" role="alert">{error}</p>}{number?<><p className="licence-revealed"><b>Licence number</b><output aria-label="Revealed licence number">{number}</output><small>Hides after 60 seconds or when this tab is hidden.</small></p><button className="ride-button" onClick={()=>N('')}>Hide number</button></>:<><button className="ride-button" disabled={busy||!access?.unlocked} onClick={reveal}>View number for authority check</button>{!access?.unlocked&&<p>Unlock the review session above to view this number.</p>}</>}<button className="text-button" disabled={busy} onClick={remove}>Delete stored number</button><p>Use the number only in the authorised government service. Do not copy it into review notes or email.</p></section>
}
