import React,{useState,useEffect} from 'react';
import {View,Text,AppState,Share,Linking} from 'react-native';
import {Button,Copy,Field,Card,Consent,ui} from './ui';
import {publicUrl} from '../lib/client';
import {t} from '../lib/i18n';
import {MemberBlock} from './MemberBlocking';
export default function SafetyTools({ride,booking,driver,api,onSupport,blockedUsers=[],onRefresh}) {
  const [status,S]=useState(null),[busy,B]=useState(false),[error,E]=useState(''),[code,C]=useState(''),[inputs,I]=useState({}),[consent,K]=useState(false),[report,R]=useState(null),[details,D]=useState(''),[saved,M]=useState('');
  const payload=driver?{rideId:ride.id}:{bookingId:booking.id};
  async function refresh(){S(await api.request('safety/status',payload));}
  useEffect(()=>{let alive=true;const load=async()=>{try{const r=await api.request('safety/status',payload);if(alive)S(r);}catch(e){if(alive)E(e.message);}};load();const timer=setInterval(load,30000);return()=>{alive=false;clearInterval(timer);};},[ride.id,booking?.id,driver]);
  useEffect(()=>{if(!code)return;const timer=setTimeout(()=>C(''),120000);const sub=AppState.addEventListener('change',s=>{if(s!=='active')C('');});return()=>{clearTimeout(timer);sub.remove();};},[code]);
  useEffect(()=>{if(status?.boarding?.confirmed_at)C('');},[status?.boarding?.confirmed_at]);
  useEffect(()=>{const sub=AppState.addEventListener('change',s=>{if(s!=='active'){I({});D('');}});return()=>sub.remove();},[]);
  async function run(path,body,done){if(busy)return;B(true);E('');try{const r=await api.request(path,body);await done?.(r);await refresh();}catch(e){E(e.message);}finally{B(false);}}
  const active=!ride.cancelled&&!ride.completedAt;
  return <View style={{gap:16}}><Card><Copy heading>Before you board</Copy><Copy>Check the driver, car colour and licence plate. If something does not match, do not board. Move to a public place and contact support.</Copy><Copy>A boarding code confirms a reservation, not someone’s identity or safety.</Copy>{error&&<Text accessibilityRole="alert" style={ui.error}>{t(error)}</Text>}{saved&&<Copy>{saved}</Copy>}
  {driver?(ride.passengers||[]).map(p=><View key={p.id} style={{gap:10}}><Copy heading>{p.name}</Copy>{status?.passengerChecks?.some(c=>c.booking_id===p.id&&c.confirmed_at)?<Copy>Boarding code confirmed</Copy>:active&&<><Field label="Passenger’s six-digit code" value={inputs[p.id]} onChange={v=>I(f=>({...f,[p.id]:v}))} maxLength={6} keyboardType="number-pad" autoComplete="off"/><Button title="Confirm boarding code" disabled={busy||!/^\d{6}$/.test(inputs[p.id]||'')} onPress={()=>run('safety/boarding/confirm',{bookingId:p.id,code:inputs[p.id]},()=>I({}))}/></>}<Button title="Report a safety concern" secondary onPress={()=>R(p.id)}/><MemberBlock id={p.userId} role="passenger" blocked={blockedUsers.some(m=>m.id===p.userId)} api={api} refresh={onRefresh}/></View>):<>
    {status?.boarding?.confirmed_at?<Copy>Boarding code confirmed</Copy>:active&&<>{code&&<Text accessibilityLabel={t('Your private boarding code')} style={{fontSize:38,letterSpacing:6,fontWeight:'800',textAlign:'center'}}>{code}</Text>}<Copy>Show the code only at pickup after checking the vehicle. It expires in 15 minutes and hides after 2 minutes or when you leave the app.</Copy><Button title={code?'Generate a new code':'Show my boarding code'} disabled={busy} onPress={()=>run('safety/boarding/code',{bookingId:booking.id},r=>C(r.code))}/>{code&&<Button title="Hide code" secondary onPress={()=>C('')}/>}</>}
    <Button title="Report a safety concern" secondary onPress={()=>R(booking.id)}/><MemberBlock id={ride.owner} blocked={blockedUsers.some(m=>m.id===ride.owner)} api={api} refresh={onRefresh}/>
  </>}</Card>
  <Card><Copy heading>Share your trip plan</Copy><Copy>An expiring itinerary link shares the listed route, driver name, vehicle and plate. Private addresses, messages and other passenger identities are hidden. This is not live GPS tracking.</Copy>
    {active&&<><Consent label="I understand anyone with the link can see these trip details until it expires or I revoke it." value={consent} onChange={K}/><Button title="Create and share itinerary link" disabled={busy||!consent} onPress={()=>run('safety/share/create',{...payload,consent:true},async r=>{K(false);await Share.share({message:publicUrl(r.url)});})}/></>}
    {status?.shareLinks?.map(link=><View key={link.id} style={{gap:6}}><Copy>{t('Link expires')+': '+new Date(link.expiresAt).toLocaleString()}</Copy><Button title="Revoke link" secondary disabled={busy} onPress={()=>run('safety/share/revoke',{id:link.id})}/></View>)}
  </Card>
  {report&&<Card><Copy heading>Confidential safety report</Copy><Copy>Reports go to authorised support. They are not anonymous and may require follow-up. Do not include licence numbers or banking details.</Copy><Field label="What happened?" value={details} onChange={D} multiline maxLength={2000}/><Button title="Send confidential report" disabled={busy||details.trim().length<10} onPress={()=>run('safety/report',{bookingId:report,category:'other_safety',details},r=>{D('');R(null);M(t('Report saved. Reference')+': '+r.reportId);})}/><Button title="Close report" secondary onPress={()=>{R(null);D('');}}/></Card>}
  <Copy>Support is not an emergency service or live monitoring. For immediate danger in Canada, call 911.</Copy><Button title="Contact support" secondary onPress={()=>onSupport?onSupport():Linking.openURL('mailto:support@ridely.ca').catch(()=>E('Unable to open email. Contact support@ridely.ca.'))}/>
  </View>;
}
