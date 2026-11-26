import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

// Asks for an App Store / Play rating with the system prompt, only at a happy moment (a finished
// set) and only for people who use the app: after 5 finished sets, at least 3 days after first use,
// and at most once every 120 days. Apple and Google also cap how often the prompt really appears.
const KEY = 'ratb.review';
const DAY = 86400000;
export const RULES = { sets: 5, firstDays: 3, gapDays: 120 };

export function cleanReview(raw, now = Date.now()) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const num = (v, min, max) => (Number.isFinite(v) && v >= min && v <= max ? v : null);
  return {
    first: num(r.first, 0, now) ?? now,
    sets: Math.floor(num(r.sets, 0, 1e6) ?? 0),
    asked: num(r.asked, 0, now),
  };
}

// Pure decision, so it can be tested: returns [nextState, shouldAsk].
export function onSetFinished(state, now = Date.now()) {
  const s = { ...state, sets: state.sets + 1 };
  const due = s.sets >= RULES.sets && now - s.first >= RULES.firstDays * DAY && (!s.asked || now - s.asked >= RULES.gapDays * DAY);
  if (due) s.asked = now;
  return [s, due];
}

export async function setFinished() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const [next, ask] = onSetFinished(cleanReview(raw ? JSON.parse(raw) : null));
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    if (!ask) return false;
    if (!(await StoreReview.isAvailableAsync()) || !(await StoreReview.hasAction())) return false;
    await StoreReview.requestReview();
    return true;
  } catch (e) {
    return false; // a rating prompt must never break counting
  }
}

// Called once at launch so "first use" is recorded even before the first finished set.
export async function markFirstUse() {
  try {
    if (!(await AsyncStorage.getItem(KEY))) await AsyncStorage.setItem(KEY, JSON.stringify(cleanReview(null)));
  } catch (e) {}
}
