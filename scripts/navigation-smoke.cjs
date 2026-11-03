// Uses an isolated in-memory API; never changes the app's database.
const assert = require('node:assert/strict');
const http = require('node:http');
const { readFile, mkdir } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { createServer } = require('../server/index.cjs');
const root = path.resolve(__dirname, '..', 'dist');
const apiServer = createServer(':memory:');
const webServer = http.createServer(async (req, res) => {
  const target = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!target.startsWith(root + path.sep) && target !== root) { res.writeHead(403); return res.end(); }
  try {
    const file = target === root ? path.join(root, 'index.html') : target;
    const data = await readFile(file);
    res.setHeader('Content-Type', ({ '.js': 'application/javascript', '.html': 'text/html', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json' })[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
async function listen(server) { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return `http://127.0.0.1:${server.address().port}`; }
(async () => {
  let browser;
  let page;
  const errors = [];
  try {
    const apiBase = await listen(apiServer), webBase = await listen(webServer);
    async function api(route, method = 'GET', data, token) {
      const res = await fetch(apiBase + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
      const body = await res.json(); assert.ok(res.ok, JSON.stringify(body)); return body;
    }
    async function account(email, name, role) { return api('/auth/register', 'POST', { email, name, role, phone: '12345678', birthDate: '2000-01-01', password: 'test-password-123' }); }
    const company = await account('company@example.dk', 'Test Virksomhed', 'company');
    const young = await account('young@example.dk', 'Test Ung', 'young');
    const author = await account('author@example.dk', 'Netværksprofil', 'young');
    const p = await api('/profiles/me', 'GET', null, author.token);
    await api('/profiles/me', 'PUT', { ...p, discoverable: true }, author.token);
    await api('/posts', 'POST', { text: 'Min første dag på arbejde!', followers: true }, author.token);
    await api(`/follows/${author.user.id}`, 'POST', {}, young.token);
    const job = await api('/jobs', 'POST', { title: 'Praktisk hjælper', description: 'Hjælp med praktiske opgaver.', location: 'København', tags: ['Værktøj'] }, company.token);
    await api('/jobs', 'POST', { title: 'Butiksmedhjælper', description: 'Hjælp kunder i butikken.', location: 'Aarhus', tags: ['Kundeservice'] }, company.token);
    browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
    page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^http:\/\/(localhost|127\.0\.0\.1):3001\//, async route => {
      const target = new URL(route.request().url());
      const response = await route.fetch({ url: apiBase + target.pathname + target.search });
      await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': '*' } });
    });
    page.setDefaultTimeout(12000);
    const tab = name => page.getByLabel(name, { exact: true });
    const visibleText = async value => { await page.getByText(value, { exact: true }).first().waitFor({ state: 'visible' }); };
    async function login(email) {
      await page.locator('input[aria-label="E-mail"]:visible').fill(email);
      await page.locator('input[aria-label="Adgangskode"]:visible').fill('test-password-123');
      await page.getByRole('button', { name: 'Log ind', exact: true }).click();
      await tab(email.startsWith('company') ? 'Feed' : 'Hjem').waitFor();
    }
    async function checkNav() {
      assert.equal(await tab('Job').count(), 1);
      assert.equal(await tab('Profil').count(), 1);
      for (const name of ['Job','Profil']) {
        const bounds = await tab(name).boundingBox();
        assert.ok(bounds && bounds.y > 700 && bounds.y + bounds.height <= 845, `${name} must stay at the bottom`);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'No horizontal page overflow');
    }
    await page.goto(webBase);
    await login('young@example.dk');
    await visibleText('Min første dag på arbejde!'); await checkNav();
    await tab('Job').getByText('2', { exact: true }).waitFor();
    await tab('Job').click(); await visibleText('Praktisk hjælper'); await visibleText('Butiksmedhjælper');
    await tab('Job').getByText('2', { exact: true }).waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Filtrér jobs', exact: true }).click();
    await page.getByRole('button', { name: 'Aarhus', exact: true }).click();
    await visibleText('1 jobs');
    assert.equal(await page.getByRole('button', { name: 'Se job: Praktisk hjælper' }).count(), 0);
    await page.getByRole('button', { name: 'Nulstil filtre', exact: true }).click();
    await page.getByRole('button', { name: 'Skjul filtre', exact: true }).click();
    await page.getByRole('button', { name: 'Se job: Praktisk hjælper' }).click(); await checkNav();
    await page.getByRole('button', { name: 'Ansøg nu →' }).click();
    await page.getByLabel('Kort om dig', { exact: true }).fill('Jeg vil gerne være jeres nye kollega.');
    await page.getByRole('button', { name: 'Send ansøgning →' }).click();
    await visibleText('Din ansøgning er sendt ✓');
    await page.getByRole('button', { name: 'Tilbage til jobs →' }).click();
    const application = (await api('/applications', 'GET', null, company.token)).find(a => a.jobId === job.id);
    await api(`/applications/${application.id}`, 'PATCH', { status: 'Accepteret' }, company.token);
    await api('/employment-offers', 'POST', { applicationId: application.id, wage: 135, wageUnit: 'kr./time', hoursPerWeek: 8, duration: '3 måneder', startDate: '2026-12-01' }, company.token);
    await tab('Profil').click();
    await page.getByRole('button', { name: /^Mine ansættelser/ }).click(); await visibleText('Afventer den unges godkendelse');
    await page.getByRole('switch', { name: 'Tilføj jobbet til min profil med det samme' }).check();
    await page.getByRole('button', { name: 'Godkend tilbud og ansættelse' }).click();
    await visibleText('Godkendt af den unge'); await checkNav();
    await page.getByRole('button', { name: 'Se min profil →' }).click();
    await page.getByRole('button', { name: 'Erfaring', exact: true }).click(); await visibleText('Praktisk hjælper');
    await page.getByRole('button', { name: 'Log ud', exact: true }).click();
    await page.getByRole('button', { name: 'Log ind som virksomhed', exact: true }).click();
    await login('company@example.dk');
    await tab('Job').getByText('1', { exact: true }).waitFor();
    await tab('Profil').click(); await visibleText('Hvem har vi ansat?'); await visibleText('1 ansatte');
    await page.getByRole('button', { name: 'Test Ung →' }).waitFor(); await checkNav();
    await tab('Job').click(); await page.getByRole('button', { name: /^Ansøgninger/ }).click(); await visibleText('Test Ung'); await checkNav();
    await page.setViewportSize({ width: 320, height: 844 }); await checkNav();
    await page.setViewportSize({ width: 390, height: 844 }); await tab('Profil').click();
    await page.waitForTimeout(350); // Let the tab transition finish before the visual preview.
    await mkdir(path.join(__dirname, '..', 'server', 'storage'), { recursive: true });
    await page.screenshot({ path: path.join(__dirname, '..', 'server', 'storage', 'navigation-preview.png') });
    assert.deepEqual(errors, [], 'No runtime JavaScript errors');
    console.log('PASS: three bottom tabs, followed feed, job filters, application, offer approval, company employees, 320/390px layout and no runtime errors.');
  } catch (error) {
    if (page) { console.error('Visible test UI:', await page.locator('body').innerText()); console.error('Runtime errors:', errors); }
    throw error;
  } finally {
    if (browser) await browser.close();
    await Promise.all([new Promise(resolve => apiServer.close(resolve)), new Promise(resolve => webServer.close(resolve))]);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
