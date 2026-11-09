import * as Notifications from 'expo-notifications';
import { PRAYED_ACTION } from './notifications';
import { loadSalah, saveSalah, setPrayed, SALAH } from './salah';
import { syncSalahWidget } from './widget';
import { loadSettings } from './storage';
import { refreshAndroidWidgets } from '../widgets/android';

// The "Prayed ✓" button on a prayer notification. Registered at startup (index.js) so it also
// works when iOS wakes the app in the background just to handle the button.
export function prayedFromResponse(response) {
  if (response?.actionIdentifier !== PRAYED_ACTION) return null;
  const data = response.notification?.request?.content?.data || {};
  if (!SALAH.includes(data.prayer) || !/^\d{4}-\d{2}-\d{2}$/.test(data.day || '')) return null;
  return { day: data.day, prayer: data.prayer };
}

export async function applyPrayedResponse(response) {
  const hit = prayedFromResponse(response);
  if (!hit) return null;
  const log = setPrayed(await loadSalah(), hit.day, hit.prayer, 1);
  await saveSalah(log);
  syncSalahWidget(log);
  try { refreshAndroidWidgets(await loadSettings()); } catch (e) {}
  return hit;
}

export function registerPrayedAction() {
  try { Notifications.addNotificationResponseReceivedListener((r) => { applyPrayedResponse(r); }); } catch (e) {}
}
