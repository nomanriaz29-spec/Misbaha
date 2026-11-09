import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Switch, StyleSheet, ActivityIndicator, Linking, Platform } from 'react-native';
import Sheet, { Group } from '../components/Sheet';
import { getTimes, fmtTime, METHODS, PRAYERS, defaultsForCountry } from '../lib/prayer';
import { detectLocation, CITIES } from '../lib/location';
import { DAILY } from '../data/adhkar';
import { FONTS } from '../theme';
import { ALERT_SOUNDS, scheduleStatus, sendTestNotification } from '../lib/notifications';
import { isPrayed } from '../lib/salah';
import { jamaatTimes } from '../lib/mosque';
import { dateKey } from '../lib/history';
import { playSound, stopSound } from '../lib/sounds';
import { toHijri, formatHijri } from '../lib/hijri';
import { t, getLang, LANGS } from '../i18n';
import { pinAndroidWidget, androidWidgetsAvailable } from '../widgets/android';

const OFFSETS = [5, 10, 15, 20, 30];
const DAY_SHORT = (d) => t('cal.days').split(',')[d.getDay()];
export const prayerName = (key) => t('prayer.' + key);
export const soundLabel = (k) => t('sound.' + k);

export function buildPlan(settings, now = new Date()) {
  const tm = getTimes(settings.location, settings, now);
  if (!tm) return [];
  const off = (settings.offset ?? 15) * 60000;
  const enabled = PRAYERS.filter((p) => settings.prayers[p.key]);
  const items = enabled.map((p) => ({
    at: new Date(tm[p.key].getTime() + off), name: t('plan.after', { name: prayerName(p.key) }), sub: t('plan.afterSub.' + p.key), open: p.open,
  }));
  if (settings.alert?.on !== false) {
    const label = soundLabel(settings.alert?.sound || 'azan');
    enabled.forEach((p) => items.push({ at: tm[p.key], name: t('plan.prayer', { name: prayerName(p.key) }), sub: t('plan.alertSub', { sound: label }), open: 'set:salah' }));
  }
  if (settings.daily) {
    DAILY.forEach((r) => {
      const at = new Date(now); at.setHours(r.hour, r.minute, 0, 0);
      items.push({ at, name: t('daily.' + r.id + '.title'), sub: t('daily.' + r.id + '.body'), open: r.open });
    });
  }
  return items.sort((a, b) => a.at - b.at);
}

