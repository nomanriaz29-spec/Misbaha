// Share a mosque's jamaat timetable without a server: the mosque is packed into a short code
// ("RATB1." + base64url JSON). The code travels in a message, a link to Ratb's timetable page
// (which shows the times to anyone and opens Ratb), or a misbaha://mosque/<code> link.
import { cleanMosque, JAMAAT_KEYS, jamaatTimes } from './mosque';
import { fmtTime } from './prayer';
import { t } from '../i18n';

export const PREFIX = 'RATB1.';
export const PAGE = 'https://nomanriaz29-spec.github.io/Misbaha/m/';
const CODE_RE = /RATB1\.([A-Za-z0-9_-]{8,3000})/;

// UTF-8 <-> base64url, with no dependencies (mosque names are often Urdu or Arabic).
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function utf8(str) {
  const out = [];
  for (const ch of str) {
    let c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}
function fromUtf8(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i];
    let c, n;
    if (b < 0x80) { c = b; n = 1; } else if (b >> 5 === 6) { c = b & 31; n = 2; } else if (b >> 4 === 14) { c = b & 15; n = 3; } else if (b >> 3 === 30) { c = b & 7; n = 4; } else throw new Error('utf8');
    if (i + n > bytes.length) throw new Error('utf8');
    for (let k = 1; k < n; k++) { if (bytes[i + k] >> 6 !== 2) throw new Error('utf8'); c = (c << 6) | (bytes[i + k] & 63); }
    s += String.fromCodePoint(c);
    i += n;
  }
  return s;
}
export function b64urlEncode(str) {
  const b = utf8(str);
  let out = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < b.length) out += B64[(n >> 6) & 63];
    if (i + 2 < b.length) out += B64[n & 63];
  }
  return out;
}
export function b64urlDecode(s) {
  const bytes = [];
  let buf = 0, bits = 0;
  for (const ch of s) {
    const v = B64.indexOf(ch);
    if (v < 0) throw new Error('b64');
    buf = (buf << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; bytes.push((buf >> bits) & 255); }
  }
  return fromUtf8(bytes);
}

// Compact form: { n: name, o: osm id, a: lat, g: lng, j: ['a20', 'f13:30', ...] in JAMAAT_KEYS order }.
export function encodeMosque(mosque) {
  const m = cleanMosque(mosque);
  if (!m) return null;
  const c = { n: m.name, j: JAMAAT_KEYS.map((k) => (m.jamaat[k].mode === 'fixed' ? 'f' + m.jamaat[k].time : 'a' + m.jamaat[k].min)) };
  if (m.osm) c.o = m.osm;
  if (m.lat != null) { c.a = m.lat; c.g = m.lng; }
  return PREFIX + b64urlEncode(JSON.stringify(c));
}

export function decodeMosque(code) {
  try {
    const s = String(code || '');
    const body = s.startsWith(PREFIX) ? s.slice(PREFIX.length) : s;
    const c = JSON.parse(b64urlDecode(body));
    if (!c || typeof c !== 'object' || !Array.isArray(c.j) || c.j.length !== JAMAAT_KEYS.length) return null;
    const jamaat = {};
    JAMAAT_KEYS.forEach((k, i) => {
      const v = String(c.j[i] || '');
      jamaat[k] = v[0] === 'f' ? { mode: 'fixed', time: v.slice(1) } : { mode: 'after', min: Number(v.slice(1)) };
    });
    const m = cleanMosque({ name: c.n, osm: c.o, lat: c.a, lng: c.g, jamaat, remind: 0 });
    // cleanMosque replaces bad entries with defaults; a shared timetable must be exact, so reject those.
    if (!m) return null;
    for (const k of JAMAAT_KEYS) {
      const want = jamaat[k];
      const got = m.jamaat[k];
      if (want.mode !== got.mode || (want.mode === 'fixed' ? want.time !== got.time : want.min !== got.min)) return null;
    }
    return m;
  } catch (e) {
    return null;
  }
}

// Finds a timetable in any text: a pasted message, a page link or a misbaha:// link.
export function findTimetable(text) {
  const m = CODE_RE.exec(String(text || ''));
  return m ? decodeMosque(PREFIX + m[1]) : null;
}

export const shareLink = (code) => PAGE + '#' + code;

// The message people share in WhatsApp groups: readable without the app, importable with it.
export function shareMessage(mosque, settings, date = new Date()) {
  const m = cleanMosque(mosque);
  const code = encodeMosque(m);
  if (!m || !code) return '';
  const jt = settings?.location ? jamaatTimes({ ...settings, mosque: m }, date) : null;
  const lines = [t('share.heading', { name: m.name })];
  for (const k of JAMAAT_KEYS) {
    const j = m.jamaat[k];
    const name = k === 'jumuah' ? t('jamaat.jumuah') : t('prayer.' + k);
    const rule = j.mode === 'fixed' ? fmtTime(new Date(`2000-01-01T${j.time}:00`)) : t('share.after', { n: j.min });
    const today = k !== 'jumuah' && !(k === 'dhuhr' && jt?.isJumuah) && jt?.[k] && j.mode === 'after' ? ' ' + t('share.today', { time: fmtTime(jt[k]) }) : '';
    lines.push(`${name}: ${rule}${today}`);
  }
  lines.push('', t('share.open'), shareLink(code));
  return lines.join('\n');
}
