// "My mosque": the user's nearest mosque and its jamaat (congregation) times.
// Mosques are found with OpenStreetMap's Overpass API, only when the user taps "Find nearby
// mosques". That one request sends the rounded location (about 1 km) to OpenStreetMap; nothing
// else leaves the phone. Jamaat times are set once by the user, since mosques set their own.
import { getTimes, distanceKm } from './prayer';

export const JAMAAT_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah'];
export const REMIND_OPTIONS = [0, 10, 15, 20, 30];
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

// Defaults: jamaat this many minutes after the azan; Jumu'ah at a fixed time.
export const DEFAULT_JAMAAT = {
  fajr: { mode: 'after', min: 20 },
  dhuhr: { mode: 'after', min: 30 },
  asr: { mode: 'after', min: 20 },
  maghrib: { mode: 'after', min: 5 },
  isha: { mode: 'after', min: 20 },
  jumuah: { mode: 'fixed', time: '13:30' },
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function cleanMosque(m) {
  if (!m || typeof m !== 'object') return null;
  const name = typeof m.name === 'string' ? m.name.trim().slice(0, 80) : '';
  if (!name) return null;
  const lat = Number(m.lat), lng = Number(m.lng);
  const hasPos = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const jamaat = {};
  for (const k of JAMAAT_KEYS) {
    const j = m.jamaat?.[k];
    if (j?.mode === 'fixed' && TIME_RE.test(j.time || '')) jamaat[k] = { mode: 'fixed', time: j.time };
    else if (j?.mode === 'after' && Number.isInteger(j.min) && j.min >= 0 && j.min <= 120) jamaat[k] = { mode: 'after', min: j.min };
    else jamaat[k] = { ...DEFAULT_JAMAAT[k] };
  }
  return {
    name,
    osm: typeof m.osm === 'string' && /^(node|way|relation)\/\d+$/.test(m.osm) ? m.osm : '',
    lat: hasPos ? Math.round(lat * 1e5) / 1e5 : null,
    lng: hasPos ? Math.round(lng * 1e5) / 1e5 : null,
    jamaat,
    remind: REMIND_OPTIONS.includes(m.remind) ? m.remind : 0,
  };
}

export function overpassQuery(lat, lng, radius) {
  const a = `(around:${radius},${lat},${lng})`;
  return `[out:json][timeout:20];(node["amenity"="place_of_worship"]["religion"="muslim"]${a};way["amenity"="place_of_worship"]["religion"="muslim"]${a};relation["amenity"="place_of_worship"]["religion"="muslim"]${a};);out center 80;`;
}

// Turns the Overpass answer into a list sorted by distance from the user.
export function parseMosques(json, lat, lng, lang = 'en') {
  const out = [];
  for (const el of json?.elements || []) {
    const pLat = el.lat ?? el.center?.lat, pLng = el.lon ?? el.center?.lon;
    if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) continue;
    const tg = el.tags || {};
    const name = (lang === 'ur' && tg['name:ur']) || (lang === 'ar' && tg['name:ar']) || tg.name || tg['name:en'] || tg['name:ur'] || tg['name:ar'] || '';
    out.push({
      osm: `${el.type}/${el.id}`,
      name: String(name).trim().slice(0, 80),
      lat: pLat,
      lng: pLng,
      km: distanceKm({ lat, lng }, { lat: pLat, lng: pLng }),
      denomination: tg.denomination || '',
    });
  }
  out.sort((x, y) => x.km - y.km);
  const seen = new Set();
  return out.filter((m) => (seen.has(m.osm) ? false : seen.add(m.osm))).slice(0, 30);
}

async function post(url, body, ms) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), ms) : null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: 'data=' + encodeURIComponent(body),
      signal: ctrl?.signal,
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Nearest mosques around a point. Widens the search if there are fewer than 5 within 2 km.
// Throws 'offline' when no server answers.
export async function findMosques(lat, lng, lang = 'en') {
  const la = Math.round(lat * 100) / 100, ln = Math.round(lng * 100) / 100; // about 1 km, for privacy
  let lastErr = null;
  for (const radius of [2000, 6000]) {
    let json = null;
    for (const url of ENDPOINTS) {
      try { json = await post(url, overpassQuery(la, ln, radius), 20000); break; } catch (e) { lastErr = e; }
    }
    if (!json) throw new Error('offline' + (lastErr ? ': ' + lastErr.message : ''));
    const list = parseMosques(json, lat, lng, lang);
    if (list.length >= 5 || radius === 6000) return list;
  }
  return [];
}

const pad = (n) => String(n).padStart(2, '0');
export const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Jamaat time for each prayer on a given day (Jumu'ah replaces Dhuhr on Fridays).
export function jamaatTimes(settings, date = new Date()) {
  const m = settings?.mosque;
  if (!m || !settings.location) return null;
  const azan = getTimes(settings.location, settings, date);
  const out = {};
  for (const k of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    const j = k === 'dhuhr' && date.getDay() === 5 ? m.jamaat.jumuah : m.jamaat[k];
    if (j.mode === 'fixed') {
      const [h, mi] = j.time.split(':').map(Number);
      const d = new Date(date); d.setHours(h, mi, 0, 0);
      out[k] = d;
    } else {
      out[k] = new Date(azan[k].getTime() + j.min * 60000);
    }
  }
  out.isJumuah = date.getDay() === 5;
  return out;
}

// Moves a fixed "HH:MM" time by n minutes (wrapping around midnight).
export function shiftTime(time, n) {
  const [h, m] = time.split(':').map(Number);
  const t = (((h * 60 + m + n) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}
