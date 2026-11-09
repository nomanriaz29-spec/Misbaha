// Apple Watch app target for @bacons/apple-targets.
// This folder is NOT built yet. To include the watch app in iPhone builds, move it:
//   git mv watch targets/watch
// Do that after the first iPhone build with the widget has succeeded, so any problem
// is easy to pin down. The Swift code is compile-checked on every push by
// .github/workflows/ios-check.yml.
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'watch',
  name: 'RatbWatch',
  bundleIdentifier: '.watchkitapp', // -> com.nomanriaz.misbaha.watchkitapp
  deploymentTarget: '10.0',
  icon: '../../assets/icon.png',
  colors: { $accent: '#D6A651' },
});
