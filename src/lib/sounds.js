// Plays the azan / alarm inside the app: sound previews in Prayers, and the full azan
// when the user taps a prayer-time notification.
let audio = null;
try {
  audio = require('expo-audio');
} catch (e) {
  audio = null;
}

export const SOUND_FILES = {
  azan: require('../../assets/sounds/azan.wav'),        // 18 s opening, also the notification sound
  alarm: require('../../assets/sounds/alarm.wav'),
  full: require('../../assets/sounds/azan-full.m4a'),   // complete azan, 3 min 6 s
};

let player = null;
let sub = null;

export function stopSound() {
  try { sub?.remove(); } catch (e) {}
  try { player?.pause(); player?.remove(); } catch (e) {}
  sub = null;
  player = null;
}

// Returns true if playback started. onEnd runs when it finishes by itself.
export async function playSound(kind, onEnd) {
  stopSound();
  if (!audio || !SOUND_FILES[kind]) return false;
  try {
    await audio.setAudioModeAsync({ playsInSilentMode: true });
    player = audio.createAudioPlayer(SOUND_FILES[kind]);
    sub = player.addListener('playbackStatusUpdate', (s) => {
      if (s?.didJustFinish) { stopSound(); onEnd && onEnd(); }
    });
    player.play();
    return true;
  } catch (e) {
    stopSound();
    return false;
  }
}
