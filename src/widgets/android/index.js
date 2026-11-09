'use no memo';
// Android home-screen widgets: drawing, refreshing and "add to home screen".
// The native module only exists in real builds (not Expo Go), so everything is guarded.
import { loadSettings } from '../../lib/storage';
import { applyLang } from '../../i18n';
import { prayerModel, verseModel } from '../model';
import { WIDGETS, THEMES } from './widgets';

let lib = null;
try {
  lib = require('react-native-android-widget');
} catch (e) {
  lib = null;
}

export const ANDROID_WIDGETS = Object.keys(WIDGETS);

function render(name, info, settings, now = new Date()) {
  const draw = WIDGETS[name];
  if (!draw) return null;
  const ctx = { width: info?.width, height: info?.height };
  if (name === 'RatbVerse') ctx.v = verseModel(now, settings?.verseEvery);
  else ctx.m = prayerModel(settings, now);
  return { light: draw({ ...ctx, c: THEMES.light }), dark: draw({ ...ctx, c: THEMES.dark }) };
}

// Called by Android (in the background) when a widget is added, resized, or its
// 30-minute refresh comes round. Taps open the app through misbaha:// links, so no click handling.
export async function widgetTaskHandler(props) {
  const { widgetInfo, widgetAction } = props;
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  const settings = await loadSettings();
  applyLang(settings.lang);
  const tree = render(widgetInfo.widgetName, widgetInfo, settings);
  if (tree) props.renderWidget(tree);
}

export function registerAndroidWidgets() {
  if (!lib) return;
  try { lib.registerWidgetTaskHandler(widgetTaskHandler); } catch (e) {}
}

// Redraw every Ratb widget on the home screen (app opened, settings or language changed).
export function refreshAndroidWidgets(settings) {
  if (!lib) return;
  for (const name of ANDROID_WIDGETS) {
    try {
      lib.requestWidgetUpdate({ widgetName: name, renderWidget: (info) => render(name, info, settings) }).catch(() => {});
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
