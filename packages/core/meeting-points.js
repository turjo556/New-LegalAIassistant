// Owner-selected Google Maps links. Coordinates are deliberately unset until
// the exact meeting/loading point can be confirmed; city centres are not pins.
export const meetingPoints = [
 {id:'longueuil-taxi',city:'Longueuil',label:'Longueuil station · Taxi stand',mapsUrl:'https://maps.app.goo.gl/TWf7T1ReeFxm7Ynj9',instructions:'Meet at the taxi-stand meeting area outside Longueuil–Université-de-Sherbrooke station. Confirm a permitted passenger loading spot with your driver.'},
 {id:'namur-burger-king',city:'Montréal',label:'Namur · Burger King',mapsUrl:'https://maps.app.goo.gl/9PjSp5pLyFRKkWMp8',instructions:'Meet at the Burger King near Namur shown in the linked location. Confirm the vehicle meeting spot with your driver.'},
 {id:'berri-sainte-catherine',city:'Montréal',label:'Berri-UQAM · Sainte-Catherine exit',mapsUrl:'https://maps.app.goo.gl/nnyYTjZu6iWrps5p8',instructions:'Meet outside the Sainte-Catherine Street exit. Confirm the permitted loading spot with your driver.'},
 {id:'byward-universal',city:'Ottawa',label:'ByWard Market · Universal Grocery',mapsUrl:'https://maps.app.goo.gl/CqFuC3Tjs3Hw4KTu9',instructions:'Meet at Universal Grocery in ByWard Market using the linked location. Confirm the permitted loading spot with your driver.'},
 {id:'st-laurent-starbucks',city:'Ottawa',label:'St-Laurent Shopping Centre · Near Starbucks',mapsUrl:'https://maps.app.goo.gl/uBqTJcmMWh1nR4k87',instructions:'Meet near Starbucks at St-Laurent Shopping Centre using the linked location. Confirm the entrance and vehicle meeting spot with your driver.'},
 {id:'gatineau-walmart-st-joseph',city:'Gatineau',label:'Walmart · Saint-Joseph',mapsUrl:'https://maps.app.goo.gl/kPUexbdGHV6fFe3e6',instructions:'Meet at the Walmart Saint-Joseph location linked here. Confirm the vehicle meeting spot with your driver.'}
];
export const pointsForCity=city=>meetingPoints.filter(p=>p.city===city);
export const meetingPointFor=(city,label)=>meetingPoints.find(p=>p.city===city&&p.label===label)||null;
export function applyMeetingPoints(body){
 for(const [field,idField,cityField] of [['pickup','pickupLocationId','from'],['destination','dropoffLocationId','to']]){
  if(!body[idField])continue;
  const selected=meetingPoints.find(p=>p.id===body[idField]&&p.city===body[cityField]);
  if(!selected)throw Object.assign(new Error('Choose a meeting point in the selected city.'),{status:400});
  body[field]=selected.label;
 }
 return body;
}
