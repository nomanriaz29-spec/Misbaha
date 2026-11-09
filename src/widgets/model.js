// What the home-screen widgets show, worked out from the saved settings.
// Pure functions (no React, no native modules) so they can be tested in Node.
import { getTimes, PRAYER_KEYS, fmtTime } from '../lib/prayer';
import { toHijri, formatHijri } from '../lib/hijri';
import { verseFor } from '../lib/verseOfDay';
import { t, getLang, isRTL } from '../i18n';
import { SALAH, isPrayed, salahStats } from '../lib/salah';
import { dateKey } from '../lib/history';

const pad = (n) => String(n).padStart(2, '0');

// Today's five prayers, which one is next (tomorrow's Fajr after Isha), the Hijri date.
export function prayerModel(settings, now = new Date()) {
  if (!settings?.location) return null;
  const today = getTimes(settings.location, settings, now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = getTimes(settings.location, settings, tomorrowDate);
  const list = PRAYER_KEYS.map((key) => ({ key, name: t('prayer.' + key), at: today[key], time: fmtTime(today[key]) }));
  let next = list.find((p) => p.at.getTime() > now.getTime());
  if (!next) next = { key: 'fajr', name: t('prayer.fajr'), at: tomorrow.fajr, time: fmtTime(tomorrow.fajr), tomorrow: true };
  return {
    place: settings.location.name || '',
    list,
    next,
    nextKey: next.tomorrow ? null : next.key, // which row of today's list to highlight
    hijri: formatHijri(toHijri(now, settings.hijriAdjust || 0), getLang()),
    rtl: isRTL(),
    lang: getLang(),
    labels: { next: t('widget.next'), title: t('prayers.title'), open: t('widget.open') },
  };
}

export function verseModel(now = new Date(), every = 'day') {
  const lang = getLang();
  const hourly = every === 'hour';
  return { ...verseFor(now, lang, hourly ? 'hour' : 'day'), title: t(hourly ? 'widget.verseHourTitle' : 'widget.verseTitle'), rtl: isRTL(), lang };
}

// Android only refreshes a widget every 30 minutes on its own, so after each prayer begins the
// highlight could lag. This is the time of the next change, for logging and tests.
export function nextChange(model) {
  return model?.next?.at || null;
}

export const dayStamp = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Prayer tracker widget: today's five prayers, which are ticked, which have started.
export function salahModel(settings, log, now = new Date()) {
  const day = dateKey(now);
  const times = settings?.location ? getTimes(settings.location, settings, now) : null;
  const items = SALAH.map((key) => ({
    key,
    name: t('prayer.' + key),
    time: times ? fmtTime(times[key]) : '',
    prayed: isPrayed(log, day, key),
    due: times ? times[key].getTime() <= now.getTime() : true,
  }));
  const st = salahStats(log || {}, now);
  return { day, items, count: items.filter((i) => i.prayed).length, streak: st.streak, title: t('salah.title'), streakLabel: t('salah.streakShort'), rtl: isRTL(), lang: getLang() };
}
