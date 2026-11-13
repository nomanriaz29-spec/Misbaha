// Apple Watch app target for @bacons/apple-targets. Built into the iPhone app from 1.1.
// The Swift code is compile-checked, and screenshots are rendered, by .github/workflows/ios-check.yml.
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'watch',
  name: 'RatbWatch',
  displayName: 'Ratb', // the name under the icon on the watch
  bundleIdentifier: '.watchkitapp', // -> com.nomanriaz.misbaha.watchkitapp
  deploymentTarget: '10.0',
  icon: '../../assets/icon.png',
  colors: { $accent: '#D6A651' },
});
