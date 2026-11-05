// Tests for de fejl, der er rettet i appen. Hver test svarer til én commit, så en fejl kan spores
// tilbage til rettelsen. Testene bruger en database i hukommelsen og rører ikke rigtige data.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('./index.cjs');
const { profilePayload } = require('../shared/profile');

async function setup() {
  const server = createServer(':memory:', { seedDemo: false });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(route, method = 'GET', body, token, expected = 200) {
    const res = await fetch(base + route, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const value = await res.json();
    assert.equal(res.status, expected, `${method} ${route}: ${JSON.stringify(value)}`);
    return value;
  }
  const register = (email, role, birthDate = '2000-01-01') =>
    request('/auth/register', 'POST', {
      email,
      name: email.split('@')[0],
      role,
      phone: '12345678',
      birthDate,
      parentPhone: '11223344',
      password: 'secure-password-123',
    });
  const close = () =>
    new Promise(resolve => {
      server.closeAllConnections();
      server.close(resolve);
    });
  return { request, register, close };
}

test('profil: formularen sender ikke opslag og billeder med, så den kan gemmes', async () => {
  const { request, register, close } = await setup();
  try {
    const young = await register('ung@example.dk', 'young');
    const image = 'data:image/jpeg;base64,' + 'A'.repeat(6000000);
    for (let i = 0; i < 3; i++)
      await request('/posts', 'POST', { text: `Opslag ${i}`, image }, young.token, 201);
    const profile = await request('/profiles/me', 'GET', null, young.token);
    const draft = { ...profile, headline: 'Ny overskrift', skillsText: 'Service, , Teamwork' };
    const payload = profilePayload(draft);
    assert.equal(payload.posts, undefined);
    assert.deepEqual(payload.skills, ['Service', 'Teamwork']);
    await request('/profiles/me', 'PUT', payload, young.token);
    const saved = await request('/profiles/me', 'GET', null, young.token);
    assert.equal(saved.headline, 'Ny overskrift');
    assert.equal(saved.posts.length, 3);
  } finally {
    await close();
  }
});
