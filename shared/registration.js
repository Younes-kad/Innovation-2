// Shared validation keeps the registration form and API in agreement.
function todayISO() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Copenhagen', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function ageOnDate(birthDate, today = todayISO()) {
  if (typeof birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const date = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== birthDate || birthDate > today) return null;
  const age = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4)) - (today.slice(5) < birthDate.slice(5) ? 1 : 0);
  return age >= 0 && age <= 120 ? age : null;
}

function normalizePhone(value) {
  if (typeof value !== 'string' || value.length > 40 || !/^[+\d\s()-]+$/.test(value)) return null;
  const phone = value.replace(/[\s()-]/g, '').replace(/^00/, '+');
  // Danish numbers without country code, or international numbers with +country code.
  return /^(?:\d{8}|\+[1-9]\d{7,14})$/.test(phone) ? phone : null;
}

module.exports = { todayISO, ageOnDate, normalizePhone };
