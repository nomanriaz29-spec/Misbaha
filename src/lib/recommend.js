import { DHIKR, SETS } from '../data/adhkar';
import { DUAS } from '../data/duas';
import { getTimes } from './prayer';

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
