import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Sheet from '../components/Sheet';
import { t } from '../i18n';
import { FONTS } from '../theme';

const TARGETS = [33, 100, 1000, 0];

// Add or edit one of the user's own dhikr. Deleting asks for a second tap.
export default function CustomEditor({ visible, initial, onSave, onDelete, onClose, theme }) {
  const [tr, setTr] = useState('');
  const [ar, setAr] = useState('');
  const [en, setEn] = useState('');
  const [n, setN] = useState(33);
  const [custom, setCustom] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTr(initial?.tr || ''); setAr(initial?.ar || ''); setEn(initial?.en || '');
    const target = initial?.n ?? 33;
    setN(TARGETS.includes(target) ? target : -1);
    setCustom(TARGETS.includes(target) ? '' : String(target));
    setConfirmDelete(false);
  }, [visible, initial]);

  const target = n === -1 ? Math.min(100000, Math.max(1, parseInt(custom, 10) || 0)) : n;
  const valid = (tr.trim() || ar.trim()) && (n !== -1 || parseInt(custom, 10) > 0);
  const input = [styles.input, { color: theme.fg, borderColor: theme.line, backgroundColor: theme.surface }];

  return (
    <Sheet visible={visible} title={initial ? t('custom.edit') : t('custom.add')} onClose={onClose} theme={theme}>
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.muted }]}>{t('custom.name')}</Text>
        <TextInput value={tr} onChangeText={setTr} placeholder={t('custom.namePh')} placeholderTextColor={theme.muted} style={input} maxLength={80} />
      </View>
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.muted }]}>{t('custom.arabic')}</Text>
        <TextInput value={ar} onChangeText={setAr} placeholder="سُبْحَانَ اللَّهِ" placeholderTextColor={theme.muted}
          style={[input, styles.arInput]} maxLength={400} multiline textAlign="right" />
      </View>
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.muted }]}>{t('custom.meaning')}</Text>
        <TextInput value={en} onChangeText={setEn} placeholder={t('custom.meaningPh')} placeholderTextColor={theme.muted} style={input} maxLength={200} />
      </View>
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.muted }]}>{t('custom.target')}</Text>
        <View style={styles.row}>
          {[...TARGETS, -1].map((v) => {
            const on = n === v;
            return (
              <Pressable key={v} onPress={() => setN(v)} style={[styles.chip, { borderColor: on ? theme.brass : theme.line }, on && { backgroundColor: theme.brassSoft }]}>
                <Text style={{ color: theme.fg, fontFamily: on ? FONTS.uiBold : FONTS.ui, fontSize: 15 }}>
                  {v === 0 ? t('custom.noTarget') : v === -1 ? t('custom.other') : '×' + v}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {n === -1 && (
          <TextInput value={custom} onChangeText={(s) => setCustom(s.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad"
            placeholder="70" placeholderTextColor={theme.muted} style={[input, { width: 140 }]} />
        )}
      </View>

      <Pressable disabled={!valid} onPress={() => onSave({ tr: tr.trim(), ar: ar.trim(), en: en.trim(), n: target })}
        style={[styles.save, { backgroundColor: theme.brass, opacity: valid ? 1 : 0.4 }]}>
        <Text style={{ color: theme.bg, fontFamily: FONTS.uiBold, fontSize: 17 }}>{t('custom.save')}</Text>
      </Pressable>
      {initial && (
        <Pressable onPress={() => (confirmDelete ? onDelete() : setConfirmDelete(true))} style={styles.delete}>
          <Text style={{ color: confirmDelete ? '#D9534F' : theme.muted, fontFamily: FONTS.ui, fontSize: 15 }}>
            {confirmDelete ? t('custom.deleteConfirm') : t('custom.delete')}
          </Text>
        </Pressable>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontFamily: FONTS.uiBold, fontSize: 12.5, letterSpacing: 1.1, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: FONTS.ui, fontSize: 17 },
  arInput: { fontFamily: FONTS.ar, fontSize: 24, lineHeight: 40, minHeight: 60, writingDirection: 'rtl' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  save: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  delete: { alignItems: 'center', paddingVertical: 12 },
});
