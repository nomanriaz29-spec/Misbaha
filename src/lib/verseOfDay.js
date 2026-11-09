import { arabic, translation, surahInfo, arabicNumber } from './quran';

// One verse a day, the same for everyone on that date and in every language.
// Chosen verses that make sense on their own: duas, mercy, patience, gratitude, guidance.
// (Fully random verses are often mid-sentence or part of a story.) Add more references here;
// the order steps through the whole list before any verse comes back.
export const VERSES = [
  '1:2', '1:5', '1:6', '2:152', '2:153', '2:156', '2:186', '2:201', '2:263', '3:8', '3:31', '3:92',
  '3:133', '3:134', '3:190', '3:200', '4:28', '4:110', '6:103', '6:160', '6:162', '7:23', '7:55', '7:56',
  '7:199', '7:205', '8:46', '9:51', '9:129', '10:57', '10:62', '11:6', '11:114', '11:115', '12:86', '13:28',
  '13:29', '14:7', '14:34', '14:40', '14:41', '15:49', '15:98', '15:99', '16:18', '16:97', '16:125', '16:127',
  '16:128', '17:24', '17:80', '17:82', '18:46', '18:109', '19:96', '20:14', '20:25', '20:26', '20:114', '21:83',
  '21:87', '21:89', '21:107', '22:77', '23:1', '23:97', '23:98', '23:109', '23:118', '25:63', '25:74', '26:80',
  '26:83', '26:85', '27:62', '28:24', '29:69', '31:17', '31:18', '33:21', '33:41', '33:42', '33:56', '33:70',
  '35:15', '36:58', '36:82', '37:180', '37:182', '39:10', '39:53', '40:44', '40:60', '41:34', '42:19', '42:43',
  '47:7', '49:10', '49:13', '50:16', '50:18', '51:56', '53:39', '53:40', '54:17', '55:13', '55:26', '55:27',
  '55:60', '59:10', '59:18', '64:16', '65:3', '67:2', '68:4', '70:5', '71:10', '73:8', '76:9', '87:14',
  '87:15', '87:17', '89:27', '89:28', '93:3', '93:4', '93:5', '93:11', '94:5', '94:6', '94:7', '94:8',
  '95:4', '96:1', '97:3', '99:7', '99:8', '108:1', '110:3', '112:1', '113:1', '114:1',
].map((r) => r.split(':').map(Number));

// Days since 1 Jan 2000 in the phone's local time, so the verse changes at local midnight.
export function dayNumber(date) {
  return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(2000, 0, 1)) / 86400000);
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
// A step coprime with the list length visits every verse once per cycle,
// and neighbouring days land far apart in the list.
function step(n) {
  let k = Math.floor(n * 0.618) || 1;
  while (gcd(k, n) !== 1) k++;
  return k;
}

export function verseRefFor(date) {
  const n = VERSES.length;
  const i = (((dayNumber(date) * step(n)) % n) + n) % n;
  return VERSES[i];
}

const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
// Reference line, e.g. "Al-Baqarah 2:286" / "البقرة ٢٨٦" / "البقرة 2:286".
export function verseLabel(s, a, lang) {
  const info = surahInfo(s);
  const arName = info.ar.replace(DIACRITICS, '').replace(/^سورة\s*/, '');
  if (lang === 'ar') return `${arName} ${arabicNumber(a)}`;
  if (lang === 'ur') return `${arName} ${s}:${a}`;
  return `${info.name} ${s}:${a}`;
}

export function verseFor(date, lang) {
  const [s, a] = verseRefFor(date);
  const tr = lang === 'ar' ? null : translation(s, lang === 'ur' ? 'ur' : 'en')[a - 1];
  return { s, a, ar: arabic(s)[a - 1], tr, ref: verseLabel(s, a, lang) };
}
