import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View, Text, Pressable, DevSettings, Linking } from 'react-native';
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
import { loadCustom, saveCustom, newCustomId, MAX_CUSTOM } from './src/lib/custom';
import { loadHistory, saveHistory, flushHistory, record, seedToday } from './src/lib/history';
import { loadSalah, saveSalah, togglePrayed } from './src/lib/salah';
import { prayedFromResponse } from './src/lib/salahActions';
import { syncSalahWidget } from './src/lib/widget';
import { refreshAndroidWidgets } from './src/widgets/android';
import { isValidKey, isOpenableKey, isDone, setCustomRegistry } from './src/lib/recommend';
import { applyLang, needsDirectionChange, setDirection, t } from './src/i18n';
import Counter from './src/screens/Counter';
import Library from './src/screens/Library';
import CustomEditor from './src/screens/CustomEditor';
import Schedule, { buildPlan } from './src/screens/Schedule';
import Onboarding from './src/screens/Onboarding';
import Qibla from './src/screens/Qibla';
import Duas from './src/screens/Duas';
import History from './src/screens/History';
import Quran from './src/screens/Quran';
import Mosque from './src/screens/Mosque';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Restart the JS app so a right-to-left / left-to-right switch takes effect.
async function restartApp() {
  try { await require('expo-updates').reloadAsync(); return true; } catch (e) {}
  try { DevSettings.reload(); return true; } catch (e) {}
  return false;
}

