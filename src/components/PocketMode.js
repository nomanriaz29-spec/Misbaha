import React, { useRef } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { FONTS } from '../theme';

// Count without looking: a black, full-screen tap area (saves battery on OLED screens).
// Every tap gives a firm buzz, every 33 a double buzz, and the target a long pattern
// (handled by the counter). Hold anywhere for 1.5 seconds, or tap Done, to leave.
export default function PocketMode({ visible, onClose, onTap, count, target, name, done }) {
  const insets = useSafeAreaInsets();
  const held = useRef(false);
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait']}>
      <Pressable
        style={styles.wrap}
        onPressIn={() => { held.current = false; }}
        onPress={() => { if (!held.current) onTap(); }}
        onLongPress={() => { held.current = true; onClose(); }}
        delayLongPress={1500}
        accessibilityRole="button"
        accessibilityLabel={t('pocket.a11y')}
      >
        <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.hint}>{t('pocket.title')}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.done} accessibilityRole="button">
            <Text style={styles.doneTxt}>{t('common.done')}</Text>
          </Pressable>
        </View>
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.count}>{count}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {done ? t('counter.complete') : target > 0 ? t('counter.of', { n: target }) : name}
          </Text>
        </View>
        <Text style={[styles.foot, { paddingBottom: insets.bottom + 18 }]}>{t('pocket.foot')}</Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  hint: { color: '#4A5654', fontFamily: FONTS.ui, fontSize: 14 },
  done: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#243634' },
  doneTxt: { color: '#8FA29D', fontFamily: FONTS.ui, fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  count: { color: '#3D4B49', fontFamily: FONTS.num, fontSize: 120, fontVariant: ['tabular-nums'] },
  sub: { color: '#3D4B49', fontFamily: FONTS.ui, fontSize: 15, letterSpacing: 1 },
  foot: { color: '#33403E', fontFamily: FONTS.ui, fontSize: 13, textAlign: 'center', paddingHorizontal: 30 },
});
