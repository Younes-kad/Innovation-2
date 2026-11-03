const durations = ['3 måneder', '6 måneder', '1 år', 'Miniprojekt', 'Engangsopgave'];
const wageUnits = ['kr./time', 'kr./måned', 'kr. i alt'];
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validateTerms(input) {
  const number = value => typeof value === 'number' || typeof value === 'string' && value.trim() ? Number(String(value).replace(',', '.')) : NaN;
  const wage = number(input.wage), hoursPerWeek = number(input.hoursPerWeek);
  if (!Number.isFinite(wage) || wage <= 0 || wage > 100000000 || Math.abs(wage * 100 - Math.round(wage * 100)) > 0.000001) throw new Error('Angiv en løn større end 0 med højst to decimaler.');
  if (!wageUnits.includes(input.wageUnit)) throw new Error('Vælg om lønnen er pr. time, pr. måned eller for hele opgaven.');
  if (!Number.isFinite(hoursPerWeek) || hoursPerWeek <= 0 || hoursPerWeek > 168) throw new Error('Angiv ugentlige timer mellem 0 og 168 (større end 0).');
  if (!durations.includes(input.duration)) throw new Error('Vælg kontraktens varighed eller opgavetype.');
  if (!validDate(input.startDate)) throw new Error('Angiv en gyldig startdato som ÅÅÅÅ-MM-DD.');
  let endDate = input.endDate;
  const months = { '3 måneder': 3, '6 måneder': 6, '1 år': 12 }[input.duration];
  if (months) {
    const date = new Date(`${input.startDate}T00:00:00Z`);
    const day = date.getUTCDate();
    date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay)); endDate = date.toISOString().slice(0, 10);
  }
  if (!validDate(endDate) || endDate < input.startDate) throw new Error('Angiv en gyldig slutdato på eller efter startdatoen.');
  return { wage, wageUnit: input.wageUnit, hoursPerWeek, duration: input.duration, startDate: input.startDate, endDate };
}
module.exports = { durations, wageUnits, validateTerms };
