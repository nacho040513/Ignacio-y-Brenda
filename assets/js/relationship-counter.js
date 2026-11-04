const relationshipStart = { year: 2026, month: 1, day: 9, hour: 0, minute: 0, second: 0 };
const bogotaTimeZone = 'America/Bogota';
let referenceTime;
let referenceReceivedAt;

function utcFromParts({ year, month, day, hour = 0, minute = 0, second = 0 }) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

function bogotaTimeFromBrowser() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: bogotaTimeZone,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23'
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date())
    .filter(({ type }) => type !== 'literal')
    .map(({ type, value }) => [type, Number(value)]));
  return utcFromParts(parts);
}

function addMonths(date, count) {
  const result = new Date(date.getTime());
  const wantedDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + count);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(wantedDay, lastDay));
  return result;
}

function relationshipDuration(start, current) {
  let years = current.getUTCFullYear() - start.getUTCFullYear();
  let cursor = new Date(start.getTime());
  if (addMonths(cursor, years * 12) > current) years -= 1;
  cursor = addMonths(cursor, years * 12);

  let months = (current.getUTCFullYear() - cursor.getUTCFullYear()) * 12 + current.getUTCMonth() - cursor.getUTCMonth();
  if (addMonths(cursor, months) > current) months -= 1;
  cursor = addMonths(cursor, months);

  const elapsed = current - cursor;
  return {
    years,
    months,
    days: Math.floor(elapsed / 86_400_000),
    hours: Math.floor((elapsed % 86_400_000) / 3_600_000)
  };
}

function renderCounter() {
  const current = new Date(referenceTime.getTime() + Date.now() - referenceReceivedAt);
  const duration = relationshipDuration(utcFromParts(relationshipStart), current);
  Object.entries(duration).forEach(([unit, value]) => {
    const element = document.getElementById(unit);
    if (element) element.textContent = value;
  });
}

const source = document.getElementById('counter-source');
referenceTime = bogotaTimeFromBrowser();
referenceReceivedAt = Date.now();
if (source) source.textContent = 'Hora local de Bogotá';
renderCounter();
setInterval(renderCounter, 60_000);
