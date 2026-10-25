import React from 'react';
import {View,Text,Pressable,Linking} from 'react-native';
import {pointsForCity} from '../../../packages/core/meeting-points';
import {colors,Copy,Button,ui} from './ui';
import {t} from '../lib/i18n';
export default function MeetingPoint({label,city,id,onChange}) {
  return <View style={{gap:10}}><Text style={ui.label}>{t(label)}</Text>{pointsForCity(city).map(p=><View key={p.id} style={{gap:7}}><Pressable accessibilityRole="radio" accessibilityState={{checked:id===p.id}} onPress={()=>onChange(p)} style={{borderWidth:1,borderColor:colors.line,borderRadius:12,padding:14,backgroundColor:id===p.id?colors.lime:'#fff'}}><Text style={{fontWeight:'700'}}>{p.label}</Text></Pressable>{id===p.id&&<><Copy>{p.instructions}</Copy><Button title="Open meeting point map ↗" secondary onPress={()=>Linking.openURL(p.mapsUrl)}/></>}</View>)}</View>;
}
