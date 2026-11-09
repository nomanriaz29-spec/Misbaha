import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import Sheet, { Group } from '../components/Sheet';
import { FONTS } from '../theme';
import { t, getLang } from '../i18n';
import { getTimes, fmtTime } from '../lib/prayer';
import { findMosques, cleanMosque, DEFAULT_JAMAAT, JAMAAT_KEYS, REMIND_OPTIONS, jamaatTimes, shiftTime, hhmm } from '../lib/mosque';

// Pick the nearest mosque (OpenStreetMap) and set its jamaat times once.
export default function Mosque({ visible, onClose, settings, update, theme }) {
  const saved = settings.mosque;
  const [view, setView] = useState(saved ? 'edit' : 'find');
  const [state, setState] = useState({ busy: false, list: null, error: '' });
  const [draft, setDraft] = useState(saved);
  const [manual, setManual] = useState('');

  useEffect(() => {
    if (visible) { setDraft(settings.mosque); setView(settings.mosque ? 'edit' : 'find'); }
  }, [visible]);

  const search = async () => {
    if (!settings.location) return;
    setState({ busy: true, list: null, error: '' });
    try {
      const list = await findMosques(settings.location.lat, settings.location.lng, getLang());
      setState({ busy: false, list, error: list.length ? '' : t('mosque.none') });
    } catch (e) {
      setState({ busy: false, list: null, error: t('mosque.offline') });
    }
  };

  const choose = (m) => {
    const next = cleanMosque({ name: m.name || t('mosque.unnamed'), osm: m.osm, lat: m.lat, lng: m.lng, jamaat: draft?.jamaat || DEFAULT_JAMAAT, remind: draft?.remind || 0 });
    setDraft(next);
    update({ mosque: next });
    setView('edit');
  };

  const save = (patch) => {
    const next = cleanMosque({ ...draft, ...patch });
    if (!next) return;
    setDraft(next);
    update({ mosque: next });
  };

  const setJ = (k, j) => save({ jamaat: { ...draft.jamaat, [k]: j } });

  const now = new Date();
  const azan = settings.location ? getTimes(settings.location, settings, now) : null;
  const jt = draft && settings.location ? jamaatTimes({ ...settings, mosque: draft }, now) : null;

  return (
    <Sheet visible={visible} title={t('mosque.title')} onClose={onClose} theme={theme}>
      {view === 'find' || !draft ? (
        <>
          <Group theme={theme}>
            <Row theme={theme} first style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
              <T theme={theme} style={{ color: theme.muted, fontSize: 15, lineHeight: 21 }}>{t('mosque.intro')}</T>
              <Pressable onPress={search} disabled={state.busy || !settings.location} style={[styles.primary, { backgroundColor: theme.brass, opacity: settings.location ? 1 : 0.5 }]}>
                {state.busy ? <ActivityIndicator color={theme.bg} /> : <Text style={{ color: theme.bg, fontFamily: FONTS.uiBold, fontSize: 16 }}>{t('mosque.find')}</Text>}
              </Pressable>
              <T theme={theme} style={{ color: theme.muted, fontSize: 12.5, lineHeight: 17 }}>{t('mosque.privacy')}</T>
            </Row>
          </Group>
          {state.error ? <T theme={theme} style={{ color: theme.brass, fontSize: 15 }}>{state.error}</T> : null}
          {state.list?.length ? (
            <Group label={t('mosque.nearby')} theme={theme}>
              {state.list.map((m, i) => (
                <Pressable key={m.osm} onPress={() => choose(m)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                  <Row theme={theme} first={i === 0}>
                    <View style={{ flex: 1 }}>
                      <T theme={theme} numberOfLines={2} style={{ fontFamily: m.name ? FONTS.ui : FONTS.ui, color: m.name ? theme.fg : theme.muted }}>{m.name || t('mosque.unnamed')}</T>
                      {m.denomination ? <T theme={theme} style={{ color: theme.muted, fontSize: 13 }}>{m.denomination}</T> : null}
                    </View>
                    <T theme={theme} style={{ color: theme.muted, fontSize: 14 }}>{m.km < 1 ? t('mosque.m', { n: Math.round(m.km * 1000 / 10) * 10 }) : t('unit.km', { n: m.km.toFixed(1) })}</T>
                  </Row>
                </Pressable>
              ))}
            </Group>
          ) : null}
          <Group label={t('mosque.manualTitle')} theme={theme}>
            <Row theme={theme} first style={{ gap: 8 }}>
              <TextInput value={manual} onChangeText={setManual} placeholder={t('mosque.namePh')} placeholderTextColor={theme.muted} maxLength={80}
                style={[styles.input, { color: theme.fg, borderColor: theme.line, flex: 1 }]} />
              <Pill theme={theme} label={t('common.choose')} on={false} onPress={() => manual.trim() && choose({ name: manual.trim(), osm: '' })} />
            </Row>
          </Group>
          {draft ? <Pill theme={theme} label={t('common.close')} on={false} onPress={() => setView('edit')} /> : null}
        </>
      ) : (
        <>
          <Group theme={theme}>
            <Row theme={theme} first style={{ gap: 8 }}>
              <TextInput value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} onEndEditing={() => save({ name: draft.name || t('mosque.unnamed') })}
                maxLength={80} style={[styles.input, { color: theme.fg, borderColor: theme.line, flex: 1, fontFamily: FONTS.uiBold }]} accessibilityLabel={t('custom.name')} />
              <Pill theme={theme} label={t('common.change')} on={false} onPress={() => { setState({ busy: false, list: null, error: '' }); setView('find'); }} />
            </Row>
            <Row theme={theme}><T theme={theme} style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>{t('mosque.editHint')}</T></Row>
          </Group>

          <Group label={t('mosque.jamaat')} theme={theme}>
            {JAMAAT_KEYS.map((k, i) => {
              const j = draft.jamaat[k];
              const name = k === 'jumuah' ? t('jamaat.jumuah') : t('prayer.' + k);
              const az = k === 'jumuah' ? azan?.dhuhr : azan?.[k];
              const baseFixed = j.mode === 'fixed' ? j.time : az ? hhmm(new Date(az.getTime() + (j.min || 0) * 60000)) : '13:30';
              const shown = k === 'jumuah' || !jt ? null : jt[k];
              return (
                <Row theme={theme} key={k} first={i === 0} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <T theme={theme} style={{ fontFamily: FONTS.uiBold }}>{name}</T>
                    <T theme={theme} style={{ color: theme.muted, fontSize: 13.5 }}>
                      {az ? t('mosque.azanAt', { time: fmtTime(az) }) : ''}{shown ? '  ·  ' + t('mosque.jamaatAt', { time: fmtTime(shown) }) : ''}
                    </T>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {k !== 'jumuah' ? <Pill theme={theme} small label={t('mosque.after')} on={j.mode === 'after'} onPress={() => setJ(k, { mode: 'after', min: j.mode === 'after' ? j.min : DEFAULT_JAMAAT[k].min ?? 15 })} /> : null}
                      <Pill theme={theme} small label={t('mosque.fixed')} on={j.mode === 'fixed'} onPress={() => setJ(k, { mode: 'fixed', time: baseFixed })} />
                    </View>
                    {j.mode === 'after' ? (
                      <Step theme={theme} label={name} value={t('mosque.plusMin', { n: j.min })}
                        onMinus={() => setJ(k, { mode: 'after', min: Math.max(0, j.min - 5) })}
                        onPlus={() => setJ(k, { mode: 'after', min: Math.min(120, j.min + 5) })} />
                    ) : (
                      <Step theme={theme} label={name} value={fmtTime(new Date(`2000-01-01T${j.time}:00`))}
                        onMinus={() => setJ(k, { mode: 'fixed', time: shiftTime(j.time, -5) })}
                        onPlus={() => setJ(k, { mode: 'fixed', time: shiftTime(j.time, 5) })} />
                    )}
                  </View>
                </Row>
              );
            })}
          </Group>

          <Group label={t('mosque.remind')} theme={theme}>
            <Row theme={theme} first style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {REMIND_OPTIONS.map((n) => (
                  <Pill theme={theme} key={n} small label={n ? t('unit.min', { n }) : t('mosque.off')} on={draft.remind === n} onPress={() => save({ remind: n })} />
                ))}
              </View>
              <T theme={theme} style={{ color: theme.muted, fontSize: 13.5, lineHeight: 19 }}>{t('mosque.remindSub')}</T>
            </Row>
          </Group>

          <Pressable onPress={() => { update({ mosque: null }); setDraft(null); setView('find'); }} style={[styles.remove, { borderColor: theme.line }]}>
            <Text style={{ color: theme.muted, fontFamily: FONTS.ui, fontSize: 15 }}>{t('mosque.remove')}</Text>
          </Pressable>
        </>
      )}
    </Sheet>
  );
}

