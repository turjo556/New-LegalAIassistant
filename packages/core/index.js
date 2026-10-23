export const cities = ['Montréal', 'Longueuil', 'Ottawa', 'Gatineau'];
export const rides = [
 {id:'r1',from:'Montréal',to:'Québec City',time:'08:30',arrival:'11:30',driver:'Camille',initials:'CL',rating:'4.9',reviews:84,price:35,seats:3,home:true,car:'Toyota RAV4',color:'sage',pickup:'Berri-UQAM station',destination:'Sainte-Foy station',tags:['Quiet ride','Large luggage'],date:'2026-11-06'},
 {id:'r2',from:'Montréal',to:'Québec City',time:'10:00',arrival:'13:10',driver:'Alex',initials:'AM',rating:'4.8',reviews:62,price:32,seats:2,home:false,car:'Honda Civic',color:'peach',pickup:'Métro Namur',destination:'Gare du Palais',tags:['Music welcome','Carry-on'],date:'2026-11-06'},
 {id:'r3',from:'Montréal',to:'Québec City',time:'14:15',arrival:'17:20',driver:'Sarah',initials:'SB',rating:'5.0',reviews:39,price:38,seats:2,home:true,car:'Subaru Outback',color:'lavender',pickup:'Berri-UQAM station',destination:'Sainte-Foy station',tags:['Pets welcome','Large luggage'],date:'2026-11-06'},
 {id:'r4',from:'Montréal',to:'Ottawa',time:'09:00',arrival:'11:15',driver:'Jordan',initials:'JT',rating:'4.9',reviews:51,price:29,seats:3,home:true,car:'Kia Niro',color:'sage',pickup:'Métro Lionel-Groulx',destination:'Rideau station',tags:['Quiet ride'],date:'2026-11-06'},
 {id:'r5',from:'Ottawa',to:'Toronto',time:'12:00',arrival:'16:45',driver:'Morgan',initials:'MK',rating:'4.9',reviews:45,price:55,seats:2,home:true,car:'Mazda CX-5',color:'peach',pickup:'Rideau station',destination:'Yorkdale station',tags:['Large luggage'],date:'2026-11-06'}
];
export function searchRides(list, {from,to,date,seats=1,home=false}) {return list.filter(r=>r.from===from && r.to===to && r.date===date && r.seats>=Number(seats) && (!home||r.home));}
export function fare(ride,mode,seats=1){if(mode==='home'&&!ride.home)throw new Error('Home drop-off unavailable');return (ride.price+(mode==='home'?8:0))*Number(seats);}
