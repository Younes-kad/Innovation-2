// Tests for de fejl, der er rettet i appen. Hver test svarer til én commit, så en fejl kan spores
// tilbage til rettelsen. Testene bruger en database i hukommelsen og rører ikke rigtige data.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('./index.cjs');
const { profilePayload } = require('../shared/profile');
const { DatabaseSync } = require('node:sqlite');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

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

// Fælles forløb: virksomhed, ung og en accepteret ansøgning på et nyt job.
const terms = {
  wage: 100,
  wageUnit: 'kr./time',
  hoursPerWeek: 8,
  duration: '3 måneder',
  startDate: '2030-01-07',
};
async function acceptedApplication(request, company, young, title = 'Job') {
  const job = await request(
    '/jobs',
    'POST',
    { title, description: 'Beskrivelse', location: 'København' },
    company.token,
    201
  );
  await request(
    '/applications',
    'POST',
    { jobId: job.id, name: 'Ung', email: 'ung@example.dk', about: 'Jeg vil gerne.' },
    young.token,
    201
  );
  const application = (await request('/applications', 'GET', null, company.token)).find(
    a => a.jobId === job.id
  );
  await request(
    `/applications/${application.id}`,
    'PATCH',
    { status: 'Accepteret' },
    company.token
  );
  return application;
}

test('tilbud: afvises ansøgningen, trækkes tilbuddet tilbage og kan ikke godkendes', async () => {
  const { request, register, close } = await setup();
  try {
    const company = await register('firma@example.dk', 'company');
    const young = await register('ung@example.dk', 'young');
    const application = await acceptedApplication(request, company, young);
    const offer = await request(
      '/employment-offers',
      'POST',
      { applicationId: application.id, ...terms },
      company.token,
      201
    );
    const before = (await request('/notifications', 'GET', null, young.token)).counts.profile;
    await request(`/applications/${application.id}`, 'PATCH', { status: 'Afvist' }, company.token);
    const [withdrawn] = await request('/employment-offers', 'GET', null, young.token);
    assert.equal(withdrawn.status, 'withdrawn');
    assert.equal(
      (await request('/notifications', 'GET', null, young.token)).counts.profile,
      before + 1
    );
    await request(
      `/employment-offers/${offer.id}`,
      'POST',
      { decision: 'accepted', addToProfile: false },
      young.token,
      409
    );
    assert.equal((await request('/employees', 'GET', null, company.token)).length, 0);
    // Når ansøgningen accepteres igen, kan virksomheden sende et nyt tilbud.
    await request(
      `/applications/${application.id}`,
      'PATCH',
      { status: 'Accepteret' },
      company.token
    );
    const second = await request(
      '/employment-offers',
      'POST',
      { applicationId: application.id, ...terms },
      company.token,
      201
    );
    await request(
      `/employment-offers/${second.id}`,
      'POST',
      { decision: 'accepted', addToProfile: false },
      young.token
    );
    // En ansat persons ansøgning kan ikke længere ændres.
    await request(
      `/applications/${application.id}`,
      'PATCH',
      { status: 'Afvist' },
      company.token,
      409
    );
  } finally {
    await close();
  }
});

test('genansættelse: samme person kan ansættes på et andet job, men ikke to gange på samme', async () => {
  const { request, register, close } = await setup();
  try {
    const company = await register('firma@example.dk', 'company');
    const young = await register('ung@example.dk', 'young');
    const first = await acceptedApplication(request, company, young, 'Job 1');
    const offer = await request(
      '/employment-offers',
      'POST',
      { applicationId: first.id, ...terms },
      company.token,
      201
    );
    await request(
      `/employment-offers/${offer.id}`,
      'POST',
      { decision: 'accepted', addToProfile: false },
      young.token
    );
    await request(
      '/employment-offers',
      'POST',
      { applicationId: first.id, ...terms },
      company.token,
      409
    );
    const second = await acceptedApplication(request, company, young, 'Job 2');
    const again = await request(
      '/employment-offers',
      'POST',
      { applicationId: second.id, ...terms },
      company.token,
      201
    );
    await request(
      `/employment-offers/${again.id}`,
      'POST',
      { decision: 'accepted', addToProfile: false },
      young.token
    );
    const employees = await request('/employees', 'GET', null, company.token);
    assert.equal(employees.length, 2);
    assert.notEqual(employees[0].jobId, employees[1].jobId);
    const offers = await request('/employment-offers', 'GET', null, company.token);
    assert.ok(employees.every(e => offers.some(o => o.jobId === e.jobId)));
  } finally {
    await close();
  }
});

