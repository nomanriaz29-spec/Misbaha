import { useColorScheme } from 'react-native';

const light = {
  bg: '#ECEFEA', surface: '#FFFFFF', fg: '#1A2826', muted: '#5D6D69', line: '#D5DBD4',
  brass: '#9C6A1C', brassSoft: '#E9D9BC', bead: '#CDD4CC', ok: '#2F7A55', scrim: 'rgba(5,12,11,0.45)', dark: false,
};
const dark = {
  bg: '#0F1A19', surface: '#162423', fg: '#E9E5D9', muted: '#8FA29D', line: '#243634',
  brass: '#D6A651', brassSoft: '#3A3220', bead: '#273A38', ok: '#6CC199', scrim: 'rgba(0,0,0,0.55)', dark: true,
};

export const FONTS = {
  ar: 'Amiri_400Regular',
  num: 'Fraunces_300Light',
  numMed: 'Fraunces_500Medium',
  ui: 'Figtree_400Regular',
  uiBold: 'Figtree_600SemiBold',
};

export function useTheme() {
  return useColorScheme() === 'dark' ? dark : light;
}

// Fills the parent. Written out explicitly instead of StyleSheet.absoluteFill(Object),
// which newer React Native versions deprecate.
export const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };
