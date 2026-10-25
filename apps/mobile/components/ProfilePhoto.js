import React,{useState} from 'react';
import {Image,Text} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {manipulateAsync,SaveFormat} from 'expo-image-manipulator';
import {Card,Copy,Consent,Button,ui} from './ui';
import {publicUrl} from '../lib/client';
import {t} from '../lib/i18n';
export default function ProfilePhoto({user,api,refresh}) {
  const [consent,C]=useState(false),[busy,B]=useState(false),[error,E]=useState('');
  async function select(){if(busy)return;B(true);E('');try{
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:1,exif:false});
    if(result.canceled)return;
    const asset=result.assets[0];if(asset.fileSize>10*1024*1024)throw Error('Choose a photo under 10 MB.');
    const size=Math.min(asset.width,asset.height);
    const photo=await manipulateAsync(asset.uri,[{crop:{originX:Math.floor((asset.width-size)/2),originY:Math.floor((asset.height-size)/2),width:size,height:size}},{resize:{width:256,height:256}}],{compress:.7,format:SaveFormat.JPEG,base64:true});
    if(!photo.base64||photo.base64.length>106664)throw Error('This photo is too large. Choose another image.');
    await api.request('profile/photo',{photo:'data:image/jpeg;base64,'+photo.base64,publicConsent:true});C(false);await refresh();
  }catch(e){E(e.message);}finally{B(false);}}
  async function remove(){if(busy)return;B(true);E('');try{await api.request('profile/photo',{photo:null});await refresh();}catch(e){E(e.message);}finally{B(false);}}
  return <Card><Copy heading>Profile photo · optional</Copy><Copy>Driver photos appear on listings. Passenger photos are shared with their driver. Photos are not identity verification.</Copy>{user.photoUrl&&<Image accessibilityLabel={t('Your profile photo')} source={{uri:publicUrl(user.photoUrl)}} style={{width:80,height:80,borderRadius:40}}/>}<Consent label="I understand my photo can appear on my profile and rides." value={consent} onChange={C}/>{error&&<Text accessibilityRole="alert" style={ui.error}>{t(error)}</Text>}<Button title="Choose a profile photo" disabled={busy||!consent} onPress={select}/>{user.photoUrl&&<Button title="Remove photo" secondary disabled={busy} onPress={remove}/>}</Card>;
}
