const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const { randomUUID, randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { ageOnDate, normalizePhone } = require('../shared/registration');
const { validateTerms } = require('../shared/employment');

const statuses = ['Modtaget', 'Under behandling', 'Accepteret', 'Afvist'];
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const text = (value, max = 5000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const required = (value, max) => text(value, max) || fail('Udfyld alle obligatoriske felter.');
const image = value => {
  if (!value) return '';
  if (typeof value !== 'string' || value.length > 7000000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) fail('Vælg et JPG-, PNG- eller WebP-billede på højst 5 MB.');
  return value;
};
function createServer(dbPath = process.env.DB_PATH || path.join(__dirname, 'storage', 'foothold.sqlite')) {
  if (dbPath !== ':memory:') mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,salt TEXT NOT NULL,role TEXT NOT NULL,name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS user_contacts(user_id TEXT PRIMARY KEY REFERENCES users(id),phone TEXT NOT NULL,birth_date TEXT,parent_phone TEXT);
    CREATE TABLE IF NOT EXISTS profiles(user_id TEXT PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,company_id TEXT REFERENCES users(id),data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS applications(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),job_id TEXT NOT NULL REFERENCES jobs(id),company_id TEXT NOT NULL REFERENCES users(id),status TEXT NOT NULL,created_at TEXT NOT NULL,data TEXT NOT NULL,UNIQUE(user_id,job_id));
    CREATE TABLE IF NOT EXISTS employees(id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES users(id),user_id TEXT NOT NULL REFERENCES users(id),job_id TEXT NOT NULL REFERENCES jobs(id),created_at TEXT NOT NULL,UNIQUE(company_id,user_id));
    CREATE TABLE IF NOT EXISTS employment_offers(id TEXT PRIMARY KEY,application_id TEXT NOT NULL REFERENCES applications(id),company_id TEXT NOT NULL REFERENCES users(id),user_id TEXT NOT NULL REFERENCES users(id),status TEXT NOT NULL DEFAULT 'pending',terms TEXT NOT NULL,created_at TEXT NOT NULL,responded_at TEXT,added_to_profile INTEGER NOT NULL DEFAULT 0);
    CREATE UNIQUE INDEX IF NOT EXISTS one_pending_offer ON employment_offers(company_id,user_id) WHERE status='pending';
    CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS follows(follower_id TEXT NOT NULL REFERENCES users(id),followed_id TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(follower_id,followed_id));
    CREATE TABLE IF NOT EXISTS notifications(seq INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT NOT NULL REFERENCES users(id),section TEXT NOT NULL,event_key TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS notification_reads(user_id TEXT NOT NULL REFERENCES users(id),section TEXT NOT NULL,seen_seq INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,section));
    CREATE TABLE IF NOT EXISTS content_activity(seq INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT NOT NULL,content_id TEXT NOT NULL,UNIQUE(kind,content_id));
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);`);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const one = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const publicUser = user => ({ id: user.id, email: user.email, role: user.role, name: user.name });
  const getProfile = id => JSON.parse(one('SELECT data FROM profiles WHERE user_id=?', id)?.data || '{}');
  const emptyProfile = name => ({ name, headline: '', location: '', about: '', avatar: '', discoverable: false, experiences: [], education: [], skills: [], visibility: { presentation: false, experiences: false, education: false, skills: false } });
  for (const u of all('SELECT id,name FROM users WHERE id NOT IN (SELECT user_id FROM profiles)')) run('INSERT INTO profiles VALUES(?,?)', u.id, JSON.stringify(emptyProfile(u.name)));
  const recordContent = (kind, id) => run('INSERT OR IGNORE INTO content_activity(kind,content_id) VALUES(?,?)', kind, id);
  for (const p of all('SELECT id FROM posts ORDER BY rowid')) recordContent('post', p.id);
  for (const j of all('SELECT id FROM jobs ORDER BY rowid')) recordContent('job', j.id);
  const notify = (id, section, key) => run('INSERT OR IGNORE INTO notifications(user_id,section,event_key) VALUES(?,?,?)', id, section, key);
  for (const a of all('SELECT id,company_id FROM applications')) notify(a.company_id, 'jobs', `application:${a.id}`);
  for (const o of all('SELECT * FROM employment_offers')) { notify(o.user_id, 'profile', `offer:${o.id}`); if (o.status !== 'pending') notify(o.company_id, 'profile', `response:${o.id}`); }
  const related = (viewer, id) => viewer.role === 'company' && (one('SELECT id FROM applications WHERE user_id=? AND company_id=?', id, viewer.id) || one('SELECT id FROM employees WHERE user_id=? AND company_id=?', id, viewer.id));
  const canFind = (viewer, id) => id === viewer.id || getProfile(id).discoverable === true || !!related(viewer, id);
  function visiblePosts(viewer, id, onlyFollowed = false) {
    const rows = id ? all("SELECT activity.seq,posts.* FROM posts JOIN content_activity activity ON activity.kind='post' AND activity.content_id=posts.id WHERE user_id=? ORDER BY activity.seq DESC", id) : all("SELECT activity.seq,posts.* FROM posts JOIN follows ON follows.followed_id=posts.user_id JOIN content_activity activity ON activity.kind='post' AND activity.content_id=posts.id WHERE follows.follower_id=? ORDER BY activity.seq DESC", viewer.id);
    return rows.filter(row => {
      if (row.user_id === viewer.id) return !onlyFollowed;
      const p = getProfile(row.user_id), post = JSON.parse(row.data);
      return p.discoverable === true && post.followers === true && !!one('SELECT 1 FROM follows WHERE follower_id=? AND followed_id=?', viewer.id, row.user_id) || !!related(viewer, row.user_id) && post.shared === true;
    }).map(row => {
      const p = getProfile(row.user_id), author = one('SELECT id,name,role FROM users WHERE id=?', row.user_id);
      return { ...JSON.parse(row.data), id: row.id, seq: row.seq, createdAt: row.created_at, author: { ...author, avatar: p.discoverable || p.visibility?.presentation || row.user_id === viewer.id ? p.avatar : '', headline: p.discoverable ? p.headline : '' } };
    });
  }
  function notificationState(viewer) {
    const seen = Object.fromEntries(all('SELECT section,seen_seq FROM notification_reads WHERE user_id=?', viewer.id).map(r => [r.section,r.seen_seq]));
    const feed = visiblePosts(viewer, null, true);
    const maxNotice = one('SELECT COALESCE(MAX(seq),0) AS seq FROM notifications WHERE user_id=?', viewer.id).seq;
    const jobsCursor = viewer.role === 'young' ? one("SELECT COALESCE(MAX(seq),0) AS seq FROM content_activity WHERE kind='job'").seq : maxNotice;
    return { counts: { feed: feed.filter(p => p.seq > (seen.feed || 0)).length, jobs: viewer.role === 'young' ? one("SELECT count(*) AS n FROM jobs JOIN content_activity activity ON activity.kind='job' AND activity.content_id=jobs.id WHERE activity.seq>?", seen.jobs || 0).n : one("SELECT count(*) AS n FROM notifications WHERE user_id=? AND section='jobs' AND seq>?", viewer.id, seen.jobs || 0).n, profile: one("SELECT count(*) AS n FROM notifications WHERE user_id=? AND section='profile' AND seq>?", viewer.id, seen.profile || 0).n }, cursors: { feed: one("SELECT COALESCE(MAX(seq),0) AS seq FROM content_activity WHERE kind='post'").seq, jobs: jobsCursor, profile: maxNotice } };
  }
  const role = (user, expected) => { if (user.role !== expected) fail('Du har ikke adgang til denne handling.', 403); };
  const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8081,http://localhost:19006').split(',');
  const limits = new Map();
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (origins.includes(req.headers.origin)) res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    const reply = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = url.pathname;
      const method = req.method;
      let body = {};
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 15000000) fail('Indholdet er for stort.', 413); chunks.push(chunk); }
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { fail('Ugyldigt JSON.'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Ugyldige data.');
      }
      if (route === '/health' && method === 'GET') return reply({ ok: true });
      if (['/auth/register', '/auth/login'].includes(route) && method === 'POST') {
        const key = req.socket.remoteAddress;
        const now = Date.now();
        const bucket = limits.get(key) || { count: 0, until: now + 60000 };
        if (bucket.until < now) { bucket.count = 0; bucket.until = now + 60000; }
        if (++bucket.count > 30) fail('For mange forsøg. Vent et minut.', 429);
        limits.set(key, bucket);
        const email = required(body.email, 254).toLowerCase();
        const password = required(body.password, 256);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Skriv en gyldig e-mail.');
        let user = one('SELECT * FROM users WHERE email=?', email);
        if (route === '/auth/register') {
          if (user) fail('E-mailadressen er allerede registreret.', 409);
          if (password.length < 10) fail('Adgangskoden skal have mindst 10 tegn.');
          if (!['young', 'company'].includes(body.role)) fail('Vælg en gyldig rolle.');
          const phone = normalizePhone(body.phone);
          if (!phone) fail('Skriv et gyldigt telefonnummer: 8 cifre eller med landekode, fx +45.');
          const age = body.role === 'young' ? ageOnDate(body.birthDate) : null;
          if (body.role === 'young' && age === null) fail('Skriv en gyldig fødselsdato som ÅÅÅÅ-MM-DD.');
          const parentPhone = body.role === 'young' && age < 18 ? normalizePhone(body.parentPhone) : null;
          if (body.role === 'young' && age < 18 && !parentPhone) fail('Når du er under 18, skal du også angive en forælders telefonnummer.');
          const id = randomUUID(), salt = randomBytes(16).toString('hex'), name = required(body.name, 120);
          const passwordHash = scryptSync(password, salt, 64).toString('hex');
          db.exec('BEGIN');
          try {
            run('INSERT INTO users VALUES(?,?,?,?,?,?)', id, email, passwordHash, salt, body.role, name);
            run('INSERT INTO user_contacts VALUES(?,?,?,?)', id, phone, body.role === 'young' ? body.birthDate : null, parentPhone);
            run('INSERT INTO profiles VALUES(?,?)', id, JSON.stringify(emptyProfile(name)));
            db.exec('COMMIT');
          } catch (error) { db.exec('ROLLBACK'); throw error; }
          user = one('SELECT * FROM users WHERE id=?', id);
        } else {
          if (!user || !timingSafeEqual(scryptSync(password, user.salt, 64), Buffer.from(user.password, 'hex'))) fail('Forkert e-mail eller adgangskode.', 401);
        }
        run('DELETE FROM sessions WHERE expires < ?', Date.now());
        const token = randomBytes(32).toString('hex');
        run('INSERT INTO sessions VALUES(?,?,?)', token, user.id, Date.now() + 86400000);
        return reply({ token, user: publicUser(user) });
      }
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      const user = one('SELECT users.* FROM users JOIN sessions ON users.id=sessions.user_id WHERE token=? AND expires>?', token, Date.now());
      if (!user) fail('Log ind for at fortsætte.', 401);
      if (route === '/auth/me' && method === 'GET') return reply(publicUser(user));
      if (route === '/auth/logout' && method === 'POST') { run('DELETE FROM sessions WHERE token=?', token); return reply({ ok: true }); }
      if (route === '/notifications' && method === 'GET') return reply(notificationState(user));
      if (route === '/notifications/read' && method === 'POST') {
        if (!['feed','jobs','profile'].includes(body.section) || !Number.isSafeInteger(body.cursor) || body.cursor < 0 || body.cursor > notificationState(user).cursors[body.section]) fail('Ugyldig læsemarkering.');
        run('INSERT INTO notification_reads VALUES(?,?,?) ON CONFLICT(user_id,section) DO UPDATE SET seen_seq=MAX(seen_seq,excluded.seen_seq)', user.id, body.section, body.cursor);
        return reply({ ok: true });
      }
      if (route === '/feed' && method === 'GET') return reply(visiblePosts(user, null, true));
      if (route === '/people' && method === 'GET') {
        const q = text(url.searchParams.get('q'), 80).toLocaleLowerCase('da-DK');
        return reply(all('SELECT id,name,role FROM users WHERE id<>?', user.id).filter(u => canFind(user, u.id) && (!q || u.name.toLocaleLowerCase('da-DK').includes(q))).slice(0,100).map(u => { const p = getProfile(u.id); return { ...u, avatar: p.discoverable || p.visibility?.presentation ? p.avatar : '', headline: p.discoverable ? p.headline : '', following: !!one('SELECT 1 FROM follows WHERE follower_id=? AND followed_id=?', user.id, u.id) }; }));
      }
      const followMatch = route.match(/^\/follows\/([^/]+)$/);
      if (followMatch && ['POST','DELETE'].includes(method)) {
        const id = followMatch[1];
        if (method === 'DELETE') { run('DELETE FROM follows WHERE follower_id=? AND followed_id=?', user.id, id); return reply({ ok: true }); }
        if (id === user.id || !one('SELECT id FROM users WHERE id=?', id) || !canFind(user, id)) fail('Profilen kan ikke følges.', 403);
        run('INSERT OR IGNORE INTO follows VALUES(?,?)', user.id, id); return reply({ ok: true });
      }
      if (route === '/jobs' && method === 'GET') return reply(all('SELECT * FROM jobs').map(j => ({ ...JSON.parse(j.data), id: j.id, companyId: j.company_id })));
      if (route === '/jobs' && method === 'POST') {
        role(user, 'company');
        const id = randomUUID();
        const data = { title: required(body.title, 160), description: required(body.description), location: required(body.location, 160), ageGroup: text(body.ageGroup, 40), tags: Array.isArray(body.tags) ? body.tags.slice(0, 20).map(t => text(t, 60)) : [], company: user.name, initials: user.name.slice(0, 2).toLowerCase(), category: 'Jobmulighed', color: '#204D3D', background: '#DCEBB6' };
        data.tasks = [data.description];
        run('INSERT INTO jobs VALUES(?,?,?)', id, user.id, JSON.stringify(data));
        recordContent('job', id);
        return reply({ ...data, id, companyId: user.id }, 201);
      }
      if (route === '/jobs/import' && method === 'POST') {
        role(user, 'company');
        // Explicit migration: keep local source intact, deduplicate within this company.
        if (!Array.isArray(body.jobs) || body.jobs.length > 500) fail('Ugyldige jobdata.');
        db.exec('BEGIN');
        try {
          for (const job of body.jobs) {
            const id = `${user.id}:${required(job.id, 100)}`;
            const data = { title: required(job.title, 160), description: required(job.description), location: required(job.location, 160), ageGroup: text(job.ageGroup, 40), tags: Array.isArray(job.tags) ? job.tags.map(t => text(t, 60)).slice(0,20) : [], tasks: [required(job.description)], company: user.name, initials: user.name.slice(0,2), category: 'Jobmulighed', color: '#204D3D', background: '#DCEBB6' };
            run('INSERT OR IGNORE INTO jobs VALUES(?,?,?)', id, user.id, JSON.stringify(data));
            recordContent('job', id);
          }
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
        return reply({ ok: true });
      }
      if (route === '/applications' && method === 'POST') {
        role(user, 'young');
        const job = one('SELECT * FROM jobs WHERE id=?', required(body.jobId, 200));
        if (!job) fail('Jobbet findes ikke i databasen.', 404);
        if (one('SELECT id FROM applications WHERE user_id=? AND job_id=?', user.id, job.id)) fail('Du har allerede søgt dette job.', 409);
        const data = { name: required(body.name, 120), email: required(body.email, 254), about: required(body.about) };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) fail('Skriv en gyldig e-mail.');
        run('INSERT INTO applications VALUES(?,?,?,?,?,?,?)', randomUUID(), user.id, job.id, job.company_id, 'Modtaget', new Date().toISOString(), JSON.stringify(data));
        const application = one('SELECT id FROM applications WHERE user_id=? AND job_id=?', user.id, job.id);
        notify(job.company_id, 'jobs', `application:${application.id}`);
        return reply({ ok: true }, 201);
      }
      if (route === '/applications' && method === 'GET') {
        const rows = user.role === 'company' ? all('SELECT * FROM applications WHERE company_id=? ORDER BY created_at DESC', user.id) : all('SELECT * FROM applications WHERE user_id=? ORDER BY created_at DESC', user.id);
        return reply(rows.map(a => ({ id: a.id, userId: a.user_id, jobId: a.job_id, status: a.status, createdAt: a.created_at, ...JSON.parse(a.data), avatar: getProfile(a.user_id).visibility?.presentation ? getProfile(a.user_id).avatar : '', title: JSON.parse(one('SELECT data FROM jobs WHERE id=?', a.job_id).data).title })));
      }
      const applicationMatch = route.match(/^\/applications\/([^/]+)$/);
      if (applicationMatch && method === 'PATCH') {
        role(user, 'company');
        const a = one('SELECT * FROM applications WHERE id=? AND company_id=?', applicationMatch[1], user.id);
        if (!a) fail('Ansøgningen blev ikke fundet.', 404);
        if (!statuses.includes(body.status)) fail('Ugyldig status.');
        run('UPDATE applications SET status=? WHERE id=?', body.status, a.id);
        return reply({ ok: true });
      }
      if (route === '/employees' && method === 'POST') {
        role(user, 'company');
        fail('Send et ansættelsestilbud. Den unge skal godkende, før ansættelsen registreres.');
      }
      if (route === '/employment-offers' && method === 'POST') {
        role(user, 'company');
        const a = one('SELECT * FROM applications WHERE id=? AND company_id=?', required(body.applicationId, 100), user.id);
        if (!a) fail('Ansøgningen blev ikke fundet.', 404);
        if (a.status !== 'Accepteret') fail('Accepter ansøgningen før du sender et tilbud.');
        if (one('SELECT id FROM employees WHERE company_id=? AND user_id=?', user.id, a.user_id)) fail('Personen er allerede registreret som ansat.', 409);
        if (one("SELECT id FROM employment_offers WHERE company_id=? AND user_id=? AND status='pending'", user.id, a.user_id)) fail('Der afventes allerede svar på et tilbud til denne person.', 409);
        let terms;
        try { terms = validateTerms(body); } catch (error) { fail(error.message); }
        const id = randomUUID();
        run('INSERT INTO employment_offers(id,application_id,company_id,user_id,terms,created_at) VALUES(?,?,?,?,?,?)', id, a.id, user.id, a.user_id, JSON.stringify(terms), new Date().toISOString());
        notify(a.user_id, 'profile', `offer:${id}`);
        return reply({ id }, 201);
      }
      if (route === '/employment-offers' && method === 'GET') {
        const column = user.role === 'company' ? 'company_id' : 'user_id';
        return reply(all(`SELECT * FROM employment_offers WHERE ${column}=? ORDER BY created_at DESC, rowid DESC`, user.id).map(o => {
          const a = one('SELECT job_id FROM applications WHERE id=?', o.application_id);
          return { id: o.id, applicationId: o.application_id, userId: o.user_id, name: one('SELECT name FROM users WHERE id=?', o.user_id).name, company: one('SELECT name FROM users WHERE id=?', o.company_id).name, title: JSON.parse(one('SELECT data FROM jobs WHERE id=?', a.job_id).data).title, status: o.status, terms: JSON.parse(o.terms), createdAt: o.created_at, respondedAt: o.responded_at, addedToProfile: !!o.added_to_profile };
        }));
      }
      const offerMatch = route.match(/^\/employment-offers\/([^/]+)(\/profile)?$/);
      if (offerMatch && method === 'POST') {
        role(user, 'young');
        const o = one('SELECT * FROM employment_offers WHERE id=? AND user_id=?', offerMatch[1], user.id);
        if (!o) fail('Tilbuddet blev ikke fundet.', 404);
        const addLater = !!offerMatch[2];
        if (addLater && o.status !== 'accepted') fail('Godkend tilbuddet først.', 409);
        if (!addLater && o.status !== 'pending') fail('Tilbuddet er allerede besvaret.', 409);
        if (!addLater && !['accepted', 'declined'].includes(body.decision)) fail('Vælg godkend eller afvis.');
        if (!addLater && body.decision === 'accepted' && typeof body.addToProfile !== 'boolean') fail('Vælg om ansættelsen skal tilføjes til profilen.');
        const a = one('SELECT * FROM applications WHERE id=?', o.application_id);
        const now = new Date().toISOString();
        db.exec('BEGIN');
        try {
          if (!addLater && body.decision === 'accepted') {
            if (one('SELECT id FROM employees WHERE company_id=? AND user_id=?', o.company_id, user.id)) fail('Ansættelsen findes allerede.', 409);
            run('INSERT INTO employees VALUES(?,?,?,?,?)', randomUUID(), o.company_id, user.id, a.job_id, now);
          }
          if (addLater || body.decision === 'accepted' && body.addToProfile) {
            const p = getProfile(user.id), terms = JSON.parse(o.terms);
            const entryId = `employment-${o.id}`;
            if (!o.added_to_profile && !p.experiences.some(e => e.id === entryId)) {
              if (p.experiences.length >= 50) fail('Der er allerede 50 erfaringer på profilen. Fjern en erfaring, eller godkend uden at tilføje til profilen.');
              p.experiences.push({ id: entryId, organization: one('SELECT name FROM users WHERE id=?', o.company_id).name, title: JSON.parse(one('SELECT data FROM jobs WHERE id=?', a.job_id).data).title, start: terms.startDate.slice(0, 7), end: terms.endDate.slice(0, 7), description: '', type: terms.duration === 'Miniprojekt' || terms.duration === 'Engangsopgave' ? 'Projekt' : 'Job' });
              p.experiences.sort((a,b) => (b.end || '9999').localeCompare(a.end || '9999') || b.start.localeCompare(a.start));
              run('UPDATE profiles SET data=? WHERE user_id=?', JSON.stringify(p), user.id);
            }
            run('UPDATE employment_offers SET added_to_profile=1 WHERE id=?', o.id);
          }
          if (!addLater) run('UPDATE employment_offers SET status=?,responded_at=? WHERE id=?', body.decision, now, o.id);
          if (!addLater) notify(o.company_id, 'profile', `response:${o.id}`);
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
        return reply({ ok: true });
      }
      if (route === '/employees' && method === 'GET') {
        role(user, 'company');
        return reply(all('SELECT * FROM employees WHERE company_id=? ORDER BY created_at DESC', user.id).map(e => ({ id: e.id, userId: e.user_id, name: one('SELECT name FROM users WHERE id=?', e.user_id).name, avatar: getProfile(e.user_id).visibility?.presentation ? getProfile(e.user_id).avatar : '', title: JSON.parse(one('SELECT data FROM jobs WHERE id=?', e.job_id).data).title, createdAt: e.created_at })));
      }
      const profileMatch = route.match(/^\/profiles\/([^/]+)$/);
      if (profileMatch) {
        const id = profileMatch[1] === 'me' ? user.id : profileMatch[1];
        const owner = id === user.id;
        const target = one('SELECT * FROM users WHERE id=?', id);
        if (!target) fail('Profilen findes ikke.', 404);
        if (!owner && !canFind(user, id)) fail('Du har ikke adgang til profilen.', 403);
        if (method === 'GET') {
          const p = getProfile(id);
          const posts = visiblePosts(user, id);
          if (owner) return reply({ ...p, id, posts, owner: true });
          const v = related(user, id) ? p.visibility || {} : {};
          return reply({ id, name: target.name, role: target.role, ...(v.presentation ? { headline: p.headline, location: p.location, about: p.about, avatar: p.avatar } : p.discoverable ? { headline: p.headline, avatar: p.avatar } : {}), experiences: v.experiences ? p.experiences : [], education: v.education ? p.education : [], skills: v.skills ? p.skills : [], posts, owner: false, following: !!one('SELECT 1 FROM follows WHERE follower_id=? AND followed_id=?', user.id, id), restricted: !v.presentation });
        }
        if (method === 'PUT') {
          if (!owner) fail('Kun ejeren må redigere profilen.', 403);
          function entries(values, type) {
            if (!Array.isArray(values) || values.length > 50) fail('Højst 50 poster pr. sektion.');
            return values.map(e => {
              const start = required(e.start, 7), end = text(e.end, 7);
              if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(start) || (end && (!/^\d{4}-(0[1-9]|1[0-2])$/.test(end) || end < start))) fail('Brug ÅÅÅÅ-MM og en slutdato efter startdatoen.');
              return { id: text(e.id, 100) || randomUUID(), organization: required(e.organization, 160), title: required(e.title, 160), start, end, description: text(e.description, 2000), type: type === 'experience' ? text(e.type, 40) : 'Uddannelse' };
            }).sort((a,b) => (b.end || '9999').localeCompare(a.end || '9999') || b.start.localeCompare(a.start));
          }
          const visibility = Object.fromEntries(['presentation', 'experiences', 'education', 'skills'].map(k => [k, body.visibility?.[k] === true]));
          const p = { name: required(body.name, 120), headline: text(body.headline, 180), location: text(body.location, 120), about: text(body.about, 3000), avatar: image(body.avatar), discoverable: body.discoverable === true, experiences: entries(body.experiences, 'experience'), education: entries(body.education, 'education'), skills: Array.isArray(body.skills) ? [...new Set(body.skills.map(s => text(s, 60)).filter(Boolean))].slice(0,50) : [], visibility };
          db.exec('BEGIN');
          try { run('UPDATE profiles SET data=? WHERE user_id=?', JSON.stringify(p), id); run('UPDATE users SET name=? WHERE id=?', p.name, id); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
          return reply({ ok: true });
        }
      }
      const postMatch = route.match(/^\/posts(?:\/([^/]+))?$/);
      if (postMatch) {
        const id = postMatch[1];
        if (id && !one('SELECT id FROM posts WHERE id=? AND user_id=?', id, user.id)) fail('Opslaget blev ikke fundet.', 404);
        if (id && method === 'DELETE') { run('DELETE FROM posts WHERE id=? AND user_id=?', id, user.id); return reply({ ok: true }); }
        if ((!id && method === 'POST') || (id && method === 'PUT')) {
          const data = { text: required(body.text, 5000), image: image(body.image), shared: body.shared === true, followers: body.followers === true };
          if (id) run('UPDATE posts SET data=? WHERE id=? AND user_id=?', JSON.stringify(data), id, user.id);
          else { const postId = randomUUID(); run('INSERT INTO posts VALUES(?,?,?,?)', postId, user.id, new Date().toISOString(), JSON.stringify(data)); recordContent('post', postId); }
          return reply({ ok: true }, id ? 200 : 201);
        }
      }
      fail('Siden blev ikke fundet.', 404);
    } catch (error) {
      if (!error.status) console.error(error);
      reply({ error: error.status ? error.message : 'Der opstod en serverfejl. Prøv igen.' }, error.status || 500);
    }
  });
  server.on('close', () => db.close());
  return server;
}
if (require.main === module) createServer().listen(Number(process.env.PORT || 3001), '0.0.0.0', () => console.log('Foothold API: http://localhost:' + (process.env.PORT || 3001)));
module.exports = { createServer };
