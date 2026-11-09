// Umm al-Qura calendar (official Saudi calendar), generated from ICU's islamic-umalqura data.
// Covers 1445/12 AH (2024-06-07) to 1480/7 AH. Outside that range the
// tabular (Kuwaiti) algorithm is used. Users can shift by up to ±2 days to follow local moon sighting.
const START = { y: 1445, m: 12, date: '2024-06-07' };
const LENGTHS = '1011101100100101110101010010110110101001010110110101001010110111001001101101100100101101101010010101101101010010110101101001010101110100100101111010010010111011001001011011010100101011010101100101011010110010101011101010010011101101001001101110100010110110110010101010110101010010110110101001011011010100101011011010010101101010110010101011011001010011011100100101011101010010011110101001010110110100101010110101010'; // 1 = 30-day month, 0 = 29-day month

export const MONTHS = {
  en: ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhul Qadah', 'Dhul Hijjah'],
  ar: ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'],
  ur: ['محرم', 'صفر', 'ربیع الاول', 'ربیع الثانی', 'جمادی الاول', 'جمادی الثانی', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذوالقعدہ', 'ذوالحجہ'],
};

const DAY = 86400000;
const utcDay = (date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY);
const startDay = Math.floor(Date.parse(START.date + 'T00:00:00Z') / DAY);

// Tabular Islamic calendar (fallback outside the table).
function tabular(dayNumber) {
  const jd = dayNumber + 2440588; // days since 1970-01-01 -> Julian Day Number
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const m = Math.floor((24 * l) / 709);
  return { y: 30 * n + j - 30, m, d: l - Math.floor((709 * m) / 24) };
}

// Hijri date for a local calendar day. adjust: -2..2 days (local moon sighting).
export function toHijri(date = new Date(), adjust = 0) {
  const day = utcDay(date) + (adjust | 0);
  let offset = day - startDay;
  if (offset < 0) return tabular(day);
  let y = START.y, m = START.m;
  for (let i = 0; i < LENGTHS.length; i++) {
    const len = LENGTHS[i] === '1' ? 30 : 29;
    if (offset < len) return { y, m, d: offset + 1 };
    offset -= len;
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return tabular(day);
}

export function formatHijri(h, lang = 'en') {
  const names = MONTHS[lang] || MONTHS.en;
  return lang === 'en' ? `${h.d} ${names[h.m - 1]} ${h.y}` : `${h.d} ${names[h.m - 1]} ${h.y}هـ`;
}

export const isRamadan = (h) => h.m === 9;
export const isWhiteDay = (h) => h.d >= 13 && h.d <= 15;
