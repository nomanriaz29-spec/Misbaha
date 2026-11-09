import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BeadRing from '../components/BeadRing';
import { detectLocation, CITIES } from '../lib/location';
import { defaultsForCountry } from '../lib/prayer';
import { requestNotificationPermission } from '../lib/notifications';
import { FONTS } from '../theme';
import { t } from '../i18n';

export default function Onboarding({ theme, onDone }) {
  const [step, setStep] = useState('location'); // location | cities | notify
  const [loc, setLoc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const askLocation = async () => {
    setBusy(true); setErr('');
    try {
      const r = await detectLocation();
      if (r.denied) { setErr(t('onb.denied')); setStep('cities'); }
      else { setLoc(r); setStep('notify'); }
    } catch (e) { setErr(e.message); setStep('cities'); }
    setBusy(false);
  };

  const finish = async (askNotif) => {
    let granted = false;
    if (askNotif) { setBusy(true); granted = await requestNotificationPermission(); setBusy(false); }
    onDone({ location: { ...loc, at: Date.now() }, ...defaultsForCountry(loc.country), methodAuto: true, onboarded: true }, granted);
  };

  const Primary = ({ label, onPress }) => (
    <Pressable onPress={onPress} disabled={busy} style={[styles.primary, { backgroundColor: theme.brass }]}>
      {busy ? <ActivityIndicator color={theme.bg} /> : <Text style={[styles.pTxt, { color: theme.bg }]}>{label}</Text>}
    </Pressable>
  );
  const Secondary = ({ label, onPress }) => (
    <Pressable onPress={onPress} style={styles.secondary}><Text style={[styles.sTxt, { color: theme.muted }]}>{label}</Text></Pressable>
  );

  return (
    <SafeAreaView style={[styles.wrap, { backgroundColor: theme.bg }]}>
      {step === 'cities' ? (
        <View style={{ flex: 1, gap: 12 }}>
          <Text style={[styles.h, { color: theme.fg, fontSize: 26 }]}>{t('onb.chooseCity')}</Text>
          {err ? <Text style={[styles.p, { color: theme.muted }]}>{err}</Text> : null}
          <ScrollView style={[styles.list, { borderColor: theme.line, backgroundColor: theme.surface }]}>
            {CITIES.map((c, i) => (
              <Pressable key={c.name} onPress={() => { setLoc(c); setStep('notify'); }}
                style={{ paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: theme.line }}>
                <Text style={{ color: theme.fg, fontFamily: FONTS.ui, fontSize: 18 }}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Secondary label={t('onb.tryAgain')} onPress={askLocation} />
          <Secondary label={t('common.openSettings')} onPress={() => Linking.openSettings()} />
        </View>
      ) : (
        <View style={styles.center}>
          <BeadRing size={170} n={33} filled={step === 'notify' ? 33 : 11} theme={theme} />
          <Text style={[styles.ar, { color: theme.fg }]}>سُبْحَانَ اللَّهِ</Text>
          {step === 'location' ? (
            <>
              <Text style={[styles.meaning, { color: theme.brass }]}>{t('onb.nameMeaning')}</Text>
              <Text style={[styles.h, { color: theme.fg }]}>{t('onb.locTitle')}</Text>
              <Text style={[styles.p, { color: theme.muted }]}>{t('onb.locBody')}</Text>
              <View style={styles.actions}>
                <Primary label={t('location.useMine')} onPress={askLocation} />
                <Secondary label={t('onb.cityInstead')} onPress={() => setStep('cities')} />
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.h, { color: theme.fg }]}>{t('onb.notifTitle')}</Text>
              <Text style={[styles.p, { color: theme.muted }]}>{t('onb.notifBody', { place: loc?.name || '' })}</Text>
              <View style={styles.actions}>
                <Primary label={t('onb.turnOn')} onPress={() => finish(true)} />
                <Secondary label={t('onb.notNow')} onPress={() => finish(false)} />
              </View>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 24, paddingVertical: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  meaning: { fontFamily: FONTS.ui, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 330, fontStyle: 'italic' },
  ar: { fontFamily: FONTS.ar, fontSize: 30, lineHeight: 50 },
  h: { fontFamily: FONTS.numMed, fontSize: 28, textAlign: 'center', lineHeight: 34 },
  p: { fontFamily: FONTS.ui, fontSize: 17, lineHeight: 25, textAlign: 'center', maxWidth: 340 },
  actions: { alignSelf: 'stretch', gap: 6, marginTop: 12 },
  primary: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pTxt: { fontFamily: FONTS.uiBold, fontSize: 18 },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  sTxt: { fontFamily: FONTS.ui, fontSize: 17 },
  list: { flex: 1, borderWidth: 1, borderRadius: 16 },
});
