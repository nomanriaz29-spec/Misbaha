import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Linking, Platform } from 'react-native';
import Svg, { Circle, Line, Path, Rect, G, Text as SvgText } from 'react-native-svg';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Sheet from '../components/Sheet';
import { qiblaBearing, distanceKm, compassPoint, angleDiff } from '../lib/qibla';
import { FONTS, FILL } from '../theme';
import { t } from '../i18n';

const ALIGN_DEG = 5;

const SMOOTHING = 0.3; // 0..1, lower = steadier, higher = snappier

// The dial is drawn once and only rotated afterwards, so sensor updates never redraw it.
const Dial = React.memo(function Dial({ size, bearing, aligned, theme }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 300 300">
      <Circle cx={150} cy={150} r={122} fill={theme.surface} stroke={aligned ? theme.ok : theme.line} strokeWidth={aligned ? 4 : 1.5} />
      {Array.from({ length: 72 }, (_, i) => {
        const a = (i * 5 * Math.PI) / 180, major = i % 18 === 0, mid = i % 6 === 0;
        const r1 = 122, r2 = major ? 104 : mid ? 110 : 115;
        return <Line key={i} x1={150 + r1 * Math.sin(a)} y1={150 - r1 * Math.cos(a)} x2={150 + r2 * Math.sin(a)} y2={150 - r2 * Math.cos(a)}
          stroke={major ? theme.fg : theme.muted} strokeWidth={major ? 2 : 1} />;
      })}
      {[['N', 0], ['E', 90], ['S', 180], ['W', 270]].map(([t, a]) => {
        const r = (a * Math.PI) / 180;
        return <SvgText key={t} x={150 + 88 * Math.sin(r)} y={150 - 88 * Math.cos(r) + 6} fontSize={19.5} fontWeight="600" textAnchor="middle"
          fill={t === 'N' ? theme.brass : theme.muted}>{t}</SvgText>;
      })}
      {/* Qibla needle + Kaaba */}
      <G rotation={bearing} origin="150, 150">
        <Line x1={150} y1={150} x2={150} y2={58} stroke={theme.brass} strokeWidth={3} strokeLinecap="round" />
        <Rect x={137} y={30} width={26} height={26} rx={3} fill={theme.fg} />
        <Rect x={137} y={36} width={26} height={4} fill={theme.brass} />
      </G>
      <Circle cx={150} cy={150} r={6} fill={theme.brass} />
    </Svg>
  );
});

// Live Qibla compass. The dial turns with the phone so the Kaaba marker always
// points to the Qibla; when the phone faces it, the ring turns green and vibrates.
export default function Qibla({ visible, onClose, settings, theme }) {
  const loc = settings.location;
  const bearing = loc ? qiblaBearing(loc.lat, loc.lng) : 0;
  const km = loc ? distanceKm(loc.lat, loc.lng) : 0;

  // Only what the text shows lives in React state, and it changes at most once per degree.
  const [reading, setReading] = useState({ off: null, low: false });
  const [error, setError] = useState('');
  const rot = useRef(new Animated.Value(0)).current;
  const smooth = useRef(null);   // filtered heading, removes sensor jitter
  const unwrapped = useRef(0);   // continuous angle so the dial never spins the long way round
  const shown = useRef({ off: null, low: false });
  const wasAligned = useRef(false);

  useEffect(() => {
    if (!visible) return;
    let sub = null;
    let cancelled = false;
    smooth.current = null;
    (async () => {
      setError('');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setError(t('qibla.noPermission')); return; }
      try {
        sub = await Location.watchHeadingAsync((h) => {
          if (cancelled) return;
          const raw = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          smooth.current = smooth.current == null ? raw : (smooth.current + SMOOTHING * angleDiff(raw, smooth.current) + 360) % 360;
          const hd = smooth.current;
          // Rotate the dial directly: no React re-render, no queued animations.
          unwrapped.current += angleDiff(-hd, unwrapped.current);
          rot.setValue(unwrapped.current);
          // iOS reports accuracy in degrees; Android reports 0 (unreliable) to 3 (high).
          const acc = h.accuracy;
          const low = acc != null && (Platform.OS === 'ios' ? acc < 0 || acc > 25 : acc <= 1);
          const off = Math.round(angleDiff(bearing, hd));
          if (off !== shown.current.off || low !== shown.current.low) {
            shown.current = { off, low };
            setReading({ off, low });
          }
        });
      } catch (e) {
        setError(t('qibla.noSensor'));
      }
    })();
    return () => { cancelled = true; sub && sub.remove(); };
  }, [visible, bearing]);

  const { off, low: lowAccuracy } = reading;
  const aligned = off != null && Math.abs(off) <= ALIGN_DEG;
  useEffect(() => {
    if (aligned && !wasAligned.current && settings.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    wasAligned.current = aligned;
  }, [aligned]);

  const spin = useRef(rot.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'], extrapolate: 'extend' })).current;
  const S = 280;

  let status = t('qibla.hold');
  if (error) status = error;
  else if (aligned) status = t('qibla.facing');
  else if (off != null) status = t(off > 0 ? 'qibla.right' : 'qibla.left', { n: Math.abs(off) });

  return (
    <Sheet visible={visible} title={t('qibla.title')} onClose={onClose} theme={theme}>
      <View style={{ alignItems: 'center', gap: 16 }}>
        <View style={{ width: S, height: S }}>
          {/* fixed pointer: the top of the phone */}
          <Svg width={S} height={S} style={FILL}>
            <Path d={`M${S / 2 - 9} 6 L${S / 2 + 9} 6 L${S / 2} 22 Z`} fill={aligned ? theme.ok : theme.fg} />
          </Svg>
          <Animated.View style={[FILL, { transform: [{ rotate: spin }] }]} renderToHardwareTextureAndroid>
            <Dial size={S} bearing={bearing} aligned={aligned} theme={theme} />
          </Animated.View>
        </View>

        <Text style={[styles.status, { color: aligned ? theme.ok : theme.fg }]}>{status}</Text>
        {lowAccuracy && !error ? (
          <Text style={[styles.note, { color: theme.brass }]}>{t('qibla.calibrate')}</Text>
        ) : null}

        <View style={[styles.facts, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Fact theme={theme} k={t('qibla.title')} v={`${Math.round(bearing)}° ${compassPoint(bearing)}`} />
          <Fact theme={theme} k={t('qibla.makkah')} v={t('unit.km', { n: Math.round(km).toLocaleString() })} />
          <Fact theme={theme} k={t('qibla.from')} v={loc?.name || '—'} />
        </View>

        {error ? (
          <Pressable onPress={() => Linking.openSettings()} style={[styles.btn, { borderColor: theme.line }]}>
            <Text style={{ color: theme.fg, fontFamily: FONTS.ui }}>{t('common.openSettings')}</Text>
          </Pressable>
        ) : null}
        <Text style={[styles.note, { color: theme.muted }]}>{t('qibla.note')}</Text>
      </View>
    </Sheet>
  );
}

function Fact({ theme, k, v }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 3, minWidth: 0 }}>
      <Text style={{ color: theme.muted, fontSize: 12.5, fontFamily: FONTS.ui }}>{k}</Text>
      <Text numberOfLines={1} style={{ color: theme.fg, fontSize: 17, fontFamily: FONTS.numMed }}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  status: { fontFamily: FONTS.uiBold, fontSize: 20.5, textAlign: 'center' },
  note: { fontFamily: FONTS.ui, fontSize: 14, lineHeight: 20.5, textAlign: 'center', maxWidth: 320 },
  facts: { flexDirection: 'row', alignSelf: 'stretch', borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 6 },
  btn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1 },
});
