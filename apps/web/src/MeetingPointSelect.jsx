import React from 'react';
import {pointsForCity} from '../../../packages/core/meeting-points.js';
export default function MeetingPointSelect({city,label,name,value,address,onAddress,onChange}){
 const options=pointsForCity(city),selected=options.find(p=>p.id===value);
 return <div className="meeting-point-field">{options.length?<><label>{label}<select aria-label={label} required value={value} onChange={e=>onChange(options.find(p=>p.id===e.target.value))}><option value="" disabled>Select a meeting point</option>{options.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label><input type="hidden" name={name} value={selected?.label||''}/>{selected&&<div className="preset-directions"><a href={selected.mapsUrl} target="_blank" rel="noreferrer">Open exact selected location in Google Maps ↗</a><small>{selected.instructions}</small></div>}</>:<label>{label}<input name={name} required minLength={3} maxLength={150} value={address} onChange={e=>onAddress(e.target.value)} placeholder="Public, accessible meeting point"/></label>}</div>;
}
