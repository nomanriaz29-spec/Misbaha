import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { surahInfo, arabic, translation, arabicNumber, BISMILLAH, hasBismillahHeader, loadQuranState, saveQuranState } from '../lib/quran';
import { t, getLang } from '../i18n';
import { FONTS } from '../theme';

const SIZES = [0.85, 1, 1.2, 1.4];
const ALL = Array.from({ length: 114 }, (_, i) => i + 1);

// Quran reader: surah list with search, continue reading, bookmarks and a Friday shortcut to al-Kahf.
export default function Quran({ visible, onClose, openSurah, theme }) {
  const lang = getLang();
  const [state, setState] = useState(null);
  const [surah, setSurah] = useState(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const listRef = useRef(null);
  const startAyah = useRef(1);

  useEffect(() => { if (visible && !state) loadQuranState().then(setState); }, [visible]);
  useEffect(() => { if (visible && openSurah) { startAyah.current = 1; setSurah(openSurah); } }, [visible, openSurah]);
  useEffect(() => { if (!visible) { setSelected(null); setQuery(''); } }, [visible]);

  const update = useCallback((patch) => {
    setState((cur) => { const next = { ...cur, ...patch }; saveQuranState(next); return next; });
  }, []);

  const open = (s, a = 1) => { startAyah.current = a; setSelected(null); setSurah(s); };
  const isMarked = (s, a) => !!state?.marks.find((m) => m.s === s && m.a === a);
  const toggleMark = (s, a) => update({ marks: isMarked(s, a) ? state.marks.filter((m) => !(m.s === s && m.a === a)) : [{ s, a }, ...state.marks] });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL;
    return ALL.filter((n) => {
      const i = surahInfo(n);
      return String(n) === q || i.name.toLowerCase().includes(q) || i.meaning.toLowerCase().includes(q) || i.ar.includes(query.trim());
    });
  }, [query]);

  const isFriday = new Date().getDay() === 5;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => (surah ? setSurah(null) : onClose())} presentationStyle="fullScreen">
      <SafeAreaView style={[styles.wrap, { backgroundColor: theme.bg }]}>
        {!surah || !state ? (
          <>
            <View style={styles.head}>
              <Text style={[styles.title, { color: theme.fg }]}>{t('quran.title')}</Text>
              <Pressable onPress={onClose} style={[styles.pill, { backgroundColor: theme.surface, borderColor: theme.line }]}>
                <Text style={{ color: theme.fg, fontFamily: FONTS.ui, fontSize: 15 }}>{t('common.done')}</Text>
              </Pressable>
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(n) => String(n)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 0 }}
              ListHeaderComponent={
                <View style={{ gap: 10, marginBottom: 12 }}>
                  {state?.last && (
                    <Card theme={theme} accent onPress={() => open(state.last.s, state.last.a)}
                      title={t('quran.continue')} sub={`${surahInfo(state.last.s).name} · ${t('quran.verse', { n: state.last.a })}`} />
                  )}
                  {isFriday && <Card theme={theme} onPress={() => open(18)} title={t('quran.kahf')} sub={t('quran.kahfSub')} />}
                  {state?.marks.length ? (
                    <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.line }]}>
                      <Text style={[styles.lbl, { color: theme.muted }]}>{t('quran.bookmarks')}</Text>
                      {state.marks.slice(0, 5).map((m) => (
                        <Pressable key={m.s + ':' + m.a} onPress={() => open(m.s, m.a)} style={styles.markRow}>
                          <Text style={{ color: theme.fg, fontFamily: FONTS.ui, fontSize: 16 }}>★  {surahInfo(m.s).name} {m.s}:{m.a}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  <TextInput value={query} onChangeText={setQuery} placeholder={t('quran.search')} placeholderTextColor={theme.muted}
                    style={[styles.search, { color: theme.fg, borderColor: theme.line, backgroundColor: theme.surface }]} />
                </View>
              }
              renderItem={({ item: n }) => {
                const i = surahInfo(n);
                return (
                  <Pressable onPress={() => open(n)} style={[styles.surahRow, { borderBottomColor: theme.line }]}>
                    <View style={[styles.num, { borderColor: theme.brass }]}><Text style={{ color: theme.brass, fontFamily: FONTS.numMed, fontSize: 14 }}>{n}</Text></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: theme.fg, fontFamily: FONTS.uiBold, fontSize: 17 }}>{i.name}</Text>
                      <Text style={{ color: theme.muted, fontFamily: FONTS.ui, fontSize: 13.5 }} numberOfLines={1}>
                        {lang === 'en' ? i.meaning + ' · ' : ''}{t(i.place === 'M' ? 'quran.makki' : 'quran.madani')} · {t('quran.verses', { n: i.verses })}
                      </Text>
                    </View>
                    <Text style={[styles.surahAr, { color: theme.fg }]}>{i.ar.replace('سُوْرَةُ ', '')}</Text>
                  </Pressable>
                );
              }}
            />
          </>
        ) : (
          <Reader
            key={surah}
            surah={surah}
            startAyah={startAyah.current}
            state={state}
            update={update}
            lang={lang}
            theme={theme}
            listRef={listRef}
            selected={selected}
            setSelected={setSelected}
            isMarked={isMarked}
            toggleMark={toggleMark}
            onBack={() => setSurah(null)}
            onNext={surah < 114 ? () => open(surah + 1) : null}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

function Reader({ surah, startAyah, state, update, lang, theme, listRef, selected, setSelected, isMarked, toggleMark, onBack, onNext }) {
  const info = surahInfo(surah);
  const ar = useMemo(() => arabic(surah), [surah]);
  const tr = useMemo(() => (state.showTr ? translation(surah, lang) : null), [surah, lang, state.showTr]);
  const hasTr = lang !== 'ar';
  const scale = state.size || 1;
  const data = useMemo(() => ar.map((text, i) => ({ a: i + 1, text })), [ar]);
  const lastSaved = useRef(0);

  useEffect(() => {
    if (startAyah > 1) setTimeout(() => listRef.current?.scrollToIndex({ index: Math.min(startAyah - 1, data.length - 1), animated: false, viewPosition: 0 }), 50);
    update({ last: { s: surah, a: startAyah } });
  }, [surah]);

  // Remember the first fully visible verse as the reading position.
  const onViewable = useRef(({ viewableItems }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first && Date.now() - lastSaved.current > 1500) {
      lastSaved.current = Date.now();
      update({ last: { s: surah, a: first.item.a } });
    }
  }).current;

  const cycleSize = () => update({ size: SIZES[(SIZES.indexOf(scale) + 1) % SIZES.length] });

  return (
    <>
      <View style={styles.head}>
        <Pressable onPress={onBack} hitSlop={8} style={[styles.pill, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text style={{ color: theme.fg, fontFamily: FONTS.ui, fontSize: 15 }}>‹ {t('quran.surahs')}</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {hasTr && (
            <Pressable onPress={() => update({ showTr: !state.showTr })} style={[styles.pill, { borderColor: state.showTr ? theme.brass : theme.line }, state.showTr && { backgroundColor: theme.brassSoft }]}>
              <Text style={{ color: theme.fg, fontFamily: FONTS.ui, fontSize: 15 }}>{t('quran.translation')}</Text>
            </Pressable>
          )}
          <Pressable onPress={cycleSize} accessibilityLabel={t('quran.textSize')} style={[styles.pill, { borderColor: theme.line }]}>
            <Text style={{ color: theme.fg, fontFamily: FONTS.ui, fontSize: 15 }}>A{scale > 1 ? '+' : scale < 1 ? '−' : ''}</Text>
          </Pressable>
        </View>
      </View>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(v) => String(v.a)}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        onScrollToIndexFailed={(e) => setTimeout(() => listRef.current?.scrollToIndex({ index: e.index, animated: false }), 200)}
        initialNumToRender={Math.min(data.length, Math.max(12, startAyah + 4))}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 60 }}
        ListHeaderComponent={
          <View style={styles.surahHead}>
            <Text style={[styles.surahTitleAr, { color: theme.fg }]}>{info.ar}</Text>
            <Text style={{ color: theme.fg, fontFamily: FONTS.uiBold, fontSize: 18 }}>{info.name}{lang === 'en' ? ' · ' + info.meaning : ''}</Text>
            <Text style={{ color: theme.muted, fontFamily: FONTS.ui, fontSize: 14 }}>
              {t(info.place === 'M' ? 'quran.makki' : 'quran.madani')} · {t('quran.verses', { n: info.verses })} · {t('quran.juz', { n: info.juz })}
            </Text>
            {hasBismillahHeader(surah) && <Text style={[styles.bismillah, { color: theme.brass }]}>{BISMILLAH}</Text>}
          </View>
        }
        renderItem={({ item }) => {
          const marked = isMarked(surah, item.a);
          const sel = selected === item.a;
          return (
            <Pressable onPress={() => setSelected(sel ? null : item.a)} onLongPress={() => toggleMark(surah, item.a)}
              style={[styles.ayah, { borderBottomColor: theme.line }, sel && { backgroundColor: theme.surface }]}>
              <Text style={[styles.ayahAr, { color: theme.fg, fontSize: 27 * scale, lineHeight: 52 * scale }]}>
                {item.text} <Text style={{ color: theme.brass }}>﴿{arabicNumber(item.a)}﴾</Text>
              </Text>
              {tr ? (
                <Text style={[styles.ayahTr, { color: theme.muted, fontSize: 15.5 * scale, lineHeight: 23 * scale }, lang === 'ur' && styles.ur]}>
                  {lang === 'ur' ? '' : `${item.a}. `}{tr[item.a - 1]}
                </Text>
              ) : null}
              {(sel || marked) && (
                <View style={styles.ayahTools}>
                  <Text style={{ color: theme.muted, fontFamily: FONTS.ui, fontSize: 13 }}>{surah}:{item.a}</Text>
                  <Pressable onPress={() => toggleMark(surah, item.a)} hitSlop={8}>
                    <Text style={{ color: marked ? theme.brass : theme.fg, fontFamily: FONTS.uiBold, fontSize: 14 }}>
                      {marked ? '★ ' + t('quran.bookmarked') : '☆ ' + t('quran.bookmark')}
                    </Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
            <Text style={{ color: theme.muted, fontFamily: FONTS.ui, fontSize: 13, textAlign: 'center' }}>{t('quran.credit')}</Text>
            {onNext && (
              <Pressable onPress={onNext} style={[styles.next, { backgroundColor: theme.brass }]}>
                <Text style={{ color: theme.bg, fontFamily: FONTS.uiBold, fontSize: 16 }}>{t('quran.nextSurah', { name: surahInfo(surah + 1).name })}</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </>
  );
}

function Card({ theme, title, sub, onPress, accent }) {
  return (
    <Pressable onPress={onPress} style={[styles.box, { backgroundColor: accent ? theme.brassSoft : theme.surface, borderColor: accent ? theme.brass : theme.line }]}>
      <Text style={{ color: theme.fg, fontFamily: FONTS.uiBold, fontSize: 17 }}>{title}</Text>
      <Text style={{ color: theme.muted, fontFamily: FONTS.ui, fontSize: 14 }}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  title: { fontFamily: FONTS.numMed, fontSize: 26 },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  box: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
  lbl: { fontFamily: FONTS.uiBold, fontSize: 12.5, letterSpacing: 1.1, marginBottom: 4 },
  markRow: { paddingVertical: 6 },
  search: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONTS.ui, fontSize: 16 },
  surahRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  num: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] },
  surahAr: { fontFamily: FONTS.ar, fontSize: 21, writingDirection: 'rtl' },
  surahHead: { alignItems: 'center', gap: 4, paddingVertical: 16 },
  surahTitleAr: { fontFamily: FONTS.ar, fontSize: 32, lineHeight: 52 },
  bismillah: { fontFamily: FONTS.ar, fontSize: 26, lineHeight: 50, marginTop: 10 },
  ayah: { paddingVertical: 14, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  ayahAr: { fontFamily: FONTS.ar, textAlign: 'right', writingDirection: 'rtl' },
  ayahTr: { fontFamily: FONTS.ui },
  ur: { textAlign: 'right', writingDirection: 'rtl', fontFamily: undefined },
  ayahTools: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  next: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999 },
});
