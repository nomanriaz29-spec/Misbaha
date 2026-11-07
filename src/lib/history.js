import AsyncStorage from '@react-native-async-storage/async-storage';
import { isValidKey, isDone, itemFor } from './recommend';

const KEY = 'misbaha.history';
const MAX_DAYS = 730; // keep two years on the phone

// History shape: { 'YYYY-MM-DD': { total, items: { key: taps }, done: { key: timesCompleted } } }

export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };

const num = (n, max) => (Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : 0);

function clean(h) {
  const out = {};
  if (!h || typeof h !== 'object') return out;
  for (const [day, v] of Object.entries(h)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !v || typeof v !== 'object') continue;
    const items = {}, done = {};
    for (const [k, n] of Object.entries(v.items || {})) if (isValidKey(k) && num(n, 1e6)) items[k] = num(n, 1e6);
    for (const [k, n] of Object.entries(v.done || {})) if (isValidKey(k) && num(n, 1000)) done[k] = num(n, 1000);
    const total = Object.values(items).reduce((a, b) => a + b, 0);
    if (total || Object.keys(done).length) out[day] = { total, items, done };
  }
  return out;
}

function prune(h) {
  const days = Object.keys(h).sort();
  if (days.length <= MAX_DAYS) return h;
  const out = {};
  days.slice(-MAX_DAYS).forEach((d) => { out[d] = h[d]; });
  return out;
}

export async function loadHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return clean(raw ? JSON.parse(raw) : null);
  } catch (e) {
    return {};
  }
}

// Writes are batched so fast tapping doesn't hammer storage; flush() on app background.
let timer = null, pending = null;
export function saveHistory(h) {
  pending = h;
  clearTimeout(timer);
  timer = setTimeout(flushHistory, 500);
}
export function flushHistory() {
  clearTimeout(timer);
  if (!pending) return;
  const data = JSON.stringify(prune(pending));
  pending = null;
  AsyncStorage.setItem(KEY, data).catch(() => {});
}

// Adds `delta` taps for `key` today, and `doneDelta` completions.
export function record(h, key, delta, doneDelta = 0) {
  if (!isValidKey(key)) return h;
  const day = dateKey();
  const prev = h?.[day] || { total: 0, items: {}, done: {} };
  const d = { total: prev.total, items: { ...prev.items }, done: { ...prev.done } };
  if (delta) {
    const n = Math.max(0, (d.items[key] || 0) + delta);
    if (n) d.items[key] = n; else delete d.items[key];
    d.total = Object.values(d.items).reduce((a, b) => a + b, 0);
  }
  if (doneDelta) {
    const n = Math.max(0, (d.done[key] || 0) + doneDelta);
    if (n) d.done[key] = n; else delete d.done[key];
  }
  return { ...(h || {}), [day]: d };
}

// First run after this update: turn today's existing counter progress into a history entry.
export function seedToday(h, progress) {
  const day = dateKey();
  if (h[day] || !progress || !progress.total) return h;
  const items = {}, done = {};
  for (const [k, p] of Object.entries(progress.prog || {})) {
    let taps = p.c || 0;
    if (k.startsWith('set:')) { const set = itemFor(k).set; for (let i = 0; i < Math.min(p.step, set.steps.length); i++) taps += set.steps[i][1]; }
    if (taps) items[k] = taps;
    if (isDone(k, p)) done[k] = 1;
  }
  const total = Object.values(items).reduce((a, b) => a + b, 0);
  return total ? { ...h, [day]: { total, items, done } } : h;
}

export function stats(h, now = new Date()) {
  const has = (k) => (h[k]?.total || 0) > 0;
  let current = 0;
  const d = new Date(now);
  if (!has(dateKey(d))) d.setDate(d.getDate() - 1); // today not started yet: streak still counts to yesterday
  while (has(dateKey(d))) { current++; d.setDate(d.getDate() - 1); }

  let best = 0, run = 0, prev = null;
  for (const k of Object.keys(h).filter(has).sort()) {
    const t = parseKey(k);
    run = prev && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  let week = 0;
  for (let i = 0; i < 7; i++) { const x = new Date(now); x.setDate(x.getDate() - i); week += h[dateKey(x)]?.total || 0; }
  const all = Object.values(h).reduce((a, v) => a + (v.total || 0), 0);
  return { current, best: Math.max(best, current), week, all };
}
