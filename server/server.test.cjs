const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { createServer } = require('./index.cjs');
const { DatabaseSync } = require('node:sqlite');
const { ageOnDate, normalizePhone, todayISO } = require('../shared/registration');
const { validateTerms, durations } = require('../shared/employment');

test('employment terms: duration, month boundaries and required wage/hours', () => {
  const base = {
    wage: '135,50',
    wageUnit: 'kr./time',
    hoursPerWeek: '7,5',
    duration: '3 måneder',
    startDate: '2026-01-31',
    endDate: '2026-02-02',
  };
  assert.equal(validateTerms(base).endDate, '2026-04-30');
  assert.equal(validateTerms(base).wage, 135.5);
  assert.equal(validateTerms(base).hoursPerWeek, 7.5);
  for (const duration of durations)
    assert.equal(validateTerms({ ...base, duration }).duration, duration);
  assert.equal(
    validateTerms({ ...base, duration: '1 år', startDate: '2028-02-29' }).endDate,
    '2029-02-28'
  );
  for (const fields of [
    { wage: '' },
    { wage: -1 },
    { wage: 'NaN' },
    { wage: 1.555 },
    { hoursPerWeek: 169 },
    { hoursPerWeek: 0 },
    { hoursPerWeek: '' },
    { wageUnit: 'ukendt' },
    { duration: '2 år' },
    { startDate: '2026-02-30' },
    { duration: 'Engangsopgave', endDate: '' },
    { duration: 'Miniprojekt', endDate: '2025-01-01' },
  ])
    assert.throws(() => validateTerms({ ...base, ...fields }));
});

test('registration validation: age boundary, invalid dates and phone formats', () => {
  assert.equal(ageOnDate('2008-11-03', '2026-11-03'), 18);
  assert.equal(ageOnDate('2008-11-04', '2026-11-03'), 17);
  assert.equal(ageOnDate('2008-11-02', '2026-11-03'), 18);
  for (const date of [
    '',
    '2010-02-30',
    '2011-02-29',
    '2030-01-01',
    '2010-13-01',
    '2010-1-01',
    null,
  ])
    assert.equal(ageOnDate(date, '2026-11-03'), null);
  assert.equal(ageOnDate('2012-02-29', '2026-11-03'), 14);
  assert.equal(normalizePhone('12 34 56 78'), '12345678');
  assert.equal(normalizePhone('0045 12 34 56 78'), '+4512345678');
  assert.equal(normalizePhone('+44 (1234) 567890'), '+441234567890');
  for (const phone of ['', '123', 'ring12345678', '+00000000', '123456789', null])
    assert.equal(normalizePhone(phone), null);
});

