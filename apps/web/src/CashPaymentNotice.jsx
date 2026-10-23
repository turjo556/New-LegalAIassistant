import React from 'react';
import {Banknote} from 'lucide-react';
export default function CashPaymentNotice({driver=false}){
 return <div className="cash-payment-notice"><Banknote size={23} aria-hidden="true"/><div><strong>{driver?'Passengers pay you directly in cash':'Pay your driver directly in cash'}</strong><span>Cash payments · Pilot programme</span><p>{driver?'Collect the displayed fare and any approved custom-stop fees from your passengers in person.':'Bring the displayed fare, including any approved custom-stop fees, and pay your driver in person.'} Ridely does not collect the driver’s cash fare or issue fare payouts. Booking credits are separate.</p></div></div>;
}
