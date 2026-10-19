import * as SecureStore from 'expo-secure-store';
import {createApi} from './api';
export const api=createApi({baseUrl:process.env.EXPO_PUBLIC_API_URL||'https://ridemyway.bonjour-847.workers.dev',storage:{getItem:k=>SecureStore.getItemAsync(k),setItem:(k,v)=>SecureStore.setItemAsync(k,v,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),deleteItem:k=>SecureStore.deleteItemAsync(k)}});
