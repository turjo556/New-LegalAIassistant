import React from 'react';
import {View,Text} from 'react-native';
import {Card,Copy,Button} from './ui';
import {t} from '../lib/i18n';
export default function Credits({data,onAccount}) {
  const credits=data.bookingCredits;
  return <View style={{gap:16}}><Card><Copy heading>Booking credits</Copy><Text style={{fontSize:48,fontWeight:'900'}}>{credits?.balance??0}</Text><Copy>Each account gets two free booking credits. One credit covers one reservation, even for multiple seats.</Copy><Copy>Additional credits cost $3.99 CAD each. Your ride fare and approved custom-stop fees are paid separately to the driver in cash.</Copy><Copy>Cancelled bookings restore a credit. This is not a card refund.</Copy>{!data.user?<Button title="Sign in to see your balance" onPress={onAccount}/>:<Copy>In-app credit purchases are not enabled in this development build. No charge can be made here.</Copy>}</Card>
  {credits?.entries?.length>0&&<Card><Copy heading>Credit history</Copy>{credits.entries.map(entry=><View key={entry.id} style={{gap:4}}><Text style={{fontWeight:'800'}}>{entry.amount>0?'+':''}{entry.amount} · {t(entry.kind)}</Text><Copy>{t(entry.reason)}</Copy><Copy>{new Date(entry.created).toLocaleDateString()}</Copy></View>)}</Card>}
  </View>;
}
