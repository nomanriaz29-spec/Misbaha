import { Platform } from 'react-native';
import { getTimes, PRAYER_KEYS } from './prayer';
import { t, getLang } from '../i18n';
import { verseFor, slotStart } from './verseOfDay';
import { refreshAndroidWidgets } from '../widgets/android';
import { SALAH, mergeSalah, saveSalah, salahStats } from './salah';
import { dateKey } from './history';

// Shared with the iOS widget extension through this App Group (see app.json and targets/prayer-widget).
export const APP_GROUP = 'group.com.nomanriaz.misbaha';
const DAYS = 30;
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; // the widget keeps working for a month even if the app isn't opened

let ExtensionStorage = null;
if (Platform.OS === 'ios') {
  try {
    // Not available in Expo Go; the widget only exists in real builds.
    ExtensionStorage = require('@bacons/apple-targets').ExtensionStorage;
  } catch (e) {
    ExtensionStorage = null;
  }
}

// Writes the next 30 days of prayer times for the widget and asks iOS to redraw it.
// Shape: { place, updated, days: [{ d: 'YYYY-MM-DD', t: [fajr, dhuhr, asr, maghrib, isha] (unix seconds) }],
//          labels: { names: [5 prayer names], next, inPrefix, open, rtl } }  (labels follow the app's language)
export function updateWidget(settings) {
  if (Platform.OS === 'android') { refreshAndroidWidgets(settings); return; }
  updateVerseWidget(settings);
  if (!ExtensionStorage || !settings?.location) return;
  try {
    const days = [];
    for (let i = 0; i < DAYS; i++) {
      const day = new Date();
      day.setHours(12, 0, 0, 0);
      day.setDate(day.getDate() + i);
      const tm = getTimes(settings.location, settings, day);
      const d = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      days.push({ d, t: PRAYER_KEYS.map((k) => Math.floor(tm[k].getTime() / 1000)) });
    }
    const storage = new ExtensionStorage(APP_GROUP);
    const labels = {
      names: PRAYER_KEYS.map((k) => t('prayer.' + k)),
      next: t('widget.next'),
      inPrefix: t('widget.in'),
      open: t('widget.open'),
      rtl: getLang() !== 'en',
      lang: getLang(),
    };
    storage.set('prayers', JSON.stringify({ place: settings.location.name || '', updated: Math.floor(Date.now() / 1000), days, labels }));
    ExtensionStorage.reloadWidget();
  } catch (e) {}
}

// Verse widget: the coming verses in the app's language, so it keeps changing without the app
// being opened: 30 days ahead when it changes daily, 7 days (168 verses) when it changes hourly.
// Shape: { days: [{ t: start (unix s), d: 'YYYY-MM-DD', s, a, ar, tr (null in Arabic), ref }],
//          labels: { title, open, rtl, lang, every: 'day' | 'hour' } }
let lastVerseWrite = '';
export function updateVerseWidget(settings) {
  if (!ExtensionStorage) return;
  const lang = getLang();
  const every = settings?.verseEvery === 'hour' ? 'hour' : 'day';
  const now = new Date();
  const first = slotStart(now, every);
  const stamp = dayKey(now) + lang + every;
  if (stamp === lastVerseWrite) return; // already written today with these settings
  try {
    const days = [];
    const count = every === 'hour' ? 7 * 24 : DAYS;
    for (let i = 0; i < count; i++) {
      const at = new Date(first);
      if (every === 'hour') at.setHours(at.getHours() + i);
      else at.setDate(at.getDate() + i);
      days.push({ t: Math.floor(at.getTime() / 1000), d: dayKey(at), ...verseFor(at, lang, every) });
    }
    const labels = { title: t(every === 'hour' ? 'widget.verseHourTitle' : 'widget.verseTitle'), open: t('widget.verseOpen'), rtl: lang !== 'en', lang, every };
    new ExtensionStorage(APP_GROUP).set('verses', JSON.stringify({ days, labels }));
    ExtensionStorage.reloadWidget();
    lastVerseWrite = stamp;
  } catch (e) {}
}

// Prayer tracker widget (iPhone). The app writes the last 8 days of ticks as "salah"; the widget's
// buttons write their own ticks as "salahEdits" (JSON data, each with the time it was made).
// Here the widget's ticks are merged into the app's log (newer wins), then "salah" is rewritten.
// Returns { log, changed } so the app can show ticks made on the widget.
export function syncSalahWidget(log) {
  if (!ExtensionStorage) return { log, changed: false };
  let result = { log, changed: false };
  try {
    const storage = new ExtensionStorage(APP_GROUP);
    const raw = storage.get('salahEdits');
    if (raw) {
      result = mergeSalah(log, JSON.parse(raw));
      if (result.changed) saveSalah(result.log);
      storage.remove('salahEdits');
    }
    const days = {};
    const now = new Date();
    for (let i = 0; i < 8; i++) {
      const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i);
      const k = dateKey(d);
      if (result.log[k]) days[k] = result.log[k];
    }
    const st = salahStats(result.log, now);
    const labels = { title: t('salah.title'), names: SALAH.map((k) => t('prayer.' + k)), streak: t('salah.streakShort'), rtl: getLang() !== 'en', lang: getLang() };
    storage.set('salah', JSON.stringify({ days, streak: st.streak, labels }));
    ExtensionStorage.reloadWidget();
  } catch (e) {}
  return result;
}
