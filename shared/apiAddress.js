function resolveApiUrl({ override, platform, webOrigin, hostUri }) {
  if (typeof override === 'string' && override.trim()) return override.trim().replace(/\/+$/, '');
  if (platform === 'web') {
    const origin = new URL(webOrigin);
    return `${origin.protocol}//${origin.hostname}:3001`;
  }
  if (hostUri) {
    try {
      const host = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname;
      if (host) return `http://${host}:3001`;
    } catch { /* No development host is available in some standalone builds. */ }
  }
  return 'http://localhost:3001';
}
module.exports = { resolveApiUrl };
