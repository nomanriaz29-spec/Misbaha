import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Switch, StyleSheet, ActivityIndicator, Linking, Platform } from 'react-native';
import Sheet, { Group } from '../components/Sheet';
import { getTimes, fmtTime, METHODS, PRAYERS, defaultsForCountry } from '../lib/prayer';
import { detectLocation, CITIES } from '../lib/location';
import { DAILY } from '../data/adhkar';
import { FONTS } from '../theme';
import { ALERT_SOUNDS } from '../lib/notifications';
import { playSound, stopSound } from '../lib/sounds';

const OFFSETS = [5, 10, 15, 20, 30];

export function buildPlan(settings, now = new Date()) {
  const t = getTimes(settings.location, settings, now);
  if (!t) return [];
  const off = (settings.offset ?? 15) * 60000;
  const items = PRAYERS.filter((p) => settings.prayers[p.key]).map((p) => ({
    at: new Date(t[p.key].getTime() + off), name: 'After ' + p.name, sub: p.body, open: p.open,
  }));
  if (settings.daily) {
    DAILY.forEach((r) => {
      const at = new Date(now); at.setHours(r.hour, r.minute, 0, 0);
      items.push({ at, name: r.title, sub: r.body, open: r.open });
    });
  }
  return items.sort((a, b) => a.at - b.at);
}

