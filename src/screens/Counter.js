import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import BeadRing from '../components/BeadRing';
import { DHIKR } from '../data/adhkar';
import { fmtTime } from '../lib/prayer';
import { itemFor, labelFor, recommend } from '../lib/recommend';
import { FONTS, FILL } from '../theme';

const blank = { step: 0, c: 0, extra: false };

export function currentOf(progress) {
  const p = progress.prog[progress.cur] || blank;
  const k = itemFor(progress.cur, p.step);
  const last = k.type !== 'set' || k.step === k.set.steps.length - 1;
  const done = k.target > 0 && p.c >= k.target && last && !p.extra;
  return { ...k, c: p.c, extra: !!p.extra, done };
}

export default function Counter({ theme, progress, setProgress, settings, next, onChoose, onOpenLibrary, onOpenDuas, onOpenSchedule, onOpenQibla, onOpenHistory }) {
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const ringSize = Math.min(width * 0.74, 290, height * 0.34);
  const k = currentOf(progress);
  const lock = useRef(false);
  const scale = useRef(new Animated.Value(1)).current;
  const [armed, setArmed] = useState(false);

  const vibrate = (strong) => {
    if (!settings.haptics) return;
    if (strong) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
    vibrate(hit);
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

  const T = k.target;
  const n = T >= 3 && T <= 34 ? T : 33;
  const shown = T > 0 && !k.extra ? Math.min(k.c, T) : k.c;
  const filled = T >= 3 && T <= 34 ? Math.min(k.c, T)
    : T > 0 && T < 3 ? (k.c >= T ? 33 : Math.round((k.c / T) * 33))
    : k.c === 0 ? 0 : ((k.c - 1) % 33) + 1;
  const ofText = k.done ? 'COMPLETE' : T > 0 ? (k.c >= T ? `+${k.c - T} EXTRA` : `OF ${T}`) : k.c >= 33 ? `ROUND ${Math.floor((k.c - 1) / 33) + 1}` : 'NO TARGET';
  const long = k.item.ar.length > 38;
  const veryLong = k.item.ar.length > 110;
  const name = k.type === 'set' ? k.set.name : k.type === 'dua' ? k.item.title : k.item.tr;
  const recs = k.done ? recommend(progress.cur, settings) : [];

  return (
    <SafeAreaView style={[styles.wrap, { backgroundColor: theme.bg }]}>
      <View style={styles.top}>
        <Pressable onPress={onOpenHistory} accessibilityRole="button" accessibilityLabel="Your history" hitSlop={8}>
          <Text style={[styles.brand, { color: theme.fg }]}>Misbaha</Text>
          <Text style={[styles.small, { color: theme.muted }]}>Today {progress.total.toLocaleString()} <Text style={{ color: theme.brass }}>· History ›</Text></Text>
        </Pressable>
        <View style={styles.topRight}>
          <Pressable onPress={onOpenSchedule} style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <View style={[styles.dot, { backgroundColor: theme.brass }]} />
            <Text numberOfLines={1} style={[styles.small, { color: theme.fg, flexShrink: 1 }]}>
              {next ? `Next: ${next.name} · ${fmtTime(next.at)}` : 'Prayer times'}
            </Text>
          </Pressable>
          <Pressable onPress={onOpenQibla} accessibilityRole="button" accessibilityLabel="Qibla finder"
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: theme.surface, borderColor: theme.line }, pressed && { opacity: 0.6 }]}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={theme.fg} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={12} cy={12} r={9.5} />
              <Path d="M15.5 8.5 13.4 13.4 8.5 15.5 10.6 10.6Z" fill={theme.brass} stroke={theme.brass} />
            </Svg>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.stage} onPressIn={inc} accessibilityRole="button" accessibilityLabel={k.done ? `${name} complete` : `Count ${k.item.tr}`}>
        <Text style={[styles.ar, long && styles.arLong, veryLong && styles.arVeryLong, { color: theme.fg }]}>{k.item.ar}</Text>
        <View style={{ width: ringSize, height: ringSize }}>
          <BeadRing size={ringSize} n={n} filled={filled} theme={theme} />
          <View style={styles.center} pointerEvents="none">
            <Animated.Text style={[styles.num, { color: theme.fg, transform: [{ scale }], fontSize: ringSize * 0.3 }]}>{shown}</Animated.Text>
            <Text style={[styles.of, { color: k.done ? theme.ok : theme.muted }]}>{ofText}</Text>
          </View>
        </View>

        {k.done ? (
          <View style={[styles.done, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text style={[styles.doneT, { color: theme.ok }]}>✓ {name} complete</Text>
            <Text style={[styles.mean, { color: theme.muted }]}>May Allah accept it from you.</Text>
            <View style={styles.doneBtns}>
              <Pill theme={theme} label="Repeat" onPress={restart} />
              {k.type !== 'set' && <Pill theme={theme} label="Keep counting" onPress={keepCounting} />}
            </View>
            <Text style={[styles.lbl, { color: theme.muted }]}>RECOMMENDED NEXT</Text>
            <View style={styles.recs}>
              {recs.map((r) => <Pill key={r} theme={theme} label={labelFor(r)} accent onPress={() => onChoose(r)} />)}
            </View>
          </View>
        ) : (
          <>
            <View style={{ alignItems: 'center', gap: 3, maxWidth: 340 }}>
              <Text style={[styles.tr, { color: theme.fg }]} numberOfLines={3}>{k.type === 'dua' ? k.item.title : k.item.tr}</Text>
              {height > 680 && <Text style={[styles.mean, { color: theme.muted }]} numberOfLines={3}>
                {k.type === 'dua' ? k.item.for : k.item.en}{k.item.ref ? ' · ' + k.item.ref : ''}</Text>}
            </View>
            {k.type === 'set' && (
              <View style={styles.steps}>
                {k.set.steps.map(([id, cnt], i) => (
                  <View key={i} style={[styles.stepPill, { borderColor: i === k.step ? theme.brass : i < k.step ? 'transparent' : theme.line },
                    i === k.step && { backgroundColor: theme.brassSoft }]}>
                    <Text style={{ fontSize: 11.5, fontFamily: FONTS.ui, color: i < k.step ? theme.ok : i === k.step ? theme.fg : theme.muted }}>
                      {(i < k.step ? '✓ ' : '') + DHIKR[id].tr.split(',')[0].split(' ').slice(0, 2).join(' ') + ' ×' + cnt}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={[styles.hint, { color: theme.muted }]}>
              {k.type === 'set' ? `${k.set.name.toUpperCase()} · STEP ${k.step + 1} OF ${k.set.steps.length}` : 'TAP ANYWHERE TO COUNT'}
            </Text>
          </>
        )}
      </Pressable>

      <View style={styles.bar}>
        <BarBtn theme={theme} label="Undo" onPress={undo} icon={<Path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />} />
        <BarBtn theme={theme} label={armed ? 'Tap again' : 'Reset'} warn={armed} onPress={reset} icon={<Path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />} />
        <BarBtn theme={theme} label="Prayers" onPress={onOpenSchedule} icon={<Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />} />
        <BarBtn theme={theme} label="Duas" onPress={onOpenDuas} icon={<Path d="M7 20c-1.7-1.3-3-3.3-3-6V9.5a1.5 1.5 0 0 1 3 0V13M17 20c1.7-1.3 3-3.3 3-6V9.5a1.5 1.5 0 0 0-3 0V13M7 13V5.5a1.5 1.5 0 0 1 3 0V12M17 13V5.5a1.5 1.5 0 0 0-3 0V12" />} />
        <BarBtn theme={theme} label="Adhkar" primary onPress={onOpenLibrary}
          icon={<>{[[12, 5], [5, 12], [19, 12], [12, 19]].map(([x, y]) => <Circle key={x + '' + y} cx={x} cy={y} r={2} />)}</>} />
      </View>
    </SafeAreaView>
  );
}

function Pill({ theme, label, onPress, accent }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, { borderColor: accent ? theme.brass : theme.line },
      accent && { backgroundColor: theme.brassSoft }, pressed && { opacity: 0.6 }]}>
      <Text numberOfLines={1} style={{ color: theme.fg, fontFamily: FONTS.ui, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function BarBtn({ theme, label, onPress, icon, primary, warn }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.barBtn, primary && { backgroundColor: theme.surface, borderColor: theme.line, borderWidth: 1 }, pressed && { opacity: 0.6 }]}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={warn ? theme.brass : theme.fg} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">{icon}</Svg>
      <Text style={{ fontSize: 11.5, fontFamily: FONTS.ui, color: warn ? theme.brass : primary ? theme.fg : theme.muted }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 8 },
  brand: { fontFamily: FONTS.numMed, fontSize: 20 },
  small: { fontFamily: FONTS.ui, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, maxWidth: '78%' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, flexShrink: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  ar: { fontFamily: FONTS.ar, fontSize: 36, lineHeight: 60, textAlign: 'center', writingDirection: 'rtl', maxWidth: 360 },
  arLong: { fontSize: 23, lineHeight: 40 },
  arVeryLong: { fontSize: 18, lineHeight: 32 },
  center: { ...FILL, alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: FONTS.num, fontVariant: ['tabular-nums'] },
  of: { fontFamily: FONTS.ui, fontSize: 12.5, letterSpacing: 1 },
  tr: { fontFamily: FONTS.uiBold, fontSize: 16, textAlign: 'center' },
  mean: { fontFamily: FONTS.ui, fontSize: 13.5, lineHeight: 19, textAlign: 'center' },
  steps: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  stepPill: { paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1 },
  hint: { fontFamily: FONTS.ui, fontSize: 11.5, letterSpacing: 0.8 },
  done: { alignSelf: 'stretch', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 18, padding: 14 },
  doneT: { fontFamily: FONTS.uiBold, fontSize: 16 },
  doneBtns: { flexDirection: 'row', gap: 8 },
  lbl: { fontFamily: FONTS.uiBold, fontSize: 11, letterSpacing: 1.2, marginTop: 4 },
  recs: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  pill: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, maxWidth: '100%' },
  bar: { flexDirection: 'row', gap: 4, paddingTop: 8, paddingBottom: 10 },
  barBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 14 },
});
