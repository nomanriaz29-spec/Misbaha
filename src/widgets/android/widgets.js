'use no memo'; // widgets are plain functions; the React Compiler must not wrap them
import React from 'react';
// Loaded defensively: the library's native part is missing in Expo Go, and importing it there throws.
let lib = null;
try { lib = require('react-native-android-widget'); } catch (e) { lib = null; }
const Missing = () => null;
const FlexWidget = lib?.FlexWidget || Missing;
const TextWidget = lib?.TextWidget || Missing;
import { t } from '../../i18n';

// Android home-screen widgets, drawn by react-native-android-widget.
// Each takes a model from ../model.js, a colour scheme and the widget's size in dp.

export const THEMES = {
  dark: { bg: '#0F1A19', fg: '#E9E5D9', muted: '#8FA29D', brass: '#D6A651', rule: '#2E4441', hl: '#1D2B29', ok: '#6CC199' },
  light: { bg: '#F6F2E8', fg: '#1C2624', muted: '#66756F', brass: '#9C7128', rule: '#D9CFBD', hl: '#EDE4D2', ok: '#2F7A55' },
};

const PRAYERS_URI = 'misbaha://prayers';
// Widgets are drawn left to right whatever the phone's language, so items are ordered
// explicitly for Arabic and Urdu.
const align = (rtl) => (rtl ? 'right' : 'left');

function Root({ c, children, uri, padding = 14 }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c.bg, borderRadius: 22, padding, flexDirection: 'column' }}
    >
      {children}
    </FlexWidget>
  );
}

function T({ text, size, color, bold, align: a = 'left', lines = 1, flex, family }) {
  return (
    <TextWidget
      text={String(text ?? '')}
      maxLines={lines}
      truncate="END"
      style={{ fontSize: size, color, fontWeight: bold ? '600' : 'normal', textAlign: a, ...(family ? { fontFamily: family } : {}), ...(flex ? { width: 'match_parent' } : {}) }}
    />
  );
}

// Two items on a line, pushed to opposite ends; swapped for right-to-left languages.
function Line({ rtl, start, end, style }) {
  const items = rtl ? [end, start] : [start, end];
  return (
    <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent', ...style }}>
      {items[0]}
      {items[1]}
    </FlexWidget>
  );
}

function NoData({ c, text }) {
  return (
    <Root c={c} uri="misbaha://">
      <T text={t('app.name')} size={16} color={c.fg} bold />
      <T text={text} size={12} color={c.muted} lines={3} />
    </Root>
  );
}

