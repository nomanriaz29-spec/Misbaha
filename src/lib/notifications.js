import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getTimes, PRAYERS } from './prayer';
import { DAILY } from '../data/adhkar';
import { updateWidget } from './widget';
import { toHijri, isRamadan } from './hijri';
import { t } from '../i18n';
import { dateKey } from './history';

const CHANNEL = 'reminders';

// Prayer-time alert sounds. Android fixes a channel's sound when it is created,
// so each sound gets its own channel. iOS plays the file named in the notification.
// Both files are under 30 seconds (iOS's limit) and bundled by the expo-notifications plugin.
export const ALERT_SOUNDS = {
  azan: { file: 'azan.wav', channel: 'prayer-azan', channelName: 'Prayer time: azan' },
  alarm: { file: 'alarm.wav', channel: 'prayer-alarm', channelName: 'Prayer time: alarm' },
  standard: { file: 'default', channel: 'prayer-standard', channelName: 'Prayer time: standard sound' },
};

const IOS_PENDING_LIMIT = 64;
const DAY = 86400000;

// Show notifications as banners (with their sound) even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// "Prayed ✓" button on prayer notifications: ticks the prayer in the tracker without opening the app.
export const PRAYED_ACTION = 'prayed';
async function setupCategory() {
  try {
    await Notifications.setNotificationCategoryAsync('prayer', [
      { identifier: PRAYED_ACTION, buttonTitle: t('salah.prayedAction'), options: { opensAppToForeground: false } },
    ]);
  } catch (e) {}
}

export async function setupChannel() {
  await setupCategory();
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Tasbeeh reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: '#D6A651',
    sound: 'default',
  });
  for (const s of Object.values(ALERT_SOUNDS)) {
    await Notifications.setNotificationChannelAsync(s.channel, {
      name: s.channelName,
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#D6A651',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: s.file,
    });
  }
}

export async function requestNotificationPermission() {
  await setupChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const res = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return res.granted;
}

export async function hasNotificationPermission() {
  const p = await Notifications.getPermissionsAsync();
  return p.granted;
}

// Clears everything and schedules, for each enabled prayer:
//   - an alert AT the prayer time, with the chosen sound (azan by default)
//   - a tasbeeh reminder a few minutes after it
// plus the three daily tasbeeh. Safe to call often (app open, settings change, background task).
// What was scheduled last time, for the status line in Prayers (next reminder, errors).
let lastRun = { at: 0, count: 0, failed: 0, error: '', upcoming: [] };
export const lastSchedule = () => lastRun;

// Calls are queued so two refreshes (app opening and a settings change at the same moment)
// can't cancel each other's reminders halfway through.
let queue = Promise.resolve(0);
export function rescheduleAll(settings) {
  const run = queue.then(() => scheduleAll(settings)).catch((e) => {
    lastRun = { ...lastRun, at: Date.now(), error: String(e?.message || e).slice(0, 200) };
    return 0;
  });
  queue = run;
  return run;
}

