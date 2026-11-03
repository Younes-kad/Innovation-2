const { randomBytes, scryptSync } = require('node:crypto');
const DEMO_COMPANY = 'foothold-demo-company';
const DEMO_PERSON_IDS = ['foothold-demo-sofie', 'foothold-demo-malik'];
function seedDemo(db) {
  db.exec('CREATE TABLE IF NOT EXISTS seed_migrations(name TEXT PRIMARY KEY)');
  if (db.prepare('SELECT name FROM seed_migrations WHERE name=?').get('starter-content-v1')) return seedPeople(db);
  db.exec('BEGIN');
  try {
    const salt = randomBytes(16).toString('hex');
    const password = scryptSync(randomBytes(32).toString('hex'), salt, 64).toString('hex');
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(DEMO_COMPANY, 'starter-demo@foothold.invalid', password, salt, 'company', 'Foothold Demo');
    db.prepare('INSERT INTO profiles VALUES(?,?)').run(DEMO_COMPANY, JSON.stringify({ name: 'Foothold Demo', headline: 'Fiktive muligheder. Rigtige første skridt.', location: '', about: 'Denne profil viser fiktive jobs og opslag, så du kan prøve Foothold. Ingen rigtig arbejdsgiver modtager dine demoansøgninger.', avatar: '', discoverable: false, experiences: [], education: [], skills: [], visibility: {} }));
    const jobs = [
      { id: 'foothold-demo-job-cafe', title: 'Cafémedhjælper – dit første fritidsjob', location: 'København', category: 'Café og service', ageGroup: '15–20 år', tags: ['Kundeservice', 'Teamwork'], description: 'Prøv kræfter med caféhverdagen. Du hjælper med at tage imod gæster, gøre borde klar og holde caféen hyggelig. En erfaren kollega viser dig opgaverne, og du behøver ikke erfaring.', tasks: ['Byd gæster velkommen sammen med en kollega', 'Gør borde klar og hold orden', 'Lær om service og samarbejde'] },
      { id: 'foothold-demo-job-some', title: 'Junior SoMe-hjælper', location: 'Aarhus', category: 'Marketing', ageGroup: '16–22 år', tags: ['Kreativitet', 'Kommunikation'], description: 'Har du lyst til at fortælle gode historier? Hjælp et fiktivt kreativt team med korte tekster, idéer til opslag og billeder fra hverdagen. Du får sparring og tid til at lære.', tasks: ['Find idéer til opslag sammen med teamet', 'Skriv korte tekster til sociale medier', 'Planlæg en lille indholdskalender'] },
    ];
    const posts = [
      { id: 'foothold-demo-post-first-day', text: 'Første dag på et nyt job? Du behøver ikke kunne det hele fra starten. Stil spørgsmål, lær dine kolleger at kende, og giv dig selv lov til at øve dig. De små skridt tæller også. 🌱' },
      { id: 'foothold-demo-post-skills', text: 'En lille sejr fra arbejdslivet: at turde tage imod den næste kunde eller dele sin første idé med teamet. Kommunikation og teamwork vokser, når vi prøver os frem. Hvilken ny ting vil du gerne lære? ✨' },
    ];
    const now = new Date().toISOString();
    for (const job of jobs) {
      const { id, ...fields } = job;
      db.prepare('INSERT INTO jobs VALUES(?,?,?)').run(id, DEMO_COMPANY, JSON.stringify({ ...fields, company: 'Foothold Demo', initials: 'f.', color: '#204D3D', background: '#DCEBB6', fictional: true, createdAt: now }));
    }
    for (const post of posts) db.prepare('INSERT INTO posts VALUES(?,?,?,?)').run(post.id, DEMO_COMPANY, now, JSON.stringify({ text: post.text, image: '', shared: false, followers: false, fictional: true }));
    db.prepare('INSERT INTO seed_migrations VALUES(?)').run('starter-content-v1');
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  seedPeople(db);
}

function seedPeople(db) {
  if (db.prepare('SELECT name FROM seed_migrations WHERE name=?').get('demo-people-v2')) return;
  const people = [
    { id: DEMO_PERSON_IDS[0], name: 'Sofie Nielsen', headline: 'Gymnasieelev med mit første fritidsjob på café', location: 'København', about: 'Jeg er en fiktiv demoprofil. Jeg går i gymnasiet og er nysgerrig på service og samarbejde. Mit første fritidsjob har givet mig mod på at møde nye mennesker og prøve noget nyt.', skills: ['Kundeservice', 'Teamwork', 'Kommunikation'], organization: 'Democafé (fiktiv)', title: 'Cafémedhjælper', postId: 'foothold-demo-post-first-day', text: 'For tre måneder siden turde jeg næsten ikke tage imod en bestilling. I dag kan jeg både hjælpe gæsterne og holde hovedet koldt, når caféen er fyldt. ☕\n\nMit første fritidsjob har lært mig, at man ikke skal kunne det hele på dag ét. Mine kolleger har været gode til at svare på spørgsmål, og jeg er blevet meget mere sikker på mig selv.\n\nNæste mål: at lære at lave den perfekte cappuccino! Små skridt tæller også. 🌱' },
    { id: DEMO_PERSON_IDS[1], name: 'Malik Jensen', headline: 'Elev med interesse for design, idéer og sociale medier', location: 'Aarhus', about: 'Jeg er en fiktiv demoprofil. Jeg kan godt lide at skabe indhold og gøre idéer konkrete. Lige nu øver jeg mig i at skrive, planlægge projekter og samarbejde med andre.', skills: ['Kreativitet', 'Planlægning', 'Sociale medier'], organization: 'Kreativt skoleprojekt (fiktivt)', title: 'Indhold og kommunikation', postId: 'foothold-demo-post-skills', text: 'Jeg har lige afsluttet mit første lille SoMe-projekt sammen med to fra min klasse! 🎨\n\nVi lavede en indholdskalender, skrev tekster og tog billeder. Jeg troede først, at det vigtigste var at få flotte idéer. Men jeg lærte mindst lige så meget af at give feedback, holde aftaler og lytte til de andre.\n\nDet har givet mig lyst til at finde et fritidsjob, hvor jeg kan arbejde videre med kommunikation. Man behøver ikke et langt CV for at have noget at byde på. ✨' },
  ];
  db.exec('BEGIN');
  try {
    for (const person of people) {
      const salt = randomBytes(16).toString('hex');
      db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(person.id, `${person.id}@foothold.invalid`, scryptSync(randomBytes(32).toString('hex'), salt, 64).toString('hex'), salt, 'young', person.name);
      db.prepare('INSERT INTO profiles VALUES(?,?)').run(person.id, JSON.stringify({ name: person.name, headline: person.headline, location: person.location, about: person.about, avatar: '', fictional: true, discoverable: true, experiences: [{ id: `${person.id}-experience`, organization: person.organization, title: person.title, start: '2026-08', end: '', type: person.id === DEMO_PERSON_IDS[0] ? 'Job' : 'Projekt', description: 'Fiktiv erfaring til demonstration af Foothold.' }], education: [{ id: `${person.id}-education`, organization: 'Demogymnasiet (fiktivt)', title: 'Gymnasial uddannelse', start: '2025-08', end: '', type: 'Uddannelse', description: '' }], skills: person.skills, visibility: {} }));
      db.prepare('UPDATE posts SET user_id=?,data=? WHERE id=? AND user_id=?').run(person.id, JSON.stringify({ text: person.text, image: '', shared: false, followers: true, fictional: true }), person.postId, DEMO_COMPANY);
    }
    db.prepare('INSERT INTO seed_migrations VALUES(?)').run('demo-people-v2');
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
module.exports = { seedDemo, DEMO_COMPANY, DEMO_PERSON_IDS };