export default function Schedule({ visible, onClose, onStart, settings, update, notifOn, onEnableNotifs, onLanguage, salah, onToggleSalah, onOpenMosque, theme }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [widgetMsg, setWidgetMsg] = useState('');
  const [status, setStatus] = useState(null);
  const [testMsg, setTestMsg] = useState('');
  useEffect(() => {
    if (!visible) { setTestMsg(''); return undefined; }
    const load = () => scheduleStatus().then(setStatus).catch(() => {});
    load();
    const timer = setTimeout(load, 2500); // reminders are rescheduled in the background when settings change
    return () => clearTimeout(timer);
  }, [visible, settings, notifOn]);
  const today = dateKey(new Date());
  const jt = settings.mosque ? jamaatTimes(settings, new Date()) : null;
  const [picker, setPicker] = useState(null); // 'method' | 'city' | 'lang' | null
  const [preview, setPreview] = useState(null); // sound being previewed
  useEffect(() => { if (!visible) { stopSound(); setPreview(null); } }, [visible]);
  const alert = settings.alert || { on: true, sound: 'azan' };
  const lang = getLang();
  const togglePreview = async (kind) => {
    if (preview === kind) { stopSound(); setPreview(null); return; }
    const ok = await playSound(kind, () => setPreview(null));
    setPreview(ok ? kind : null);
  };

  const times = useMemo(() => getTimes(settings.location, settings), [settings, visible]);
  const plan = useMemo(() => buildPlan(settings), [settings, visible, lang]);
  const now = Date.now();
  const next = plan.find((x) => x.at.getTime() > now);
  const hijriToday = formatHijri(toHijri(new Date(), settings.hijriAdjust || 0), lang);

  const useGps = async () => {
    setBusy(true); setMsg('');
    try {
      const loc = await detectLocation();
      if (loc.denied) setMsg(t('location.off'));
      else { update({ location: loc, ...defaultsForCountry(loc.country), methodAuto: true }); setMsg(t('location.updated', { name: loc.name })); }
    } catch (e) { setMsg(t('location.error')); }
    setBusy(false);
  };

  const Row = ({ first, children, style }) => (
    <View style={[styles.row, { borderTopColor: theme.line, borderTopWidth: first ? 0 : 1 }, style]}>{children}</View>
  );
  const T = (p) => <Text {...p} style={[{ fontFamily: FONTS.ui, color: theme.fg, fontSize: 17 }, p.style]} />;
  const Btn = ({ label, onPress }) => (
    <Pressable onPress={onPress} style={[styles.btn, { borderColor: theme.line }]}><T style={{ fontSize: 15 }}>{label}</T></Pressable>
  );
  const Toggle = ({ value, onChange }) => (
    <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.brass, false: theme.bead }} thumbColor="#fff" />
  );
  const Stepper = ({ value, onChange, min, max, format, label }) => (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} hitSlop={6} accessibilityLabel={label + ' −'} style={[styles.stepBtn, { borderColor: theme.line }]}>
        <T style={{ fontSize: 20.5 }}>−</T>
      </Pressable>
      <T style={{ minWidth: 70, textAlign: 'center', fontVariant: ['tabular-nums'], color: value ? theme.brass : theme.muted }}>{format(value)}</T>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} hitSlop={6} accessibilityLabel={label + ' +'} style={[styles.stepBtn, { borderColor: theme.line }]}>
        <T style={{ fontSize: 20.5 }}>+</T>
      </Pressable>
    </View>
  );
  const minutes = (v) => (v === 0 ? t('unit.min', { n: 0 }) : `${v > 0 ? '+' : ''}${t('unit.min', { n: v })}`);
  const days = (v) => (v === 0 ? '0' : `${v > 0 ? '+' : ''}${t('unit.day', { n: v })}`);

  return (
    <Sheet visible={visible} title={t('prayers.sheetTitle')} onClose={() => { setPicker(null); onClose(); }} theme={theme}>
      <View style={{ gap: 8 }}>
        <Text style={[styles.lbl, { color: theme.muted }]}>{t('prayers.timesIn', { place: settings.location?.name || '' })}</Text>
        <View style={[styles.grid, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          {['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].map((k) => {
            const trackable = k !== 'sunrise' && salah && onToggleSalah;
            const started = times && times[k] <= new Date();
            const on = trackable && isPrayed(salah, today, k);
            return (
              <Pressable key={k} style={styles.cell} disabled={!trackable || !started} onPress={() => onToggleSalah(today, k)}
                accessibilityRole={trackable ? 'checkbox' : undefined} accessibilityState={trackable ? { checked: !!on, disabled: !started } : undefined}>
                <Text style={{ color: theme.muted, fontSize: 12.5, fontFamily: FONTS.ui }} numberOfLines={1}>{prayerName(k)}</Text>
                <Text style={{ color: on ? theme.brass : theme.fg, fontSize: 16, fontFamily: FONTS.numMed, fontVariant: ['tabular-nums'] }}>
                  {times ? fmtTime(times[k]).replace(/ (AM|PM)/, '') : '--'}
                </Text>
                {jt && jt[k] ? (
                  <Text style={{ color: theme.brass, fontSize: 11.5, fontFamily: FONTS.ui }} numberOfLines={1}>{t('jamaat.short')} {fmtTime(jt[k]).replace(/ (AM|PM)/, '')}</Text>
                ) : null}
                {trackable ? (
                  <View style={[styles.tick, { borderColor: on ? theme.brass : theme.line, backgroundColor: on ? theme.brass : 'transparent', opacity: started ? 1 : 0.3 }]}>
                    <Text style={{ color: theme.bg, fontSize: 12, fontFamily: FONTS.uiBold }}>{on ? '✓' : ''}</Text>
                  </View>
                ) : <View style={{ height: 20 }} />}
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: theme.muted, fontSize: 14, fontFamily: FONTS.ui, textAlign: 'center' }}>{hijriToday}</Text>
        {salah ? <Text style={{ color: theme.muted, fontSize: 13, fontFamily: FONTS.ui, textAlign: 'center' }}>{t('salah.tapHint')}</Text> : null}
      </View>

      {onOpenMosque ? (
        <Group label={t('mosque.title')} theme={theme}>
          <Row first>
            <View style={{ flex: 1 }}>
              <T numberOfLines={1} style={{ fontFamily: settings.mosque ? FONTS.uiBold : FONTS.ui }}>{settings.mosque ? settings.mosque.name : t('mosque.notSet')}</T>
              <T style={{ color: theme.muted, fontSize: 14 }}>
                {settings.mosque
                  ? (jt ? `${t(jt.isJumuah ? 'jamaat.jumuah' : 'prayer.dhuhr')} ${fmtTime(jt.dhuhr)}` : '') + (settings.mosque.remind ? '  ·  ' + t('mosque.remindShort', { n: settings.mosque.remind }) : '')
                  : t('mosque.notSetSub')}
              </T>
            </View>
            <Btn label={settings.mosque ? t('common.change') : t('mosque.findShort')} onPress={onOpenMosque} />
          </Row>
        </Group>
      ) : null}

      {!notifOn && (
        <Group theme={theme}>
          <Row first style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
            <T style={{ fontFamily: FONTS.uiBold }}>{t('notif.offTitle')}</T>
            <T style={{ color: theme.muted, fontSize: 15 }}>{t('notif.offBody')}</T>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Btn label={t('notif.turnOn')} onPress={onEnableNotifs} />
              <Btn label={t('common.openSettings')} onPress={() => Linking.openSettings()} />
            </View>
          </Row>
        </Group>
      )}

      <Group label={t('alert.title')} theme={theme}>
        <Row first>
          <View style={{ flex: 1 }}>
            <T>{t('alert.toggle')}</T>
            <T style={{ color: theme.muted, fontSize: 14 }}>{t('alert.toggleSub')}</T>
          </View>
          <Toggle value={alert.on} onChange={(v) => update({ alert: { ...alert, on: v } })} />
        </Row>
        {alert.on && (
          <Row style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <T>{t('alert.sound')}</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {Object.keys(ALERT_SOUNDS).map((k) => {
                const on = alert.sound === k;
                return (
                  <Pressable key={k} onPress={() => update({ alert: { ...alert, sound: k } })} accessibilityRole="radio" accessibilityState={{ checked: on }}
                    style={[styles.soundOpt, { borderColor: on ? theme.brass : theme.line }, on && { backgroundColor: theme.brassSoft }]}>
                    <T style={{ fontFamily: on ? FONTS.uiBold : FONTS.ui }}>{soundLabel(k)}{k === 'azan' ? ' ★' : ''}</T>
                  </Pressable>
                );
              })}
            </View>
            {alert.sound !== 'standard' && (
              <Pressable onPress={() => togglePreview(alert.sound === 'azan' ? 'azan' : 'alarm')} style={[styles.btn, { borderColor: theme.line, alignSelf: 'flex-start' }]}>
                <T style={{ fontSize: 15 }}>{preview ? '■  ' + t('alert.stop') : '▶  ' + t('alert.play', { sound: soundLabel(alert.sound) })}</T>
              </Pressable>
            )}
            <T style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>
              {t('alert.note.' + alert.sound)}{Platform.OS === 'ios' ? ' ' + t('alert.iosSwitch') : ''}
            </T>
            {alert.sound === 'azan' && <T style={{ color: theme.muted, fontSize: 12.5 }}>{t('alert.credit')}</T>}
          </Row>
        )}
        {alert.on && Platform.OS === 'android' && (
          <Row style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <T style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>{t('alert.exact')}</T>
            <Btn label={t('common.openSettings')} onPress={() => Linking.openSettings()} />
          </Row>
        )}
      </Group>

      {notifOn ? (
        <Group label={t('diag.title')} theme={theme}>
          <Row first style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
            <T style={{ fontSize: 15 }}>
              {status?.pending != null ? t('diag.scheduled', { n: status.pending }) : t('diag.checking')}
            </T>
            {status?.next ? (
              <T style={{ color: theme.muted, fontSize: 14 }}>
                {t('diag.next', { title: status.next.title, at: `${new Date(status.next.at).toDateString() === new Date().toDateString() ? '' : DAY_SHORT(new Date(status.next.at)) + ' '}${fmtTime(new Date(status.next.at))}` })}
              </T>
            ) : null}
            {status && status.pending === 0 ? <T style={{ color: theme.brass, fontSize: 14 }}>{t('diag.none')}</T> : null}
            {status?.error ? <T style={{ color: theme.brass, fontSize: 13 }}>{t('diag.error', { msg: status.error })}</T> : null}
          </Row>
          <Row style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <Btn label={t('diag.test')} onPress={async () => { try { await sendTestNotification(settings); setTestMsg(t('diag.testSent')); } catch (e) { setTestMsg(t('diag.error', { msg: String(e?.message || e) })); } }} />
            <T style={{ color: theme.muted, fontSize: 13.5, lineHeight: 19 }}>{testMsg || t('diag.help')}</T>
          </Row>
        </Group>
      ) : null}

      <Group label={t('plan.title')} theme={theme}>
        {plan.map((x, i) => {
          const past = x.at.getTime() <= now;
          return (
            <Row key={i} first={i === 0} style={x === next ? { backgroundColor: theme.brassSoft } : null}>
              <Text style={[styles.tm, { color: past ? theme.muted : theme.fg }]}>{fmtTime(x.at)}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={{ fontFamily: FONTS.uiBold, color: past ? theme.muted : theme.fg }}>{x.name}</T>
                <T style={{ color: theme.muted, fontSize: 14 }} numberOfLines={2}>{x.sub}</T>
              </View>
              <Btn label={t('plan.start')} onPress={() => onStart(x.open)} />
            </Row>
          );
        })}
      </Group>

      <Group label={t('calendar.title')} theme={theme}>
        <Row first>
          <View style={{ flex: 1 }}>
            <T>{t('calendar.adjust')}</T>
            <T style={{ color: theme.muted, fontSize: 14 }}>{hijriToday}</T>
          </View>
          <Stepper value={settings.hijriAdjust || 0} min={-2} max={2} format={days} label={t('calendar.adjust')}
            onChange={(v) => update({ hijriAdjust: v })} />
        </Row>
        <Row>
          <View style={{ flex: 1 }}><T>{t('calendar.friday')}</T><T style={{ color: theme.muted, fontSize: 14 }}>{t('calendar.fridaySub')}</T></View>
          <Toggle value={settings.friday !== false} onChange={(v) => update({ friday: v })} />
        </Row>
        <Row>
          <View style={{ flex: 1 }}><T>{t('calendar.white')}</T><T style={{ color: theme.muted, fontSize: 14 }}>{t('calendar.whiteSub')}</T></View>
          <Toggle value={settings.whiteDays !== false} onChange={(v) => update({ whiteDays: v })} />
        </Row>
        <Row>
          <View style={{ flex: 1 }}><T>{t('calendar.ramadan')}</T><T style={{ color: theme.muted, fontSize: 14 }}>{t('calendar.ramadanSub')}</T></View>
          <Toggle value={settings.ramadan !== false} onChange={(v) => update({ ramadan: v })} />
        </Row>
      </Group>

      <Group label={t('location.title')} theme={theme}>
        <Row first>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: FONTS.uiBold }}>{settings.location?.name || t('location.notSet')}</T>
            <T style={{ color: theme.muted, fontSize: 14 }}>{settings.location?.source === 'gps' ? t('location.fromPhone') : t('location.manual')}</T>
          </View>
          {busy ? <ActivityIndicator color={theme.brass} /> : <Btn label={t('location.useMine')} onPress={useGps} />}
        </Row>
        <Row>
          <T>{t('location.chooseCity')}</T>
          <Btn label={picker === 'city' ? t('common.hide') : t('common.choose')} onPress={() => setPicker(picker === 'city' ? null : 'city')} />
        </Row>
        {picker === 'city' && CITIES.map((x) => (
          <Pressable key={x.name} onPress={() => { update({ location: { ...x, at: Date.now() }, ...defaultsForCountry(x.country), methodAuto: true }); setPicker(null); setMsg(t('location.updated', { name: x.name })); }}
            style={[styles.opt, { borderTopColor: theme.line }]}>
            <T>{x.name}</T>
          </Pressable>
        ))}
        {msg ? <Row><T style={{ color: theme.muted, fontSize: 15 }}>{msg}</T></Row> : null}
      </Group>

      <Group label={t('calc.title')} theme={theme}>
        <Row first>
          <View style={{ flex: 1 }}><T>{t('calc.method')}</T><T style={{ color: theme.muted, fontSize: 14 }}>{METHODS[settings.method]}</T></View>
          <Btn label={picker === 'method' ? t('common.hide') : t('common.change')} onPress={() => setPicker(picker === 'method' ? null : 'method')} />
        </Row>
        {picker === 'method' && Object.entries(METHODS).map(([k, v]) => (
          <Pressable key={k} onPress={() => { update({ method: k, methodAuto: false }); setPicker(null); }}
            style={[styles.opt, { borderTopColor: theme.line }, settings.method === k && { backgroundColor: theme.brassSoft }]}>
            <T>{v}</T>
          </Pressable>
        ))}
        <Row>
          <T>{t('prayer.asr')}</T>
          <View style={[styles.seg, { borderColor: theme.line }]}>
            {['Shafi', 'Hanafi'].map((m) => (
              <Pressable key={m} onPress={() => update({ madhab: m, methodAuto: false })} style={[styles.segBtn, settings.madhab === m && { backgroundColor: theme.brass }]}>
                <T style={{ fontSize: 15, color: settings.madhab === m ? theme.bg : theme.fg }}>{m === 'Shafi' ? t('calc.standard') : t('calc.hanafi')}</T>
              </Pressable>
            ))}
          </View>
        </Row>
      </Group>

      <Group label={t('tune.title')} theme={theme}>
        <Row first style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <T style={{ color: theme.muted, fontSize: 14 }}>{t('tune.body')}</T>
        </Row>
        {PRAYERS.map((p) => (
          <Row key={p.key}>
            <T>{prayerName(p.key)}</T>
            <Stepper value={settings.adjust?.[p.key] || 0} min={-30} max={30} format={minutes} label={prayerName(p.key)}
              onChange={(n) => update({ adjust: { ...settings.adjust, [p.key]: n } })} />
          </Row>
        ))}
      </Group>

      <Group label={t('reminders.title')} theme={theme}>
        <Row first style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
          <T>{t('reminders.after')}</T>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {OFFSETS.map((o) => (
              <Pressable key={o} onPress={() => update({ offset: o })}
                style={[styles.chip, { borderColor: settings.offset === o ? theme.brass : theme.line }, settings.offset === o && { backgroundColor: theme.brassSoft }]}>
                <T style={{ fontSize: 15 }}>{t('unit.min', { n: o })}</T>
              </Pressable>
            ))}
          </View>
        </Row>
        {PRAYERS.map((p) => (
          <Row key={p.key}>
            <View style={{ flex: 1 }}>
              <T>{prayerName(p.key)}</T>
              <T style={{ color: theme.muted, fontSize: 13 }}>{alert.on ? t('reminders.both') : t('reminders.only')}</T>
            </View>
            <Toggle value={!!settings.prayers[p.key]} onChange={(v) => update({ prayers: { ...settings.prayers, [p.key]: v } })} />
          </Row>
        ))}
        <Row>
          <View style={{ flex: 1 }}><T>{t('reminders.daily')}</T><T style={{ color: theme.muted, fontSize: 14 }}>9:00 AM · 2:30 PM · 10:00 PM</T></View>
          <Toggle value={settings.daily} onChange={(v) => update({ daily: v })} />
        </Row>
        <Row>
          <T>{t('reminders.vibrate')}</T>
          <Toggle value={settings.haptics} onChange={(v) => update({ haptics: v })} />
        </Row>
      </Group>

      <Group label={t('widgets.title')} theme={theme}>
        {(Platform.OS === 'android'
          ? [['RatbPrayerTimes', 'widgets.prayerTimes', 'widgets.prayerTimesSub'], ['RatbTodayPrayers', 'widgets.today', 'widgets.todaySub'],
             ['RatbNextPrayer', 'widgets.next', 'widgets.nextSub'], ['RatbSalah', 'widgets.salah', 'widgets.salahSub'], ['RatbVerse', 'widgets.verse', 'widgets.verseSub']]
          : [[null, 'widgets.prayerTimes', 'widgets.prayerTimesSubIos'], [null, 'widgets.today', 'widgets.todaySub'], [null, 'widgets.salah', 'widgets.salahSubIos'], [null, 'widgets.verse', 'widgets.verseSubIos']]
        ).map(([name, title, sub], i) => (
          <Row key={title} first={i === 0}>
            <View style={{ flex: 1 }}><T>{t(title)}</T><T style={{ color: theme.muted, fontSize: 14 }}>{t(sub)}</T></View>
            {name && androidWidgetsAvailable() ? (
              <Btn label={t('widgets.add')} onPress={async () => setWidgetMsg((await pinAndroidWidget(name)) ? '' : t('widgets.manualAndroid'))} />
            ) : null}
          </Row>
        ))}
        <Row>
          <View style={{ flex: 1, gap: 8 }}>
            <T>{t('widgets.verseEvery')}</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['day', 'hour'].map((k) => {
                const on = (settings.verseEvery || 'day') === k;
                return (
                  <Pressable key={k} onPress={() => update({ verseEvery: k })} accessibilityRole="radio" accessibilityState={{ checked: on }}
                    style={[styles.soundOpt, { borderColor: on ? theme.brass : theme.line }, on && { backgroundColor: theme.brassSoft }]}>
                    <T style={{ fontFamily: on ? FONTS.uiBold : FONTS.ui }}>{t('widgets.every.' + k)}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Row>
        <Row><T style={{ color: theme.muted, fontSize: 14, lineHeight: 20 }}>{widgetMsg || (Platform.OS === 'android' ? t('widgets.howAndroid') : t('widgets.howIos'))}</T></Row>
      </Group>

      <Group label={t('lang.title')} theme={theme}>
        {Object.entries(LANGS).map(([k, label], i) => {
          const on = (settings.lang || 'system') === k;
          return (
            <Pressable key={k} onPress={() => onLanguage(k)} style={[styles.row, { borderTopColor: theme.line, borderTopWidth: i ? 1 : 0 }, on && { backgroundColor: theme.brassSoft }]}>
              <T style={{ fontFamily: on ? FONTS.uiBold : FONTS.ui }}>{label || t('lang.system')}</T>
              {on ? <T style={{ color: theme.brass }}>✓</T> : null}
            </Pressable>
          );
        })}
      </Group>

      <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 20.5, fontFamily: FONTS.ui }}>{t('prayers.footer')}</Text>
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
  tick: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  soundOpt: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
