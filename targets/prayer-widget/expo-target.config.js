/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'PrayerWidget',
  bundleIdentifier: '.prayerwidget', // -> com.nomanriaz.misbaha.prayerwidget
  deploymentTarget: '17.0',
  icon: '../../assets/icon.png',
  colors: {
    $accent: '#D6A651',
    $widgetBackground: '#0F1A19',
  },
  // Same App Group as the app, so the widget can read the prayer times the app writes.
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
