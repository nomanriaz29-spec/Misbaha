# Credits

## Azan recording

`assets/sounds/azan.wav` (the 18-second opening used for notifications) and `assets/sounds/azan-full.m4a` (the complete azan played in the app) are made from:

**"Call to prayer from the Prophet's Mosque" by ejaz215**, recorded at al-Masjid an-Nabawi, Madinah.
- Original: https://freesound.org/people/ejaz215/sounds/33937/
- Wikimedia Commons: https://commons.wikimedia.org/wiki/File:33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg
- Licence: **Creative Commons Attribution 3.0 (CC BY 3.0)**, https://creativecommons.org/licenses/by/3.0/

CC BY requires credit. The app shows "Azan recorded at the Prophet's Mosque by ejaz215 (CC BY 3.0)" under Prayers → Prayer time alert, and the store description can carry the same line.

Changes made: trimmed the silent lead-in, cut the notification clip after the first "Allahu Akbar, Allahu Akbar" with a short fade (iOS allows at most 30 seconds), loudness-normalised and converted to mono WAV / AAC.
Source file SHA-1 (lossless copy): 707c3918e8b1e5fd76e45b18b1583e2d78f36bac

## Alarm tone

`assets/sounds/alarm.wav` was generated for Misbaha (synthesised tones) and has no third-party rights.

## Libraries

Prayer times are calculated with [adhan-js](https://github.com/batoulapps/adhan-js) (MIT licence).
