import { Coordinates, CalculationMethod, PrayerTimes, Madhab, HighLatitudeRule } from 'adhan';

export const METHODS = {
  MuslimWorldLeague: 'Muslim World League',
  UmmAlQura: 'Umm al-Qura (Makkah)',
  Dubai: 'UAE (Dubai)',
  Qatar: 'Qatar',
  Kuwait: 'Kuwait',
  Egyptian: 'Egyptian General Authority',
  Karachi: 'University of Karachi',
  Turkey: 'Diyanet (Turkey)',
  NorthAmerica: 'ISNA (North America)',
  MoonsightingCommittee: 'Moonsighting Committee',
  Singapore: 'Singapore / Malaysia / Indonesia',
  Tehran: 'Tehran',
};

// Sensible default calculation method per country (ISO code).
const BY_COUNTRY = {
  AE: 'Dubai', SA: 'UmmAlQura', YE: 'UmmAlQura', BH: 'UmmAlQura', QA: 'Qatar', KW: 'Kuwait', OM: 'MuslimWorldLeague',
  EG: 'Egyptian', SD: 'Egyptian', LY: 'Egyptian', SY: 'Egyptian', LB: 'Egyptian', IQ: 'Egyptian', JO: 'Egyptian', PS: 'Egyptian',
  PK: 'Karachi', IN: 'Karachi', BD: 'Karachi', AF: 'Karachi', NP: 'Karachi', LK: 'Karachi',
  TR: 'Turkey', US: 'NorthAmerica', CA: 'NorthAmerica', GB: 'MoonsightingCommittee',
  SG: 'Singapore', MY: 'Singapore', BN: 'Singapore', ID: 'Singapore', IR: 'Tehran',
};
const HANAFI_COUNTRIES = ['PK', 'IN', 'BD', 'AF', 'NP', 'LK'];

export function defaultsForCountry(code) {
  const c = (code || '').toUpperCase();
  return { method: BY_COUNTRY[c] || 'MuslimWorldLeague', madhab: HANAFI_COUNTRIES.includes(c) ? 'Hanafi' : 'Shafi' };
}

export function getTimes(location, settings, date = new Date()) {
  if (!location) return null;
  const coords = new Coordinates(location.lat, location.lng);
  const fn = CalculationMethod[settings.method] || CalculationMethod.MuslimWorldLeague;
  const params = fn();
  params.madhab = settings.madhab === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  try { params.highLatitudeRule = HighLatitudeRule.recommended(coords); } catch (e) {}
  const t = new PrayerTimes(coords, date, params);
  return { fajr: t.fajr, sunrise: t.sunrise, dhuhr: t.dhuhr, asr: t.asr, maghrib: t.maghrib, isha: t.isha };
}

export const PRAYERS = [
  { key: 'fajr', name: 'Fajr', body: 'After Salah, then your morning adhkar', open: 'set:salah' },
  { key: 'dhuhr', name: 'Dhuhr', body: 'SubhanAllah 33 · Alhamdulillah 33 · Allahu Akbar 33', open: 'set:salah' },
  { key: 'asr', name: 'Asr', body: 'After Salah, then your evening adhkar', open: 'set:salah' },
  { key: 'maghrib', name: 'Maghrib', body: 'SubhanAllah 33 · Alhamdulillah 33 · Allahu Akbar 33', open: 'set:salah' },
  { key: 'isha', name: 'Isha', body: 'SubhanAllah 33 · Alhamdulillah 33 · Allahu Akbar 33', open: 'set:salah' },
];

export function fmtTime(d) {
  if (!d) return '--';
  let h = d.getHours(); const m = d.getMinutes();
  const ap = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}
