// Apple Maps mosque search (iOS only). Returns null when the native module isn't in the build
// (Android, Expo Go, tests), so callers fall back to OpenStreetMap.
let native = null;
try {
  native = require('expo-modules-core').requireOptionalNativeModule('RatbPlaces');
} catch (e) {
  native = null;
}

export const hasApplePlaces = () => !!native?.searchMosques;

export async function searchMosquesApple(lat, lng, radius) {
  if (!native?.searchMosques) return null;
  return native.searchMosques(lat, lng, radius);
}
