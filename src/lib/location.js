import * as Location from 'expo-location';
import { distanceKm, defaultsForCountry } from './prayer';

// Asks for "while using the app" location and returns { lat, lng, name, country }.
// Returns { denied: true } when the user says no.
export async function detectLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return { denied: true };
  return readPosition();
}

async function placeFor(lat, lng) {
  let name = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  let country = '';
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (place) {
      name = place.city || place.subregion || place.region || name;
      country = place.isoCountryCode || '';
    }
  } catch (e) {}
  return { name, country };
}

const MOVED_KM = 15;      // prayer times shift about 1 minute per ~25 km east-west
const CHECK_EVERY = 3 * 3600e3;

// Called when the app comes to the foreground. If location is on (no prompt is ever shown here)
// and the phone has moved more than 15 km, returns a settings patch with the new place.
export async function refreshLocationIfMoved(settings) {
  const cur = settings?.location;
  if (!cur || cur.source !== 'gps' || Date.now() - (cur.at || 0) < CHECK_EVERY) return null;
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    let pos = await Location.getLastKnownPositionAsync({ maxAge: CHECK_EVERY, requiredAccuracy: 5000 });
    if (!pos) pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    if (!pos) return null;
    const next = { lat: Math.round(pos.coords.latitude * 100) / 100, lng: Math.round(pos.coords.longitude * 100) / 100 };
    if (distanceKm(cur, next) < MOVED_KM) return { location: { ...cur, at: Date.now() } };
    const place = await placeFor(next.lat, next.lng);
    const patch = { location: { ...next, ...place, source: 'gps', at: Date.now() }, moved: true };
    if (settings.methodAuto && place.country && place.country !== cur.country) Object.assign(patch, defaultsForCountry(place.country));
    return patch;
  } catch (e) {
    return null;
  }
}

async function readPosition() {
  let pos = null;
  try {
    pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch (e) {
    pos = await Location.getLastKnownPositionAsync();
  }
  if (!pos) throw new Error('Could not read your location. Check that location services are on.');

  // Rounded to about 1 km before it is used or saved.
  const lat = Math.round(pos.coords.latitude * 100) / 100;
  const lng = Math.round(pos.coords.longitude * 100) / 100;
  const { name, country } = await placeFor(lat, lng);
  return { lat, lng, name, country, source: 'gps', at: Date.now() };
}

// Fallback list when location permission is denied.
export const CITIES = [
  ['Dubai', 25.2048, 55.2708, 'AE'], ['Abu Dhabi', 24.4539, 54.3773, 'AE'], ['Sharjah', 25.3463, 55.4209, 'AE'],
  ['Riyadh', 24.7136, 46.6753, 'SA'], ['Jeddah', 21.4858, 39.1925, 'SA'], ['Makkah', 21.3891, 39.8579, 'SA'], ['Madinah', 24.5247, 39.5692, 'SA'],
  ['Doha', 25.2854, 51.531, 'QA'], ['Kuwait City', 29.3759, 47.9774, 'KW'], ['Muscat', 23.588, 58.3829, 'OM'], ['Manama', 26.2285, 50.586, 'BH'],
  ['Cairo', 30.0444, 31.2357, 'EG'], ['Amman', 31.9539, 35.9106, 'JO'], ['Istanbul', 41.0082, 28.9784, 'TR'],
  ['Karachi', 24.8607, 67.0011, 'PK'], ['Lahore', 31.5204, 74.3587, 'PK'], ['Islamabad', 33.6844, 73.0479, 'PK'],
  ['Delhi', 28.6139, 77.209, 'IN'], ['Mumbai', 19.076, 72.8777, 'IN'], ['Hyderabad', 17.385, 78.4867, 'IN'], ['Dhaka', 23.8103, 90.4125, 'BD'],
  ['Jakarta', -6.2088, 106.8456, 'ID'], ['Kuala Lumpur', 3.139, 101.6869, 'MY'], ['Singapore', 1.3521, 103.8198, 'SG'],
  ['London', 51.5074, -0.1278, 'GB'], ['Birmingham', 52.4862, -1.8904, 'GB'], ['Paris', 48.8566, 2.3522, 'FR'], ['Berlin', 52.52, 13.405, 'DE'],
  ['New York', 40.7128, -74.006, 'US'], ['Chicago', 41.8781, -87.6298, 'US'], ['Houston', 29.7604, -95.3698, 'US'], ['Toronto', 43.6532, -79.3832, 'CA'],
  ['Lagos', 6.5244, 3.3792, 'NG'], ['Nairobi', -1.2921, 36.8219, 'KE'], ['Casablanca', 33.5731, -7.5898, 'MA'], ['Sydney', -33.8688, 151.2093, 'AU'],
].map(([name, lat, lng, country]) => ({ name, lat, lng, country, source: 'manual' }));
