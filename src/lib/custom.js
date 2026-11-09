import AsyncStorage from '@react-native-async-storage/async-storage';

// The user's own dhikr. Counter key: "my:<id>".
const KEY = 'ratb.custom';
export const MAX_CUSTOM = 50;

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export function cleanCustom(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const d of list) {
    if (!d || typeof d !== 'object' || !/^[a-z0-9]{3,24}$/.test(d.id || '') || seen.has(d.id)) continue;
    const tr = clip(d.tr, 80);
    const ar = clip(d.ar, 400);
    if (!tr && !ar) continue;
    const n = Number.isInteger(d.n) && d.n >= 0 && d.n <= 100000 ? d.n : 33;
    out.push({ id: d.id, tr, ar, en: clip(d.en, 200), n });
    seen.add(d.id);
    if (out.length >= MAX_CUSTOM) break;
  }
  return out;
}

export async function loadCustom() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return cleanCustom(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return [];
  }
}

export async function saveCustom(list) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(cleanCustom(list))); } catch (e) {}
}

export const newCustomId = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).slice(0, 16);
