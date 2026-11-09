import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FONTS } from '../theme';
import { t } from '../i18n';
import { SALAH, isPrayed, prayedCount, salahStats } from '../lib/salah';
import { getTimes } from '../lib/prayer';
import { dateKey, parseKey } from '../lib/history';

// Prayer tracker for one day: five buttons to tick, plus the streak and the last 7 days.
// Prayers that haven't started yet can't be ticked; past days can be filled in.
export default function SalahCard({ salah, day, onToggle, settings, theme, showStats = true }) {
  const now = new Date();
  const today = dateKey(now);
  const future = day > today;
  const times = day === today && settings?.location ? getTimes(settings.location, settings, now) : null;
  const st = salahStats(salah, now);
  const n = prayedCount(salah, day);

  return (
    <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <View style={styles.head}>
        <Text style={[styles.lbl, { color: theme.muted }]}>{t('salah.title').toUpperCase()}</Text>
        <Text style={{ color: n === 5 ? theme.ok : theme.muted, fontFamily: FONTS.uiBold, fontSize: 14 }}>{n === 5 ? '✓ ' : ''}{t('salah.count', { n })}</Text>
      </View>
      <View style={styles.row}>
        {SALAH.map((k) => {
          const on = isPrayed(salah, day, k);
          const notYet = future || (times && times[k] > now);
          return (
            <Pressable
              key={k}
              disabled={notYet}
              onPress={() => onToggle(day, k)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled: notYet }}
              accessibilityLabel={t('prayer.' + k)}
              hitSlop={4}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}
            >
              <View style={[styles.dot, { borderColor: on ? theme.brass : theme.line, backgroundColor: on ? theme.brass : 'transparent', opacity: notYet ? 0.35 : 1 }]}>
                <Text style={{ color: on ? theme.bg : theme.muted, fontSize: 18, fontFamily: FONTS.uiBold }}>{on ? '✓' : ''}</Text>
              </View>
              <Text numberOfLines={1} style={{ color: notYet ? theme.muted : theme.fg, fontSize: 13, fontFamily: FONTS.ui, opacity: notYet ? 0.6 : 1 }}>{t('prayer.' + k)}</Text>
            </Pressable>
          );
        })}
      </View>
      {showStats ? (
        <View style={[styles.stats, { borderTopColor: theme.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.brass, fontFamily: FONTS.numMed, fontSize: 22 }}>{st.streak}</Text>
            <Text style={{ color: theme.muted, fontSize: 12.5, fontFamily: FONTS.ui }}>{t('salah.streak')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.fg, fontFamily: FONTS.numMed, fontSize: 22 }}>{st.week}<Text style={{ color: theme.muted, fontSize: 14 }}>/35</Text></Text>
            <Text style={{ color: theme.muted, fontSize: 12.5, fontFamily: FONTS.ui }}>{t('salah.week')}</Text>
          </View>
          <View style={styles.bars} accessibilityLabel={t('salah.last7')}>
            {st.last7.map((d) => (
              <View key={d.day} style={{ alignItems: 'center', gap: 3 }}>
                <View style={[styles.barBg, { backgroundColor: theme.bead }]}>
                  <View style={{ height: `${(d.n / 5) * 100}%`, backgroundColor: d.n === 5 ? theme.ok : theme.brass, borderRadius: 3, width: '100%' }} />
                </View>
                <Text style={{ color: d.day === day ? theme.fg : theme.muted, fontSize: 10, fontFamily: FONTS.ui }}>
                  {t('cal.days').split(',')[parseKey(d.day).getDay()].slice(0, 1)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lbl: { fontFamily: FONTS.uiBold, fontSize: 12.5, letterSpacing: 1.1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { alignItems: 'center', gap: 6, flex: 1 },
  dot: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, paddingTop: 12, gap: 8 },
  bars: { flexDirection: 'row', gap: 5, alignItems: 'flex-end' },
  barBg: { width: 9, height: 30, borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden' },
});
