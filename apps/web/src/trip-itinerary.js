// Match the approval-order itinerary used by the road routing service. Never
// derive another passenger's exact address or coordinates from public data.
export function tripStops(ride, requests = []) {
 const itinerary = ride.itinerary?.length ? ride.itinerary : [{kind:'pickup',label:ride.pickup},{kind:'dropoff',label:ride.destination}];
 return itinerary.map((stop,index) => {
  const custom = stop.kind.startsWith('custom');
  const own = custom && requests.find(r=>r.id===stop.id && r.status==='approved');
  const pickup = stop.kind.includes('pickup');
  return {...stop,index:index+1,custom,own:!!own,label:own?.address||stop.label,
   lat:own?.lat ?? (pickup?ride.pickupLat:ride.dropoffLat),
   lng:own?.lng ?? (pickup?ride.pickupLng:ride.dropoffLng),
   time:custom?null:pickup?ride.time:ride.arrival,
   description:custom?(own?'Your approved '+(pickup?'pickup':'drop-off'):'Approved custom '+(pickup?'pickup':'drop-off')+' · Approximate area'):'Standard '+(pickup?'pickup':'drop-off')};
 });
}