function Row({ theme, first, children, style }) {
  return <View style={[styles.row, { borderTopColor: theme.line, borderTopWidth: first ? 0 : 1 }, style]}>{children}</View>;
}
function T({ theme, style, ...p }) {
  return <Text {...p} style={[{ fontFamily: FONTS.ui, color: theme.fg, fontSize: 16 }, style]} />;
}
function Pill({ theme, label, on, onPress, small }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!on }}
      style={[styles.pill, small && styles.pillSmall, { borderColor: on ? theme.brass : theme.line }, on && { backgroundColor: theme.brassSoft }]}>
      <Text style={{ color: theme.fg, fontFamily: on ? FONTS.uiBold : FONTS.ui, fontSize: small ? 13.5 : 15 }}>{label}</Text>
    </Pressable>
  );
}
function Step({ theme, onMinus, onPlus, value, label }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onMinus} hitSlop={6} accessibilityLabel={label + ' −5'} style={[styles.stepBtn, { borderColor: theme.line }]}><T theme={theme} style={{ fontSize: 19 }}>−</T></Pressable>
      <T theme={theme} style={{ minWidth: 74, textAlign: 'center', fontFamily: FONTS.numMed, fontVariant: ['tabular-nums'] }}>{value}</T>
      <Pressable onPress={onPlus} hitSlop={6} accessibilityLabel={label + ' +5'} style={[styles.stepBtn, { borderColor: theme.line }]}><T theme={theme} style={{ fontSize: 19 }}>+</T></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  primary: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  pill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  pillSmall: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  remove: { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 20 },
});
