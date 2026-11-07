import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Sheet, { Group } from '../components/Sheet';
import { DHIKR, SETS, ONES } from '../data/adhkar';
import { FONTS } from '../theme';

export default function Library({ visible, onClose, onChoose, progress, theme }) {
  const Row = ({ k, first, children }) => (
    <Pressable
      onPress={() => onChoose(k)}
      style={[styles.row, { borderTopColor: theme.line, borderTopWidth: first ? 0 : 1 }, progress.cur === k && { backgroundColor: theme.brassSoft }]}
    >
      {children}
    </Pressable>
  );

  return (
    <Sheet visible={visible} title="Adhkar" onClose={onClose} theme={theme}>
      <Group label="Routines" theme={theme}>
        {Object.entries(SETS).map(([id, s], i) => {
          const p = progress.prog['set:' + id];
          const started = p && (p.step || p.c);
          return (
            <Row key={id} k={'set:' + id} first={i === 0}>
              <View style={styles.line}>
                <Text style={[styles.t, { color: theme.fg }]}>{s.name}</Text>
                <Text style={[styles.c, { color: started ? theme.brass : theme.muted }]}>
                  {started ? `step ${p.step + 1}/${s.steps.length}` : `${s.steps.length} steps`}
                </Text>
              </View>
              <Text style={[styles.s, { color: theme.muted }]}>{s.sub}</Text>
            </Row>
          );
        })}
      </Group>

      <Group label="Tasbeeh" theme={theme}>
        {ONES.map((id, i) => {
          const d = DHIKR[id];
          const c = progress.prog['one:' + id]?.c || 0;
          return (
            <Row key={id} k={'one:' + id} first={i === 0}>
              <Text style={[styles.ar, { color: theme.fg }]}>{d.ar}</Text>
              <View style={styles.line}>
                <Text style={[styles.t, { color: theme.fg, flex: 1 }]}>{d.tr}</Text>
                <Text style={[styles.c, { color: c ? theme.brass : theme.muted }]}>
                  {d.n ? (c ? `${c} / ${d.n}` : `×${d.n}`) : c ? String(c) : 'open'}
                </Text>
              </View>
              <Text style={[styles.s, { color: theme.muted }]}>{d.en}</Text>
            </Row>
          );
        })}
      </Group>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 13, paddingHorizontal: 14, gap: 4 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  t: { fontFamily: FONTS.uiBold, fontSize: 17 },
  c: { fontFamily: FONTS.ui, fontSize: 14, fontVariant: ['tabular-nums'] },
  s: { fontFamily: FONTS.ui, fontSize: 14, lineHeight: 20.5 },
  ar: { fontFamily: FONTS.ar, fontSize: 24, lineHeight: 34, textAlign: 'right', writingDirection: 'rtl' },
});
