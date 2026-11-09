import { DHIKR, SETS } from '../data/adhkar';
import { DUAS } from '../data/duas';
import { getTimes } from './prayer';
import { t, c, getLang } from '../i18n';

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// The user's own dhikr, keyed by id (see src/lib/custom.js). Set by the app after loading.
let CUSTOM = {};
export function setCustomRegistry(list) {
  CUSTOM = {};
  (list || []).forEach((d) => { CUSTOM[d.id] = d; });
}
export const customList = () => Object.values(CUSTOM);

// True only for keys that name a real routine, dhikr or dua. Everything read back from
// storage or a notification goes through this, so a stale or tampered key can't crash the app.
// Custom keys ("my:<id>") are accepted by shape so history survives deleting one.
export function isValidKey(key) {
  if (typeof key !== 'string' || key.length > 64) return false;
  const parts = key.split(':');
  if (parts.length !== 2) return false;
  const [type, id] = parts;
  if (type === 'set') return hasOwn(SETS, id);
  if (type === 'dua') return hasOwn(DUAS, id);
  if (type === 'one') return hasOwn(DHIKR, id);
  if (type === 'my') return /^[a-z0-9]{3,24}$/.test(id);
  return false;
}

// A key the counter can open right now (a deleted custom dhikr can't be).
export const isOpenableKey = (key) => isValidKey(key) && (!key.startsWith('my:') || hasOwn(CUSTOM, key.slice(3)));

// Whether a counter entry has reached its final target (and isn't in "keep counting" mode).
export function isDone(key, p) {
  if (!p || !isValidKey(key)) return false;
  const k = itemFor(key, p.step);
  const last = k.type !== 'set' || k.step === k.set.steps.length - 1;
  return k.target > 0 && p.c >= k.target && last && !p.extra;
}

// Resolves any counter key ("set:salah", "one:subhan", "dua:sleep", "my:abc") to what the counter shows.
export function itemFor(key, step = 0) {
  const [type, id] = key.split(':');
  if (type === 'set') {
    const set = SETS[id];
    const s = Math.min(step, set.steps.length - 1);
    const [did, target] = set.steps[s];
    return { type, id, set, step: s, item: { ...DHIKR[did], id: did }, target };
  }
  if (type === 'dua') { const d = DUAS[id]; return { type, id, item: { ...d, id }, target: d.n || 1 }; }
  if (type === 'my') {
    const d = CUSTOM[id];
    if (!d) return { type, id, item: { id, ar: '', tr: t('custom.deleted'), en: '', n: 0, custom: true }, target: 0 };
    return { type, id, item: { ...d, custom: true }, target: d.n };
  }
  return { type, id, item: { ...DHIKR[id], id }, target: DHIKR[id].n };
}

// Localised names for display.
export const setName = (id) => c('sets', id, 'name') || SETS[id].name;
export const setSub = (id) => c('sets', id, 'sub') || SETS[id].sub;
export const duaField = (id, f) => c('duas', id, f) || DUAS[id][f];
export const dhikrMeaning = (id) => (getLang() === 'en' ? DHIKR[id].en : c('dhikr', id, 'en'));

// Short name for a dhikr: transliteration in English, Arabic text in Arabic and Urdu.
export function dhikrName(item) {
  if (getLang() === 'en' || !item.ar) return item.tr || item.ar;
  return item.ar.replace(/[ً-ٰٟ]/g, ''); // without diacritics, easier to scan
}

export function labelFor(key) {
  const [type, id] = key.split(':');
  if (type === 'set') return setName(id);
  if (type === 'dua') return duaField(id, 'title');
  const d = itemFor(key).item;
  const name = dhikrName(d);
  return d.n ? `${name} ×${d.n}` : name;
}

// What to do next after finishing `key`: a routine that fits the time of day, then two companions.
export function recommend(key, settings, now = new Date()) {
  const out = [];
  const tm = settings?.location ? getTimes(settings.location, settings, now) : null;
  if (tm) {
    const n = now.getTime();
    if (n >= tm.fajr.getTime() && n < tm.sunrise.getTime() + 3 * 3600e3) out.push('set:morning');
    else if (n >= tm.asr.getTime() && n < tm.isha.getTime()) out.push('set:evening');
    else if (n >= tm.isha.getTime() || n < tm.fajr.getTime()) out.push('set:sleep');
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