// Five rows: name and time, the next prayer highlighted.
function TimesList({ m, c, size = 14, gap = 3 }) {
  return (
    <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', flexGap: gap }}>
      {m.list.map((p) => {
        const on = p.key === m.nextKey;
        return (
          <Line
            key={p.key}
            rtl={m.rtl}
            style={{ backgroundColor: on ? c.hl : c.bg, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}
            start={<T text={p.name} size={size} color={on ? c.brass : c.fg} bold={on} />}
            end={<T text={p.time} size={size} color={on ? c.brass : c.muted} bold={on} />}
          />
        );
      })}
    </FlexWidget>
  );
}

// 4x2: next prayer on one side, today's five times on the other. Narrow sizes show the list only.
export function PrayerTimesWidget({ m, c, width = 320, height = 150 }) {
  if (!m) return <NoData c={c} text={t('widget.open')} />;
  if (width < 230) return <TodayPrayersWidget m={m} c={c} width={width} height={height} />;
  const nextBlock = (
    <FlexWidget style={{ flexDirection: 'column', flex: 1, justifyContent: 'space-between', height: 'match_parent' }}>
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
        <T text={m.labels.next.toUpperCase()} size={11} color={c.muted} align={align(m.rtl)} flex />
        <T text={m.next.name} size={26} color={c.fg} align={align(m.rtl)} flex />
        <T text={m.next.time} size={20} color={c.brass} bold align={align(m.rtl)} flex />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
        <T text={m.hijri} size={11} color={c.muted} align={align(m.rtl)} flex />
        <T text={m.place} size={11} color={c.muted} align={align(m.rtl)} flex />
      </FlexWidget>
    </FlexWidget>
  );
  const list = (
    <FlexWidget style={{ flexDirection: 'column', flex: 1, justifyContent: 'center', height: 'match_parent' }}>
      <TimesList m={m} c={c} size={height > 190 ? 15 : 13} gap={height > 190 ? 6 : 2} />
    </FlexWidget>
  );
  const divider = <FlexWidget style={{ width: 1, height: 'match_parent', backgroundColor: c.rule, marginHorizontal: 12 }} />;
  return (
    <Root c={c} uri={PRAYERS_URI}>
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', height: 'match_parent' }}>
        {m.rtl ? list : nextBlock}
        {divider}
        {m.rtl ? nextBlock : list}
      </FlexWidget>
    </Root>
  );
}

// 2x2: all five times in a small square.
export function TodayPrayersWidget({ m, c, height = 150 }) {
  if (!m) return <NoData c={c} text={t('widget.open')} />;
  const big = height > 175;
  return (
    <Root c={c} uri={PRAYERS_URI} padding={10}>
      <Line
        rtl={m.rtl}
        style={{ marginBottom: big ? 6 : 3, paddingHorizontal: 6 }}
        start={<T text={m.labels.title} size={11} color={c.muted} />}
        end={<T text={m.place} size={10} color={c.muted} />}
      />
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', width: 'match_parent' }}>
        <TimesList m={m} c={c} size={big ? 15 : 13} gap={big ? 8 : 1} />
      </FlexWidget>
    </Root>
  );
}

// 2x1: just the next prayer.
export function NextPrayerWidget({ m, c }) {
  if (!m) return <NoData c={c} text={t('widget.open')} />;
  return (
    <Root c={c} uri={PRAYERS_URI} padding={10}>
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', height: 'match_parent', justifyContent: 'center' }}>
        <T text={m.labels.next.toUpperCase()} size={10} color={c.muted} align={align(m.rtl)} flex />
        <Line
          rtl={m.rtl}
          start={<T text={m.next.name} size={18} color={c.fg} bold />}
          end={<T text={m.next.time} size={18} color={c.brass} bold />}
        />
      </FlexWidget>
    </Root>
  );
}

// 4x2 and larger: the verse in Arabic with its meaning.
export function VerseWidget({ v, c, height = 150 }) {
  if (!v) return <NoData c={c} text={t('widget.verseOpen')} />;
  const tall = height > 200;
  return (
    <Root c={c} uri={`misbaha://quran/${v.s}/${v.a}`}>
      <Line
        rtl={v.rtl}
        style={{ marginBottom: 6 }}
        start={<T text={v.title.toUpperCase()} size={11} color={c.brass} bold />}
        end={<T text={v.ref} size={11} color={c.muted} />}
      />
      <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', width: 'match_parent' }}>
        <T text={v.ar} size={v.tr ? (tall ? 24 : 18) : tall ? 28 : 22} color={c.fg} align="right" lines={v.tr ? (tall ? 5 : 2) : tall ? 7 : 4} flex />
        {v.tr ? <FlexWidget style={{ height: 1, width: 'match_parent', backgroundColor: c.rule, marginVertical: tall ? 10 : 6 }} /> : null}
        {v.tr ? <T text={v.tr} size={tall ? 16 : 13} color={c.fg} align={align(v.rtl)} lines={tall ? 8 : 3} flex /> : null}
      </FlexWidget>
    </Root>
  );
}

// 4x1 / 4x2: tick each prayer. Taps run in the background (widgetTaskHandler) and redraw the widget.
export function SalahWidget({ s, c, height = 110 }) {
  if (!s) return <NoData c={c} text={t('widget.open')} />;
  const tall = height > 130;
  const short = height < 95; // 4x1: smaller circles so the names fit
  const dot = tall ? 38 : short ? 22 : 30;
  const items = s.rtl ? [...s.items].reverse() : s.items;
  return (
    <Root c={c} uri="misbaha://salah" padding={tall ? 14 : short ? 7 : 10}>
      <Line
        rtl={s.rtl}
        style={{ marginBottom: tall ? 10 : short ? 2 : 6, paddingHorizontal: short ? 4 : 0 }}
        start={<T text={s.title.toUpperCase()} size={short ? 10 : 11} color={c.brass} bold />}
        end={<T text={`${s.count}/5${s.streak ? `  ·  ${s.streak} ${s.streakLabel}` : ''}`} size={11} color={s.count === 5 ? c.ok || c.brass : c.muted} />}
      />
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', flex: 1, justifyContent: 'space-between', alignItems: 'center' }}>
        {items.map((it) => (
          <FlexWidget
            key={it.key}
            clickAction={it.due ? 'SALAH_TOGGLE' : 'OPEN_URI'}
            clickActionData={it.due ? { k: it.key, d: s.day } : { uri: 'misbaha://salah' }}
            style={{ flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'match_parent' }}
          >
            <FlexWidget style={{ width: dot, height: dot, borderRadius: dot / 2, borderWidth: 2, borderColor: it.prayed ? c.brass : c.rule,
              backgroundColor: it.prayed ? c.brass : c.bg, justifyContent: 'center', alignItems: 'center' }}>
              <T text={it.prayed ? '✓' : ''} size={dot * 0.48} color={c.bg} bold />
            </FlexWidget>
            <T text={it.name} size={tall ? 12 : short ? 10 : 11} color={it.prayed ? c.brass : it.due ? c.fg : c.muted} bold={it.prayed} align="center" />
            {tall ? <T text={it.time} size={10} color={c.muted} align="center" /> : null}
          </FlexWidget>
        ))}
      </FlexWidget>
    </Root>
  );
}

export const WIDGETS = {
  RatbSalah: (ctx) => <SalahWidget {...ctx} />,
  RatbPrayerTimes: (ctx) => <PrayerTimesWidget {...ctx} />,
  RatbTodayPrayers: (ctx) => <TodayPrayersWidget {...ctx} />,
  RatbNextPrayer: (ctx) => <NextPrayerWidget {...ctx} />,
  RatbVerse: (ctx) => <VerseWidget {...ctx} />,
};