test('profile → application → company → hire, privacy, isolation and restart persistence', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'foothold-test-'));
  const dbPath = path.join(directory, 'test.sqlite');
  let server = createServer(dbPath, { seedDemo: false });
  async function start() {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  }
  let base = await start();
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
  const register = (email, name, role) =>
    request('/auth/register', 'POST', {
      email,
      name,
      role,
      phone: '12345678',
      birthDate: '2000-01-01',
      password: 'secure-password-123',
    });
  try {
    const registration = {
      email: 'minor@example.dk',
      name: 'Under 18',
      role: 'young',
      phone: '12 34 56 78',
      birthDate: `${Number(todayISO().slice(0, 4)) - 16}-01-01`,
      password: 'secure-password-123',
    };
    await request('/auth/register', 'POST', { ...registration, phone: '' }, null, 400);
    await request('/auth/register', 'POST', { ...registration, birthDate: '' }, null, 400);
    await request(
      '/auth/register',
      'POST',
      { ...registration, birthDate: '2010-02-30' },
      null,
      400
    );
    await request('/auth/register', 'POST', registration, null, 400);
    await request('/auth/register', 'POST', { ...registration, parentPhone: '123' }, null, 400);
    const minor = await request('/auth/register', 'POST', {
      ...registration,
      parentPhone: '+45 87 65 43 21',
    });
    assert.equal(minor.user.phone, undefined);
    assert.equal(minor.user.birthDate, undefined);
    assert.equal(minor.user.parentPhone, undefined);
    const me = await request('/auth/me', 'GET', null, minor.token);
    assert.equal(me.phone, undefined);
    assert.equal((await request('/profiles/me', 'GET', null, minor.token)).parentPhone, undefined);
    await request(
      '/auth/register',
      'POST',
      { ...registration, email: 'company-phone@example.dk', role: 'company', phone: '' },
      null,
      400
    );
    const young = await register('young@example.dk', 'Ung Bruger', 'young');
    const otherYoung = await register('other@example.dk', 'Anden Ung', 'young');
    const company = await register('company@example.dk', 'Virksomhed A', 'company');
    const otherCompany = await register('company2@example.dk', 'Virksomhed B', 'company');
    await request('/jobs', 'GET', null, null, 401);
    await request(
      '/auth/login',
      'POST',
      { email: 'young@example.dk', password: 'wrong' },
      null,
      401
    );
    const p = await request('/profiles/me', 'GET', null, young.token);
    assert.deepEqual(Object.values(p.visibility), [false, false, false, false]);
    const image = 'data:image/png;base64,iVBORw0KGgo=';
    const entry = {
      id: 'experience1',
      organization: 'Butik',
      title: 'Butiksmedhjælper',
      start: '2026-01',
      end: '',
      description: 'Kundeservice',
      type: 'Job',
    };
    const updated = {
      ...p,
      name: 'Ung Ansøger',
      headline: 'Elev med interesse for salg',
      avatar: image,
      about: 'Privat beskrivelse',
      experiences: [entry],
      education: [{ ...entry, id: 'school', title: 'Gymnasieelev' }],
      skills: ['Kundeservice'],
      visibility: { ...p.visibility, experiences: true },
    };
    await request('/profiles/me', 'PUT', updated, young.token);
    assert.equal(
      (await request('/profiles/me', 'GET', null, young.token)).experiences[0].title,
      entry.title
    );
    await request(
      '/profiles/me',
      'PUT',
      { ...updated, experiences: [{ ...entry, end: '2025-01' }] },
      young.token,
      400
    );
    await request(
      '/profiles/me',
      'PUT',
      { ...updated, avatar: 'javascript:alert(1)' },
      young.token,
      400
    );
    await request(
      '/posts',
      'POST',
      { text: 'Privat refleksion', image, shared: false },
      young.token,
      201
    );
    await request(
      '/posts',
      'POST',
      { text: 'Jeg har lært noget nyt', shared: true },
      young.token,
      201
    );
    const owned = await request('/profiles/me', 'GET', null, young.token);
    assert.equal(owned.posts[0].text, 'Jeg har lært noget nyt');
    const privatePost = owned.posts.find(post => !post.shared);
    await request(
      `/posts/${privatePost.id}`,
      'PUT',
      { text: 'Mit redigerede opslag', image, shared: false },
      young.token
    );
    await request(`/posts/${privatePost.id}`, 'DELETE', null, otherYoung.token, 404);
    await request(`/posts/${privatePost.id}`, 'PUT', { text: 'Overtaget' }, otherYoung.token, 404);
    await request(`/posts/${privatePost.id}`, 'PUT', { text: 'Overtaget' }, company.token, 404);
    await request(`/profiles/${young.user.id}`, 'GET', null, otherCompany.token, 403);
    const job = await request(
      '/jobs',
      'POST',
      { title: 'Butiksmedhjælper', description: 'Hjælp kunder', location: 'København' },
      company.token,
      201
    );
    await request('/jobs', 'POST', { title: 'Test' }, young.token, 403);
    await request(
      '/applications',
      'POST',
      {
        jobId: job.id,
        name: 'Ung Ansøger',
        email: 'young@example.dk',
        about: 'Jeg vil gerne arbejde hos jer.',
      },
      young.token,
      201
    );
    await request(
      '/applications',
      'POST',
      { jobId: job.id, name: 'Ung', email: 'young@example.dk', about: 'Igen' },
      young.token,
      409
    );
    const a = (await request('/applications', 'GET', null, company.token))[0];
    assert.equal(a.userId, young.user.id);
    assert.equal(a.title, job.title);
    assert.equal(a.status, 'Modtaget');
    assert.equal(a.avatar, '');
    const applicationBadge = await request('/notifications', 'GET', null, company.token);
    assert.equal(applicationBadge.counts.jobs, 1);
    assert.equal((await request('/notifications', 'GET', null, otherCompany.token)).counts.jobs, 0);
    await request(
      '/notifications/read',
      'POST',
      { section: 'jobs', cursor: applicationBadge.cursors.jobs },
      company.token
    );
    assert.equal((await request('/notifications', 'GET', null, company.token)).counts.jobs, 0);
    assert.equal((await request('/applications', 'GET', null, otherCompany.token)).length, 0);
    const visible = await request(`/profiles/${young.user.id}`, 'GET', null, company.token);
    assert.equal(visible.about, undefined);
    assert.equal(visible.avatar, undefined);
    assert.equal(visible.experiences.length, 1);
    assert.equal(visible.education.length, 0);
    assert.equal(visible.skills.length, 0);
    assert.equal(visible.posts.length, 1);
    assert.equal(visible.posts[0].text, 'Jeg har lært noget nyt');
    await request(`/profiles/${young.user.id}`, 'PUT', updated, company.token, 403);
    await request(`/profiles/${young.user.id}`, 'GET', null, otherYoung.token, 403);
    await request(`/profiles/${young.user.id}`, 'PUT', updated, otherYoung.token, 403);
    await request(
      `/applications/${a.id}`,
      'PATCH',
      { status: 'Accepteret' },
      otherCompany.token,
      404
    );
    await request('/employees', 'POST', { applicationId: a.id }, company.token, 400);
    await request(`/applications/${a.id}`, 'PATCH', { status: 'Under behandling' }, company.token);
    await request(`/applications/${a.id}`, 'PATCH', { status: 'Ugyldig' }, company.token, 400);
    await request(`/applications/${a.id}`, 'PATCH', { status: 'Afvist' }, company.token);
    await request(`/applications/${a.id}`, 'PATCH', { status: 'Accepteret' }, company.token);
    const terms = {
      wage: '135,50',
      wageUnit: 'kr./time',
      hoursPerWeek: '8',
      duration: '3 måneder',
      startDate: '2026-12-01',
    };
    // Direct employer-side registration no longer bypasses the employee's consent.
    await request('/employees', 'POST', { applicationId: a.id }, company.token, 400);
    await request(
      '/employment-offers',
      'POST',
      { applicationId: a.id, ...terms },
      young.token,
      403
    );
    await request(
      '/employment-offers',
      'POST',
      { applicationId: a.id, ...terms },
      otherCompany.token,
      404
    );
    await request('/employment-offers', 'POST', { applicationId: a.id }, company.token, 400);
    await request(
      '/employment-offers',
      'POST',
      { applicationId: a.id, ...terms, hoursPerWeek: 169 },
      company.token,
      400
    );
    const offer = await request(
      '/employment-offers',
      'POST',
      { applicationId: a.id, ...terms },
      company.token,
      201
    );
    assert.equal((await request('/employees', 'GET', null, company.token)).length, 0);
    assert.equal((await request('/profiles/me', 'GET', null, young.token)).experiences.length, 1);
    assert.equal((await request('/employment-offers', 'GET', null, otherCompany.token)).length, 0);
    assert.equal((await request('/employment-offers', 'GET', null, otherYoung.token)).length, 0);
    const received = (await request('/employment-offers', 'GET', null, young.token))[0];
    assert.equal((await request('/notifications', 'GET', null, young.token)).counts.profile, 1);
    assert.equal(
      (await request('/notifications', 'GET', null, otherYoung.token)).counts.profile,
      0
    );
    assert.equal(received.status, 'pending');
    assert.equal(received.terms.wage, 135.5);
    assert.equal(received.terms.endDate, '2027-03-01');
    await request(
      '/employment-offers',
      'POST',
      { applicationId: a.id, ...terms },
      company.token,
      409
    );
    await request(
      `/employment-offers/${offer.id}`,
      'POST',
      { decision: 'accepted', addToProfile: true },
      company.token,
      403
    );
    await request(
      `/employment-offers/${offer.id}`,
      'POST',
      { decision: 'accepted', addToProfile: true },
      otherYoung.token,
      404
    );
    await request(`/employment-offers/${offer.id}/profile`, 'POST', {}, young.token, 409);
    await request(
      `/employment-offers/${offer.id}`,
      'POST',
      { decision: 'accepted' },
      young.token,
      400
    );
    await request(
      `/employment-offers/${offer.id}`,
      'POST',
      { decision: 'accepted', addToProfile: false, wage: 1 },
      young.token
    );
    assert.equal((await request('/notifications', 'GET', null, company.token)).counts.profile, 1);
    assert.equal(
      (await request('/employment-offers', 'GET', null, young.token))[0].terms.wage,
      135.5
    );
    assert.equal((await request('/profiles/me', 'GET', null, young.token)).experiences.length, 1);
    await request(
      `/employment-offers/${offer.id}`,
      'POST',
      { decision: 'declined' },
      young.token,
      409
    );
    await request(`/employment-offers/${offer.id}/profile`, 'POST', {}, young.token);
    await request(`/employment-offers/${offer.id}/profile`, 'POST', {}, young.token);
    const added = await request('/profiles/me', 'GET', null, young.token);
    assert.equal(added.experiences.length, 2);
    assert.deepEqual(added.visibility, updated.visibility);
    const experience = added.experiences.find(e => e.id === `employment-${offer.id}`);
    assert.equal(experience.organization, 'Virksomhed A');
    assert.equal(experience.wage, undefined);
    assert.equal(experience.hoursPerWeek, undefined);
    assert.equal(experience.description, '');
    assert.equal((await request('/employees', 'GET', null, company.token)).length, 1);
    assert.equal((await request('/employees', 'GET', null, otherCompany.token)).length, 0);
    // A declined offer creates no employee; a new project offer can be accepted with immediate profile inclusion.
    await request(
      '/applications',
      'POST',
      { jobId: job.id, name: 'Anden Ung', email: 'other@example.dk', about: 'Jeg søger også.' },
      otherYoung.token,
      201
    );
    const a2 = (await request('/applications', 'GET', null, company.token)).find(
      a => a.userId === otherYoung.user.id
    );
    await request(
      '/employment-offers',
      'POST',
      { applicationId: a2.id, ...terms },
      company.token,
      400
    );
    await request(`/applications/${a2.id}`, 'PATCH', { status: 'Accepteret' }, company.token);
    const declined = await request(
      '/employment-offers',
      'POST',
      { applicationId: a2.id, ...terms },
      company.token,
      201
    );
    await request(
      `/employment-offers/${declined.id}`,
      'POST',
      { decision: 'declined' },
      otherYoung.token
    );
    assert.equal((await request('/employees', 'GET', null, company.token)).length, 1);
    await request(`/employment-offers/${declined.id}/profile`, 'POST', {}, otherYoung.token, 409);
    const project = await request(
      '/employment-offers',
      'POST',
      {
        applicationId: a2.id,
        ...terms,
        duration: 'Miniprojekt',
        wageUnit: 'kr. i alt',
        endDate: '2026-12-15',
      },
      company.token,
      201
    );
    await request(
      `/employment-offers/${project.id}`,
      'POST',
      { decision: 'accepted', addToProfile: true },
      otherYoung.token
    );
    const p2 = await request('/profiles/me', 'GET', null, otherYoung.token);
    assert.equal(p2.experiences.length, 1);
    assert.equal(p2.experiences[0].type, 'Projekt');
    assert.equal(p2.visibility.experiences, false);
    const companyView = await request(
      `/profiles/${otherYoung.user.id}`,
      'GET',
      null,
      company.token
    );
    assert.equal(companyView.experiences.length, 0);
    assert.equal(companyView.terms, undefined);
    await request(
      '/profiles/me',
      'PUT',
      {
        ...updated,
        visibility: { presentation: true, experiences: true, education: true, skills: true },
      },
      young.token
    );
    const shared = await request(`/profiles/${young.user.id}`, 'GET', null, company.token);
    assert.equal(shared.about, updated.about);
    assert.equal(shared.skills[0], 'Kundeservice');
    await request('/profiles/me', 'PUT', updated, young.token);
    assert.equal(
      (await request(`/profiles/${young.user.id}`, 'GET', null, company.token)).about,
      undefined
    );
    await request(`/posts/${privatePost.id}`, 'DELETE', null, young.token);
    assert.equal((await request('/profiles/me', 'GET', null, young.token)).posts.length, 1);
    const legacy = {
      jobs: [{ id: 'local-old', title: 'Gammelt job', description: 'Bevares', location: 'Aarhus' }],
    };
    await request('/jobs/import', 'POST', legacy, company.token);
    await request('/jobs/import', 'POST', legacy, company.token);
    assert.equal((await request('/jobs', 'GET', null, company.token)).length, 2);
    await new Promise(resolve => server.close(resolve));
    const stored = new DatabaseSync(dbPath, { readOnly: true });
    const contact = stored
      .prepare('SELECT * FROM user_contacts WHERE user_id=?')
      .get(minor.user.id);
    assert.equal(contact.phone, '12345678');
    assert.equal(contact.parent_phone, '+4587654321');
    assert.equal(contact.birth_date, registration.birthDate);
    assert.equal(
      stored.prepare('SELECT parent_phone FROM user_contacts WHERE user_id=?').get(young.user.id)
        .parent_phone,
      null
    );
    stored.close();
    server = createServer(dbPath, { seedDemo: false });
    base = await start();
    const persistedEmployees = await request('/employees', 'GET', null, company.token);
    assert.equal(persistedEmployees.length, 2);
    assert.ok(persistedEmployees.some(e => e.userId === young.user.id));
    const persistedOffers = await request('/employment-offers', 'GET', null, young.token);
    assert.equal((await request('/notifications', 'GET', null, company.token)).counts.jobs, 1);
    assert.equal(persistedOffers[0].status, 'accepted');
    assert.equal(persistedOffers[0].addedToProfile, true);
    assert.equal(persistedOffers[0].terms.wage, 135.5);
    assert.ok(
      (await request('/applications', 'GET', null, company.token)).every(
        a => a.status === 'Accepteret'
      )
    );
    assert.equal((await request('/profiles/me', 'GET', null, young.token)).experiences.length, 1);
    await request('/auth/logout', 'POST', {}, young.token);
    await request('/profiles/me', 'GET', null, young.token, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  }
});
