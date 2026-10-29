import React from 'react';
import {View,Text,Pressable} from 'react-native';
import {Card,Copy,Button,ui,colors} from './ui';
import {t} from '../lib/i18n';
export default function MessagesInbox({data,onOpen,onSignIn,onRefresh,busy}){
 const threads=data.messageInbox?.threads||[];
 return <View style={{gap:16}}><Copy heading>Messages</Copy>{!data.user?<Button title="Sign in to see messages" onPress={onSignIn}/>:threads.length?threads.map(thread=><Pressable key={thread.bookingId} accessibilityRole="button" accessibilityLabel={t('Open trip messages')+': '+thread.from+' → '+thread.to} onPress={()=>onOpen(thread.bookingId)}><Card><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}><Text style={[ui.label,{flex:1}]}>{thread.from+' → '+thread.to}</Text>{thread.unread>0&&<Text style={{fontSize:16,fontWeight:'800',color:'#c62828'}}>{thread.unread>99?'99+':thread.unread}</Text>}</View><Copy>{thread.date+' · '+t(thread.role==='driver'?'As driver':'As passenger')}</Copy>{thread.cancelled&&<Copy>Cancelled trip · Messages are read-only</Copy>}</Card></Pressable>):<Card><Copy>Messages appear after a reservation is accepted.</Copy></Card>}{data.user&&<Button title="Refresh messages" secondary disabled={busy} onPress={onRefresh}/>}</View>;
}
