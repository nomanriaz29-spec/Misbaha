import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../theme';

export default function Sheet({ visible, title, onClose, theme, children }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.wrap, { backgroundColor: theme.scrim }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: theme.bg, borderColor: theme.line, paddingBottom: insets.bottom }]}>
          <View style={styles.head}>
            <Text style={[styles.title, { color: theme.fg }]}>{title}</Text>
            <Pressable onPress={onClose} style={[styles.done, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <Text style={{ color: theme.fg, fontFamily: FONTS.ui }}>Done</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function Group({ label, theme, children }) {
  return (
    <View style={{ gap: 8 }}>
      {label ? <Text style={[styles.lbl, { color: theme.muted }]}>{label.toUpperCase()}</Text> : null}
      <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.line }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 },
  title: { fontFamily: FONTS.numMed, fontSize: 22 },
  done: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  body: { paddingHorizontal: 18, paddingBottom: 28, paddingTop: 4, gap: 20 },
  lbl: { fontFamily: FONTS.uiBold, fontSize: 11.5, letterSpacing: 1.2 },
  list: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
});
