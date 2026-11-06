import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const todayKey = () => {
  const n = new Date();
  return `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`;
};

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS);
    const s = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_SETTINGS, ...s, prayers: { ...DEFAULT_SETTINGS.prayers, ...(s.prayers || {}) } };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}
export async function saveSettings(s) {
  try { await AsyncStorage.setItem(SETTINGS, JSON.stringify(s)); } catch (e) {}
}

export async function loadProgress() {
  const fresh = { day: todayKey(), total: 0, cur: 'set:salah', prog: {} };
  try {
    const raw = await AsyncStorage.getItem(PROGRESS);
    if (!raw) return fresh;
    const p = JSON.parse(raw);
    if (p.day !== todayKey()) return { ...fresh, cur: p.cur || fresh.cur };
    return { ...fresh, ...p };
  } catch (e) {
    return fresh;
  }
}
export async function saveProgress(p) {
  try { await AsyncStorage.setItem(PROGRESS, JSON.stringify(p)); } catch (e) {}
}
