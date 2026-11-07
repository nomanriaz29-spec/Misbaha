import AsyncStorage from '@react-native-async-storage/async-storage';
import { METHODS } from './prayer';
import { isValidKey, itemFor } from './recommend';

const SETTINGS = 'misbaha.settings';
const PROGRESS = 'misbaha.progress';

export const DEFAULT_SETTINGS = {
  location: null, // { lat, lng, name, country, source: 'gps' | 'manual' }
  method: 'MuslimWorldLeague',
  madhab: 'Shafi',
  offset: 15, // minutes after the prayer
  prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  daily: true,
  haptics: true,
  onboarded: false,
};
const OFFSETS = [5, 10, 15, 20, 30];

export const todayKey = () => {
  const n = new Date();
  return `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`;
};

// About 1 km precision: plenty for prayer times and Qibla, and less sensitive to keep on the phone.
export const roundCoord = (x) => Math.round(x * 100) / 100;

export function cleanLocation(l) {
  if (!l || typeof l !== 'object') return null;
  const lat = Number(l.lat), lng = Number(l.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return {
    lat: roundCoord(lat),
    lng: roundCoord(lng),
    name: String(l.name || '').slice(0, 80),
    country: /^[A-Za-z]{2}$/.test(l.country || '') ? l.country.toUpperCase() : '',
    source: l.source === 'gps' ? 'gps' : 'manual',
  };
}

// Never trust stored JSON: keep only known fields with valid values.
function cleanSettings(s) {
  const d = DEFAULT_SETTINGS;
  if (!s || typeof s !== 'object') return { ...d, prayers: { ...d.prayers } };
  const prayers = {};
  for (const k of Object.keys(d.prayers)) prayers[k] = typeof s.prayers?.[k] === 'boolean' ? s.prayers[k] : d.prayers[k];
  const location = cleanLocation(s.location);
  return {
    location,
    method: Object.prototype.hasOwnProperty.call(METHODS, s.method) ? s.method : d.method,
    madhab: s.madhab === 'Hanafi' ? 'Hanafi' : 'Shafi',
    offset: OFFSETS.includes(s.offset) ? s.offset : d.offset,
    prayers,
    daily: typeof s.daily === 'boolean' ? s.daily : d.daily,
    haptics: typeof s.haptics === 'boolean' ? s.haptics : d.haptics,
    onboarded: s.onboarded === true && !!location,
  };
}

function cleanProgress(p, fresh) {
  if (!p || typeof p !== 'object') return fresh;
  const cur = isValidKey(p.cur) ? p.cur : fresh.cur;
  if (p.day !== todayKey()) return { ...fresh, cur };
  const prog = {};
  for (const [k, v] of Object.entries(p.prog || {})) {
    if (!isValidKey(k) || !v || typeof v !== 'object') continue;
    const c = Number.isFinite(v.c) && v.c >= 0 ? Math.min(Math.floor(v.c), 1e6) : 0;
    let step = Number.isInteger(v.step) && v.step >= 0 ? v.step : 0;
    if (k.startsWith('set:')) step = Math.min(step, itemFor(k).set.steps.length - 1);
    prog[k] = { step, c, extra: v.extra === true };
  }
  const total = Number.isFinite(p.total) && p.total >= 0 ? Math.min(Math.floor(p.total), 1e7) : 0;
  return { day: fresh.day, total, cur, prog };
}

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS);
    return cleanSettings(raw ? JSON.parse(raw) : null);
  } catch (e) {
    return cleanSettings(null);
  }
}
export async function saveSettings(s) {
  try { await AsyncStorage.setItem(SETTINGS, JSON.stringify(cleanSettings(s))); } catch (e) {}
}

export async function loadProgress() {
  const fresh = { day: todayKey(), total: 0, cur: 'set:salah', prog: {} };
  try {
    const raw = await AsyncStorage.getItem(PROGRESS);
    return raw ? cleanProgress(JSON.parse(raw), fresh) : fresh;
  } catch (e) {
    return fresh;
  }
}
export async function saveProgress(p) {
  try { await AsyncStorage.setItem(PROGRESS, JSON.stringify(p)); } catch (e) {}
}
