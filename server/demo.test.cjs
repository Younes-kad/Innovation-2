const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { createServer } = require('./index.cjs');

test('two fictional posts and two applicable jobs appear in feed; jobs only in jobs; seed is idempotent', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foothold-demo-'));
  const dbPath = path.join(directory, 'test.sqlite');
  let server = createServer(dbPath);
  async function start() { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return `http://127.0.0.1:${server.address().port}`; }
  let base = await start();
  async function req(route, method = 'GET', data, token, status = 200) {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
    const body = await response.json(); assert.equal(response.status, status, JSON.stringify(body)); return body;
  }
  try {
    const young = await req('/auth/register', 'POST', { name: 'Test Ung', email: 'demo-test@example.dk', role: 'young', password: 'test-password-123', phone: '12345678', birthDate: '2000-01-01' });
    const feed = await req('/feed', 'GET', null, young.token);
    const jobs = await req('/jobs', 'GET', null, young.token);
    assert.equal(feed.length, 4);
    assert.equal(feed.filter(p => p.fictional && p.type !== 'job').length, 2);
    assert.equal(feed.filter(p => p.type === 'job' && p.job.fictional).length, 2);
    assert.deepEqual(feed.map(p => p.type === 'job' ? 'job' : 'opslag'), ['job', 'opslag', 'job', 'opslag']);
    const authors = feed.filter(p => p.type !== 'job').map(p => p.author);
    assert.deepEqual(authors.map(a => a.name), ['Sofie Nielsen', 'Malik Jensen']);
    for (const author of authors) {
      const profile = await req(`/profiles/${author.id}`, 'GET', null, young.token);
      assert.equal(profile.fictional, true);
      assert.equal(profile.owner, false);
      assert.equal(profile.posts.length, 1);
      assert.ok(profile.about && profile.skills.length && profile.experiences.length);
      await req(`/follows/${author.id}`, 'POST', {}, young.token);
    }
    assert.equal((await req('/feed', 'GET', null, young.token)).length, 4, 'Following demo profiles must not duplicate their posts');
    assert.equal(jobs.length, 2);
    assert.ok(jobs.every(j => j.fictional && j.title && !j.demo));
    assert.deepEqual(feed.filter(p => p.type === 'job').map(p => p.job.id).sort(), jobs.map(j => j.id).sort());
    const notifications = await req('/notifications', 'GET', null, young.token);
    assert.equal(notifications.counts.feed, 4);
    await req('/notifications/read', 'POST', { section: 'feed', cursor: notifications.cursors.feed }, young.token);
    assert.equal((await req('/notifications', 'GET', null, young.token)).counts.feed, 0);
    for (const job of jobs) await req('/applications', 'POST', { jobId: job.id, name: 'Test Ung', email: 'demo-test@example.dk', about: 'Jeg prøver at søge dette fiktive job.' }, young.token, 201);
    assert.equal((await req('/applications', 'GET', null, young.token)).length, 2);
    await req('/applications', 'POST', { jobId: jobs[0].id, name: 'Test Ung', email: 'demo-test@example.dk', about: 'Igen' }, young.token, 409);
    await new Promise(resolve => server.close(resolve));
    server = createServer(dbPath); base = await start();
    assert.equal((await req('/feed', 'GET', null, young.token)).length, 4);
    assert.equal((await req('/people?q=Sofie', 'GET', null, young.token)).length, 1);
    assert.equal((await req('/jobs', 'GET', null, young.token)).length, 2);
    assert.equal((await req('/applications', 'GET', null, young.token)).length, 2);
    assert.equal((await req('/notifications', 'GET', null, young.token)).counts.feed, 0);
  } finally { await new Promise(resolve => server.close(resolve)); rmSync(directory, { recursive: true, force: true }); }
});
