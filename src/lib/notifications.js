import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getTimes, PRAYERS } from './prayer';
import { DAILY } from '../data/adhkar';
import { updateWidget } from './widget';

const CHANNEL = 'reminders';

// Prayer-time alert sounds. Android fixes a channel's sound when it is created,
// so each sound gets its own channel. iOS plays the file named in the notification.
// Both files are under 30 seconds (iOS's limit) and bundled by the expo-notifications plugin.
export const ALERT_SOUNDS = {
  azan: { label: 'Azan', file: 'azan.wav', channel: 'prayer-azan', channelName: 'Prayer time: azan' },
  alarm: { label: 'Alarm', file: 'alarm.wav', channel: 'prayer-alarm', channelName: 'Prayer time: alarm' },
  standard: { label: 'Standard', file: 'default', channel: 'prayer-standard', channelName: 'Prayer time: standard sound' },
};

const IOS_PENDING_LIMIT = 64;
const RESERVED = 4; // 3 daily tasbeeh + the refresh nudge

// Show notifications as banners (with their sound) even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupChannel() {
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
export async function rescheduleAll(settings) {
  if (!settings || !settings.location) return 0;
  updateWidget(settings); // the iOS widget works even when notifications are off
  if (!(await hasNotificationPermission())) return 0;
  await setupChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  let count = 0;
  const offsetMs = (settings.offset ?? 15) * 60 * 1000;
  const alertOn = settings.alert?.on !== false;
  const sound = ALERT_SOUNDS[settings.alert?.sound] || ALERT_SOUNDS.azan;
  const isAzan = sound === ALERT_SOUNDS.azan;
  const place = settings.location.name || 'your area';
  const enabled = PRAYERS.filter((p) => settings.prayers[p.key]);

  // Stay under iOS's 64 pending notifications: 10 a day with alerts on means 6 days ahead.
  const perDay = enabled.length * (alertOn ? 2 : 1);
  const days = perDay ? Math.max(2, Math.min(7, Math.floor((IOS_PENDING_LIMIT - RESERVED) / perDay))) : 7;

  for (let d = 0; d < days; d++) {
    const day = new Date();
    day.setHours(12, 0, 0, 0);
    day.setDate(day.getDate() + d);
    const times = getTimes(settings.location, settings, day);
    for (const p of enabled) {
      const start = times[p.key];
      if (alertOn && start.getTime() > now + 30 * 1000) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Time for ${p.name}`,
            body: isAzan ? `It's ${p.name} time in ${place}. Tap to hear the full azan.` : `It's ${p.name} time in ${place}.`,
            data: { open: 'set:salah', azan: isAzan },
            sound: sound.file,
            interruptionLevel: 'timeSensitive',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: start, channelId: sound.channel },
        });
        count++;
      }
      const after = new Date(start.getTime() + offsetMs);
      if (after.getTime() > now + 30 * 1000) {
        await Notifications.scheduleNotificationAsync({
          content: { title: `After ${p.name}`, body: p.body, data: { open: p.open }, sound: 'default' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: after, channelId: CHANNEL },
        });
        count++;
      }
    }
  }

  if (settings.daily) {
    for (const r of DAILY) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body, data: { open: r.open }, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute, channelId: CHANNEL },
      });
      count++;
    }
  }

  // Backstop: if the phone never lets the background refresh run, remind the user to open the app.
  const nudge = new Date();
  nudge.setDate(nudge.getDate() + days - 1);
  nudge.setHours(11, 0, 0, 0);
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Keep your prayer alerts running', body: 'Open Misbaha to refresh the coming days’ prayer times.', data: { open: 'set:salah' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nudge, channelId: CHANNEL },
  });

  return count;
}
