export const tripTimes=Array.from({length:96},(_,i)=>`${String(Math.floor(i/4)).padStart(2,'0')}:${String(i%4*15).padStart(2,'0')}`);
export const isTripTime=value=>typeof value==='string'&&/^([01]\d|2[0-3]):(00|15|30|45)$/.test(value);
export const tripTimeLabel=value=>{const [h,m]=value.split(':');return `${Number(h)%12||12}:${m} ${Number(h)<12?'AM':'PM'}`};
