import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getTimes, PRAYERS } from './prayer';
import { DAILY } from '../data/adhkar';
import { updateWidget } from './widget';

const CHANNEL = 'reminders';
const DAYS_AHEAD = 7; // 5 prayers × 7 days + 3 daily + 1 nudge = 39, under iOS's 64 pending limit

// Show notifications as banners even when the app is open.
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

// Clears everything and schedules the next 7 days of after-prayer reminders,
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

  for (let d = 0; d < DAYS_AHEAD; d++) {
    const day = new Date();
    day.setHours(12, 0, 0, 0);
    day.setDate(day.getDate() + d);
    const times = getTimes(settings.location, settings, day);
    for (const p of PRAYERS) {
      if (!settings.prayers[p.key]) continue;
      const at = new Date(times[p.key].getTime() + offsetMs);
      if (at.getTime() <= now + 30 * 1000) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: `After ${p.name}`, body: p.body, data: { open: p.open }, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      });
      count++;
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
  nudge.setDate(nudge.getDate() + DAYS_AHEAD - 1);
  nudge.setHours(11, 0, 0, 0);
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Keep your reminders running', body: 'Open Misbaha to refresh this week’s prayer times.', data: { open: 'set:salah' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nudge, channelId: CHANNEL },
  });

  return count;
}
