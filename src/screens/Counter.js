import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import BeadRing from '../components/BeadRing';
import PocketMode from '../components/PocketMode';
import { fmtTime, getTimes } from '../lib/prayer';
import { itemFor, labelFor, recommend, setName, duaField, dhikrMeaning, dhikrName } from '../lib/recommend';
import { toHijri, formatHijri, isRamadan } from '../lib/hijri';
import { t, getLang } from '../i18n';
import { FONTS, FILL } from '../theme';

const blank = { step: 0, c: 0, extra: false };

export function currentOf(progress) {
  const p = progress.prog[progress.cur] || blank;
  const k = itemFor(progress.cur, p.step);
  const last = k.type !== 'set' || k.step === k.set.steps.length - 1;
  const done = k.target > 0 && p.c >= k.target && last && !p.extra;
  return { ...k, c: p.c, extra: !!p.extra, done };
}

const until = (ms) => {
  const m = Math.max(0, Math.round(ms / 60000));
  return m >= 60 ? t('time.hm', { h: Math.floor(m / 60), m: m % 60 }) : t('time.m', { m });
};

export default function Counter({ theme, progress, setProgress, settings, next, onChoose, onOpenLibrary, onOpenDuas, onOpenSchedule, onOpenQibla, onOpenHistory, onOpenQuran }) {
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const ringSize = Math.min(width * 0.74, 290, height * 0.32);
  const k = currentOf(progress);
  const lock = useRef(false);
  const scale = useRef(new Animated.Value(1)).current;
  const [armed, setArmed] = useState(false);
  const [pocket, setPocket] = useState(false);
  const lang = getLang();

  const buzz = (kind) => {
    if (!settings.haptics) return;
    const H = Haptics;
    if (kind === 'target') H.notificationAsync(H.NotificationFeedbackType.Success).catch(() => {});
    else if (kind === 'round') { H.impactAsync(H.ImpactFeedbackStyle.Heavy).catch(() => {}); setTimeout(() => H.impactAsync(H.ImpactFeedbackStyle.Heavy).catch(() => {}), 160); }
    else H.impactAsync(pocket ? H.ImpactFeedbackStyle.Medium : H.ImpactFeedbackStyle.Light).catch(() => {});
  };
  const write = (p, dTotal = 0) =>
    setProgress((cur) => ({ ...cur, total: Math.max(0, cur.total + dTotal), prog: { ...cur.prog, [cur.cur]: p } }));

  const inc = () => {
    if (lock.current || k.done) return; // finished: taps do nothing until Repeat / Keep counting
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.06, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start();
    const p = { ...blank, ...(progress.prog[progress.cur] || {}) };
    p.c += 1;
    const hit = k.target > 0 && p.c === k.target;
    buzz(hit ? 'target' : p.c % 33 === 0 ? 'round' : 'tap');
    write(p, 1);
    if (k.type === 'set' && p.c >= k.target && k.step < k.set.steps.length - 1) {
      lock.current = true;
      setTimeout(() => { write({ step: p.step + 1, c: 0, extra: false }); lock.current = false; }, 650);
    }
  };

  const undo = () => {
    const p = { ...blank, ...(progress.prog[progress.cur] || {}) };
    if (k.target > 0 && !p.extra && p.c > k.target) p.c = k.target; // clamp old over-counts
    if (p.c > 0) { p.c -= 1; write(p, -1); }
    else if (k.type === 'set' && p.step > 0) { p.step -= 1; p.c = k.set.steps[p.step][1] - 1; write(p, -1); }
  };

  const restart = () => write({ ...blank });
  const keepCounting = () => write({ ...blank, ...(progress.prog[progress.cur] || {}), extra: true });
  const reset = () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 2500); return; }
    setArmed(false); restart();
  };

  // Hijri date and Ramadan countdown
  const now = new Date();
  const hijri = toHijri(now, settings.hijriAdjust || 0);
  let ramadan = null;
  if (isRamadan(hijri) && settings.ramadan !== false && settings.location) {
    const tm = getTimes(settings.location, settings, now);
    if (now < tm.maghrib && now >= tm.fajr) ramadan = t('ramadan.iftar', { d: hijri.d, in: until(tm.maghrib - now), at: fmtTime(tm.maghrib) });
    else {
      const tomorrow = new Date(now); if (now >= tm.maghrib) tomorrow.setDate(tomorrow.getDate() + 1);
      const fajr = getTimes(settings.location, settings, tomorrow).fajr;
      ramadan = t('ramadan.suhoor', { d: hijri.d, in: until(fajr - now), at: fmtTime(fajr) });
    }
  }

  const T = k.target;
  const n = T >= 3 && T <= 34 ? T : 33;
  const shown = T > 0 && !k.extra ? Math.min(k.c, T) : k.c;
  const filled = T >= 3 && T <= 34 ? Math.min(k.c, T)
    : T > 0 && T < 3 ? (k.c >= T ? 33 : Math.round((k.c / T) * 33))
    : k.c === 0 ? 0 : ((k.c - 1) % 33) + 1;
  const ofText = k.done ? t('counter.complete') : T > 0 ? (k.c >= T ? t('counter.extra', { n: k.c - T }) : t('counter.of', { n: T }))
    : k.c >= 33 ? t('counter.round', { n: Math.floor((k.c - 1) / 33) + 1 }) : t('counter.noTarget');
  const arText = k.item.ar || '';
  const long = arText.length > 38;
  const veryLong = arText.length > 110;
  const name = k.type === 'set' ? setName(k.id) : k.type === 'dua' ? duaField(k.id, 'title') : dhikrName(k.item);
  const title = k.type === 'dua' ? duaField(k.id, 'title') : lang === 'en' || k.item.custom ? k.item.tr : null;
  const meaning = k.type === 'dua' ? duaField(k.id, 'for') : k.item.custom ? k.item.en : dhikrMeaning(k.item.id);
  const recs = k.done ? recommend(progress.cur, settings) : [];

  return (
    <SafeAreaView style={[styles.wrap, { backgroundColor: theme.bg }]}>
      <View style={styles.top}>
        <Pressable onPress={onOpenHistory} accessibilityRole="button" accessibilityLabel={t('history.title')} hitSlop={8} style={{ flexShrink: 1 }}>
          <Text style={[styles.brand, { color: theme.fg }]}>{t('app.name')}</Text>
          <Text style={[styles.small, { color: theme.muted }]} numberOfLines={1}>{formatHijri(hijri, lang)}</Text>
          <Text style={[styles.small, { color: theme.muted }]} numberOfLines={1}>
            {t('counter.today', { n: progress.total.toLocaleString() })} <Text style={{ color: theme.brass }}>· {t('counter.historyLink')}</Text>
          </Text>
        </Pressable>
        <View style={styles.topRight}>
          <Pressable onPress={onOpenSchedule} style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <View style={[styles.dot, { backgroundColor: theme.brass }]} />
            <Text numberOfLines={1} style={[styles.small, { color: theme.fg, flexShrink: 1 }]}>
              {next ? t('counter.next', { name: next.name, at: fmtTime(next.at) }) : t('prayers.title')}
            </Text>
          </Pressable>
          <Pressable onPress={onOpenQibla} accessibilityRole="button" accessibilityLabel={t('qibla.title')}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: theme.surface, borderColor: theme.line }, pressed && { opacity: 0.6 }]}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={theme.fg} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={12} r={9.5} />
              <Path d="M15.5 8.5 13.4 13.4 8.5 15.5 10.6 10.6Z" fill={theme.brass} stroke={theme.brass} />
            </Svg>
          </Pressable>
        </View>
      </View>

      {ramadan && (
        <View style={[styles.ramadan, { backgroundColor: theme.brassSoft, borderColor: theme.brass }]}>
          <Text style={[styles.ramadanTxt, { color: theme.fg }]} numberOfLines={2}>☾  {ramadan}</Text>
        </View>
      )}

      <Pressable style={styles.stage} onPressIn={inc} accessibilityRole="button" accessibilityLabel={k.done ? t('counter.doneA11y', { name }) : t('counter.countA11y', { name })}>
        {arText ? <Text style={[styles.ar, long && styles.arLong, veryLong && styles.arVeryLong, { color: theme.fg }]}>{arText}</Text> : null}
        <View style={{ width: ringSize, height: ringSize }}>
          <BeadRing size={ringSize} n={n} filled={filled} theme={theme} />
          <View style={styles.center} pointerEvents="none">
            <Animated.Text style={[styles.num, { color: theme.fg, transform: [{ scale }], fontSize: ringSize * 0.3 }]}>{shown}</Animated.Text>
            <Text style={[styles.of, { color: k.done ? theme.ok : theme.muted }]}>{ofText}</Text>
          </View>
        </View>

        {k.done ? (
          <View style={[styles.done, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={[styles.doneT, { color: theme.ok }]}>✓ {t('counter.doneTitle', { name })}</Text>
            <Text style={[styles.mean, { color: theme.muted }]}>{t('counter.accept')}</Text>
            <View style={styles.doneBtns}>
              <Pill theme={theme} label={t('counter.repeat')} onPress={restart} />
              {k.type !== 'set' && <Pill theme={theme} label={t('counter.keep')} onPress={keepCounting} />}
            </View>
            <Text style={[styles.lbl, { color: theme.muted }]}>{t('counter.recommended')}</Text>
            <View style={styles.recs}>
              {recs.map((r) => <Pill key={r} theme={theme} label={labelFor(r)} accent onPress={() => onChoose(r)} />)}
            </View>
          </View>
        ) : (
          <>
            <View style={{ alignItems: 'center', gap: 3, maxWidth: 340 }}>
              {title ? <Text style={[styles.tr, { color: theme.fg }]} numberOfLines={3}>{title}</Text> : null}
              {height > 680 && (meaning || k.item.ref) ? (
                <Text style={[styles.mean, { color: theme.muted }]} numberOfLines={3}>
                  {[meaning, k.item.ref].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            {k.type === 'set' && (
              <View style={styles.steps}>
                {k.set.steps.map(([id, cnt], i) => {
                  const step = itemFor(`one:${id}`).item;
                  const short = lang === 'en' ? step.tr.split(',')[0].split(' ').slice(0, 2).join(' ') : dhikrName(step).split(' ').slice(0, 2).join(' ');
                  return (
                    <View key={i} style={[styles.stepPill, { borderColor: i === k.step ? theme.brass : i < k.step ? 'transparent' : theme.line },
                      i === k.step && { backgroundColor: theme.brassSoft }]}>
                      <Text style={{ fontSize: 13, fontFamily: FONTS.ui, color: i < k.step ? theme.ok : i === k.step ? theme.fg : theme.muted }}>
                        {(i < k.step ? '✓ ' : '') + short + ' ×' + cnt}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
            <Text style={[styles.hint, { color: theme.muted }]}>
              {k.type === 'set' ? t('counter.step', { name: setName(k.id), n: k.step + 1, of: k.set.steps.length }) : t('counter.tapHint')}
            </Text>
            <View style={styles.tools}>
              <Pill theme={theme} small label={armed ? t('counter.tapAgain') : '↺  ' + t('counter.reset')} warn={armed} onPress={reset} />
              <Pill theme={theme} small label={'◐  ' + t('pocket.button')} onPress={() => setPocket(true)} />
            </View>
          </>
        )}
      </Pressable>

      <View style={styles.bar}>
        <BarBtn theme={theme} label={t('nav.adhkar')} primary onPress={onOpenLibrary}
          icon={<>{[[12, 5], [5, 12], [19, 12], [12, 19]].map(([x, y]) => <Circle key={x + '' + y} cx={x} cy={y} r={2} />)}</>} />
        <BarBtn theme={theme} label={t('nav.duas')} onPress={onOpenDuas} icon={<Path d="M7 20c-1.7-1.3-3-3.3-3-6V9.5a1.5 1.5 0 0 1 3 0V13M17 20c1.7-1.3 3-3.3 3-6V9.5a1.5 1.5 0 0 0-3 0V13M7 13V5.5a1.5 1.5 0 0 1 3 0V12M17 13V5.5a1.5 1.5 0 0 0-3 0V12" />} />
        <BarBtn theme={theme} label={t('nav.quran')} onPress={onOpenQuran} icon={<Path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5ZM12 6.5v13" />} />
        <BarBtn theme={theme} label={t('nav.prayers')} onPress={onOpenSchedule} icon={<Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />} />
        <BarBtn theme={theme} label={t('nav.undo')} onPress={undo} icon={<Path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />} />
      </View>

      <PocketMode visible={pocket} onClose={() => setPocket(false)} onTap={inc} count={shown} target={T} name={name} done={k.done} />
    </SafeAreaView>
  );
}

function Pill({ theme, label, onPress, accent, small, warn }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, small && styles.pillSmall, { borderColor: accent || warn ? theme.brass : theme.line },
      accent && { backgroundColor: theme.brassSoft }, pressed && { opacity: 0.6 }]}>
      <Text numberOfLines={1} style={{ color: warn ? theme.brass : theme.fg, fontFamily: FONTS.ui, fontSize: small ? 14 : 15 }}>{label}</Text>
    </Pressable>
  );
}

function BarBtn({ theme, label, onPress, icon, primary }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.barBtn, primary && { backgroundColor: theme.surface, borderColor: theme.line, borderWidth: 1 }, pressed && { opacity: 0.6 }]}>
      <Svg width={27} height={27} viewBox="0 0 24 24" fill="none" stroke={theme.fg} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">{icon}</Svg>
      <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: FONTS.ui, color: primary ? theme.fg : theme.muted }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 8 },
  brand: { fontFamily: FONTS.numMed, fontSize: 25 },
  small: { fontFamily: FONTS.ui, fontSize: 14, fontVariant: ['tabular-nums'] },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, maxWidth: '62%' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, flexShrink: 1 },
  iconBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  ramadan: { marginTop: 10, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  ramadanTxt: { fontFamily: FONTS.uiBold, fontSize: 15, textAlign: 'center' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  ar: { fontFamily: FONTS.ar, fontSize: 42, lineHeight: 70, textAlign: 'center', writingDirection: 'rtl', maxWidth: 360 },
  arLong: { fontSize: 27, lineHeight: 44 },
  arVeryLong: { fontSize: 20.5, lineHeight: 32 },
  center: { ...FILL, alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: FONTS.num, fontVariant: ['tabular-nums'] },
  of: { fontFamily: FONTS.ui, fontSize: 14, letterSpacing: 1 },
  tr: { fontFamily: FONTS.uiBold, fontSize: 18, textAlign: 'center' },
  mean: { fontFamily: FONTS.ui, fontSize: 15.5, lineHeight: 21.5, textAlign: 'center' },
  steps: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  stepPill: { paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1 },
  hint: { fontFamily: FONTS.ui, fontSize: 13, letterSpacing: 0.8, textAlign: 'center' },
  tools: { flexDirection: 'row', gap: 8 },
  done: { alignSelf: 'stretch', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 18, padding: 14 },
  doneT: { fontFamily: FONTS.uiBold, fontSize: 18, textAlign: 'center' },
  doneBtns: { flexDirection: 'row', gap: 8 },
  lbl: { fontFamily: FONTS.uiBold, fontSize: 12.5, letterSpacing: 1.2, marginTop: 4 },
  recs: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  pill: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, maxWidth: '100%' },
  pillSmall: { paddingVertical: 6, paddingHorizontal: 12 },
  bar: { flexDirection: 'row', gap: 4, paddingTop: 8, paddingBottom: 10 },
  barBtn: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 11, borderRadius: 16, minHeight: 64 },
});
