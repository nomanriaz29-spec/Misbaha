import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View, Text, Pressable } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts, Amiri_400Regular } from '@expo-google-fonts/amiri';
import { Fraunces_300Light, Fraunces_500Medium } from '@expo-google-fonts/fraunces';
import { Figtree_400Regular, Figtree_600SemiBold } from '@expo-google-fonts/figtree';

import { useTheme, FONTS } from './src/theme';
import { playSound, stopSound } from './src/lib/sounds';
import { loadSettings, saveSettings, loadProgress, saveProgress, todayKey } from './src/lib/storage';
import { rescheduleAll, hasNotificationPermission, requestNotificationPermission, setupChannel } from './src/lib/notifications';
import { registerBackgroundRefresh } from './src/lib/background';
import { refreshLocationIfMoved } from './src/lib/location';
import Counter from './src/screens/Counter';
import Library from './src/screens/Library';
import Schedule, { buildPlan } from './src/screens/Schedule';
import Onboarding from './src/screens/Onboarding';
import Qibla from './src/screens/Qibla';
import Duas from './src/screens/Duas';
import History from './src/screens/History';
import { loadHistory, saveHistory, flushHistory, record, seedToday } from './src/lib/history';
import { isValidKey, isDone } from './src/lib/recommend';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const theme = useTheme();
  const [fontsLoaded] = useFonts({ Amiri_400Regular, Fraunces_300Light, Fraunces_500Medium, Figtree_400Regular, Figtree_600SemiBold });
  const [settings, setSettings] = useState(null);
  const [progress, setProgressState] = useState(null);
  const [history, setHistory] = useState(null);
  const [notifOn, setNotifOn] = useState(false);
  const [sheet, setSheet] = useState(null); // 'lib' | 'sched' | null
  const [tick, setTick] = useState(0);
  const [azanPlaying, setAzanPlaying] = useState(false);
  const settingsRef = useRef(null);
  settingsRef.current = settings;

  // Load saved state.
  useEffect(() => {
    (async () => {
      const [s, p, h] = await Promise.all([loadSettings(), loadProgress(), loadHistory()]);
      const seeded = seedToday(h, p);
      if (seeded !== h) saveHistory(seeded);
      setSettings(s); setProgressState(p); setHistory(seeded);
      await setupChannel();
      setNotifOn(await hasNotificationPermission());
      if (s.onboarded) { rescheduleAll(s).catch(() => {}); registerBackgroundRefresh(); checkTravel(s); }
    })();
  }, []);

  const ready = fontsLoaded && settings && progress && history;
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);

  const setProgress = useCallback((updater) => {
    setProgressState((cur) => {
      const next = typeof updater === 'function' ? updater(cur) : updater;
      saveProgress(next);
      return next;
    });
  }, []);

  // Record every count and completion into today's history.
  const prevProg = useRef(null);
  useEffect(() => {
    const prev = prevProg.current;
    prevProg.current = progress;
    if (!prev || !progress || prev.day !== progress.day || prev.cur !== progress.cur) return;
    const key = progress.cur;
    const delta = progress.total - prev.total;
    const was = isDone(key, prev.prog[key]), now = isDone(key, progress.prog[key]);
    const doneDelta = now && !was ? 1 : was && !now && delta < 0 ? -1 : 0;
    if (!delta && !doneDelta) return;
    setHistory((h) => { const n = record(h, key, delta, doneDelta); saveHistory(n); return n; });
  }, [progress]);

  const update = useCallback((patch) => {
    setSettings((cur) => {
      const next = { ...cur, ...patch };
      saveSettings(next);
      rescheduleAll(next).catch(() => {});
      return next;
    });
  }, []);

  // Travelled more than 15 km since the last check? Move prayer times to the new place.
  const checkTravel = useCallback(async (s) => {
    const patch = await refreshLocationIfMoved(s);
    if (!patch) return;
    const { moved, ...rest } = patch;
    update(rest);
  }, [update]);

  // When the app comes back to the foreground: new day? refresh reminders and the "next" chip.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (st) => {
      if (st !== 'active') { flushHistory(); return; }
      setProgressState((cur) => (cur && cur.day !== todayKey() ? { day: todayKey(), total: 0, cur: cur.cur, prog: {} } : cur));
      setNotifOn(await hasNotificationPermission());
      if (settingsRef.current?.onboarded) { rescheduleAll(settingsRef.current).catch(() => {}); checkTravel(settingsRef.current); }
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
    const data = response.notification.request.content.data || {};
    if (isValidKey(data.open)) { setProgress((cur) => ({ ...cur, cur: data.open })); setSheet(null); }
    // Tapped a prayer-time alert: play the complete azan (the notification only carries its opening).
    if (data.azan === true && settingsRef.current?.alert?.sound === 'azan') {
      playSound('full', () => setAzanPlaying(false)).then((ok) => setAzanPlaying(ok));
    }
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
  const choose = (key) => { if (!isValidKey(key)) return; setProgress((cur) => ({ ...cur, cur: key })); setSheet(null); };

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
        onOpenHistory={() => setSheet('history')}
      />
      {azanPlaying && (
        <Pressable onPress={() => { stopSound(); setAzanPlaying(false); }} accessibilityRole="button" accessibilityLabel="Stop the azan"
          style={{ position: 'absolute', left: 16, right: 16, bottom: 110, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 18,
            backgroundColor: theme.brass, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: theme.bg, fontFamily: FONTS.uiBold, fontSize: 16 }}>Azan playing</Text>
          <Text style={{ color: theme.bg, fontFamily: FONTS.ui, fontSize: 15 }}>Tap to stop</Text>
        </Pressable>
      )}
      <History visible={sheet === 'history'} onClose={() => setSheet(null)} history={history} theme={theme} />
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
