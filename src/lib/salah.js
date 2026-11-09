import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateKey } from './history';

// Prayer tracker: which of the five prayers were prayed each day.
// Shape: { 'YYYY-MM-DD': { fajr: { v: 1 | 0, at: unix ms } } }
// `at` is when it was last changed, so a tick made on a widget and one made in the app
// can be merged: the newer one wins.

export const SALAH = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const KEY = 'ratb.salah';
const MAX_DAYS = 730;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function cleanSalah(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [d, day] of Object.entries(raw)) {
    if (!DAY_RE.test(d) || !day || typeof day !== 'object') continue;
    const clean = {};
    for (const k of SALAH) {
      const e = day[k];
      if (e && typeof e === 'object' && (e.v === 0 || e.v === 1) && Number.isFinite(e.at)) clean[k] = { v: e.v, at: e.at };
    }
    if (Object.keys(clean).length) out[d] = clean;
  }
  const keys = Object.keys(out).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_DAYS))) delete out[k];
  return out;
}

export async function loadSalah() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return cleanSalah(raw ? JSON.parse(raw) : {});
  } catch (e) {
    return {};
  }
}
export async function saveSalah(log) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(cleanSalah(log))); } catch (e) {}
}

export const isPrayed = (log, day, k) => log?.[day]?.[k]?.v === 1;
export const prayedCount = (log, day) => SALAH.filter((k) => isPrayed(log, day, k)).length;

export function setPrayed(log, day, k, v, at = Date.now()) {
  if (!DAY_RE.test(day) || !SALAH.includes(k)) return log;
  return { ...log, [day]: { ...(log[day] || {}), [k]: { v: v ? 1 : 0, at } } };
}
export const togglePrayed = (log, day, k, at = Date.now()) => setPrayed(log, day, k, !isPrayed(log, day, k), at);

// Ticks made elsewhere (the iPhone widget): same shape; each entry wins if it is newer.
export function mergeSalah(log, edits) {
  const clean = cleanSalah(edits);
  let out = log, changed = false;
  for (const [d, day] of Object.entries(clean)) {
    for (const [k, e] of Object.entries(day)) {
      const cur = out[d]?.[k];
      if (!cur || e.at > cur.at) { out = { ...out, [d]: { ...(out[d] || {}), [k]: e } }; changed = true; }
    }
  }
  return { log: out, changed };
}

// Streak = days in a row with all five prayers. Today counts once it is complete;
// until then the streak runs to yesterday, so it doesn't drop to zero every morning.
export function salahStats(log, now = new Date()) {
  const day = (n) => { const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return dateKey(d); };
  let streak = 0;
  for (let n = prayedCount(log, day(0)) === 5 ? 0 : 1; n < MAX_DAYS && prayedCount(log, day(n)) === 5; n++) streak++;
  let week = 0;
  for (let n = 0; n < 7; n++) week += prayedCount(log, day(n));
  let best = 0, run = 0;
  const keys = Object.keys(log).sort();
  let prev = null;
  for (const k of keys) {
    const full = prayedCount(log, k) === 5;
    const d = new Date(k + 'T12:00:00');
    const consecutive = prev && Math.round((d - prev) / 86400000) === 1;
    run = full ? (consecutive ? run + 1 : 1) : 0;
    if (full) prev = d; else prev = null;
    best = Math.max(best, run);
  }
  return { today: prayedCount(log, day(0)), streak, week, best: Math.max(best, streak), last7: [6, 5, 4, 3, 2, 1, 0].map((n) => ({ day: day(n), n: prayedCount(log, day(n)) })) };
}
