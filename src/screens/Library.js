import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Sheet, { Group } from '../components/Sheet';
import { DHIKR, SETS, ONES } from '../data/adhkar';
import { setName, setSub, dhikrMeaning, dhikrName } from '../lib/recommend';
import { t, getLang } from '../i18n';
import { FONTS } from '../theme';

export default function Library({ visible, onClose, onChoose, progress, custom, onAddCustom, onEditCustom, theme }) {
  const lang = getLang();
  const Row = ({ k, first, children, onLongPress }) => (
    <Pressable
      onPress={() => onChoose(k)}
      onLongPress={onLongPress}
      style={[styles.row, { borderTopColor: theme.line, borderTopWidth: first ? 0 : 1 }, progress.cur === k && { backgroundColor: theme.brassSoft }]}
    >
      {children}
    </Pressable>
  );
  const countText = (n, c) => (n ? (c ? `${c} / ${n}` : `×${n}`) : c ? String(c) : t('library.open'));

  return (
    <Sheet visible={visible} title={t('nav.adhkar')} onClose={onClose} theme={theme}>
      <Group label={t('library.yours')} theme={theme}>
        {custom.map((d, i) => {
          const key = 'my:' + d.id;
          const c = progress.prog[key]?.c || 0;
          return (
            <Row key={d.id} k={key} first={i === 0} onLongPress={() => onEditCustom(d)}>
              {d.ar ? <Text style={[styles.ar, { color: theme.fg }]}>{d.ar}</Text> : null}
              <View style={styles.line}>
                <Text style={[styles.t, { color: theme.fg, flex: 1 }]} numberOfLines={2}>{d.tr || dhikrName(d)}</Text>
                <Text style={[styles.c, { color: c ? theme.brass : theme.muted }]}>{countText(d.n, c)}</Text>
                <Pressable onPress={() => onEditCustom(d)} hitSlop={10} accessibilityLabel={t('custom.edit')}>
                  <Text style={{ color: theme.muted, fontSize: 18 }}>✎</Text>
                </Pressable>
              </View>
              {d.en ? <Text style={[styles.s, { color: theme.muted }]}>{d.en}</Text> : null}
            </Row>
          );
        })}
        <Pressable onPress={onAddCustom} style={[styles.row, styles.add, { borderTopColor: theme.line, borderTopWidth: custom.length ? 1 : 0 }]}>
          <Text style={[styles.t, { color: theme.brass }]}>＋ {t('custom.add')}</Text>
          {!custom.length && <Text style={[styles.s, { color: theme.muted }]}>{t('custom.addHint')}</Text>}
        </Pressable>
      </Group>

      <Group label={t('library.routines')} theme={theme}>
        {Object.entries(SETS).map(([id, s], i) => {
          const p = progress.prog['set:' + id];
          const started = p && (p.step || p.c);
          return (
            <Row key={id} k={'set:' + id} first={i === 0}>
              <View style={styles.line}>
                <Text style={[styles.t, { color: theme.fg, flex: 1 }]}>{setName(id)}</Text>
                <Text style={[styles.c, { color: started ? theme.brass : theme.muted }]}>
                  {started ? t('library.stepOf', { n: p.step + 1, of: s.steps.length }) : t('library.steps', { n: s.steps.length })}
                </Text>
              </View>
              <Text style={[styles.s, { color: theme.muted }]}>{setSub(id)}</Text>
            </Row>
          );
        })}
      </Group>

      <Group label={t('library.tasbeeh')} theme={theme}>
        {ONES.map((id, i) => {
          const d = DHIKR[id];
          const c = progress.prog['one:' + id]?.c || 0;
          const meaning = dhikrMeaning(id);
          return (
            <Row key={id} k={'one:' + id} first={i === 0}>
              <Text style={[styles.ar, { color: theme.fg }]}>{d.ar}</Text>
              <View style={styles.line}>
                <Text style={[styles.t, { color: theme.fg, flex: 1 }]}>{lang === 'en' ? d.tr : id === 'free' ? t('library.free') : ''}</Text>
                <Text style={[styles.c, { color: c ? theme.brass : theme.muted }]}>{countText(d.n, c)}</Text>
              </View>
              {meaning ? <Text style={[styles.s, { color: theme.muted }]}>{meaning}</Text> : null}
            </Row>
          );
        })}
      </Group>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 13, paddingHorizontal: 14, gap: 4 },
  add: { gap: 3 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  t: { fontFamily: FONTS.uiBold, fontSize: 17 },
  c: { fontFamily: FONTS.ui, fontSize: 14, fontVariant: ['tabular-nums'] },
  s: { fontFamily: FONTS.ui, fontSize: 14, lineHeight: 20.5 },
  ar: { fontFamily: FONTS.ar, fontSize: 24, lineHeight: 38, textAlign: 'right', writingDirection: 'rtl' },
});
