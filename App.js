import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts, Amiri_400Regular } from '@expo-google-fonts/amiri';
import { Fraunces_300Light, Fraunces_500Medium } from '@expo-google-fonts/fraunces';
import { Figtree_400Regular, Figtree_600SemiBold } from '@expo-google-fonts/figtree';

import { useTheme } from './src/theme';
import { loadSettings, saveSettings, loadProgress, saveProgress, todayKey } from './src/lib/storage';
import { rescheduleAll, hasNotificationPermission, requestNotificationPermission, setupChannel } from './src/lib/notifications';
import { registerBackgroundRefresh } from './src/lib/background';
import Counter from './src/screens/Counter';
import Library from './src/screens/Library';
import Schedule, { buildPlan } from './src/screens/Schedule';
import Onboarding from './src/screens/Onboarding';
import Qibla from './src/screens/Qibla';
import Duas from './src/screens/Duas';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const theme = useTheme();
  const [fontsLoaded] = useFonts({ Amiri_400Regular, Fraunces_300Light, Fraunces_500Medium, Figtree_400Regular, Figtree_600SemiBold });
  const [settings, setSettings] = useState(null);
  const [progress, setProgressState] = useState(null);
  const [notifOn, setNotifOn] = useState(false);
  const [sheet, setSheet] = useState(null); // 'lib' | 'sched' | null
  const [tick, setTick] = useState(0);
  const settingsRef = useRef(null);
  settingsRef.current = settings;

  // Load saved state.
  useEffect(() => {
    (async () => {
      const [s, p] = await Promise.all([loadSettings(), loadProgress()]);
      setSettings(s); setProgressState(p);
      await setupChannel();
      setNotifOn(await hasNotificationPermission());
      if (s.onboarded) { rescheduleAll(s).catch(() => {}); registerBackgroundRefresh(); }
    })();
  }, []);

  const ready = fontsLoaded && settings && progress;
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);

  const setProgress = useCallback((updater) => {
    setProgressState((cur) => {
      const next = typeof updater === 'function' ? updater(cur) : updater;
      saveProgress(next);
      return next;
    });
  }, []);

  const update = useCallback((patch) => {
    setSettings((cur) => {
      const next = { ...cur, ...patch };
      saveSettings(next);
      rescheduleAll(next).catch(() => {});
      return next;
    });
  }, []);

  // When the app comes back to the foreground: new day? refresh reminders and the "next" chip.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (st) => {
      if (st !== 'active') return;
      setProgressState((cur) => (cur && cur.day !== todayKey() ? { day: todayKey(), total: 0, cur: cur.cur, prog: {} } : cur));
      setNotifOn(await hasNotificationPermission());
      if (settingsRef.current?.onboarded) rescheduleAll(settingsRef.current).catch(() => {});
      setTick((t) => t + 1);
    });
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => { sub.remove(); clearInterval(timer); };
  }, []);

  // Tapping a notification opens the matching routine.
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef(null);
  useEffect(() => {
    if (!response || !progress) return;
    const id = response.notification.request.identifier + ':' + response.notification.date;
    if (handled.current === id) return;
    handled.current = id;
    const open = response.notification.request.content.data?.open;
    if (open) { setProgress((cur) => ({ ...cur, cur: open })); setSheet(null); }
  }, [response, progress, setProgress]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  if (!settings.onboarded || !settings.location) {
    return (
      <SafeAreaProvider>
        <StatusBar style={theme.dark ? 'light' : 'dark'} />
        <Onboarding theme={theme} onDone={(patch, granted) => { setNotifOn(granted); update(patch); registerBackgroundRefresh(); }} />
      </SafeAreaProvider>
    );
  }

  const plan = buildPlan(settings);
  const now = Date.now();
  const next = plan.find((x) => x.at.getTime() > now) || null;
  const choose = (key) => { setProgress((cur) => ({ ...cur, cur: key })); setSheet(null); };

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Counter
        theme={theme}
        progress={progress}
        setProgress={setProgress}
        settings={settings}
        next={next}
        onOpenLibrary={() => setSheet('lib')}
        onChoose={choose}
        onOpenDuas={() => setSheet('duas')}
        onOpenSchedule={() => setSheet('sched')}
        onOpenQibla={() => setSheet('qibla')}
      />
      <Duas visible={sheet === 'duas'} onClose={() => setSheet(null)} onChoose={choose} theme={theme} />
      <Qibla visible={sheet === 'qibla'} onClose={() => setSheet(null)} settings={settings} theme={theme} />
      <Library visible={sheet === 'lib'} onClose={() => setSheet(null)} onChoose={choose} progress={progress} theme={theme} />
      <Schedule
        visible={sheet === 'sched'}
        onClose={() => setSheet(null)}
        onStart={choose}
        settings={settings}
        update={update}
        notifOn={notifOn}
        onEnableNotifs={async () => { const g = await requestNotificationPermission(); setNotifOn(g); if (g) rescheduleAll(settings); }}
        theme={theme}
      />
    </SafeAreaProvider>
  );
}
