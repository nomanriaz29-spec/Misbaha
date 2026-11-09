import { Platform } from 'react-native';
import { getTimes, PRAYER_KEYS } from './prayer';
import { t, getLang } from '../i18n';

// Shared with the iOS widget extension through this App Group (see app.json and targets/prayer-widget).
export const APP_GROUP = 'group.com.nomanriaz.misbaha';
const DAYS = 30; // the widget keeps working for a month even if the app isn't opened

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
