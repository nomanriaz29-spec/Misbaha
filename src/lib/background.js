import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { loadSettings } from './storage';
import { rescheduleAll } from './notifications';
import { loadCustom } from './custom';
import { setCustomRegistry } from './recommend';
import { applyLang } from '../i18n';

export const TASK = 'misbaha-reschedule';

// Runs periodically in the background (the OS decides exactly when)
// to keep the next 7 days of prayer reminders topped up.
TaskManager.defineTask(TASK, async () => {
  try {
    const s = await loadSettings();
    applyLang(s.lang); // notification text in the user's language
    setCustomRegistry(await loadCustom());
    await rescheduleAll(s);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundRefresh() {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    const registered = await TaskManager.isTaskRegisteredAsync(TASK);
    if (!registered) {
      await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 12 * 60 }); // minutes
    }
  } catch (e) {}
}
