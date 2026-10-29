import {useLocale} from './i18n.js';
import React from 'react';
import {MapPin,Route,ShieldCheck,MessageCircle,Wallet,ArrowRight,Car,ChevronDown,Check} from 'lucide-react';
import './marketing-polish.css';
const benefits=[
 [MapPin,'Know where to meet','Pickup and drop-off points are shown before you request a seat.'],
 [Route,'Choose a closer stop','Some drivers offer custom pickup or drop-off for an extra fee. Request it after acceptance.'],
 [Wallet,'Keep the fare clear','Pay your driver in cash during the pilot. Booking credits cover your Ridely reservation separately.']
];
const plans=[
 ['Online ride payments & driver payouts','Pay through Stripe checkout and receive driver payouts, once payment processing and cancellation rules are ready.'],
 ['Live journey tracking','Follow your ride and share trip progress with someone you trust.'],
 ['Rebooking support','Help finding another ride when a driver cancels, with clear refund rules.'],
 ['Better travel matches','Driver ratings, vehicle photos, and travel preferences to help you choose.'],
 ['Canada & US journeys','Expand the community across Canada and the United States.']
];
export default function MarketingSections({onJoin,onOffer,onSupport}){const locale=useLocale();return <div className="marketing marketing-polished">
 <section className="marketing-section" id="why-ridely"><div className="marketing-heading"><span className="section-kicker">WHY RIDELY</span><h2>Plan your ride before you leave.</h2><p>Public meeting points, clear fares, and room for your luggage.</p></div><div className="benefit-grid">{benefits.map(([I,title,copy])=><article className="benefit-card" key={title}><span className="feature-icon" aria-hidden="true"><I size={24}/></span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
 <section className="marketing-section how-section" id="how-it-works"><div className="marketing-heading"><span className="section-kicker">HOW IT WORKS</span><h2>From search to confirmed seat.</h2></div><div className="steps-grid">{[
 ['01','Find a ride','Choose your cities and date. Check the meeting points, luggage allowance, and fare.'],
 ['02','Request a seat','Send your request. Seats are not held while you wait, and no credit is used yet.'],
 ['03','The driver accepts','Your reservation is confirmed and one booking credit is used. Message your driver to arrange the details.']
 ].map(([n,title,copy])=><article key={n}><span className="step-number">{n}</span><h3>{title}</h3><p>{copy}</p></article>)}</div><p className="marketing-response-note">The driver has up to 2 hours to respond, or until 10 minutes before departure if sooner.</p></section>
 <section className="marketing-section pilot-tools" id="features"><div className="marketing-heading"><span className="section-kicker">DURING YOUR TRIP</span><h2>Keep the details together.</h2></div><ul>{[
 'Message your driver after acceptance.',
 'Use your private boarding code at pickup.',
 'Share your itinerary with someone you trust. This is not live tracking.',
 'Report a concern or contact support from your account.'
 ].map(copy=><li key={copy}><Check size={18}/><span>{copy}</span></li>)}</ul></section>
 <section className="safety-section" id="safety"><div><span className="section-kicker">SAFETY</span><h2>Driver checks before publishing.</h2><p>Drivers must complete identity verification and separate licence-eligibility and insurance reviews before publishing a ride.</p><p>These checks do not guarantee driving behaviour or vehicle condition.</p><a className="safety-guide-link" href={locale==='fr'?'/fr/securite':'/safety'}>Explore the safety guide <ArrowRight size={17}/></a></div><aside className="safety-note"><MessageCircle size={28}/><h3>Professional support</h3><p>Available 24/7 during the pilot. For immediate danger, call 911. Ridely is not an emergency service.</p><button onClick={onSupport}>Contact support <ArrowRight size={17}/></button></aside></section>
 <section className="marketing-section launch-section" id="coming-at-launch"><details className="marketing-roadmap"><summary><span>What’s next for Ridely<small>Planned features · Not available in the pilot</small></span><ChevronDown size={20}/></summary><div className="marketing-roadmap-items">{plans.map(([title,copy])=><article key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div></details></section>
 <section className="join-section"><h2>Ready to find a ride?</h2><p>Search Montréal, Longueuil, Ottawa, and Gatineau.</p><div><button className="primary" onClick={onJoin}>Search rides <ArrowRight size={18}/></button><button className="secondary-cta" onClick={onOffer}>Post a ride <Car size={18}/></button></div><small>Pilot · Pay your driver directly in cash</small></section>
 </div>}
