import React from 'react';
import {View,Text} from 'react-native';
import {Button,Copy,ui} from './ui';
import {t} from '../lib/i18n';
export default function CustomStops({booking,ride=booking?.ride,onRequest,busy=false}){
 if(!booking||!ride||ride.cancelled||ride.completedAt)return null;
 const kinds=['pickup','dropoff'].filter(kind=>kind==='pickup'?ride.allowPickup:ride.allowDropoff);
 return <View style={{gap:10,marginVertical:10}}><Text style={ui.label}>{t('Custom stops')}</Text>{kinds.length?<><Copy>Extra fee per passenger. Your driver must approve each request.</Copy>{kinds.map(kind=>{const request=booking.requests?.find(q=>q.kind===kind),locked=request&&request.status!=='declined';const label=kind==='pickup'?'Request custom pickup':'Request custom drop-off';const status={pending:'Awaiting driver approval',approved:'Approved',declined:'Not accepted'}[request?.status];return <View key={kind} style={{gap:6}}>{request&&<Copy>{t(kind==='pickup'?'Custom pickup':'Custom drop-off')+' · '+t(status||request.status)}</Copy>}<Button title={t(label)+' · +$'+ride[kind+'Fee']+'/'+t('person')} secondary disabled={busy||!!locked} onPress={()=>onRequest(booking,kind)}/></View>})}</>:<Copy>This driver offers standard meeting points only.</Copy>}</View>;
}