export default function App() {
  const theme = useTheme();
  const [fontsLoaded] = useFonts({ Amiri_400Regular, Fraunces_300Light, Fraunces_500Medium, Figtree_400Regular, Figtree_600SemiBold });
  const [settings, setSettings] = useState(null);
  const [progress, setProgressState] = useState(null);
  const [history, setHistory] = useState(null);
  const [salah, setSalah] = useState(null); // prayer tracker
  const [custom, setCustom] = useState(null);
  const [notifOn, setNotifOn] = useState(false);
  const [sheet, setSheet] = useState(null); // 'lib' | 'sched' | 'duas' | 'qibla' | 'history' | 'quran' | 'edit'
  const [editing, setEditing] = useState(null); // custom dhikr being edited, or 'new'
  const [quranSurah, setQuranSurah] = useState(null);
  const [restartNote, setRestartNote] = useState(false);
  const [, setTick] = useState(0);
  const [azanPlaying, setAzanPlaying] = useState(false);
  const settingsRef = useRef(null);
  settingsRef.current = settings;

  // The language must be set before anything renders text.
  if (settings) applyLang(settings.lang);

  // Load saved state.
  useEffect(() => {
    (async () => {
      const [s, cu, p, h, sl] = await Promise.all([loadSettings(), loadCustom(), loadProgress(), loadHistory(), loadSalah()]);
      setCustomRegistry(cu);
      const lang = applyLang(s.lang);
      if (needsDirectionChange(lang)) setDirection(lang); // applies from the next launch
      if (!isOpenableKey(p.cur)) p.cur = 'set:salah';
      const seeded = seedToday(h, p);
      if (seeded !== h) saveHistory(seeded);
      setCustom(cu); setSettings(s); setProgressState(p); setHistory(seeded);
      setSalah(syncSalahWidget(sl).log); // picks up prayers ticked on the iPhone widget
      await setupChannel();
      setNotifOn(await hasNotificationPermission());
      if (s.onboarded) { rescheduleAll(s).catch(() => {}); registerBackgroundRefresh(); checkTravel(s); }
    })();
  }, []);

  const ready = fontsLoaded && settings && progress && history && custom && salah;
  const isReady = !!ready;
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
      applyLang(next.lang); // notifications and the widget use the new language
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
      // prayers ticked on a widget or from a notification while the app was closed
      const fresh = await loadSalah();
      const synced = syncSalahWidget(fresh);
      setSalah(synced.log);
      if (settingsRef.current?.onboarded) { rescheduleAll(settingsRef.current).catch(() => {}); checkTravel(settingsRef.current); }
      setTick((x) => x + 1);
    });
    const timer = setInterval(() => setTick((x) => x + 1), 60000);
    return () => { sub.remove(); clearInterval(timer); };
  }, []);

  // Prayer tracker: tick or untick one prayer, then update the widgets.
  const toggleSalah = useCallback((day, key) => {
    setSalah((cur) => {
      const next = togglePrayed(cur || {}, day, key);
      saveSalah(next);
      syncSalahWidget(next);
      refreshAndroidWidgets(settingsRef.current);
      return next;
    });
  }, []);

  const openQuran = (surah) => { setQuranSurah(surah || null); setSheet('quran'); };

  // Tapping a notification opens the matching routine, dua or surah.
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef(null);
  useEffect(() => {
    if (!response || !progress) return;
    const id = response.notification.request.identifier + ':' + response.notification.date;
    if (handled.current === id) return;
    handled.current = id;
    const data = response.notification.request.content.data || {};
    // "Prayed ✓" button: tick the prayer (salahActions saves it too); nothing to open.
    const prayed = prayedFromResponse(response);
    if (prayed) { setSalah((cur) => { const n = { ...cur, [prayed.day]: { ...(cur?.[prayed.day] || {}), [prayed.prayer]: { v: 1, at: Date.now() } } }; saveSalah(n); return n; }); return; }
    const q = typeof data.open === 'string' && /^quran:(\d{1,3})$/.exec(data.open);
    if (q && +q[1] >= 1 && +q[1] <= 114) openQuran(+q[1]);
    else if (isOpenableKey(data.open)) { setProgress((cur) => ({ ...cur, cur: data.open })); setSheet(null); }
    // Tapped a prayer-time alert: play the complete azan (the notification only carries its opening).
    if (data.azan === true && settingsRef.current?.alert?.sound === 'azan') {
      playSound('full', () => setAzanPlaying(false)).then((ok) => setAzanPlaying(ok));
    }
  }, [response, progress, setProgress]);

  // Links from the widgets: misbaha://quran/<surah>/<verse> and misbaha://prayers
  const handleUrl = useCallback((url) => {
    if (typeof url === 'string' && /^misbaha:\/\/prayers\b/.test(url)) { setSheet('sched'); return; }
    if (typeof url === 'string' && /^misbaha:\/\/salah\b/.test(url)) { setSheet('history'); return; }
    const m = typeof url === 'string' && /^misbaha:\/\/quran\/(\d{1,3})(?:\/(\d{1,3}))?/.exec(url);
    if (!m) return;
    const s = +m[1], a = +(m[2] || 1);
    if (s >= 1 && s <= 114 && a >= 1 && a <= 286) { setQuranSurah({ s, a }); setSheet('quran'); }
  }, []);
  useEffect(() => {
    if (!isReady) return;
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    return () => sub.remove();
  }, [isReady, handleUrl]);

  // Switching between a left-to-right and a right-to-left language needs a restart.
  const changeLanguage = async (lang) => {
    update({ lang });
    const applied = applyLang(lang);
    if (needsDirectionChange(applied)) {
      setDirection(applied);
      setTimeout(async () => { if (!(await restartApp())) setRestartNote(true); }, 300);
    }
  };

  // Custom dhikr
  const saveCustomItem = (fields) => {
    const list = editing && editing !== 'new'
      ? custom.map((d) => (d.id === editing.id ? { ...d, ...fields } : d))
      : [...custom, { id: newCustomId(), ...fields }].slice(0, MAX_CUSTOM);
    setCustom(list); setCustomRegistry(list); saveCustom(list);
    const key = editing && editing !== 'new' ? 'my:' + editing.id : 'my:' + list[list.length - 1].id;
    setEditing(null);
    setProgress((cur) => ({ ...cur, cur: key }));
    setSheet(null);
  };
  const deleteCustomItem = () => {
    const list = custom.filter((d) => d.id !== editing.id);
    setCustom(list); setCustomRegistry(list); saveCustom(list);
    setProgress((cur) => (cur.cur === 'my:' + editing.id ? { ...cur, cur: 'set:salah' } : cur));
    setEditing(null);
    setSheet('lib');
  };

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
  const choose = (key) => { if (!isOpenableKey(key)) return; setProgress((cur) => ({ ...cur, cur: key })); setSheet(null); };

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
        onOpenQuran={() => openQuran(null)}
      />
      {(azanPlaying || restartNote) && (
        <Pressable
          onPress={() => { if (azanPlaying) { stopSound(); setAzanPlaying(false); } else setRestartNote(false); }}
          accessibilityRole="button"
          style={{ position: 'absolute', left: 16, right: 16, bottom: 110, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 18,
            backgroundColor: theme.brass, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ color: theme.bg, fontFamily: FONTS.uiBold, fontSize: 16, flexShrink: 1 }}>{azanPlaying ? t('azan.playing') : t('lang.restart')}</Text>
          <Text style={{ color: theme.bg, fontFamily: FONTS.ui, fontSize: 15 }}>{azanPlaying ? t('azan.stop') : '✕'}</Text>
        </Pressable>
      )}
      <History visible={sheet === 'history'} onClose={() => setSheet(null)} history={history} salah={salah} onToggleSalah={toggleSalah} settings={settings} theme={theme} />
      <Duas visible={sheet === 'duas'} onClose={() => setSheet(null)} onChoose={choose} theme={theme} />
      <Qibla visible={sheet === 'qibla'} onClose={() => setSheet(null)} settings={settings} theme={theme} />
      <Mosque visible={sheet === 'mosque'} onClose={() => setSheet('sched')} settings={settings} update={update} theme={theme} />
      <Quran visible={sheet === 'quran'} onClose={() => setSheet(null)} openSurah={quranSurah} theme={theme} />
      <Library
        visible={sheet === 'lib'}
        onClose={() => setSheet(null)}
        onChoose={choose}
        progress={progress}
        custom={custom}
        onAddCustom={() => { setEditing('new'); setSheet('edit'); }}
        onEditCustom={(d) => { setEditing(d); setSheet('edit'); }}
        theme={theme}
      />
      <CustomEditor
        visible={sheet === 'edit'}
        initial={editing && editing !== 'new' ? editing : null}
        onSave={saveCustomItem}
        onDelete={deleteCustomItem}
        onClose={() => { setEditing(null); setSheet('lib'); }}
        theme={theme}
      />
      <Schedule
        visible={sheet === 'sched'}
        onClose={() => setSheet(null)}
        onStart={choose}
        settings={settings}
        update={update}
        notifOn={notifOn}
        onEnableNotifs={async () => { const g = await requestNotificationPermission(); setNotifOn(g); if (g) rescheduleAll(settings); }}
        onLanguage={changeLanguage}
        onOpenMosque={() => setSheet('mosque')}
        salah={salah}
        onToggleSalah={toggleSalah}
        theme={theme}
      />
    </SafeAreaProvider>
  );
}