test('genansættelse: en gammel database får den nye regel, og data bevares', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foothold-migration-'));
  const dbPath = path.join(directory, 'gammel.sqlite');
  const old = new DatabaseSync(dbPath);
  old.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,salt TEXT NOT NULL,role TEXT NOT NULL,name TEXT NOT NULL);
    CREATE TABLE jobs(id TEXT PRIMARY KEY,company_id TEXT REFERENCES users(id),data TEXT NOT NULL);
    CREATE TABLE employees(id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES users(id),user_id TEXT NOT NULL REFERENCES users(id),job_id TEXT NOT NULL REFERENCES jobs(id),created_at TEXT NOT NULL,UNIQUE(company_id,user_id));
    INSERT INTO users VALUES('c','c@x.dk','p','s','company','C'),('y','y@x.dk','p','s','young','Y');
    INSERT INTO jobs VALUES('j','c','{}');
    INSERT INTO employees VALUES('e','c','y','j','2026-01-01');`);
  old.close();
  const server = createServer(dbPath, { seedDemo: false });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  await new Promise(resolve => server.close(resolve));
  const migrated = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const { sql } = migrated.prepare("SELECT sql FROM sqlite_master WHERE name='employees'").get();
    assert.ok(sql.includes('UNIQUE(company_id,user_id,job_id)'));
    assert.equal(migrated.prepare('SELECT id FROM employees').get().id, 'e');
  } finally {
    migrated.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('alder: mindst 14 år for at oprette konto, og tilbud følger timegrænserne', async () => {
  const { request, register, close } = await setup();
  const yearsAgo = years => `${new Date().getUTCFullYear() - years}-01-01`;
  try {
    const signup = {
      name: 'Barn',
      role: 'young',
      phone: '12345678',
      parentPhone: '11223344',
      password: 'secure-password-123',
    };
    const refused = await request(
      '/auth/register',
      'POST',
      {
        ...signup,
        email: 'barn@example.dk',
        birthDate: `${new Date().getUTCFullYear() - 13}-12-31`,
      },
      null,
      400
    );
    assert.match(refused.error, /mindst 14 år/);
    const company = await register('firma@example.dk', 'company');
    // Start lige efter nytår, så personen har den forventede alder på startdatoen.
    const start = `${new Date().getUTCFullYear()}-01-02`;
    const fourteen = await register('fjorten@example.dk', 'young', yearsAgo(14));
    const first = await acceptedApplication(request, company, fourteen, 'Job 14');
    const offerFor = (application, hoursPerWeek, expected) =>
      request(
        '/employment-offers',
        'POST',
        { applicationId: application.id, ...terms, startDate: start, hoursPerWeek },
        company.token,
        expected
      );
    assert.match((await offerFor(first, 13, 400)).error, /højst 12 timer/);
    await offerFor(first, 12, 201);
    const sixteen = await register('seksten@example.dk', 'young', yearsAgo(16));
    const second = await acceptedApplication(request, company, sixteen, 'Job 16');
    assert.match((await offerFor(second, 41, 400)).error, /højst 40 timer/);
    await offerFor(second, 40, 201);
    const adult = await register('voksen@example.dk', 'young', yearsAgo(20));
    const third = await acceptedApplication(request, company, adult, 'Job 20');
    await offerFor(third, 45, 201);
  } finally {
    await close();
  }
});
