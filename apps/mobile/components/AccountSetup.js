import React,{useState,useEffect} from 'react';
import {View,Text,AppState,Linking} from 'react-native';
import {Button,Field,Copy,Card,Consent,ui} from './ui';
import {t} from '../lib/i18n';
export default function AccountSetup({data,api,refresh,driver=false}) {
  const [form,F]=useState({}),[busy,B]=useState(false),[error,E]=useState(''),[message,M]=useState('');
  const set=(key,value)=>F(f=>({...f,[key]:value}));
  useEffect(()=>{const sub=AppState.addEventListener('change',state=>{if(state!=='active')F({});});return()=>sub.remove();},[]);
  async function run(path,body,done) {if(busy)return;B(true);E('');M('');try{const result=await api.request(path,body);await done?.(result);await refresh();}catch(e){E(e.message);}finally{B(false);}}
  const verification=data.driverVerification||{},rider=data.riderProfile||{};
  return <View style={{gap:16}}>
    <Card><Copy heading>{driver?'Become a Ridely driver':'Get ready for your first ride'}</Copy><Copy>One account for riding and driving. Complete these checks at your own pace.</Copy>{error&&<Text accessibilityRole="alert" style={ui.error}>{t(error)}</Text>}{message&&<Text accessibilityLiveRegion="polite" style={ui.success}>{t(message)}</Text>}</Card>
    <Card><Copy heading>1. Confirm your email</Copy><Copy>{data.user.email}</Copy>{data.user.emailVerified?<Copy>Email confirmed</Copy>:<>
      <Button title="Send email code" disabled={busy||!data.capabilities?.email} onPress={()=>run('verification/send',{kind:'email'},()=>M('Code sent. Check your inbox and spam folder. It expires in 10 minutes.'))}/>
      {!data.capabilities?.email&&<Copy>Email verification is awaiting provider setup.</Copy>}
      <Field label="Six-digit email code" value={form.emailCode} onChange={v=>set('emailCode',v)} keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode"/>
      <Button title="Confirm email" disabled={busy||!/^\d{6}$/.test(form.emailCode||'')} onPress={()=>run('verification/confirm',{kind:'email',code:form.emailCode},()=>F({}))}/>
    </>}</Card>
    {driver?<>
      <Card><Copy heading>2. Your driving licence</Copy><Copy>Choose the province that issued your licence.</Copy><View style={{flexDirection:'row',gap:10}}>{['QC','ON'].map(p=><Button key={p} title={p==='QC'?'Québec':'Ontario'} secondary={(form.province||verification.licenceProvince)!==p} disabled={busy||!!verification.licenceProvince&&verification.licenceProvince!==p} onPress={()=>set('province',p)}/>)}</View>
      <Consent label="I authorise Ridely to review my driving privileges, licence class, restrictions and vehicle insurance." value={!!form.eligibility} onChange={v=>set('eligibility',v)}/>
      <Button title="Save licence province and consent" disabled={busy||!form.eligibility||!(form.province||verification.licenceProvince)} onPress={()=>run('driver/enrol',{licenceProvince:form.province||verification.licenceProvince,eligibilityConsent:true},()=>M('Licence review consent saved.'))}/>
      <Copy>Licence numbers are encrypted and available only to authorised review staff. Do not email document images or licence numbers.</Copy>
      {verification.licenceSubmission&&<Copy>{t('Submission status')+': '+verification.licenceSubmission.status}</Copy>}
      <Field label="Driver’s licence number" value={form.number} onChange={v=>set('number',v)} autoCapitalize="characters" autoCorrect={false} secureTextEntry autoComplete="off"/>
      <Consent label="I consent to secure licence-number storage for my driving-eligibility review." value={!!form.licenceConsent} onChange={v=>set('licenceConsent',v)}/>
      <Button title="Submit licence securely" disabled={busy||!data.user.emailVerified||!verification.eligibilityConsent||!verification.licenceSubmissionAvailable||!form.licenceConsent||!form.number} onPress={()=>run('driver/licence/submit',{number:form.number,consent:true},()=>{F({});M('Licence number submitted securely.');})}/>
      {!verification.licenceSubmissionAvailable&&<Copy>Secure licence submission is awaiting activation. No number has been saved.</Copy>}
      </Card>
      <Card><Copy heading>3. Confirm your identity</Copy><Copy>Stripe collects your licence document and selfie directly. This is separate from the review of your current driving privileges and insurance.</Copy><Copy>{t('Identity status')+': '+verification.identity}</Copy>
      <Consent label="I understand Stripe will process my identity documents and selfie for verification." value={!!form.stripeConsent} onChange={v=>set('stripeConsent',v)}/>
      <Button title="Verify with Stripe" disabled={busy||!form.stripeConsent||!data.user.emailVerified||!verification.available} onPress={()=>run('driver/identity/start',{consent:true},async r=>{if(r.url){const u=new URL(r.url);if(u.protocol!=='https:'||u.hostname!=='verify.stripe.com')throw Error('Unexpected verification link.');await Linking.openURL(r.url);}set('stripeConsent',false);})}/>
      <Button title="Check verification result" secondary disabled={busy||!verification.available} onPress={()=>run('driver/identity/refresh',{})}/>
      {verification.identity==='test_verified'&&<Copy>Test result only. Live identity and separate licence and insurance approval are required before bookings open.</Copy>}
      </Card>
      <Card><Copy heading>4. Final review</Copy><Copy>{t('Driving eligibility')+': '+verification.licence}</Copy><Copy>{t('Vehicle insurance')+': '+verification.insurance}</Copy><Copy>Contact support to arrange the separate insurance review. Do not email sensitive documents. Saving a draft does not publish your ride.</Copy><Button title="Request driver review" secondary disabled={busy||!verification.eligibilityConsent} onPress={()=>run('support/create',{subject:'Driver review request',body:'Please arrange the separate driving eligibility and vehicle insurance review for my driver application.'},()=>M('Driver review requested.'))}/></Card>
    </>:<>
      <Card><Copy heading>2. Your private rider details</Copy>{rider.detailsComplete?<Copy>Private rider profile complete</Copy>:<>
      <Copy>Your legal name and date of birth stay private. Ridely’s pilot is for adults aged 18 and over. These self-reported details are not an identity check.</Copy>
      <Field label="Full legal name" value={form.legalName} onChange={v=>set('legalName',v)} autoComplete="name"/>
      <Field label="Date of birth (YYYY-MM-DD)" value={form.dob} onChange={v=>set('dob',v)} keyboardType="numbers-and-punctuation" maxLength={10}/>
      <Consent label="I am at least 18 and consent to encrypted storage of these private details for account and incident handling." value={!!form.profileConsent} onChange={v=>set('profileConsent',v)}/>
      <Button title="Save private details" disabled={busy||!rider.available||!form.profileConsent||!form.legalName||!form.dob} onPress={()=>run('rider/profile/save',{legalName:form.legalName,dob:form.dob,consent:true,adultPolicyAccepted:true},()=>F({}))}/>
      {!rider.available&&<Copy>Private profile storage is awaiting activation. No private details were saved.</Copy>}
      </>}</Card>
      <Card><Copy heading>3. Confirm your phone</Copy>{data.user.phoneVerified?<Copy>Phone confirmed</Copy>:<>
      <Field label="Phone number (+1…)" value={form.phone} onChange={v=>set('phone',v)} keyboardType="phone-pad" autoComplete="tel"/>
      <Button title="Send phone code" disabled={busy||!data.capabilities?.sms||!form.phone} onPress={()=>run('verification/send',{kind:'phone',phone:form.phone},()=>M('Code sent. It expires in 10 minutes.'))}/>
      {!data.capabilities?.sms&&<Copy>Phone verification is awaiting SMS provider setup.</Copy>}
      <Field label="Six-digit phone code" value={form.phoneCode} onChange={v=>set('phoneCode',v)} keyboardType="number-pad" maxLength={6} textContentType="oneTimeCode"/>
      <Button title="Confirm phone" disabled={busy||!/^\d{6}$/.test(form.phoneCode||'')} onPress={()=>run('verification/confirm',{kind:'phone',code:form.phoneCode},()=>F({}))}/>
      </>}</Card>
    </>}
  </View>;
}
