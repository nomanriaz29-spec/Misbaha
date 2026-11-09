import { I18nManager } from 'react-native';
import en from './en';
import ar from './ar';
import ur from './ur';
import { CONTENT } from './content';

const TABLES = { en, ar, ur };
export const LANGS = { system: null, en: 'English', ar: 'العربية', ur: 'اردو' };

let lang = 'en';

export function deviceLang() {
  try {
    const code = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2).toLowerCase();
    return TABLES[code] ? code : 'en';
  } catch (e) {
    return 'en';
  }
}

// setting: 'system' | 'en' | 'ar' | 'ur'
export function applyLang(setting) {
  lang = setting && setting !== 'system' && TABLES[setting] ? setting : deviceLang();
  return lang;
}
export const getLang = () => lang;
export const isRTL = (l = lang) => l === 'ar' || l === 'ur';

// t('key', { n: 3 }) -> translated string with {n} filled in. Falls back to English, then the key.
export function t(key, vars) {
  const table = TABLES[lang][key] != null ? TABLES[lang] : en;
  let s = table[key];
  // Plural: a key ending in _other is used when n is not 1 (Arabic and Urdu use the same form).
  if (s != null && vars && vars.n != null && Math.abs(Number(String(vars.n).replace(/[^\d.-]/g, ''))) !== 1 && table[key + '_other'] != null) s = table[key + '_other'];
  if (s == null) s = key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));
  return s;
}

// Translated content for built-in dhikr, routines, duas and prayers.
// kind: 'dhikr' | 'sets' | 'duas' | 'prayers'; returns null when there is no translation.
export function c(kind, id, field) {
  return CONTENT[lang]?.[kind]?.[id]?.[field] ?? null;
}

// Does the layout direction match the language? If not, flip it; the app must restart to apply.
export function needsDirectionChange(l = lang) {
  return I18nManager.isRTL !== isRTL(l);
}
export function setDirection(l = lang) {
  try {
    I18nManager.allowRTL(isRTL(l));
    I18nManager.forceRTL(isRTL(l));
  } catch (e) {}
}
