import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Switch, StyleSheet } from 'react-native';
import Sheet, { Group } from '../components/Sheet';
import { FONTS } from '../theme';
import { t } from '../i18n';
import { QADA, left, totals, makeUp, setOwed, estimate, qadaStreak, emptyQada } from '../lib/qada';

// Qada: count prayers owed from the past and tick them off one by one as they are made up.
export default function Qada({ visible, onClose, qada, setQada, settings, theme }) {
  const [editing, setEditing] = useState(false);
  const [years, setYears] = useState(1);
  const [months, setMonths] = useState(0);
  const [witr, setWitr] = useState(settings?.madhab === 'Hanafi');
  const [armed, setArmed] = useState(false);
  const tot = totals(qada);
  const streak = qadaStreak(qada);
  const days = Math.round(years * 354.37 + months * 29.53);
  const shown = QADA.filter((k) => k !== 'witr' || qada.owed.witr > 0 || (editing && settings?.madhab === 'Hanafi'));

  const T = (p) => <Text {...p} style={[{ fontFamily: FONTS.ui, color: theme.fg, fontSize: 16 }, p.style]} />;
  const name = (k) => t('prayer.' + k);

  const setupView = (
    <>
      <T style={{ color: theme.muted, fontSize: 15, lineHeight: 21 }}>{t('qada.intro')}</T>
      <Group label={t('qada.estimateTitle')} theme={theme}>
        <View style={[styles.row, { borderTopWidth: 0 }]}>
          <T style={{ flex: 1 }}>{t('qada.years')}</T>
          <Stepper theme={theme} value={years} onChange={setYears} min={0} max={80} label={t('qada.years')} />
        </View>
        <View style={[styles.row, { borderTopColor: theme.line }]}>
          <T style={{ flex: 1 }}>{t('qada.months')}</T>
          <Stepper theme={theme} value={months} onChange={setMonths} min={0} max={11} label={t('qada.months')} />
        </View>
        <View style={[styles.row, { borderTopColor: theme.line }]}>
          <T style={{ flex: 1 }}>{t('qada.withWitr')}</T>
          <Switch value={witr} onValueChange={setWitr} trackColor={{ true: theme.brass, false: theme.bead }} thumbColor="#fff" />
        </View>
        <View style={[styles.row, { borderTopColor: theme.line, flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
          <T style={{ color: theme.muted, fontSize: 13.5, lineHeight: 19 }}>{t('qada.estimateNote')}</T>
          <Pressable disabled={!days} onPress={() => setQada(estimate(qada, years, months, witr))}
            style={[styles.primary, { backgroundColor: theme.brass, opacity: days ? 1 : 0.4 }]}>
            <Text style={{ color: theme.bg, fontFamily: FONTS.uiBold, fontSize: 16 }}>{t('qada.set', { n: days.toLocaleString() })}</Text>
          </Pressable>
        </View>
      </Group>
      <Pressable onPress={() => setEditing(true)} style={styles.link}>
        <T style={{ color: theme.brass }}>{t('qada.manual')}</T>
      </Pressable>
    </>
  );

  const editView = (
    <Group label={t('qada.owed')} theme={theme}>
      {QADA.filter((k) => k !== 'witr' || settings?.madhab === 'Hanafi' || qada.owed.witr > 0).map((k, i) => (
        <View key={k} style={[styles.row, { borderTopColor: theme.line, borderTopWidth: i ? 1 : 0 }]}>
          <T style={{ flex: 1 }}>{name(k)}</T>
          <TextInput
            value={String(qada.owed[k] || '')}
            onChangeText={(v) => setQada(setOwed(qada, k, parseInt(v.replace(/[^\d]/g, '') || '0', 10)))}
            keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.muted} maxLength={6}
            accessibilityLabel={t('qada.owed') + ' ' + name(k)}
            style={[styles.input, { color: theme.fg, borderColor: theme.line }]} />
        </View>
      ))}
      <View style={[styles.row, { borderTopColor: theme.line }]}>
        <Pressable onPress={() => setEditing(false)} style={[styles.primary, { flex: 1, backgroundColor: theme.brass }]}>
          <Text style={{ color: theme.bg, fontFamily: FONTS.uiBold, fontSize: 16 }}>{t('common.done')}</Text>
        </Pressable>
      </View>
    </Group>
  );

  const pct = tot.owed ? tot.made / tot.owed : 0;
  const mainView = (
    <>
      <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        {tot.left === 0 ? (
          <T style={{ color: theme.ok, fontFamily: FONTS.uiBold, fontSize: 18, textAlign: 'center' }}>✓ {t('qada.allDone')}</T>
        ) : (
          <>
            <Text style={{ color: theme.fg, fontFamily: FONTS.num, fontSize: 52, fontVariant: ['tabular-nums'] }}>{tot.left.toLocaleString()}</Text>
            <T style={{ color: theme.muted, fontSize: 14 }}>{t('qada.leftTotal')}</T>
          </>
        )}
        <View style={[styles.bar, { backgroundColor: theme.bead }]} accessibilityLabel={t('qada.progress', { made: tot.made, owed: tot.owed })}>
          <View style={{ width: `${Math.max(pct > 0 ? 2 : 0, pct * 100)}%`, backgroundColor: tot.left ? theme.brass : theme.ok, height: '100%', borderRadius: 4 }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' }}>
          <T style={{ color: theme.muted, fontSize: 13.5 }}>{t('qada.progress', { made: tot.made.toLocaleString(), owed: tot.owed.toLocaleString() })}</T>
          <T style={{ color: tot.today ? theme.brass : theme.muted, fontSize: 13.5 }}>{streak > 1 ? t('qada.streak', { n: streak }) : t('qada.madeToday', { n: tot.today })}</T>
        </View>
      </View>

      <Group theme={theme}>
        {shown.map((k, i) => {
          const l = left(qada, k);
          return (
            <View key={k} style={[styles.row, { borderTopColor: theme.line, borderTopWidth: i ? 1 : 0 }]}>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: FONTS.uiBold }}>{name(k)}</T>
                <T style={{ color: l ? theme.muted : theme.ok, fontSize: 13.5 }}>{l ? t('qada.left', { n: l.toLocaleString() }) : '✓'}</T>
              </View>
              <Pressable onPress={() => setQada(makeUp(qada, k, -1))} disabled={!qada.made[k]} hitSlop={6}
                accessibilityRole="button" accessibilityLabel={t('qada.undoA11y', { name: name(k) })}
                style={[styles.round, { borderColor: theme.line, opacity: qada.made[k] ? 1 : 0.3 }]}>
                <T style={{ fontSize: 20 }}>−</T>
              </Pressable>
              <Pressable onPress={() => setQada(makeUp(qada, k, 1))} disabled={!l} hitSlop={6}
                accessibilityRole="button" accessibilityLabel={t('qada.addA11y', { name: name(k) })}
                style={({ pressed }) => [styles.add, { backgroundColor: l ? theme.brass : theme.bead }, pressed && { opacity: 0.7 }]}>
                <Text style={{ color: theme.bg, fontFamily: FONTS.uiBold, fontSize: 17 }}>+1</Text>
              </Pressable>
            </View>
          );
        })}
      </Group>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        <Pressable onPress={() => setEditing(true)} style={[styles.ghost, { borderColor: theme.line, flex: 1 }]}>
          <T style={{ fontSize: 15 }}>{t('qada.edit')}</T>
        </Pressable>
        <Pressable
          onPress={() => { if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 2500); return; } setArmed(false); setQada(emptyQada()); }}
          style={[styles.ghost, { borderColor: armed ? theme.brass : theme.line, flex: 1 }]}>
          <T style={{ fontSize: 15, color: armed ? theme.brass : theme.muted }}>{armed ? t('qada.resetConfirm') : t('qada.reset')}</T>
        </Pressable>
      </View>
    </>
  );

  return (
    <Sheet visible={visible} title={t('qada.title')} onClose={() => { setEditing(false); onClose(); }} theme={theme}>
      {editing ? editView : tot.active ? mainView : setupView}
    </Sheet>
  );
}

function Stepper({ theme, value, onChange, min, max, label }) {
  const btn = (d, s) => (
    <Pressable onPress={() => onChange(Math.max(min, Math.min(max, value + d)))} hitSlop={6} accessibilityLabel={label + ' ' + s}
      style={[styles.round, { borderColor: theme.line }]}>
      <Text style={{ color: theme.fg, fontSize: 20 }}>{s}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {btn(-1, '−')}
      <Text style={{ color: theme.fg, fontFamily: FONTS.numMed, fontSize: 18, minWidth: 34, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{value}</Text>
      {btn(1, '+')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: 1 },
  hero: { borderWidth: 1, borderRadius: 18, padding: 16, alignItems: 'center', gap: 8 },
  bar: { height: 8, borderRadius: 4, alignSelf: 'stretch', overflow: 'hidden' },
  primary: { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  ghost: { borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  link: { paddingVertical: 10, alignItems: 'center', marginBottom: 20 },
  round: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  add: { minWidth: 58, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 17, minWidth: 96, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
