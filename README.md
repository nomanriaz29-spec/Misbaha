# Misbaha — Tasbeeh counter with prayer reminders

One codebase for **Android and iOS**, built with Expo (SDK 56, React Native).

## What the app does

- **Tap anywhere to count.** A ring of 33 beads fills as you go. Your phone gives a light vibration on each tap and a stronger one when you reach the target. The screen stays awake while counting.
- **Routines that advance on their own:** After Salah (Astaghfirullah ×3, then 33 · 33 · 33 + tahlil), Morning adhkar, Evening adhkar, Before sleep (33 · 33 · 34).
- **14 adhkar** with Arabic, transliteration, meaning and hadith source, plus a free counter.
- **Stops at the target.** When a routine or count is finished, taps stop counting and a completion card appears with **Repeat**, **Keep counting**, and **Recommended next**. The recommendations suit the time of day (morning adhkar after Fajr, evening adhkar after Asr, the before-sleep tasbeeh at night) and include matching duas.
- **Duas menu** (Duas button). 33 duas in 7 groups by what they're for: daily life, worry & hardship, forgiveness, family, knowledge & provision, health, and faith & guidance. Each has Arabic, transliteration, meaning, when to read it and its Quran or hadith source, and opens in the counter.
- **Location permission at first launch.** The app calculates prayer times anywhere in the world with the [adhan](https://github.com/batoulapps/adhan-js) library. It picks the right calculation method for the country automatically (UAE, Umm al-Qura, Karachi + Hanafi, ISNA and others). Users can change the method and Asr school. If they decline location, they pick a city instead.
- **Real notifications on the phone.** These are local notifications, so they need no server and work offline.
  - 15 minutes after each of the 5 prayers. The delay can be set to 5, 10, 15, 20 or 30 minutes, and each prayer can be turned off.
  - 3 daily tasbeeh reminders at 9:00 AM, 2:30 PM and 10:00 PM.
  - Tapping a notification opens the matching routine.
  - Reminders are scheduled 7 days ahead and refreshed every time the app opens and by a background task. iOS allows at most 64 pending notifications, and the app uses about 39.
- **Qibla finder** (compass button in the top bar). The live compass turns with the phone using its heading sensor. It shows the bearing and distance to the Kaaba, turns green and vibrates when you face the Qibla, and prompts you to calibrate when the reading is unreliable.
- Light and dark mode follow the phone.

## Project layout

```
App.js                     app shell, state, notification taps
index.js                   entry point (registers the background task)
app.json                   name, bundle IDs, permissions, icons
eas.json                   build profiles for the stores
src/data/adhkar.js         all adhkar, routines, daily reminder times
src/lib/prayer.js          prayer time calculation + country defaults
src/lib/location.js        location permission + fallback city list
src/lib/notifications.js   permission, Android channel, scheduling
src/lib/background.js      background refresh of reminders
src/screens/               Onboarding, Counter, Library, Schedule
assets/                    icon, adaptive icon, splash, notification icon
```

---

## 1. Run it on your phone (about 10 minutes)

You need [Node.js LTS](https://nodejs.org) on your computer.

```bash
cd misbaha-app
npm install
npx expo install --fix      # aligns every package with Expo SDK 56
npx expo start
```

Install **Expo Go** from the App Store or Play Store and scan the QR code.

> **Notifications in Expo Go:** Local notifications mostly work in Expo Go, but the background refresh does not run there. To test everything exactly as users will get it, make a preview build (step 3) and install that.

## 2. Before you publish, change these

In `app.json`:

- `ios.bundleIdentifier` and `android.package`: replace `com.yourname.misbaha` with your own reverse domain, for example `com.nomanriaz.misbaha`. **You cannot change these after the first store release.**
- `name` if you want a different store name. "Misbaha" may already be taken on the stores.

## 3. Build with EAS (Expo's cloud build service)

```bash
npm install -g eas-cli
eas login                  # free Expo account at expo.dev
eas build:configure
```

**Android test build** (an APK you can install directly on any Android phone):

```bash
eas build --platform android --profile preview
```

**Store builds:**

```bash
npm run build:android      # .aab for Google Play
npm run build:ios          # .ipa for the App Store (EAS handles certificates)
```

You don't need a Mac. EAS builds iOS in the cloud.

## 4. Publish to the stores

### Google Play
1. Create a [Google Play Console](https://play.google.com/console) developer account. It costs a one-time fee of US$25.
2. Create the app and fill in the store listing: description, screenshots, a 512×512 icon and a 1024×500 feature graphic.
3. **Data safety form:** declare *approximate and precise location*, used for *app functionality*, *not shared*, *processed on device*.
4. **Privacy policy URL:** host `PRIVACY.md` somewhere public. A free GitHub Pages or Notion page works.
5. **Exact alarm permission:** the app requests `SCHEDULE_EXACT_ALARM` so reminders arrive on time. Play Console may ask you to justify it. Explain that the app delivers time-critical reminders after each prayer. If it gets rejected, remove the permission from `app.json`. Reminders will still work, but Android may deliver them a few minutes late.
6. New personal developer accounts must run a **closed test with at least 12 testers for 14 days** before Google allows a production release. Check the current rule in Play Console.
7. Upload with `npm run submit:android`, or drag the `.aab` into Play Console.

### Apple App Store
1. Join the [Apple Developer Program](https://developer.apple.com/programs/). It costs US$99 per year.
2. Create the app in [App Store Connect](https://appstoreconnect.apple.com) with the same bundle ID as in `app.json`.
3. Add screenshots for 6.9" and 6.5" iPhones, a description, keywords and a privacy policy URL.
4. **App Privacy:** Location → *App Functionality* → *not linked to identity*, *not used for tracking*.
5. Run `npm run submit:ios`, then submit for review in App Store Connect. Test with TestFlight first.

## 5. Updating the app later

- Bump `version` in `app.json`, and also `ios.buildNumber` and `android.versionCode`, then build and submit again.
- To add or edit adhkar, change `src/data/adhkar.js`. To change the daily reminder times, edit `DAILY` in that file.

## Notes on accuracy

Prayer times are calculated, not fetched from a mosque. They usually match published timetables within 1–3 minutes. Users can choose a different method under **Prayers → Calculation** if their local mosque follows another convention.
