import {customFeeCents} from '../../packages/core/custom-fees';
import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Modal, Alert, Platform, KeyboardAvoidingView, RefreshControl, Switch, AppState, Linking, ActivityIndicator, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, Circle } from 'react-native-maps';
import { cities, searchRides } from '@nearway/core';
import { pickupCities } from '../../packages/core/pickup';
import { api, configuration, publicUrl } from './lib/client';
import * as SecureStore from 'expo-secure-store';
import { getLanguage, setLanguage, subscribeLanguage, t } from './lib/i18n';
import AccountSetup from './components/AccountSetup';
import SafetyTools from './components/SafetyTools';
import Credits from './components/Credits';
import ProfilePhoto from './components/ProfilePhoto';
import MeetingPoint from './components/MeetingPoint';
import TripOverview from './components/TripOverview';
import BrandHero from './components/BrandHero';
import {canCancelBooking} from '../../packages/core/cancellation';
import { seatFareCents } from '../../packages/core/fare-policy';
import { vehicleColors, plateProvinces } from '../../packages/core/vehicle.js';
const C = {
  navy: '#11120F',
  blue: '#27301C',
  orange: '#C5FF28',
  bg: '#F5F5EC',
  text: '#11120F',
  muted: '#5E6357',
  line: '#DADDCF',
  white: '#fff'
};
const dateString = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const confirm = (title, fn) => Alert.alert(t(title), t('This updates your shared trip.'), [{
  text: t('Keep trip'),
  style: 'cancel'
}, {
  text: t('Confirm'),
  style: 'destructive',
  onPress: fn
}]);
function Button({
  title,
  onPress,
  secondary = false,
  disabled = false
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{
    disabled
  }} disabled={disabled} onPress={onPress} style={({
    pressed
  }) => [s.button, secondary && s.secondary, (disabled || pressed) && {
    opacity: .55
  }]}><Text style={[s.buttonText, secondary && {
      color: C.blue
    }]}>{title}</Text></Pressable>;
}
function Field({
  label,
  value,
  onChange,
  secure = false,
  numeric = false,
  multiline = false,
  placeholder = '',
  ...props
}) {
  return <View style={s.field}><Text style={s.label}>{t(label)}</Text><TextInput accessibilityLabel={label} value={value == null ? '' : String(value)} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#8995a5" style={[s.input, multiline && {
      minHeight: 90,
      textAlignVertical: 'top'
    }]} secureTextEntry={secure} keyboardType={numeric ? "decimal-pad" : "default"} multiline={multiline} {...props} /></View>;
}
function TripTime({
  label,
  value,
  onChange
}) {
  const [open, O] = useState(false);
  const [hour, minute] = (value || '09:00').split(':').map(Number);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return <View style={s.field}><Text style={s.label}>{t(label)}</Text><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => O(!open)} style={s.input}><Text>{value}</Text></Pressable>{open && <DateTimePicker value={d} mode="time" minuteInterval={15} display="default" onChange={(_, next) => {
      O(false);
      if (next) {
        const total = Math.round((next.getHours() * 60 + next.getMinutes()) / 15) * 15 % 1440;
        onChange(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`);
      }
    }} />}</View>;
}
function City({
  label,
  value,
  onChange
}) {
  const [open, setOpen] = useState(false);
  return <View style={s.field}><Text style={s.label}>{t(label)}</Text><Pressable accessibilityRole="button" accessibilityLabel={label + ', ' + value} onPress={() => setOpen(!open)} style={s.input}><Text style={s.city}>{value} ▾</Text></Pressable>{open && <View style={s.choices}>{cities.map(c => <Pressable accessibilityRole="button" key={c} onPress={() => {
        onChange(c);
        setOpen(false);
      }} style={[s.choice, value === c && {
        backgroundColor: C.blue
      }]}><Text style={{
          color: value === c ? 'white' : C.text
        }}>{c}</Text></Pressable>)}</View>}</View>;
}
function NumberChoice({
  label,
  value,
  onChange,
  max = 4,
  min = 1
}) {
  return <View style={s.field}><Text style={s.label}>{t(label)}</Text><View style={s.row}>{Array.from({
        length: max - min + 1
      }, (_, i) => i + min).map(n => <Pressable accessibilityRole="button" accessibilityLabel={label + ': ' + n} accessibilityState={{
        selected: value === n
      }} key={n} onPress={() => onChange(n)} style={[s.number, value === n && {
        backgroundColor: C.blue,
        borderColor: C.blue
      }]}><Text style={{
          color: value === n ? 'white' : C.text,
          fontWeight: '600'
        }}>{n}</Text></Pressable>)}</View></View>;
}
function Pin({
  label,
  value,
  onChange,
  city,
  standard
}) {
  const hasStandard=Number.isFinite(standard?.lat)&&Number.isFinite(standard?.lng);
  const centre = hasStandard ? standard : {
    lat: pickupCities[city][0],
    lng: pickupCities[city][1]
  };
  const choose = e => onChange({
    lat: e.nativeEvent.coordinate.latitude,
    lng: e.nativeEvent.coordinate.longitude
  });
  return <View style={s.field}><Text style={s.label}>{t(label)}</Text><Text style={s.small}>{t("Tap to place the pin at the exact address. Pins are not address-verified.")}</Text>{Platform.OS === 'ios' ? <MapView accessibilityLabel={label + ' map'} style={s.map} initialRegion={{
      latitude: centre.lat,
      longitude: centre.lng,
      latitudeDelta: .075,
      longitudeDelta: .075
    }} onPress={choose}>{hasStandard && <><Circle center={{
          latitude: centre.lat,
          longitude: centre.lng
        }} radius={3000} strokeColor={C.blue} fillColor="rgba(21,95,223,0.08)" /><Marker coordinate={{
          latitude: centre.lat,
          longitude: centre.lng
        }} title={t("Standard meeting point")} pinColor={C.blue} /></>}{value && Number.isFinite(value.lat) && Number.isFinite(value.lng) && <Marker draggable onDragEnd={choose} coordinate={{
        latitude: value.lat,
        longitude: value.lng
      }} pinColor={C.orange} title={t("Selected stop")} />}</MapView> : <Text style={s.small}>{t("Enter confirmed coordinates below. An in-app Android map is not configured yet; no city-centre pin is treated as an exact address.")}</Text>}<View style={s.two}><View style={{
        flex: 1
      }}><Field label={label + ' latitude'} keyboardType="numbers-and-punctuation" numeric value={Number.isFinite(value?.lat) ? String(value.lat) : ""} onChange={v => onChange({
          ...value,
          lat: v === '' ? null : Number(v)
        })} /></View><View style={{
        flex: 1
      }}><Field label={label + ' longitude'} keyboardType="numbers-and-punctuation" numeric value={Number.isFinite(value?.lng) ? String(value.lng) : ""} onChange={v => onChange({
          ...value,
          lng: v === '' ? null : Number(v)
        })} /></View></View></View>;
}
function Itinerary({
  ride
}) {
  return <View style={s.itinerary}><Text style={s.label}>{t("APPROVED ITINERARY \xB7 ")}{ride.detourMinutes || 0}{t("/15 ADDED MIN")}</Text>{ride.itinerary?.map((stop, i) => <Text key={i} style={s.body}>● {stop.label}{stop.minutes ? ` · +${stop.minutes} min` : t("")}</Text>)}<Text style={s.small}>{t("Standard ")}{ride.time}–{ride.arrival}{t(". Add approved detour minutes to the arrival estimate. Custom stops are approximate here; private addresses are hidden. Times and order are driver estimates.")}</Text></View>;
}
function AppContent() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage);
  const [setup, Setup] = useState(null);
  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync('ridely.language').then(v => {
      if (active && v) setLanguage(v);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  async function toggleLanguage() {
    const next = language === 'fr' ? 'en' : 'fr';
    setLanguage(next);
    await SecureStore.setItemAsync('ridely.language', next).catch(() => {});
  }
  const [data, setData] = useState({
      user: null,
      rides: [],
      bookings: [],
      hosting: [],
      saved: []
    }),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, E] = useState(''),
    [tab, T] = useState('Explore'),
    [role, R] = useState('Riders'),
    [modal, M] = useState(null),
    [form, F] = useState({}),
    [messages, SM] = useState([]),
    [authMode, AM] = useState('login');
  const [from, From] = useState('Montréal'),
    [to, To] = useState('Ottawa'),
    [date, D] = useState(new Date()),
    [seats, S] = useState(1),
    [showDate, SD] = useState(false),
    [query, Q] = useState({
      from: 'Montréal',
      to: 'Ottawa',
      date: dateString(new Date()),
      seats: 1
    });
  const set = (k, v) => F(f => ({
    ...f,
    [k]: v
  }));
  const refresh = useCallback(async () => {
    try {
      setData(await api.request('state'));
      E('');
    } catch (e) {
      E(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!configuration.ready) {
      setLoading(false);
      return;
    }
    refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, 30000);
    const sub = AppState.addEventListener('change', v => {
      if (v === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh]);
  async function action(path, body, done) {
    if (busy) return;
    setBusy(true);
    E('');
    try {
      const d = await api.request(path, body);
      if (d.rides) setData(d);else if (d.refresh) await refresh();
      await done?.(d);
    } catch (e) {
      E(e.message);
    } finally {
      setBusy(false);
    }
  }
  function open(type, params = {}) {
    E('');
    F(params);
    M(type);
  }
  function signed(fn) {
    if (!data.user) {
      AM('login');
      open('auth');
      return;
    }
    fn();
  }
  function close() {
    M(null);
    F({});
    E('');
    SM([]);
  }
  async function conversation(id) {
    signed(() => {
      open('messages', {
        id,
        message: ''
      });
      action('messages', {
        id
      }, d => SM(d.messages));
    });
  }
  function offer() {
    signed(() => open('offer', {
      from: 'Montréal',
      to: 'Ottawa',
      date: dateString(new Date()),
      time: '09:00',
      arrival: '12:00',
      seats: 4,
      price: '25',
      vehicleColor: '',
      plateProvince: 'QC',
      licencePlate: '',
      pickupFee: '5',
      dropoffFee: '5',
      allowPickup: false,
      allowDropoff: false,
      ...data.rideDraft
    }));
  }
  function auth() {
    if (authMode === 'register' && !form.terms) {
      E('Accept the early-access terms and privacy policy.');
      return;
    }
    action(authMode === 'login' ? 'login' : 'register', {
      name: form.name,
      email: form.email,
      password: form.password,
      referralCode: authMode==='register'?form.referralCode:undefined
    }, () => {
      close();
      T('Account');
      Setup(authMode === 'register' ? 'rider' : null);
    });
  }
  function publish() {
    let price;
    try {
      price = seatFareCents(form.price) / 100;
    } catch (e) {
      E(e.message);
      return;
    }
    try {if(form.allowPickup)customFeeCents(Number(form.pickupFee));if(form.allowDropoff)customFeeCents(Number(form.dropoffFee));}catch(e){E(e.message);return;}
    const draft = {
      ...form,
      price,
      seats: Number(form.seats),
      pickupFee: Number(form.pickupFee),
      dropoffFee: Number(form.dropoffFee),
      pickupLat: form.pickupPin?.lat ?? form.pickupLat,
      pickupLng: form.pickupPin?.lng ?? form.pickupLng,
      dropoffLat: form.dropoffPin?.lat ?? form.dropoffLat,
      dropoffLng: form.dropoffPin?.lng ?? form.dropoffLng
    };
    if (!data.user?.emailVerified || !data.driverVerification?.approved) {
      action('rides/draft', {
        draft
      }, () => {
        close();
        T('Account');
        Setup('driver');
      });
      return;
    }
    action('rides', draft, () => {
      close();
      T('Explore');
      R('Drivers');
    });
  }
  async function approveStop() {
    if (!data.capabilities?.roadRouting) {
      action('stops/decision', {
        id: form.request.id,
        decision: 'approve',
        minutes: Number(form.minutes)
      }, close);
      return;
    }
    setBusy(true);
    E('');
    try {
      const quote = await api.request('stops/quote', {
        id: form.request.id
      });
      setBusy(false);
      Alert.alert('Review road detour', `${quote.totalMinutes}/15 minutes total, including boarding. Traffic may change.`, [{
        text: 'Not now',
        style: 'cancel'
      }, {
        text: 'Approve',
        onPress: () => action('stops/decision', {
          id: form.request.id,
          decision: 'approve',
          quoteId: quote.id
        }, close)
      }]);
    } catch (e) {
      E(e.message);
      setBusy(false);
    }
  }
  function support(subject,reference=''){open('support',{subject,body:reference?'Reference: '+reference+'\n\n':''});}
  function custom(booking, kind) {
    open('request', {
      booking,
      kind,
      address: '',
      pin: null
    });
  }
  const shown = tab === 'Trips' ? data.bookings.map(b => ({
    ...b.ride,
    booking: b
  })) : tab === 'Saved' ? data.rides.filter(r => data.saved.includes(r.id)) : role === 'Drivers' ? data.hosting : searchRides(data.rides, query);
  const money = v => '$' + (Number.isInteger(Number(v)) ? Number(v) : Number(v).toFixed(2));
  const err = error ? <View accessibilityRole="alert" style={s.error}><Text style={s.errorText}>{error}</Text>{!modal && <Button title={t("Try again")} onPress={refresh} secondary />}</View> : null;
  function card(ride) {
    const b = ride.booking;
    return <View key={b?.id || ride.id} style={s.card}><View style={s.spread}><Text style={s.route}>{ride.from} → {ride.to}</Text><Pressable accessibilityRole="button" accessibilityLabel={data.saved.includes(ride.id) ? t("Unsave ride") : t("Save ride")} onPress={() => signed(() => action('favorites', {
          id: ride.id
        }))}><Text style={s.heart}>{data.saved.includes(ride.id) ? t("\u2665") : t("\u2661")}</Text></Pressable></View><Text style={s.tag}>{t("Cash fare \xB7 paid directly to driver")}</Text>{ride.driverPhoto && <Image accessibilityLabel={t("Driver profile photo")} source={api.photoSource(ride.driverPhoto)} style={{
        width: 48,
        height: 48,
        borderRadius: 24
      }} />}<Text style={s.caption}>{ride.date} · {ride.car} · {ride.vehicleColor} · {ride.driver}</Text><View style={s.spread}><Text style={s.time}>{ride.time} — {ride.arrival}</Text><Text style={s.price}>{money(b ? b.total : ride.price)}<Text style={s.small}> {b ? t("total") : t("/ seat")}</Text></Text></View><Text style={s.body}>{t("Pickup \xB7 ")}{ride.pickup}{'\n'}{t("Drop-off \xB7 ")}{ride.destination}</Text><View style={s.row}>{ride.allowPickup && <Text style={s.tag}>{t("Custom pickup allowed")}</Text>}{ride.allowDropoff && <Text style={s.tag}>{t("Custom drop-off allowed")}</Text>}</View><Text style={s.small}>{ride.seats}{t(" seats available \xB7 Driver identity, driving eligibility and insurance require separate approval. Details can change; check the person and vehicle at pickup.")}</Text><Itinerary ride={ride} />{ride.vehicleDetails && <Text style={s.body}>{t("Vehicle: ")}{ride.vehicleDetails.vehicleColor || 'Colour not provided'}{t(" \xB7 Plate: ")}{ride.vehicleDetails.licencePlate || 'Not provided yet'} {ride.vehicleDetails.plateProvince}</Text>}{b ? <><Text style={s.status}>{ride.cancelled ? t("DRIVER CANCELLED THIS RIDE") : t("STANDARD SEATS RESERVED")}</Text>{!ride.cancelled && ['pickup', 'dropoff'].map(kind => {
          const enabled = kind === 'pickup' ? ride.allowPickup : ride.allowDropoff;
          const existing = b.requests?.find(r => r.kind === kind);
          return enabled ? <Button key={kind} title={existing && existing.status !== 'declined' ? `${kind}: ${existing.status}` : `Request custom ${kind === 'pickup' ? 'pickup' : 'drop-off'} · +${money(kind === 'pickup' ? ride.pickupFee : ride.dropoffFee)}/person`} disabled={busy || !!existing && existing.status !== 'declined'} onPress={() => custom(b, kind)} secondary /> : null;
        })}{b.requests?.map(r => <View style={s.request} key={r.id}><Text style={s.driverName}>{r.kind} · {r.status}</Text><Text style={s.body}>{r.address}</Text><Text style={s.small}>{r.status === 'approved' ? `+${r.minutes} min · ${money(r.fee / 100)} supplement` : t("Standard booking stays unchanged until approval.")}</Text></View>)}<Button title={t("Trip details & boarding code")} onPress={() => open('safety', {
          ride,
          booking: b,
          driver: false
        })} /><Button title={t("Message driver")} onPress={() => conversation(b.id)} secondary />{canCancelBooking(ride)?<Button title={t('Cancel reservation')} disabled={busy} onPress={()=>confirm('Cancel this reservation?',()=>action('bookings/cancel',{id:b.id}))} secondary/>:<Button title={t('Request cancellation through support')} secondary onPress={()=>support('Late cancellation request',b.id)}/>}</> : ride.owner === data.user?.id ? <><Text style={s.status}>{ride.cancelled ? t("CANCELLED") : t("YOUR LISTING")}</Text><Button title={t("Manage boarding & trip sharing")} onPress={() => open('safety', {
          ride,
          driver: true
        })} />{ride.passengers?.map(p => <View style={s.request} key={p.id}><Text style={s.driverName}>{p.name} · {p.seats}{t(" passenger(s)")}</Text><Button title={t("Message passenger")} onPress={() => conversation(p.id)} secondary />{p.requests?.map(request => <View key={request.id}><Text style={s.driverName}>{t("Custom ")}{request.kind} · {request.status}</Text><Text style={s.body}>{request.address}</Text><Text style={s.small}>{request.distance.toFixed(2)}{t(" km from standard \xB7 ")}{money(request.fee / 100)}{t(" extra")}</Text><Button title={t("Inspect address pin \u2197")} secondary onPress={() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${request.lat}&mlon=${request.lng}#map=16/${request.lat}/${request.lng}`).catch(() => E('Unable to open the map.'))} />{request.status === 'pending' && !ride.cancelled && <Button title={t("Review request")} onPress={() => open('decision', {
              request,
              ride,
              minutes: ''
            })} />}</View>)}</View>)}{!ride.cancelled&&(ride.passengers?.length?<Button title={t('Request cancellation through support')} secondary onPress={()=>support('Driver cancellation request',ride.id)}/>:<Button title={t('Cancel published ride')} disabled={busy} onPress={()=>confirm('Cancel this empty listing?',()=>action('rides/cancel',{id:ride.id}))} secondary/>)}</> : <Button title={ride.bookable ? t("Review & book \u2192") : t("Driver review pending")} onPress={() => signed(() => open('book', {
        ride,
        seats: Number(query.seats || 1)
      }))} disabled={!ride.bookable || ride.cancelled || ride.seats < Number(query.seats || 1)} />}</View>;
  }
  return <SafeAreaView style={s.safe} edges={['top', 'bottom']}><StatusBar style="dark" /><View style={s.header}><Text style={s.logo}>{t("ridely")}<Text style={{
          color: C.orange
        }}>.</Text></Text><Pressable accessibilityRole="button" accessibilityLabel={t("Change language")} onPress={toggleLanguage}><Text style={s.signin}>{language === 'fr' ? t("EN") : t("FR")}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => data.user ? T('Account') : (AM('login'), open('auth'))}><Text style={s.signin}>{data.user?.name || 'Sign in'}</Text></Pressable></View><ScrollView contentContainerStyle={s.page} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => {
      setLoading(true);
      refresh();
    }} />} keyboardShouldPersistTaps="handled">{data.testing?.isolated&&<View style={s.notice}><Text style={s.driverName}>{t("Test mode · fictional accounts")}</Text><Text style={s.body}>{t("Trips and approvals are simulated. No real identity checks or payments. Use only your test logins and fictional details.")}</Text></View>}{!configuration.ready && <View style={s.notice}><Text style={s.driverName}>{t("Development build")}</Text><Text style={s.body}>{configuration.message}</Text></View>}{!modal && err}{loading && <ActivityIndicator color={C.blue} />}{tab === 'Explore' && <><View style={s.segments}>{['Riders', 'Drivers'].map(r => <Pressable key={r} accessibilityRole="tab" accessibilityState={{
            selected: role === r
          }} onPress={() => R(r)} style={[s.segment, role === r && s.segmentActive]}><Text style={[s.segmentText, role === r && {
              color: 'white'
            }]}>{t(r)}</Text></Pressable>)}</View><BrandHero driver={role==='Drivers'} onOffer={offer}/>{role === 'Riders' ? <View style={s.card}><City label={t("Leaving from")} value={from} onChange={From} /><City label={t("Going to")} value={to} onChange={To} /><View style={s.field}><Text style={s.label}>{t("Departure date")}</Text><Pressable accessibilityRole="button" onPress={() => SD(!showDate)} style={s.input}><Text style={s.city}>{date.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}</Text></Pressable>{showDate && <DateTimePicker value={date} minimumDate={new Date()} mode="date" display={Platform.OS === 'ios' ? "inline" : "default"} themeVariant="light" onChange={(_, d) => {
              if (d) D(d);
              SD(false);
            }} />}</View><NumberChoice label={t("Passengers")} value={seats} onChange={S} /><Button title={t("Find a ride \u2192")} onPress={() => {
            if (from === to) {
              E('Choose two different cities.');
              return;
            }
            Q({
              from,
              to,
              date: dateString(date),
              seats
            });
          }} /></View> : <View style={s.notice}><Text style={s.body}>{t("Custom pickup and drop-off are off by default. Enable either on your listing. Passengers book your standard route first, then request a change.")}</Text></View>}</>}
 {tab === 'Credits' ? <Credits data={data} onAccount={() => {
        AM('login');
        open('auth');
      }} /> : tab === 'Account' ? <>
 {setup && data.user ? <><Button title={t("Back to account")} secondary onPress={() => Setup(null)} /><AccountSetup key={setup} data={data} api={api} refresh={refresh} driver={setup === 'driver'} /></> : <>
 <Text style={s.heading}>{t("Your account")}</Text>{data.user ? <><View style={s.card}>{data.user.photoUrl && <Image accessibilityLabel={t("Your profile photo")} source={api.photoSource(data.user.photoUrl)} style={{
                width: 64,
                height: 64,
                borderRadius: 32
              }} />}<Text style={s.route}>{data.user.name}</Text><Text style={s.body}>{data.user.email}</Text><Text style={s.body}>{t("One account for riding and driving. Your session stays in this device\u2019s secure storage.")}</Text><Button title={data.riderProfile?.ready ? t("Review rider checks") : t("Complete rider setup")} onPress={() => Setup('rider')} /><Button title={t("Become a Ridely driver")} secondary onPress={() => Setup('driver')} /><Button title={t("Booking credits")} secondary onPress={() => T('Credits')} /><Button title={t("Sign out")} secondary disabled={busy} onPress={() => action('logout', {}, () => {
                close();
                Setup(null);
                T('Explore');
                R('Riders');
              })} /></View>
 <ProfilePhoto user={data.user} api={api} refresh={refresh} /><View style={s.card}><Text style={s.route}>{t("Trip updates")}</Text><Text style={s.body}>{t("Updates appear here while the app is open. Push notifications are not connected yet.")}</Text>{data.notifications?.length ? data.notifications.map(n => <View key={n.id}><Text style={s.body}>{t(n.title)}</Text><Text style={s.small}>{new Date(n.created).toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA')}</Text></View>) : <Text style={s.body}>{t("No updates yet.")}</Text>}<Button title={t("Mark updates as read")} secondary disabled={busy} onPress={() => action('notifications/read', {})} /></View>
 </> : <Button title={t("Sign in or create account")} onPress={() => {
            AM('login');
            open('auth');
          }} />}
 <View style={s.notice}><Text style={s.driverName}>{t("Pilot support")}</Text><Text style={s.body}>{data.capabilities?.pilotSupport24_7 ? t("Professional support \xB7 Available 24/7 during the pilot") : t("Contact Ridely support")}</Text><Text style={s.body}>{t("For immediate danger, call 911. Support is not an emergency service or live trip monitoring.")}</Text><Button title={t("Contact support")} secondary onPress={()=>support('Account support')} /><Button title={t("Early-access terms and privacy policy")} secondary onPress={() => Linking.openURL(publicUrl('/policies')).catch(e => E(e.message))} /></View>
 </>}</> : <>{data.user && (tab === 'Trips' || (role === 'Drivers' && tab === 'Explore')) && (data.seatRequests || []).filter(q => (role === 'Drivers' && tab === 'Explore' ? q.driverId : q.passengerId) === data.user.id && q.status !== 'accepted').map(q => <View style={s.card} key={q.id}><Text style={s.route}>{q.origin} → {q.destination}</Text><Text style={s.body}>{q.date} · {q.time} · {q.seats} {t('seat(s)')}</Text><Text style={s.status}>{t(({pending:'Awaiting driver approval',declined:'Not accepted',expired:'Request expired',withdrawn:'Request withdrawn'})[q.status])}</Text>{q.status === 'pending' && <><Text style={s.body}>{t('Respond by')} {new Date(q.expiresAt).toLocaleString(undefined, {timeZone:'America/Toronto'})} ET</Text>{q.driverId === data.user.id ? <><Button title={t('Accept seats')} disabled={busy} onPress={() => confirm('These seats are available across all my listings. I will update my other listings immediately.', () => action('booking-requests/decision', {id:q.id,decision:'accept',availabilityConfirmed:true}))}/><Button title={t('Decline')} secondary disabled={busy} onPress={() => action('booking-requests/decision', {id:q.id,decision:'decline'})}/></> : <Button title={t('Withdraw request')} secondary disabled={busy} onPress={() => action('booking-requests/withdraw', {id:q.id})}/>}</>}<Button title={t('Refresh requests')} secondary onPress={refresh}/></View>)}<View style={s.spread}><Text style={s.heading}>{tab === 'Trips' ? t("My trips") : tab === 'Saved' ? t("Saved rides") : role === 'Drivers' ? t("Your routes") : t("Available rides")}</Text><Text style={s.caption}>{shown.length}{t(" \xB7 CAD")}</Text></View>{shown.length ? shown.map(card) : !loading && <View style={s.card}><Text style={s.route}>{!data.user && tab !== 'Explore' ? t("Sign in to see your trips") : t("Your next journey starts here")}</Text><Text style={s.body}>{role === 'Drivers' && tab === 'Explore' ? t("Post a route and choose your standard meeting points.") : t("No matching rides yet. Try another route or date, or offer the first ride.")}</Text><Button title={data.user ? t("Offer a ride") : t("Sign in")} secondary onPress={() => data.user ? offer() : (AM('login'), open('auth'))} /></View>}</>}
 <Text style={s.footnote}>{t("Pull to refresh. Shared data refreshes every 30 seconds while the app is open.")}</Text></ScrollView><View style={s.bottom}>{['Explore', 'Trips', 'Saved', 'Credits', 'Account'].map(tabKey => <Pressable accessibilityRole="tab" accessibilityState={{
        selected: tab === tabKey
      }} key={tabKey} onPress={() => T(tabKey)} style={s.bottomTab}><Text style={[s.bottomIcon, tab === tabKey && {
          color: C.blue
        }]}>{{
            Explore: '↗',
            Trips: '⇄',
            Saved: '♡',
            Credits: '▣',
            Account: '○'
          }[tabKey]}</Text><Text style={[s.bottomText, tab === tabKey && {
          color: C.blue,
          fontWeight: '700'
        }]}>{t({
            Explore: 'Search',
            Trips: 'My trips',
            Saved: 'Saved',
            Credits: 'Credits',
            Account: 'Account'
          }[tabKey])}</Text></Pressable>)}</View>
 <Modal visible={!!modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}><SafeAreaView style={s.safe}><KeyboardAvoidingView style={{
          flex: 1
        }} behavior={Platform.OS === 'ios' ? "padding" : undefined}><View style={s.modalHeader}><Text style={s.modalTitle}>{t({
                auth: authMode === 'login' ? 'Welcome back' : 'Join Ridely',
                book: 'Review your ride',
                offer: 'Post your route',
                request: 'Request a custom stop',
                decision: 'Review custom stop',
                messages: 'Trip messages',
                safety: 'Your trip and safety', support:'Contact support'
              }[modal])}</Text><Pressable accessibilityRole="button" accessibilityLabel={t("Close")} onPress={close} style={s.close}><Text style={{
                fontSize: 24,
                color: C.text
              }}>×</Text></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>{err}
 {modal==='safety'&&form.ride&&<><TripOverview ride={form.ride} booking={form.booking} driver={form.driver}/><SafetyTools ride={form.ride} booking={form.booking} driver={form.driver} api={api} onSupport={()=>support('Trip support',form.booking?.id||form.ride.id)}/></>}
 {modal==='support'&&<><Text style={s.body}>{t('A support request does not automatically cancel your booking. In immediate danger, call 911.')}</Text><Field label={t('Subject')} value={form.subject} onChange={v=>set('subject',v)} maxLength={100}/>{!data.user&&<Field label={t('Email')} value={form.email} onChange={v=>set('email',v)} autoCapitalize="none" keyboardType="email-address"/>}<Field label={t('How can we help?')} value={form.body} onChange={v=>set('body',v)} multiline maxLength={4000}/><Button title={t('Send support request')} disabled={busy||form.subject?.trim().length<3||form.body?.trim().length<10} onPress={()=>action('support/create',{subject:form.subject,body:form.body,email:form.email},r=>{close();Alert.alert(t('Request received'),t('Reference')+': '+r.ticketId);})}/></>}
 {modal === 'auth' && <>{authMode === 'register' && <Field label={t("First name")} value={form.name} onChange={v => set('name', v)} autoComplete="given-name" />}<Field label={t("Email")} value={form.email} onChange={v => set('email', v)} keyboardType="email-address" autoCapitalize="none" autoComplete="email" /><Field label={t("Password")} value={form.password} onChange={v => set('password', v)} secure autoCapitalize="none" autoComplete={authMode === 'login' ? "current-password" : "new-password"} /><Text style={s.small}>{t("At least 10 characters. Use your password manager to create and save a strong password.")}</Text>{authMode === 'register' && <><Field label={t('Referral code (optional)')} value={form.referralCode} onChange={v=>set('referralCode',v.toUpperCase().replace(/[^A-Z0-9-]/g,''))} autoCapitalize="characters" autoCorrect={false} maxLength={20}/><View style={s.spread}><Text style={[s.body, {
                    flex: 1
                  }]}>{t("I agree to the early-access terms and privacy policy.")}</Text><Switch accessibilityLabel={t("Accept terms and privacy policy")} value={!!form.terms} onValueChange={v => set('terms', v)} trackColor={{
                    true: C.orange
                  }} /></View><Button title={t("Read terms and privacy policy")} secondary onPress={() => Linking.openURL(publicUrl('/policies')).catch(e => E(e.message))} /></>}<Button title={busy ? t("Please wait\u2026") : authMode === 'login' ? t("Sign in") : t("Create account")} disabled={busy} onPress={auth} /><Button title={authMode === 'login' ? t("New here? Create account") : t("Already a member? Sign in")} secondary onPress={() => {
                AM(authMode === 'login' ? 'register' : 'login');
                E('');
              }} /></>}
 {modal === 'book' && form.ride && <><Text style={s.heading}>{form.ride.from} → {form.ride.to}</Text><Text style={s.body}>{form.ride.date} · {form.ride.time}–{form.ride.arrival}{'\n'}{t("Driver: ")}{form.ride.driver}</Text><Text style={s.driverName}>{t("Standard pickup")}</Text><Text style={s.body}>{form.ride.pickup}</Text><Text style={s.driverName}>{t("Standard drop-off")}</Text><Text style={s.body}>{form.ride.destination}</Text><Itinerary ride={form.ride} /><NumberChoice label={t("Seats to reserve")} max={Math.min(4, form.ride.seats)} value={form.seats} onChange={v => set('seats', v)} /><View style={s.notice}><Text style={s.body}>{t("Request the standard meeting points first. The driver has up to 2 hours to accept, no later than 1 hour before departure. No credit is used until acceptance. Pay the ride fare to the driver in cash.")}</Text></View><Text style={s.price}>{money(form.ride.price * form.seats)}{t(" CAD \xB7 cash to driver")}</Text><Text style={s.body}>{data.bookingCredits?.balance ?? 0}{t(" booking credits available \xB7 1 required")}</Text>{!data.riderProfile?.ready && <Button title={t("Complete rider setup")} secondary onPress={() => {
                close();
                T('Account');
                Setup('rider');
              }} />}{data.bookingCredits?.balance < 1 && <Button title={t("View booking credits")} secondary onPress={() => {
                close();
                T('Credits');
              }} />}<Button title={busy ? t("Reserving\u2026") : t("Request standard seats")} disabled={busy || !data.riderProfile?.ready || !(data.bookingCredits?.balance >= 1)} onPress={() => action('bookings', {
                rideId: form.ride.id,
                seats: form.seats,
                pickupMode: 'standard'
              }, () => {
                close();
                T('Trips');
                Alert.alert(t('Request sent'), t('Waiting for driver approval. No credit used yet. Check My trips for the result.'));
              })} /></>}
 {modal === 'offer' && <><City label={t("Departure city")} value={form.from} onChange={v => F(f => ({
                ...f,
                from: v,
                pickupPin: null,
                pickupLocationId: '',
                pickup: '', pickupLat:null, pickupLng:null
              }))} /><City label={t("Destination city")} value={form.to} onChange={v => F(f => ({
                ...f,
                to: v,
                dropoffPin: null,
                dropoffLocationId: '',
                destination: '', dropoffLat:null, dropoffLng:null
              }))} /><Field label={t("Date (YYYY-MM-DD)")} value={form.date} onChange={v => set('date', v)} /><View style={s.two}><View style={{
                  flex: 1
                }}><TripTime label={t("Departure time")} value={form.time} onChange={v => set('time', v)} /></View><View style={{
                  flex: 1
                }}><TripTime label={t("Estimated arrival")} value={form.arrival} onChange={v => set('arrival', v)} /></View></View><Text style={s.small}>{t("Eastern time \xB7 15-minute increments \xB7 same-day arrival")}</Text><Field label={t("Vehicle")} value={form.car} onChange={v => set('car', v)} /><Field label={t("Licence plate number")} value={form.licencePlate} onChange={v => set('licencePlate', v)} autoCapitalize="characters" /><Text style={s.label}>{t("Plate province / territory")}</Text><View style={s.row}>{plateProvinces.map(p => <Button key={p} title={p} secondary={form.plateProvince !== p} onPress={() => set('plateProvince', p)} />)}</View><Text style={s.label}>{t("Car colour")}</Text><View style={s.row}>{vehicleColors.map(c => <Button key={c} title={c} secondary={form.vehicleColor !== c} onPress={() => set('vehicleColor', c)} />)}</View><Text style={s.small}>{t("Your plate is shared with booked passengers. Colour appears in search results. Driver-provided details.")}</Text><Field label={t("Luggage allowance")} value={form.luggage} onChange={v=>set('luggage',v)} maxLength={120}/><Field label={t("Vehicle and travel notes")} value={form.vehicleNotes} onChange={v=>set('vehicleNotes',v)} maxLength={500} multiline/><NumberChoice label={t("Available seats")} value={form.seats} onChange={v => set('seats', v)} /><Field label={t("Price per seat (CAD)")} numeric keyboardType="number-pad" value={form.price} onChange={v => set('price', v)} onBlur={() => {
                if (form.price !== '' && Number.isFinite(Number(form.price))) set('price', String(Number(form.price)));
              }} /><Text style={s.small}>{t("Recommended: $25 CAD per seat \xB7 Maximum: $30 CAD per seat. Whole dollars only. Optional custom-stop fees are separate.")}</Text><MeetingPoint label={t("Standard pickup point")} city={form.from} id={form.pickupLocationId} onChange={p => F(f => ({
                ...f,
                pickup: p.label,
                pickupLocationId: p.id,
                pickupPin: null,
                pickupLat: null,
                pickupLng: null
              }))} /><MeetingPoint label={t("Standard drop-off point")} city={form.to} id={form.dropoffLocationId} onChange={p => F(f => ({
                ...f,
                destination: p.label,
                dropoffLocationId: p.id,
                dropoffPin: null,
                dropoffLat: null,
                dropoffLng: null
              }))} />{['pickup', 'dropoff'].map(kind => {
                const key = kind === 'pickup' ? 'allowPickup' : 'allowDropoff',
                  pin = kind + 'Pin';
                return <View key={kind} style={s.card}><View style={s.spread}><Text style={[s.driverName, {
                      flex: 1
                    }]}>{t("Allow custom ")}{kind === 'pickup' ? t("pickup") : t("drop-off")}</Text><Switch accessibilityLabel={'Allow custom ' + kind} value={form[key]} onValueChange={v => set(key, v)} trackColor={{
                      true: C.blue
                    }} /></View>{form[key] && <><NumberChoice label={kind + ' fee per person (CAD)'} min={5} max={10} value={Number(form[kind + 'Fee'])} onChange={v => set(kind + 'Fee',String(v))}/><Text style={s.small}>{t('$5–$10 CAD per option, per passenger. $1 increments.')}</Text><Pin label={'Standard ' + kind + ' pin'} value={form[pin]} onChange={v => set(pin, v)} city={kind === 'pickup' ? form.from : form.to} /></>}</View>;
              })}{form.allowPickup && !form.allowDropoff && <Pin label={t("Standard dropoff pin")} value={form.dropoffPin} onChange={v => set('dropoffPin', v)} city={form.to} />}{form.allowDropoff && !form.allowPickup && <Pin label={t("Standard pickup pin")} value={form.pickupPin} onChange={v => set('pickupPin', v)} city={form.from} />}<Text style={s.body}>{t("Custom pins must fall within 3 km of their standard point. All approved stops share a 15-minute driver-estimated detour allowance, including stopping. Verify road access and timing before approval.")}</Text><Button title={busy ? t("Saving\u2026") : data.driverVerification?.approved ? t("Publish route") : t("Save ride & continue to verification")} onPress={publish} disabled={busy} /></>}
 {modal === 'request' && form.booking && <><Text style={s.heading}>{t("Custom ")}{form.kind === 'pickup' ? t("pickup") : t("drop-off")}</Text><Text style={s.body}>{t("Your standard seats stay booked. Only your driver sees the precise address. The fee is added only after approval.")}</Text><Field label={t("Full address")} value={form.address} onChange={v => set('address', v)} multiline /><Pin label={t("Requested stop")} value={form.pin} onChange={v => set('pin', v)} city={form.kind === 'pickup' ? form.booking.ride.from : form.booking.ride.to} standard={{
                lat: form.kind === 'pickup' ? form.booking.ride.pickupLat : form.booking.ride.dropoffLat,
                lng: form.kind === 'pickup' ? form.booking.ride.pickupLng : form.booking.ride.dropoffLng
              }} /><Text style={s.body}>{t("The pin must be within 3 km of the standard stop. Pins are not address-verified; the driver checks road detours.")}</Text><Button title={busy ? t("Sending\u2026") : t("Send request to driver")} disabled={busy || !Number.isFinite(form.pin?.lat) || !Number.isFinite(form.pin?.lng)} onPress={() => action('stops/request', {
                bookingId: form.booking.id,
                kind: form.kind,
                expectedFee: form.booking.ride[form.kind+'Fee'],
                address: form.address,
                lat: form.pin.lat,
                lng: form.pin.lng
              }, close)} /></>}
 {modal === 'decision' && form.request && <><Text style={s.heading}>{t("Custom ")}{form.request.kind}</Text><Text style={s.body}>{form.request.address}{'\n'}{form.request.distance.toFixed(2)}{t(" km from the standard point")}</Text><Text style={s.status}>{form.ride.detourMinutes || 0}{t("/15 ADDED MINUTES ALREADY APPROVED")}</Text><Text style={s.body}>{t("Inspect the address and review all existing stops. Enter added road travel time including stopping and boarding. These are your estimates; automatic routing is not connected.")}</Text>{!data.capabilities?.roadRouting && <Field label={t("Added minutes (1\u201315)")} numeric value={form.minutes} onChange={v => set('minutes', v)} />}<Button title={t("Approve request")} disabled={busy} onPress={approveStop} /><Button title={t("Decline request")} secondary disabled={busy} onPress={() => action('stops/decision', {
                id: form.request.id,
                decision: 'decline'
              }, close)} /></>}
 {modal === 'messages' && <><Text style={s.small}>{t("Private to you and the other member. No push alerts yet\u2014refresh for replies.")}</Text>{messages.map(m => <View key={m.id} style={s.card}><Text style={s.driverName}>{m.sender}</Text><Text style={s.body}>{m.body}</Text><Text style={s.small}>{new Date(m.created).toLocaleString()}</Text></View>)}{!messages.length && <Text style={s.body}>{t("No messages yet.")}</Text>}<Button title={t("Refresh messages")} secondary disabled={busy} onPress={() => action('messages', {
                id: form.id
              }, d => SM(d.messages))} /><Field label={t("Your message")} value={form.message} onChange={v => set('message', v)} multiline maxLength={2000} /><Button title={busy ? t("Sending\u2026") : t("Send message")} disabled={busy || !form.message?.trim()} onPress={() => action('messages/send', {
                id: form.id,
                message: form.message
              }, d => {
                SM(d.messages);
                set('message', '');
              })} /></>}
 </ScrollView></KeyboardAvoidingView></SafeAreaView></Modal></SafeAreaView>;
}
export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}
const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg
  },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  logo: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -1,
    color: C.navy
  },
  signin: {
    fontSize: 12,
    fontWeight: '600',
    color: C.blue,
    maxWidth: 110
  },
  page: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 35,
    gap: 16
  },
  segments: {
    flexDirection: 'row',
    gap: 10
  },
  segment: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 17,
    alignItems: 'center',
    backgroundColor: 'white'
  },
  segmentActive: {
    backgroundColor: C.blue,
    borderColor: C.blue
  },
  segmentText: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text
  },
  hero: {
    backgroundColor: C.navy,
    borderRadius: 18,
    padding: 25,
    gap: 13
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: '#C5FF28'
  },
  heroTitle: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -1.3,
    color: 'white'
  },
  heroBody: {
    fontSize: 13,
    color: '#D9DECF',
    lineHeight: 22
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    borderColor: C.line,
    borderWidth: 1,
    padding: 18,
    gap: 13
  },
  button: {
    backgroundColor: C.orange,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 9,
    alignItems: 'center',
    minHeight: 46
  },
  secondary: {
    backgroundColor: '#F5F5EC',
    borderWidth: 1,
    borderColor: '#DADDCF'
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.navy,
    textAlign: 'center'
  },
  field: {
    gap: 8
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: C.muted,
    letterSpacing: .6
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#cbd6e6',
    padding: 13,
    borderRadius: 8,
    fontSize: 15,
    color: C.text,
    minHeight: 46
  },
  city: {
    fontSize: 15,
    color: C.text,
    fontWeight: '500'
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  two: {
    flexDirection: 'row',
    gap: 12
  },
  spread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  choice: {
    backgroundColor: '#F5F5EC',
    padding: 12,
    borderRadius: 8
  },
  number: {
    width: 48,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 8,
    backgroundColor: 'white'
  },
  heading: {
    fontSize: 24,
    color: C.navy,
    fontWeight: '700',
    letterSpacing: -.6,
    flexShrink: 1
  },
  route: {
    fontSize: 17,
    fontWeight: '700',
    color: C.navy,
    flexShrink: 1
  },
  body: {
    fontSize: 13,
    lineHeight: 22,
    color: C.muted
  },
  small: {
    fontSize: 10,
    lineHeight: 17,
    color: C.muted
  },
  caption: {
    fontSize: 10,
    color: C.muted
  },
  heart: {
    fontSize: 27,
    color: C.blue
  },
  time: {
    fontSize: 15,
    fontWeight: '600',
    color: C.navy
  },
  price: {
    fontSize: 23,
    fontWeight: '700',
    color: C.navy
  },
  tag: {
    backgroundColor: C.blue,
    color: 'white',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 5,
    fontSize: 9
  },
  itinerary: {
    padding: 13,
    borderRadius: 8,
    backgroundColor: '#F5F5EC',
    gap: 8
  },
  status: {
    fontSize: 10,
    fontWeight: '700',
    color: C.blue,
    lineHeight: 18
  },
  request: {
    padding: 15,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.line,
    gap: 10,
    backgroundColor: '#F5F5EC'
  },
  driverName: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text
  },
  notice: {
    padding: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DADDCF',
    backgroundColor: '#EDF2DF',
    gap: 10
  },
  footnote: {
    fontSize: 9,
    color: C.muted,
    lineHeight: 17
  },
  bottom: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: C.line
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 58,
    gap: 3
  },
  bottomIcon: {
    fontSize: 21,
    color: C.muted
  },
  bottomText: {
    fontSize: 10,
    color: C.muted
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    gap: 15
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: C.navy,
    flexShrink: 1
  },
  close: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 22
  },
  error: {
    backgroundColor: '#fff0ea',
    borderWidth: 1,
    borderColor: '#e5b7a5',
    padding: 15,
    borderRadius: 9,
    gap: 10
  },
  errorText: {
    color: '#942d17',
    fontSize: 12,
    lineHeight: 20
  },
  map: {
    height: 250,
    borderRadius: 10
  }
});
