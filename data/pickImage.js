import * as ImagePicker from 'expo-image-picker';
export async function pickImage() {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.75 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset.base64 || asset.base64.length > 7000000) throw new Error('Vælg et billede på højst 5 MB.');
  const mime = asset.base64.startsWith('/9j/') ? 'image/jpeg' : asset.base64.startsWith('iVBORw0KGgo') ? 'image/png' : asset.base64.startsWith('UklGR') ? 'image/webp' : asset.mimeType || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('Vælg JPG, PNG eller WebP.');
  return `data:${mime};base64,${asset.base64}`;
}
