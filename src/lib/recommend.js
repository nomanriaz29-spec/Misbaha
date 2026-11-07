import { DHIKR, SETS } from '../data/adhkar';
import { DUAS } from '../data/duas';
import { getTimes } from './prayer';

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// True only for keys that name a real routine, dhikr or dua. Everything read back from
// storage or a notification goes through this, so a stale or tampered key can't crash the app.
export function isValidKey(key) {
  if (typeof key !== 'string' || key.length > 64) return false;
  const parts = key.split(':');
  if (parts.length !== 2) return false;
  const [type, id] = parts;
  if (type === 'set') return hasOwn(SETS, id);
  if (type === 'dua') return hasOwn(DUAS, id);
  if (type === 'one') return hasOwn(DHIKR, id);
  return false;
}

// Whether a counter entry has reached its final target (and isn't in "keep counting" mode).
export function isDone(key, p) {
  if (!p || !isValidKey(key)) return false;
  const k = itemFor(key, p.step);
  const last = k.type !== 'set' || k.step === k.set.steps.length - 1;
  return k.target > 0 && p.c >= k.target && last && !p.extra;
}

// Resolves any counter key ("set:salah", "one:subhan", "dua:sleep") to what the counter shows.
export function itemFor(key, step = 0) {
  const [type, id] = key.split(':');
  if (type === 'set') {
    const set = SETS[id];
    const s = Math.min(step, set.steps.length - 1);
    const [did, target] = set.steps[s];
    return { type, id, set, step: s, item: DHIKR[did], target };
  }
  if (type === 'dua') { const d = DUAS[id]; return { type, id, item: d, target: d.n || 1 }; }
  return { type, id, item: DHIKR[id], target: DHIKR[id].n };
}

export function labelFor(key) {
  const [type, id] = key.split(':');
  if (type === 'set') return SETS[id].name;
  if (type === 'dua') return DUAS[id].title;
  const d = DHIKR[id];
  return d.n ? `${d.tr} ×${d.n}` : d.tr;
}

// What to do next after finishing `key`: a routine that fits the time of day, then two companions.
export function recommend(key, settings, now = new Date()) {
  const out = [];
  const t = settings?.location ? getTimes(settings.location, settings, now) : null;
  if (t) {
    const n = now.getTime();
    if (n >= t.fajr.getTime() && n < t.sunrise.getTime() + 3 * 3600e3) out.push('set:morning');
    else if (n >= t.asr.getTime() && n < t.isha.getTime()) out.push('set:evening');
    else if (n >= t.isha.getTime() || n < t.fajr.getTime()) out.push('set:sleep');
  }
  const companions = {
    'set:salah': ['dua:rabbanaAtina', 'dua:parents', 'one:salawat'],
    'set:morning': ['dua:sayyid', 'dua:afini', 'one:salawat'],
    'set:evening': ['dua:sayyid', 'dua:afini', 'one:salawat'],
    'set:sleep': ['dua:sleep', 'one:tawbah', 'dua:afuww'],
  };
  const fallback = key.startsWith('dua:') ? ['one:salawat', 'one:astaghfir', 'dua:accept'] : ['one:salawat', 'dua:rabbanaAtina', 'one:subhanBihamdihi'];
  out.push(...(companions[key] || fallback));
  return [...new Set(out)].filter((k) => k !== key).slice(0, 3);
}
