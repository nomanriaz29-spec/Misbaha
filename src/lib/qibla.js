// Kaaba, Masjid al-Haram, Makkah
export const KAABA = { lat: 21.4225, lng: 39.8262 };

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

// Great-circle initial bearing from a point to the Kaaba, degrees clockwise from true north.
export function qiblaBearing(lat, lng) {
  const p1 = rad(lat), p2 = rad(KAABA.lat), dl = rad(KAABA.lng - lng);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

// Distance to the Kaaba in kilometres (haversine).
export function distanceKm(lat, lng) {
  const dp = rad(KAABA.lat - lat), dl = rad(KAABA.lng - lng);
  const a = Math.sin(dp / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(KAABA.lat)) * Math.sin(dl / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const compassPoint = (b) => POINTS[Math.round(b / 22.5) % 16];

// Signed smallest difference a - b, in (-180, 180].
export const angleDiff = (a, b) => ((a - b + 540) % 360) - 180;
