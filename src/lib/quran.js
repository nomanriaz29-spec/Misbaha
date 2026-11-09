import AsyncStorage from '@react-native-async-storage/async-storage';

// Quran text is large, so each file is only loaded the first time it's needed.
let AR = null, EN = null, UR = null, META = null;
export const meta = () => (META || (META = require('../data/quran/meta.json')));
export const arabic = (s) => (AR || (AR = require('../data/quran/ar.json')))[s - 1];
export function translation(s, lang) {
  if (lang === 'en') return (EN || (EN = require('../data/quran/en.json')))[s - 1];
  if (lang === 'ur') return (UR || (UR = require('../data/quran/ur.json')))[s - 1];
  return null;
}

// meta row: [arabicName, name, englishMeaning, 'M'|'D', verses, juz, page]
export const surahInfo = (s) => {
  const m = meta()[s - 1];
  return { n: s, ar: m[0], name: m[1], meaning: m[2], place: m[3], verses: m[4], juz: m[5], page: m[6] };
};

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const arabicNumber = (n) => String(n).replace(/\d/g, (d) => AR_DIGITS[d]);
export const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
export const hasBismillahHeader = (s) => s !== 1 && s !== 9;

const KEY = 'ratb.quran';
const DEFAULT = { last: null, marks: [], showTr: true, size: 1 };
const validRef = (r) => r && Number.isInteger(r.s) && r.s >= 1 && r.s <= 114 && Number.isInteger(r.a) && r.a >= 1 && r.a <= 286;

export async function loadQuranState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const s = raw ? JSON.parse(raw) : {};
    return {
      last: validRef(s.last) ? { s: s.last.s, a: s.last.a } : null,
      marks: Array.isArray(s.marks) ? s.marks.filter(validRef).slice(0, 200).map((m) => ({ s: m.s, a: m.a })) : [],
      showTr: s.showTr !== false,
      size: [0.85, 1, 1.2, 1.4].includes(s.size) ? s.size : 1,
    };
  } catch (e) {
    return { ...DEFAULT };
  }
}
export async function saveQuranState(state) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}
