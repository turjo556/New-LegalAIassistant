import React from 'react';
import {View,Text,Image} from 'react-native';
import {Card,Copy,ui,colors} from './ui';
import {tripStops} from '../../../packages/core/trip-itinerary';
import {publicUrl} from '../lib/client';
import {t} from '../lib/i18n';
export default function TripOverview({ride,booking,driver}) {
 const requests=driver?(ride.passengers||[]).flatMap(p=>p.requests||[]):booking?.requests||[];
 const vehicle=ride.vehicleDetails||{},stops=tripStops(ride,requests);
 return <View style={{gap:16}}><Card><Copy heading>{ride.from+' → '+ride.to}</Copy><Copy>{ride.date+' · '+ride.time+'–'+ride.arrival+' · '+t('Eastern time')}</Copy><Text style={[ui.label,{backgroundColor:colors.lime,padding:10,borderRadius:8}]}>{t('Cash fare · paid directly to driver')}</Text>{booking&&<Copy>{t('Your agreed fare')+': $'+booking.total+' CAD'}</Copy>}<View style={{flexDirection:'row',gap:12,alignItems:'center'}}>{ride.driverPhoto&&<Image accessibilityLabel={t('Driver profile photo')} source={{uri:publicUrl(ride.driverPhoto)}} style={{width:52,height:52,borderRadius:26}}/>}<View style={{flex:1,gap:6}}><Copy heading>{ride.driver}</Copy><Copy>{ride.car+' · '+(vehicle.vehicleColor||ride.vehicleColor||'')}</Copy><Text style={ui.label}>{t('Licence plate')+': '+(vehicle.licencePlate||t('Not provided'))+' '+(vehicle.plateProvince||'')}</Text></View></View></Card>
 <Card><Copy heading>Full itinerary</Copy>{stops.map(stop=><View key={stop.id||stop.index} style={{flexDirection:'row',gap:12}}><Text style={{fontWeight:'900',fontSize:19,color:colors.ink}}>{stop.index}</Text><View style={{flex:1,gap:5}}><Text style={ui.label}>{t(stop.description)}</Text><Copy>{stop.label}</Copy><Copy>{stop.time||t('Time to confirm')}{stop.minutes?' · +'+stop.minutes+' min':''}</Copy></View></View>)}<Copy>All approved custom stops share a 15-minute detour allowance. Times are estimates. Other passengers’ exact addresses stay private.</Copy></Card>
 <Card><Copy heading>Pickup and cancellation</Copy><Copy>Drivers must wait 10 minutes from the later of the agreed pickup time or their actual arrival. Riders can cancel online at least 6 hours before departure; later requests go to support.</Copy><Copy>Drivers can cancel directly only when no passenger has booked. Otherwise, contact support. A support request does not cancel a reservation automatically.</Copy></Card>
 </View>;
}
