import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateKey } from './history';

// Qada: prayers owed from the past, and how many have been made up.
// Shape: { owed: { fajr: n, ... witr: n }, made: { fajr: n, ... }, days: { 'YYYY-MM-DD': n made up that day } }
// Kept only on the phone.

export const QADA = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'];
const KEY = 'ratb.qada';
const MAX = 100000; // about 270 years of one prayer a day: plenty, and keeps numbers sane
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const KEEP_DAYS = 60;

const int = (v) => (Number.isInteger(v) && v >= 0 ? Math.min(v, MAX) : 0);

export function emptyQada() {
  return { owed: Object.fromEntries(QADA.map((k) => [k, 0])), made: Object.fromEntries(QADA.map((k) => [k, 0])), days: {} };
}

export function cleanQada(raw) {
  const q = emptyQada();
  if (!raw || typeof raw !== 'object') return q;
  for (const k of QADA) {
    q.owed[k] = int(raw.owed?.[k]);
    q.made[k] = Math.min(int(raw.made?.[k]), q.owed[k]);
  }
  const days = Object.entries(raw.days || {}).filter(([d, n]) => DAY_RE.test(d) && Number.isInteger(n) && n > 0).sort(([a], [b]) => (a < b ? -1 : 1));
  q.days = Object.fromEntries(days.slice(-KEEP_DAYS).map(([d, n]) => [d, Math.min(n, MAX)]));
  return q;
}

export async function loadQada() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return cleanQada(raw ? JSON.parse(raw) : null);
  } catch (e) {
    return emptyQada();
  }
}
export async function saveQada(q) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(cleanQada(q))); } catch (e) {}
}

export const left = (q, k) => Math.max(0, (q.owed[k] || 0) - (q.made[k] || 0));

export function totals(q, today = dateKey(new Date())) {
  const owed = QADA.reduce((s, k) => s + q.owed[k], 0);
  const made = QADA.reduce((s, k) => s + q.made[k], 0);
  return { owed, made, left: owed - made, today: q.days[today] || 0, active: owed > 0 };
}

// Records n prayers of one kind made up (n < 0 undoes). Never goes below 0 or above what is owed.
export function makeUp(q, k, n = 1, today = dateKey(new Date())) {
  if (!QADA.includes(k)) return q;
  const made = Math.max(0, Math.min(q.owed[k], q.made[k] + n));
  const delta = made - q.made[k];
  if (!delta) return q;
  const day = Math.max(0, (q.days[today] || 0) + delta);
  const days = { ...q.days };
  if (day) days[today] = day; else delete days[today];
  return cleanQada({ ...q, made: { ...q.made, [k]: made }, days });
}

export function setOwed(q, k, n) {
  if (!QADA.includes(k)) return q;
  return cleanQada({ ...q, owed: { ...q.owed, [k]: int(n) } });
}

// "I missed about Y years and M months": one of each prayer per day (witr too for the Hanafi school).
// Lunar year is used, as most scholars count missed years by Hijri years.
export function estimate(q, years, months, withWitr) {
  const days = Math.round(Math.max(0, years) * 354.37 + Math.max(0, months) * 29.53);
  const owed = Object.fromEntries(QADA.map((k) => [k, k === 'witr' && !withWitr ? 0 : int(days)]));
  return cleanQada({ ...q, owed });
}

// Days in a row (up to today) with at least one prayer made up. Today counts once something is made up.
export function qadaStreak(q, now = new Date()) {
  const day = (n) => { const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return dateKey(d); };
  let n = q.days[day(0)] ? 0 : 1, streak = 0;
  while (n < KEEP_DAYS && q.days[day(n)]) { streak++; n++; }
  return streak;
}
