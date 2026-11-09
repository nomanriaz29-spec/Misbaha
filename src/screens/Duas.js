import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Sheet from '../components/Sheet';
import { DUAS, DUA_CATS } from '../data/duas';
import { duaField } from '../lib/recommend';
import { t, c, getLang } from '../i18n';
import { FONTS } from '../theme';

// Duas menu: filter by what you need, tap a dua to read it, then open it in the counter.
export default function Duas({ visible, onClose, onChoose, theme }) {
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState(null);
  const lang = getLang();
  const catName = (cat) => c('cats', cat.id, 'name') || cat.name;
  const cats = [{ id: 'all', name: t('duas.all') }, ...DUA_CATS];
  const groups = DUA_CATS.filter((x) => cat === 'all' || x.id === cat)
    .map((x) => ({ ...x, items: Object.entries(DUAS).filter(([, d]) => d.cat === x.id) }));

  return (
    <Sheet visible={visible} title={t('nav.duas')} onClose={onClose} theme={theme}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -18 }}>
        <View style={{ width: 10 }} />
        {cats.map((x) => (
          <Pressable key={x.id} onPress={() => setCat(x.id)}
            style={[styles.chip, { borderColor: cat === x.id ? theme.brass : theme.line }, cat === x.id && { backgroundColor: theme.brassSoft }]}>
            <Text style={{ color: theme.fg, fontFamily: FONTS.ui, fontSize: 15.5 }}>{x.id === 'all' ? x.name : catName(x)}</Text>
          </Pressable>
        ))}
        <View style={{ width: 10 }} />
      </ScrollView>

      {groups.map((g) => (
        <View key={g.id} style={{ gap: 8 }}>
          <Text style={[styles.lbl, { color: theme.muted }]}>{lang === 'en' ? catName(g).toUpperCase() : catName(g)}</Text>
          <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            {g.items.map(([id, d], i) => {
              const isOpen = open === id;
              const meaning = lang === 'en' ? d.en : lang === 'ur' ? c('duas', id, 'en') : null;
              return (
                <Pressable key={id} onPress={() => setOpen(isOpen ? null : id)}
                  style={[styles.row, { borderTopColor: theme.line, borderTopWidth: i ? 1 : 0 }, isOpen && { backgroundColor: theme.bg }]}>
                  <View style={styles.line}>
                    <Text style={[styles.t, { color: theme.fg }]}>{duaField(id, 'title')}</Text>
                    <Text style={{ color: theme.muted, fontSize: 20.5 }}>{isOpen ? '−' : '+'}</Text>
                  </View>
                  <Text style={[styles.s, { color: theme.muted }]}>{duaField(id, 'for')}</Text>
                  {isOpen && (
                    <View style={{ gap: 10, marginTop: 8 }}>
                      <Text style={[styles.ar, { color: theme.fg }]}>{d.ar}</Text>
                      {lang === 'en' && <Text style={[styles.trn, { color: theme.fg }]}>{d.tr}</Text>}
                      {meaning ? <Text style={[styles.s, { color: theme.fg, fontSize: 16, lineHeight: 24 }]}>{meaning}</Text> : null}
                      <View style={[styles.meta, { borderColor: theme.line }]}>
                        <Text style={[styles.s, { color: theme.muted }]}><Text style={{ fontFamily: FONTS.uiBold }}>{t('duas.when')} </Text>{duaField(id, 'when')}</Text>
                        <Text style={[styles.s, { color: theme.muted }]}><Text style={{ fontFamily: FONTS.uiBold }}>{t('duas.source')} </Text>{d.ref}</Text>
                      </View>
                      <Pressable onPress={() => onChoose('dua:' + id)} style={[styles.go, { backgroundColor: theme.brass }]}>
                        <Text style={{ color: theme.bg, fontFamily: FONTS.uiBold, fontSize: 16 }}>
                          {t('duas.read')}{d.n > 1 ? ` (×${d.n})` : ''}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  lbl: { fontFamily: FONTS.uiBold, fontSize: 13, letterSpacing: 1.2 },
  list: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { paddingVertical: 13, paddingHorizontal: 14, gap: 3 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  t: { fontFamily: FONTS.uiBold, fontSize: 17, flex: 1 },
  s: { fontFamily: FONTS.ui, fontSize: 14, lineHeight: 20.5 },
  ar: { fontFamily: FONTS.ar, fontSize: 26, lineHeight: 42, textAlign: 'right', writingDirection: 'rtl' },
  trn: { fontFamily: FONTS.uiBold, fontSize: 16, lineHeight: 23 },
  meta: { gap: 4, borderTopWidth: 1, paddingTop: 8 },
  go: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
});