export default function Schedule({ visible, onClose, onStart, settings, update, notifOn, onEnableNotifs, theme }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [picker, setPicker] = useState(null); // 'method' | 'city' | null
  const [preview, setPreview] = useState(null); // sound being previewed
  useEffect(() => { if (!visible) { stopSound(); setPreview(null); } }, [visible]);
  const alert = settings.alert || { on: true, sound: 'azan' };
  const togglePreview = async (kind) => {
    if (preview === kind) { stopSound(); setPreview(null); return; }
    const ok = await playSound(kind, () => setPreview(null));
    setPreview(ok ? kind : null);
  };

  const times = useMemo(() => getTimes(settings.location, settings), [settings, visible]);
  const plan = useMemo(() => buildPlan(settings), [settings, visible]);
  const now = Date.now();
  const next = plan.find((x) => x.at.getTime() > now);

  const useGps = async () => {
    setBusy(true); setMsg('');
    try {
      const loc = await detectLocation();
      if (loc.denied) {
        setMsg('Location is off for Misbaha. Turn it on in Settings, or choose a city.');
      } else {
        update({ location: loc, ...defaultsForCountry(loc.country), methodAuto: true });
        setMsg('Updated to ' + loc.name);
      }
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const Row = ({ first, children, style }) => (
    <View style={[styles.row, { borderTopColor: theme.line, borderTopWidth: first ? 0 : 1 }, style]}>{children}</View>
  );
  const T = (p) => <Text {...p} style={[{ fontFamily: FONTS.ui, color: theme.fg, fontSize: 17 }, p.style]} />;
  const Btn = ({ label, onPress }) => (
    <Pressable onPress={onPress} style={[styles.btn, { borderColor: theme.line }]}><T style={{ fontSize: 15 }}>{label}</T></Pressable>
  );

  return (
    <Sheet visible={visible} title="Prayer & reminders" onClose={() => { setPicker(null); onClose(); }} theme={theme}>
      <View style={{ gap: 8 }}>
        <Text style={[styles.lbl, { color: theme.muted }]}>{('Prayer times · ' + (settings.location?.name || '')).toUpperCase()}</Text>
        <View style={[styles.grid, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          {[['Fajr', 'fajr'], ['Sunrise', 'sunrise'], ['Dhuhr', 'dhuhr'], ['Asr', 'asr'], ['Maghrib', 'maghrib'], ['Isha', 'isha']].map(([n, k]) => (
            <View key={k} style={styles.cell}>
              <Text style={{ color: theme.muted, fontSize: 12.5, fontFamily: FONTS.ui }}>{n}</Text>
              <Text style={{ color: theme.fg, fontSize: 16, fontFamily: FONTS.numMed, fontVariant: ['tabular-nums'] }}>
                {times ? fmtTime(times[k]).replace(/ (AM|PM)/, '') : '--'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {!notifOn && (
        <Group theme={theme}>
          <Row first style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
            <T style={{ fontFamily: FONTS.uiBold }}>Notifications are off</T>
            <T style={{ color: theme.muted, fontSize: 15 }}>Turn them on to get a reminder on your phone after each prayer.</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn label="Turn on" onPress={onEnableNotifs} />
              <Btn label="Open phone settings" onPress={() => Linking.openSettings()} />
            </View>
          </Row>
        </Group>
      )}

      <Group label="Today's reminders" theme={theme}>
        {plan.map((x, i) => {
          const past = x.at.getTime() <= now;
          return (
            <Row key={i} first={i === 0} style={x === next ? { backgroundColor: theme.brassSoft } : null}>
              <Text style={[styles.tm, { color: past ? theme.muted : theme.fg }]}>{fmtTime(x.at)}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={{ fontFamily: FONTS.uiBold, color: past ? theme.muted : theme.fg }}>{x.name}</T>
                <T style={{ color: theme.muted, fontSize: 14 }} numberOfLines={2}>{x.sub}</T>
              </View>
              <Btn label="Start" onPress={() => onStart(x.open)} />
            </Row>
          );
        })}
      </Group>

      <Group label="Location" theme={theme}>
        <Row first>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: FONTS.uiBold }}>{settings.location?.name || 'Not set'}</T>
            <T style={{ color: theme.muted, fontSize: 14 }}>{settings.location?.source === 'gps' ? 'From your phone’s location' : 'Chosen manually'}</T>
          </View>
          {busy ? <ActivityIndicator color={theme.brass} /> : <Btn label="Use my location" onPress={useGps} />}
        </Row>
        <Row>
          <T>Choose a city</T>
          <Btn label={picker === 'city' ? 'Hide' : 'Choose'} onPress={() => setPicker(picker === 'city' ? null : 'city')} />
        </Row>
        {picker === 'city' && CITIES.map((c) => (
          <Pressable key={c.name} onPress={() => { update({ location: c, ...defaultsForCountry(c.country), methodAuto: true }); setPicker(null); setMsg('Updated to ' + c.name); }}
            style={[styles.opt, { borderTopColor: theme.line }]}>
            <T>{c.name}</T>
          </Pressable>
        ))}
        {msg ? <Row><T style={{ color: theme.muted, fontSize: 15 }}>{msg}</T></Row> : null}
      </Group>

      <Group label="Calculation" theme={theme}>
        <Row first>
          <View style={{ flex: 1 }}><T>Method</T><T style={{ color: theme.muted, fontSize: 14 }}>{METHODS[settings.method]}</T></View>
          <Btn label={picker === 'method' ? 'Hide' : 'Change'} onPress={() => setPicker(picker === 'method' ? null : 'method')} />
        </Row>
        {picker === 'method' && Object.entries(METHODS).map(([k, v]) => (
          <Pressable key={k} onPress={() => { update({ method: k, methodAuto: false }); setPicker(null); }}
            style={[styles.opt, { borderTopColor: theme.line }, settings.method === k && { backgroundColor: theme.brassSoft }]}>
            <T>{v}</T>
          </Pressable>
        ))}
        <Row>
          <T>Asr</T>
          <View style={[styles.seg, { borderColor: theme.line }]}>
            {['Shafi', 'Hanafi'].map((m) => (
              <Pressable key={m} onPress={() => update({ madhab: m, methodAuto: false })} style={[styles.segBtn, settings.madhab === m && { backgroundColor: theme.brass }]}>
                <T style={{ fontSize: 15, color: settings.madhab === m ? theme.bg : theme.fg }}>{m === 'Shafi' ? 'Standard' : 'Hanafi'}</T>
              </Pressable>
            ))}
          </View>
        </Row>
      </Group>

      <Group label="Fine-tune times" theme={theme}>
        <Row first style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <T style={{ color: theme.muted, fontSize: 14 }}>If your masjid's timetable differs by a minute or two, adjust each prayer here.</T>
        </Row>
        {PRAYERS.map((p) => {
          const v = settings.adjust?.[p.key] || 0;
          const set = (n) => update({ adjust: { ...settings.adjust, [p.key]: Math.max(-30, Math.min(30, n)) } });
          return (
            <Row key={p.key}>
              <T>{p.name}</T>
              <View style={styles.stepper}>
                <Pressable onPress={() => set(v - 1)} hitSlop={6} accessibilityLabel={`${p.name} one minute earlier`} style={[styles.stepBtn, { borderColor: theme.line }]}>
                  <T style={{ fontSize: 20.5 }}>−</T>
                </Pressable>
                <T style={{ width: 64, textAlign: 'center', fontVariant: ['tabular-nums'], color: v ? theme.brass : theme.muted }}>
                  {v === 0 ? '0 min' : `${v > 0 ? '+' : ''}${v} min`}
                </T>
                <Pressable onPress={() => set(v + 1)} hitSlop={6} accessibilityLabel={`${p.name} one minute later`} style={[styles.stepBtn, { borderColor: theme.line }]}>
                  <T style={{ fontSize: 20.5 }}>+</T>
                </Pressable>
              </View>
            </Row>
          );
        })}
      </Group>

      <Group label="Prayer time alert" theme={theme}>
        <Row first>
          <View style={{ flex: 1 }}>
            <T>Alert at each prayer time</T>
            <T style={{ color: theme.muted, fontSize: 14 }}>Plays when the prayer begins</T>
          </View>
          <Switch value={alert.on} onValueChange={(v) => update({ alert: { ...alert, on: v } })}
            trackColor={{ true: theme.brass, false: theme.bead }} thumbColor="#fff" />
        </Row>
        {alert.on && (
          <Row style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <T>Sound</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {Object.entries(ALERT_SOUNDS).map(([k, s]) => {
                const on = alert.sound === k;
                return (
                  <Pressable key={k} onPress={() => update({ alert: { ...alert, sound: k } })} accessibilityRole="radio" accessibilityState={{ checked: on }}
                    style={[styles.soundOpt, { borderColor: on ? theme.brass : theme.line }, on && { backgroundColor: theme.brassSoft }]}>
                    <T style={{ fontFamily: on ? FONTS.uiBold : FONTS.ui }}>{s.label}{k === 'azan' ? ' ★' : ''}</T>
                  </Pressable>
                );
              })}
            </View>
            {alert.sound !== 'standard' && (
              <Pressable onPress={() => togglePreview(alert.sound === 'azan' ? 'azan' : 'alarm')} style={[styles.btn, { borderColor: theme.line, alignSelf: 'flex-start' }]}>
                <T style={{ fontSize: 15 }}>{preview ? '■  Stop' : `▶  Play ${ALERT_SOUNDS[alert.sound].label.toLowerCase()}`}</T>
              </Pressable>
            )}
            <T style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>
              {alert.sound === 'azan'
                ? 'The notification plays the opening of the azan. Tap it to hear the full azan in the app.'
                : alert.sound === 'alarm' ? 'A short alarm tone plays when the prayer begins.' : 'Your phone’s standard notification sound.'}
              {Platform.OS === 'ios' ? ' On iPhone, sounds play only when the ring switch is on.' : ''}
            </T>
          </Row>
        )}
        {alert.on && Platform.OS === 'android' && (
          <Row style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <T style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>
              For the alert to play exactly on time, allow “Alarms & reminders” for Misbaha in your phone’s settings.
            </T>
            <Btn label="Open phone settings" onPress={() => Linking.openSettings()} />
          </Row>
        )}
      </Group>

      <Group label="Reminders" theme={theme}>
        <Row first style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
          <T>Tasbeeh reminder, minutes after each prayer</T>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {OFFSETS.map((o) => (
              <Pressable key={o} onPress={() => update({ offset: o })}
                style={[styles.chip, { borderColor: settings.offset === o ? theme.brass : theme.line }, settings.offset === o && { backgroundColor: theme.brassSoft }]}>
                <T style={{ fontSize: 15 }}>{o} min</T>
              </Pressable>
            ))}
          </View>
        </Row>
        {PRAYERS.map((p) => (
          <Row key={p.key}>
            <View style={{ flex: 1 }}>
              <T>{p.name}</T>
              <T style={{ color: theme.muted, fontSize: 13 }}>{alert.on ? 'Prayer time alert and tasbeeh reminder' : 'Tasbeeh reminder'}</T>
            </View>
            <Switch value={!!settings.prayers[p.key]} onValueChange={(v) => update({ prayers: { ...settings.prayers, [p.key]: v } })}
              trackColor={{ true: theme.brass, false: theme.bead }} thumbColor="#fff" />
          </Row>
        ))}
        <Row>
          <View style={{ flex: 1 }}><T>Daily tasbeeh</T><T style={{ color: theme.muted, fontSize: 14 }}>9:00 AM · 2:30 PM · 10:00 PM</T></View>
          <Switch value={settings.daily} onValueChange={(v) => update({ daily: v })} trackColor={{ true: theme.brass, false: theme.bead }} thumbColor="#fff" />
        </Row>
        <Row>
          <T>Vibrate on each count</T>
          <Switch value={settings.haptics} onValueChange={(v) => update({ haptics: v })} trackColor={{ true: theme.brass, false: theme.bead }} thumbColor="#fff" />
        </Row>
      </Group>

      <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20.5, fontFamily: FONTS.ui }}>
        Times are calculated on your phone from your location and the method above. They follow you when you travel, and you can fine-tune each prayer to match your masjid. Reminders are scheduled a week ahead and refresh automatically.
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  lbl: { fontFamily: FONTS.uiBold, fontSize: 13, letterSpacing: 1.2 },
  grid: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 4 },
  cell: { flex: 1, alignItems: 'center', gap: 3 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  opt: { paddingVertical: 12, paddingHorizontal: 22, borderTopWidth: 1 },
  tm: { width: 74, fontFamily: FONTS.numMed, fontSize: 17, fontVariant: ['tabular-nums'] },
  btn: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  seg: { flexDirection: 'row', borderWidth: 1, borderRadius: 999, padding: 3 },
  segBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  soundOpt: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
