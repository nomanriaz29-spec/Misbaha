import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import BeadRing from '../components/BeadRing';
import { DHIKR, SETS } from '../data/adhkar';
import { fmtTime } from '../lib/prayer';
import { FONTS } from '../theme';

export function currentOf(progress) {
  const [type, id] = progress.cur.split(':');
  const p = progress.prog[progress.cur] || { step: 0, c: 0 };
  if (type === 'set') {
    const set = SETS[id];
    const step = Math.min(p.step, set.steps.length - 1);
    const [did, target] = set.steps[step];
    return { type, id, set, step, item: DHIKR[did], target, c: p.c };
  }
  return { type, id, item: DHIKR[id], target: DHIKR[id].n, c: p.c };
}

export default function Counter({ theme, progress, setProgress, settings, next, onOpenLibrary, onOpenSchedule, onOpenQibla }) {
  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const ringSize = Math.min(width * 0.78, 300, height * 0.36);
  const k = currentOf(progress);
  const lock = useRef(false);
  const scale = useRef(new Animated.Value(1)).current;
  const [toast, setToast] = useState('');
  const [armed, setArmed] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const say = (t) => { setToast(t); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 1800); };

  const vibrate = (strong) => {
    if (!settings.haptics) return;
    if (strong) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const inc = () => {
    if (lock.current) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.06, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start();

    const p = { ...(progress.prog[progress.cur] || { step: 0, c: 0 }) };
    p.c += 1;
    const hit = k.target > 0 && p.c === k.target;
    vibrate(hit);
    const nextProg = { ...progress, total: progress.total + 1, prog: { ...progress.prog, [progress.cur]: p } };

    if (k.type === 'set' && p.c >= k.target) {
      if (p.step < k.set.steps.length - 1) {
        lock.current = true;
        setProgress(nextProg);
        setTimeout(() => {
          setProgress((cur) => ({ ...cur, prog: { ...cur.prog, [cur.cur]: { step: p.step + 1, c: 0 } } }));
          lock.current = false;
        }, 650);
        return;
      }
      if (hit) say(k.set.name + ' complete. May Allah accept it.');
    } else if (hit) say(`${k.item.tr} ×${k.target} complete`);
    setProgress(nextProg);
  };

  const undo = () => {
    const p = { ...(progress.prog[progress.cur] || { step: 0, c: 0 }) };
    if (p.c > 0) p.c -= 1;
    else if (k.type === 'set' && p.step > 0) { p.step -= 1; p.c = k.set.steps[p.step][1] - 1; }
    else return;
    setProgress({ ...progress, total: Math.max(0, progress.total - 1), prog: { ...progress.prog, [progress.cur]: p } });
  };

  const reset = () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 2500); return; }
    setArmed(false);
    setProgress({ ...progress, prog: { ...progress.prog, [progress.cur]: { step: 0, c: 0 } } });
    say('Counter reset');
  };

  const T = k.target;
  const n = T > 0 && T <= 34 ? T : 33;
  const filled = T > 0 && T <= 34 ? Math.min(k.c, T) : k.c === 0 ? 0 : ((k.c - 1) % 33) + 1;
  const done = T > 0 && k.c >= T;
  const ofText = T > 0 ? (done ? 'COMPLETE' : `OF ${T}`) : k.c >= 33 ? `ROUND ${Math.floor((k.c - 1) / 33) + 1}` : 'NO TARGET';
  const long = k.item.ar.length > 38;

  return (
    <SafeAreaView style={[styles.wrap, { backgroundColor: theme.bg }]}>
      <View style={styles.top}>
        <View>
          <Text style={[styles.brand, { color: theme.fg }]}>Misbaha</Text>
          <Text style={[styles.small, { color: theme.muted }]}>Today {progress.total.toLocaleString()}</Text>
        </View>
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

      <Pressable style={styles.stage} onPressIn={inc} accessibilityRole="button" accessibilityLabel={`Count ${k.item.tr}`}>
        <Text style={[styles.ar, long && styles.arLong, { color: theme.fg }]}>{k.item.ar}</Text>
        <View style={{ width: ringSize, height: ringSize }}>
          <BeadRing size={ringSize} n={n} filled={filled} theme={theme} />
          <View style={styles.center} pointerEvents="none">
            <Animated.Text style={[styles.num, { color: theme.fg, transform: [{ scale }], fontSize: ringSize * 0.3 }]}>{k.c}</Animated.Text>
            <Text style={[styles.of, { color: done ? theme.ok : theme.muted }]}>{ofText}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: 3, maxWidth: 340 }}>
          <Text style={[styles.tr, { color: theme.fg }]}>{k.item.tr}</Text>
          {height > 680 && <Text style={[styles.mean, { color: theme.muted }]}>{k.item.en}{k.item.ref ? ' · ' + k.item.ref : ''}</Text>}
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
      </Pressable>

      <View style={styles.bar}>
        <BarBtn theme={theme} label="Undo" onPress={undo} icon={<Path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />} />
        <BarBtn theme={theme} label={armed ? 'Tap again' : 'Reset'} warn={armed} onPress={reset} icon={<Path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />} />
        <BarBtn theme={theme} label="Prayers" onPress={onOpenSchedule} icon={<Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />} />
        <BarBtn theme={theme} label="Adhkar" primary onPress={onOpenLibrary}
          icon={<>{[[12, 5], [5, 12], [19, 12], [12, 19]].map(([x, y]) => <Circle key={x + '' + y} cx={x} cy={y} r={2} />)}</>} />
      </View>

      {toast ? (
        <View style={[styles.toast, { backgroundColor: theme.fg }]} pointerEvents="none">
          <Text style={{ color: theme.bg, fontFamily: FONTS.ui, fontSize: 13.5 }}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
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
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: FONTS.num, fontVariant: ['tabular-nums'] },
  of: { fontFamily: FONTS.ui, fontSize: 12.5, letterSpacing: 1 },
  tr: { fontFamily: FONTS.uiBold, fontSize: 16, textAlign: 'center' },
  mean: { fontFamily: FONTS.ui, fontSize: 13.5, lineHeight: 19, textAlign: 'center' },
  steps: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  stepPill: { paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1 },
  hint: { fontFamily: FONTS.ui, fontSize: 11.5, letterSpacing: 0.8 },
  bar: { flexDirection: 'row', gap: 8, paddingTop: 8, paddingBottom: 10 },
  barBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 14 },
  toast: { position: 'absolute', alignSelf: 'center', bottom: 110, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
});
