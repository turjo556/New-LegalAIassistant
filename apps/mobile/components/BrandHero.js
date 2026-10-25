import React from 'react';
import {View,Text,Image,StyleSheet,useWindowDimensions} from 'react-native';
import {Button,colors} from './ui';
import {t} from '../lib/i18n';
// The same local, illustrative photos used on ridely.ca; no remote image calls.
const friends=require('../../web/public/images/ridely-friends.webp');
const rider=require('../../web/public/images/ridely-rider.webp');
const city=require('../../web/public/images/ridely-city.webp');
export default function BrandHero({driver,onOffer}) {
 const {width}=useWindowDimensions();
 return <View style={s.shell}>
  <View style={s.photos}><Image source={friends} accessibilityLabel={t('Friends meeting beside a car in Montréal before sharing a journey')} resizeMode="cover" style={s.mainPhoto}/><Image source={driver?city:rider} accessibilityLabel={t(driver?'Montréal’s bridge and skyline seen through a car window':'A passenger sharing a laugh on a sunny road trip')} resizeMode="cover" style={s.smallPhoto}/><View style={s.sticker}><Text style={s.stickerText}>MONTRÉAL ↔ OTTAWA</Text></View></View>
  <View style={s.copy}><Text style={s.eyebrow}>{t('MONTRÉAL ↔ OTTAWA · EARLY ACCESS')}</Text><Text style={[s.title,{fontSize:width<360?38:46,lineHeight:width<360?40:48}]}>{t(driver?'EMPTY SEATS.':'GOOD COMPANY.')}<Text style={s.lime}>{'\n'+t(driver?'GOOD COMPANY.':'NEXT CITY.')}</Text></Text><Text style={s.body}>{t(driver?'Turn your regular trips into great conversations and share the cost of the journey.':'Shared rides. Real connections. Your next city starts here.')}</Text>{driver&&<Button title="＋ Post your route" onPress={onOffer}/>}</View>
  <View style={s.trust}><Text style={s.trustText}>{t('2 free booking credits')}</Text><Text style={s.trustText}>{t('Pay your driver in cash')}</Text></View>
 </View>;
}
const s=StyleSheet.create({shell:{overflow:'hidden',borderRadius:24,backgroundColor:colors.ink},photos:{height:210,position:'relative'},mainPhoto:{width:'100%',height:210},smallPhoto:{position:'absolute',right:16,bottom:-12,width:94,height:110,borderWidth:4,borderColor:colors.paper,borderRadius:14,transform:[{rotate:'6deg'}]},sticker:{position:'absolute',left:14,bottom:15,padding:10,backgroundColor:colors.lime,borderRadius:6,transform:[{rotate:'-3deg'}]},stickerText:{color:colors.ink,fontSize:11,fontWeight:'900'},copy:{padding:23,paddingTop:30,gap:14},eyebrow:{color:colors.lime,fontSize:9,fontWeight:'800',letterSpacing:1.5},title:{color:'#fff',fontWeight:'900',letterSpacing:-1.7},lime:{color:colors.lime},body:{color:'#D9DECF',fontSize:14,lineHeight:22},trust:{paddingHorizontal:20,paddingVertical:14,backgroundColor:colors.lime,flexDirection:'row',justifyContent:'space-between',gap:12,flexWrap:'wrap'},trustText:{color:colors.ink,fontSize:11,fontWeight:'800'}});
