// Expo reads app.json first and passes it here as `config`.
// The Android widget plugin is only added when its package is installed, so a missing
// package can never stop an iPhone build (or `expo start`).
module.exports = ({ config }) => {
  let hasAndroidWidgets = false;
  try {
    require.resolve('react-native-android-widget/app.plugin', { paths: [__dirname] });
    hasAndroidWidgets = true;
  } catch (e) {
    hasAndroidWidgets = false;
  }
  if (!hasAndroidWidgets) {
    config.plugins = (config.plugins || []).filter((p) => !(Array.isArray(p) && p[0] === 'react-native-android-widget'));
  }
  return config;
};
