import React,{useState} from 'react';
import {View,Text} from 'react-native';
import {Button,Copy,Card,ui} from './ui';
import {getLanguage} from '../lib/i18n';
const labels={
 'Block driver':'Bloquer le conducteur','Block passenger':'Bloquer le passager','Unblock member':'Débloquer le membre',
 'Confirm block':'Confirmer le blocage','Keep member':'Ne pas bloquer',
 'New bookings and messages between you will be blocked. Existing reservations stay active; contact support if you need help.':'Les nouvelles réservations et les messages entre vous seront bloqués. Les réservations existantes restent actives; contactez le soutien au besoin.',
 'Blocked members':'Membres bloqués','No blocked members.':'Aucun membre bloqué.',
 'Member blocked.':'Membre bloqué.','Member unblocked.':'Membre débloqué.',
};
const label=s=>getLanguage()==='fr'?(labels[s]||s):s;
export function MemberBlock({id,blocked=false,role='driver',api,refresh}){
 const [confirm,C]=useState(false),[busy,B]=useState(false),[error,E]=useState(''),[result,S]=useState('');
 async function toggle(){if(busy)return;B(true);E('');try{await api.request('blocks/toggle',{id});S(blocked?'Member unblocked.':'Member blocked.');C(false);await refresh?.();}catch(e){E(e.message);}finally{B(false);}}
 if(!id)return null;
 return <View style={{gap:8}}>{error&&<Text accessibilityRole="alert" style={ui.error}>{error}</Text>}{result&&<Copy>{label(result)}</Copy>}{confirm&&!blocked?<><Copy>{label('New bookings and messages between you will be blocked. Existing reservations stay active; contact support if you need help.')}</Copy><Button title={label('Confirm block')} disabled={busy} onPress={toggle}/><Button title={label('Keep member')} secondary disabled={busy} onPress={()=>C(false)}/></>:<Button title={label(blocked?'Unblock member':role==='passenger'?'Block passenger':'Block driver')} secondary disabled={busy} onPress={()=>blocked?toggle():C(true)}/>}</View>;
}
export default function BlockedMembers({data,api,refresh}){
 return <Card><Copy heading>{label('Blocked members')}</Copy>{data.blockedUsers?.length?data.blockedUsers.map(member=><MemberBlock key={member.id} id={member.id} blocked api={api} refresh={refresh}/>):<Copy>{label('No blocked members.')}</Copy>}</Card>;
}
