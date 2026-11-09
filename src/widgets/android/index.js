'use no memo';
// Android home-screen widgets: drawing, refreshing and "add to home screen".
// The native module only exists in real builds (not Expo Go), so everything is guarded.
import { loadSettings } from '../../lib/storage';
import { applyLang } from '../../i18n';
import { prayerModel, verseModel, salahModel } from '../model';
import { loadSalah, saveSalah, togglePrayed, SALAH } from '../../lib/salah';
import { WIDGETS, THEMES } from './widgets';

let lib = null;
try {
  lib = require('react-native-android-widget');
} catch (e) {
  lib = null;
}

export const ANDROID_WIDGETS = Object.keys(WIDGETS);

function render(name, info, settings, log, now = new Date()) {
  const draw = WIDGETS[name];
  if (!draw) return null;
  const ctx = { width: info?.width, height: info?.height };
  if (name === 'RatbVerse') ctx.v = verseModel(now, settings?.verseEvery);
  else if (name === 'RatbSalah') ctx.s = salahModel(settings, log || {}, now);
  else ctx.m = prayerModel(settings, now);
  return { light: draw({ ...ctx, c: THEMES.light }), dark: draw({ ...ctx, c: THEMES.dark }) };
}

// Called by Android (in the background) when a widget is added, resized, or its
// 30-minute refresh comes round. Taps open the app through misbaha:// links, so no click handling.
export async function widgetTaskHandler(props) {
  const { widgetInfo, widgetAction } = props;
  if (widgetAction === 'WIDGET_DELETED') return;
  const settings = await loadSettings();
  applyLang(settings.lang);
  let log = await loadSalah();
  if (widgetAction === 'WIDGET_CLICK') {
    // A prayer tapped on the tracker widget: tick or untick it, then redraw.
    const d = props.clickActionData || {};
    if (props.clickAction !== 'SALAH_TOGGLE' || !SALAH.includes(d.k) || !/^\d{4}-\d{2}-\d{2}$/.test(d.d || '')) return;
    log = togglePrayed(log, d.d, d.k);
    await saveSalah(log);
  }
  const tree = render(widgetInfo.widgetName, widgetInfo, settings, log);
  if (tree) props.renderWidget(tree);
}

export function registerAndroidWidgets() {
  if (!lib) return;
  try { lib.registerWidgetTaskHandler(widgetTaskHandler); } catch (e) {}
}

// Redraw every Ratb widget on the home screen (app opened, settings or language changed).
export function refreshAndroidWidgets(settings) {
  if (!lib) return;
  const logP = loadSalah();
  for (const name of ANDROID_WIDGETS) {
    try {
      lib.requestWidgetUpdate({ widgetName: name, renderWidget: async (info) => render(name, info, settings, await logP) }).catch(() => {});
    } catch (e) {}
  }
}

// Shows the launcher's own "Add to home screen" prompt. Returns false when the launcher
// doesn't support it (the app then explains how to add it by hand).
export async function pinAndroidWidget(name) {
  if (!lib?.requestPinWidget) return false;
  try { return await lib.requestPinWidget({ widgetName: name }); } catch (e) { return false; }
}

export const androidWidgetsAvailable = () => !!lib;

export { render as renderAndroidWidget };
