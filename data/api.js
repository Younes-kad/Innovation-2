import { Platform } from 'react-native';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? `${window.location.protocol}//${window.location.hostname}:3001` : 'http://localhost:3001');
let token = '';
export const setToken = value => { token = value; };
export async function api(path, method = 'GET', body) {
  let response;
  try { response = await fetch(`${API_URL}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }); }
  catch { throw new Error('Ingen forbindelse til serveren. Kontrollér at backend kører, og at API-adressen er korrekt.'); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Handlingen kunne ikke gennemføres.');
  return data;
}
