import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { resolveApiUrl } from '../shared/apiAddress';
export const API_URL = resolveApiUrl({
  override: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  webOrigin: Platform.OS === 'web' ? window.location.origin : undefined,
  hostUri: Constants.expoConfig?.hostUri,
});
let token = '';
export const setToken = value => { token = value; };
export async function api(path, method = 'GET', body) {
  let response;
  try { response = await fetch(`${API_URL}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }); }
  catch { throw new Error(`Ingen forbindelse til serveren på ${API_URL}. Kontrollér at backend kører, og at telefonen og computeren er på samme netværk.`); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Handlingen kunne ikke gennemføres.');
  return data;
}
