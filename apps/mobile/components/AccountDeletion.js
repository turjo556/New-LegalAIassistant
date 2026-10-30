import React,{useState} from 'react';
import {Text} from 'react-native';
import {Card,Copy,Field,Button,ui} from './ui';
import {t} from '../lib/i18n';

export default function AccountDeletion({data,api,refresh}) {
  const [confirmation,setConfirmation]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[requested,setRequested]=useState(false);
  const pending=requested||data.accountDeletion?.status==='pending';
  async function submit(){
    if(busy||confirmation!=='DELETE'||!password)return;
    setBusy(true);setError('');
    try{await api.request('account/deletion/request',{confirmation,password});setPassword('');setConfirmation('');setRequested(true);await refresh();}
    catch(e){setPassword('');setError(e.message);}
    finally{setBusy(false);}
  }
  return <Card><Copy heading>Delete account</Copy>{pending ? <><Text accessibilityRole="alert" style={ui.success}>{t('Your account deletion request has been received.')}</Text><Copy>Your account remains active while the request is reviewed. Support will confirm the processing timeline and any required retention.</Copy></> : <><Copy>Request deletion of your Ridely account and personal data. Support will confirm the processing timeline and any required retention.</Copy><Copy>Limited trip, payment, safety and legal records may need to be retained. This does not automatically cancel bookings.</Copy><Field label="Current password" value={password} onChange={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="password"/><Field label="Type DELETE to confirm" value={confirmation} onChange={setConfirmation} autoCapitalize="characters" autoCorrect={false}/>{!!error&&<Text accessibilityRole="alert" style={ui.error}>{t(error)}</Text>}<Button title={busy?'Sending request…':'Request account deletion'} disabled={busy||confirmation!=='DELETE'||!password} onPress={submit}/></>}</Card>;
}
