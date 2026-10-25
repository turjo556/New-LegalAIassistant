import * as SecureStore from 'expo-secure-store';
import {createApi} from './api';
import {mobileConfig} from './config';
import {getLanguage} from './i18n';
export const configuration = mobileConfig(process.env.EXPO_PUBLIC_API_URL, process.env.EXPO_PUBLIC_APP_ENV || 'development');
const storage = {
  getItem: k => SecureStore.getItemAsync(k),
  setItem: (k, v) => SecureStore.setItemAsync(k, v, {keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),
  deleteItem: k => SecureStore.deleteItemAsync(k),
};
export const api = configuration.ready
  ? createApi({baseUrl: configuration.baseUrl, storage, getLanguage})
  : {request: async () => {throw new Error(configuration.message);}, clear: async () => {}};
export function publicUrl(path) {
  if (!configuration.ready) throw new Error(configuration.message);
  const url = new URL(path, configuration.baseUrl);
  if (url.origin !== configuration.baseUrl) throw new Error('Unexpected Ridely link.');
  return url.href;
}
