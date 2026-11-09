import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Sheet, { Group } from '../components/Sheet';
import { dateKey, stats } from '../lib/history';
import { labelFor, setName } from '../lib/recommend';
import { t } from '../i18n';
import { SETS } from '../data/adhkar';
import { FONTS, FILL } from '../theme';

const WEEKDAYS = () => t('cal.weekdaysShort').split(','); // Monday first
const MONTHS = () => t('cal.months').split(',');
const DAYS = () => t('cal.days').split(','); // Sunday first

// Shade a day by how much tasbeeh was done.
const level = (n) => (n <= 0 ? 0 : n < 100 ? 1 : n < 300 ? 2 : 3);
const LEVEL_OPACITY = [0, 0.28, 0.55, 0.9];

export default function History({ visible, onClose, history, theme }) {
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [sel, setSel] = useState(dateKey(today));
  const s = useMemo(() => stats(history), [history, visible]);

  const cells = useMemo(() => {
    const first = new Date(month);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysIn; d++) out.push(new Date(month.getFullYear(), month.getMonth(), d));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const isFuture = (d) => d > today;
  const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= today;
  const shift = (n) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  const day = history[sel];
  const selDate = (() => { const [y, m, d] = sel.split('-').map(Number); return new Date(y, m - 1, d); })();
  const isToday = sel === dateKey(today);
  const items = day ? Object.entries(day.items).sort((a, b) => b[1] - a[1]) : [];
  const done = day?.done || {};

  return (
    <Sheet visible={visible} title={t('history.title')} onClose={onClose} theme={theme}>
      <View style={styles.statsRow}>
        <Stat theme={theme} k={t('history.streak')} v={s.current} unit={t('history.days', { n: s.current })} accent />
        <Stat theme={theme} k={t('history.best')} v={s.best} unit={t('history.days', { n: s.best })} />
        <Stat theme={theme} k={t('history.week')} v={s.week.toLocaleString()} />
        <Stat theme={theme} k={t('history.all')} v={s.all.toLocaleString()} />
      </View>

      <View style={[styles.cal, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <View style={styles.calHead}>
          <Pressable onPress={() => shift(-1)} hitSlop={10} accessibilityLabel={t('history.prevMonth')} style={styles.nav}>
            <Text style={{ color: theme.fg, fontSize: 23 }}>‹</Text>
          </Pressable>
          <Text style={[styles.month, { color: theme.fg }]}>{MONTHS()[month.getMonth()]} {month.getFullYear()}</Text>
          <Pressable onPress={() => canNext && shift(1)} hitSlop={10} accessibilityLabel={t('history.nextMonth')} style={[styles.nav, !canNext && { opacity: 0.25 }]}>
            <Text style={{ color: theme.fg, fontSize: 23 }}>›</Text>
          </Pressable>
        </View>
        <View style={styles.grid}>
          {WEEKDAYS().map((w, wi) => <Text key={wi} numberOfLines={1} adjustsFontSizeToFit style={[styles.wd, { color: theme.muted }]}>{w}</Text>)}
          {cells.map((d, i) => {
            if (!d) return <View key={i} style={styles.cell} />;
            const k = dateKey(d), n = history[k]?.total || 0, lv = level(n), future = isFuture(d);
            const selected = k === sel, todayCell = k === dateKey(today);
            return (
              <Pressable key={i} disabled={future} onPress={() => setSel(k)} style={styles.cell}
                accessibilityLabel={`${d.getDate()} ${MONTHS()[d.getMonth()]}, ${n}`}>
                <View style={[styles.dayBox, { borderColor: selected ? theme.fg : todayCell ? theme.brass : 'transparent' }]}>
                  {lv > 0 && <View style={[FILL, { backgroundColor: theme.brass, opacity: LEVEL_OPACITY[lv], borderRadius: 9 }]} />}
                  <Text style={{ fontFamily: FONTS.ui, fontSize: 15, color: future ? theme.line : lv >= 2 ? theme.bg : theme.fg, fontVariant: ['tabular-nums'] }}>{d.getDate()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.legend}>
          <Text style={[styles.lg, { color: theme.muted }]}>{t('history.less')}</Text>
          {[0, 1, 2, 3].map((lv) => (
            <View key={lv} style={[styles.sw, { borderColor: theme.line }]}>
              {lv > 0 && <View style={[FILL, { backgroundColor: theme.brass, opacity: LEVEL_OPACITY[lv], borderRadius: 3 }]} />}
            </View>
          ))}
          <Text style={[styles.lg, { color: theme.muted }]}>{t('history.more')}</Text>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <View style={styles.dayHead}>
          <Text style={[styles.dayTitle, { color: theme.fg }]}>
            {isToday ? t('history.today') : `${DAYS()[selDate.getDay()]} ${selDate.getDate()} ${MONTHS()[selDate.getMonth()]}`}
          </Text>
          <Text style={[styles.dayTotal, { color: theme.brass }]}>{(day?.total || 0).toLocaleString()}</Text>
        </View>

        <Group label={t('library.routines')} theme={theme}>
          {Object.entries(SETS).map(([id, set], i) => {
            const n = done['set:' + id] || 0;
            const goal = id === 'salah' ? 5 : 1;
            const full = n >= goal;
            return (
              <View key={id} style={[styles.row, { borderTopColor: theme.line, borderTopWidth: i ? 1 : 0 }]}>
                <Text style={[styles.rowT, { color: theme.fg }]}>{setName(id)}</Text>
                <Text style={[styles.rowV, { color: full ? theme.ok : n ? theme.brass : theme.muted }]}>
                  {id === 'salah' ? `${full ? '✓ ' : ''}${t('history.ofFive', { n: Math.min(n, 99) })}` : full ? '✓ ' + t('history.done') : '—'}
                </Text>
              </View>
            );
          })}
        </Group>

        {items.length ? (
          <Group label={t('history.counts')} theme={theme}>
            {items.map(([k, n], i) => (
              <View key={k} style={[styles.row, { borderTopColor: theme.line, borderTopWidth: i ? 1 : 0 }]}>
                <Text style={[styles.rowT, { color: theme.fg, flex: 1 }]} numberOfLines={1}>
                  {done[k] && !k.startsWith('set:') ? '✓ ' : ''}{labelFor(k).replace(/ ×\d+$/, '')}
                </Text>
                <Text style={[styles.rowV, { color: theme.fg }]}>{n.toLocaleString()}</Text>
              </View>
            ))}
          </Group>
        ) : (
          <Text style={[styles.empty, { color: theme.muted }]}>
            {isToday ? t('history.emptyToday') : t('history.emptyDay')}
          </Text>
        )}
      </View>

      <Text style={[styles.empty, { color: theme.muted, textAlign: 'left' }]}>{t('history.private')}</Text>
    </Sheet>
  );
}

function Stat({ theme, k, v, unit, accent }) {
  return (
    <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: accent ? theme.brass : theme.line }]}>
      <Text style={{ color: theme.muted, fontSize: 12.5, fontFamily: FONTS.ui }}>{k}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.fg, fontSize: 23, fontFamily: FONTS.numMed, fontVariant: ['tabular-nums'] }}>{v}</Text>
      {unit ? <Text style={{ color: theme.muted, fontSize: 12.5, fontFamily: FONTS.ui }}>{unit}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 2, minWidth: 0 },
  cal: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 8 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center' },
  month: { fontFamily: FONTS.numMed, fontSize: 19.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  wd: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: FONTS.ui, fontSize: 12.5, paddingBottom: 4 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  dayBox: { flex: 1, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  lg: { fontFamily: FONTS.ui, fontSize: 12.5 },
  sw: { width: 12, height: 12, borderRadius: 3, borderWidth: 1, overflow: 'hidden' },
  dayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  dayTitle: { fontFamily: FONTS.numMed, fontSize: 21.5 },
  dayTotal: { fontFamily: FONTS.numMed, fontSize: 21.5, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rowT: { fontFamily: FONTS.ui, fontSize: 17 },
  rowV: { fontFamily: FONTS.uiBold, fontSize: 16, fontVariant: ['tabular-nums'] },
  empty: { fontFamily: FONTS.ui, fontSize: 15, lineHeight: 21.5, textAlign: 'center' },
});