async function scheduleAll(settings) {
  if (!settings || !settings.location) return 0;
  updateWidget(settings); // the iOS widget works even when notifications are off
  if (!(await hasNotificationPermission())) return 0;
  await setupChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  let count = 0, failed = 0, firstError = '';
  const upcoming = [];
  // Each reminder is scheduled on its own: one failure must not stop the rest.
  const add = async (req, at) => {
    try {
      await Notifications.scheduleNotificationAsync(req);
      if (at) upcoming.push({ title: req.content.title, at: +at });
      return true;
    } catch (e) {
      failed++;
      if (!firstError) firstError = String(e?.message || e).slice(0, 200);
      return false;
    }
  };
  const offsetMs = (settings.offset ?? 15) * 60 * 1000;
  const alertOn = settings.alert?.on !== false;
  const sound = ALERT_SOUNDS[settings.alert?.sound] || ALERT_SOUNDS.azan;
  const isAzan = sound === ALERT_SOUNDS.azan;
  const place = settings.location.name || '';
  const enabled = PRAYERS.filter((p) => settings.prayers[p.key]);
  const adjust = settings.hijriAdjust || 0;
  const ramadanOn = settings.ramadan !== false;

  // Stay under iOS's 64 pending notifications. Fixed ones: 3 daily tasbeeh, the Friday reminder,
  // one white-days reminder and the refresh nudge. The rest are shared out per day.
  const fixed = (settings.daily ? 3 : 0) + (settings.friday !== false ? 1 : 0) + (settings.whiteDays !== false ? 1 : 0) + 1;
  const ramadanSoon = ramadanOn && [0, 3, 6].some((d) => isRamadan(toHijri(new Date(Date.now() + d * DAY), adjust)));
  const perDay = enabled.length * (alertOn ? 2 : 1) + (ramadanSoon ? 1 : 0);
  const days = perDay ? Math.max(2, Math.min(7, Math.floor((IOS_PENDING_LIMIT - fixed) / perDay))) : 7;

  for (let d = 0; d < days; d++) {
    const day = new Date();
    day.setHours(12, 0, 0, 0);
    day.setDate(day.getDate() + d);
    const times = getTimes(settings.location, settings, day);
    for (const p of enabled) {
      const start = times[p.key];
      const name = t('prayer.' + p.key);
      if (alertOn && start.getTime() > now + 30 * 1000) {
        if (await add({
          content: {
            title: t('n.timeFor', { name }),
            body: t(isAzan ? 'n.timeBodyAzan' : 'n.timeBody', { name, place }),
            data: { open: 'set:salah', azan: isAzan, prayer: p.key, day: dateKey(start) },
            sound: sound.file,
            interruptionLevel: 'timeSensitive',
            categoryIdentifier: 'prayer',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: start, channelId: sound.channel },
        }, start)) count++;
      }
      const after = new Date(start.getTime() + offsetMs);
      if (after.getTime() > now + 30 * 1000) {
        if (await add({
          content: { title: t('plan.after', { name }), body: t('plan.afterSub.' + p.key), data: { open: p.open, prayer: p.key, day: dateKey(start) }, sound: 'default', categoryIdentifier: 'prayer' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: after, channelId: CHANNEL },
        }, after)) count++;
      }
    }
  }

  if (settings.daily) {
    for (const r of DAILY) {
      if (await add({
        content: { title: t('daily.' + r.id + '.title'), body: t('daily.' + r.id + '.body'), data: { open: r.open }, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute, channelId: CHANNEL },
      })) count++;
    }
  }

  // Ramadan: a suhoor reminder 30 minutes before Fajr on each Ramadan day.
  if (ramadanOn) {
    for (let d = 0; d < days; d++) {
      const day = new Date(); day.setHours(12, 0, 0, 0); day.setDate(day.getDate() + d);
      const h = toHijri(day, adjust);
      if (!isRamadan(h)) continue;
      const at = new Date(getTimes(settings.location, settings, day).fajr.getTime() - 30 * 60000);
      if (at.getTime() <= now + 30 * 1000) continue;
      if (await add({
        content: { title: t('n.suhoorTitle', { d: h.d }), body: t('n.suhoorBody'), data: { open: 'set:morning' }, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      })) count++;
    }
  }

  // Friday: Surah al-Kahf and salawat, every Friday at 10:00 (weekday 6 = Friday).
  if (settings.friday !== false) {
    if (await add({
      content: { title: t('n.fridayTitle'), body: t('n.fridayBody'), data: { open: 'quran:18' }, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 6, hour: 10, minute: 0, channelId: CHANNEL },
    })) count++;
  }

  // White days: the evening before the 13th of the Hijri month (fasting the 13th, 14th and 15th is Sunnah).
  if (settings.whiteDays !== false) {
    for (let d = 1; d <= 31; d++) {
      const day = new Date(); day.setHours(12, 0, 0, 0); day.setDate(day.getDate() + d);
      const h = toHijri(day, adjust);
      if (h.d !== 13 || isRamadan(h)) continue;
      const at = new Date(day); at.setDate(at.getDate() - 1); at.setHours(20, 30, 0, 0);
      if (at.getTime() > now + 30 * 1000) {
        if (await add({
          content: { title: t('n.whiteTitle'), body: t('n.whiteBody'), data: { open: 'dua:accept' }, sound: 'default' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
        })) count++;
      }
      break;
    }
  }

  // Backstop: if the phone never lets the background refresh run, remind the user to open the app.
  const nudge = new Date();
  nudge.setDate(nudge.getDate() + days - 1);
  nudge.setHours(11, 0, 0, 0);
  await add({
    content: { title: t('n.nudgeTitle'), body: t('n.nudgeBody'), data: { open: 'set:salah' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nudge, channelId: CHANNEL },
  });

  upcoming.sort((a, b) => a.at - b.at);
  lastRun = { at: Date.now(), count, failed, error: firstError, upcoming: upcoming.slice(0, 5) };
  return count;
}

// For the status line in Prayers: how many reminders the phone is holding and the next one.
export async function scheduleStatus() {
  let pending = null;
  try { pending = (await Notifications.getAllScheduledNotificationsAsync()).length; } catch (e) {}
  const perm = await Notifications.getPermissionsAsync().catch(() => null);
  const next = lastRun.upcoming.find((u) => u.at > Date.now()) || null;
  return { pending, granted: !!perm?.granted, next, failed: lastRun.failed, error: lastRun.error };
}

// Sends a notification in 5 seconds with the chosen prayer sound, to check sound and banners.
export async function sendTestNotification(settings) {
  await setupChannel();
  const sound = ALERT_SOUNDS[settings?.alert?.sound] || ALERT_SOUNDS.azan;
  await Notifications.scheduleNotificationAsync({
    content: { title: t('test.title'), body: t('test.body'), data: { open: 'set:salah' }, sound: sound.file, interruptionLevel: 'timeSensitive' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: sound.channel },
  });
}
