# Misbaha — Tasbeeh counter with prayer reminders

One codebase for **Android and iOS**, built with Expo (SDK 58, React Native 0.88).

## What the app does

- **Tap anywhere to count.** A ring of 33 beads fills as you go. Your phone gives a light vibration on each tap and a stronger one when you reach the target. The screen stays awake while counting.
- **Routines that advance on their own:** After Salah (Astaghfirullah ×3, then 33 · 33 · 33 + tahlil), Morning adhkar, Evening adhkar, Before sleep (33 · 33 · 34).
- **14 adhkar** with Arabic, transliteration, meaning and hadith source, plus a free counter.
- **Stops at the target.** When a routine or count is finished, taps stop counting and a completion card appears with **Repeat**, **Keep counting**, and **Recommended next**. The recommendations suit the time of day (morning adhkar after Fajr, evening adhkar after Asr, the before-sleep tasbeeh at night) and include matching duas.
- **Duas menu** (Duas button). 33 duas in 7 groups by what they're for: daily life, worry & hardship, forgiveness, family, knowledge & provision, health, and faith & guidance. Each has Arabic, transliteration, meaning, when to read it and its Quran or hadith source, and opens in the counter.
- **Location permission at first launch.** The app calculates prayer times anywhere in the world with the [adhan](https://github.com/batoulapps/adhan-js) library. It picks the right calculation method for the country automatically (UAE, Umm al-Qura, Karachi + Hanafi, ISNA and others). Users can change the method and Asr school. If they decline location, they pick a city instead.
- **Real notifications on the phone.** These are local notifications, so they need no server and work offline.
  - **At each prayer time, an alert with the azan** (default), an alarm tone or the standard sound, chosen under **Prayers → Prayer time alert**. The notification plays the 18-second opening of the azan (recorded at the Prophet's Mosque, Madinah), which keeps it under iOS's 30-second limit. Tapping it plays the full azan in the app. Recording details are in [CREDITS.md](CREDITS.md).
  - A tasbeeh reminder 15 minutes after each of the 5 prayers. The delay can be set to 5, 10, 15, 20 or 30 minutes, and each prayer can be turned off.
  - 3 daily tasbeeh reminders at 9:00 AM, 2:30 PM and 10:00 PM.
  - Tapping a notification opens the matching routine.
  - Alerts and reminders are scheduled 6 days ahead (7 with alerts off) and refreshed every time the app opens and by a background task. That keeps the app under iOS's limit of 64 pending notifications.
- **Qibla finder** (compass button in the top bar). The live compass turns with the phone using its heading sensor. It shows the bearing and distance to the Kaaba, turns green and vibrates when you face the Qibla, and prompts you to calibrate when the reading is unreliable.
- **Daily history** (tap "Today · History" in the top left). It shows your current and best streak, the last 7 days and all-time totals, plus a month calendar shaded by how much you did each day. Tap any day to see which routines you completed (After Salah 0–5, morning, evening, before sleep) and a count for every dhikr and dua. Two years of history are kept on the phone.
- **Accurate prayer times that follow you.** Times are calculated on the phone with the [adhan](https://github.com/batoulapps/adhan-js) library. When the app opens, it checks (without asking again) whether you've moved more than 15 km and updates the place and the country's method. **Fine-tune times** in Prayers lets you shift any prayer by ±30 minutes to match your masjid exactly.
- **iOS widget** ([preview](docs/widget-preview.png)) for the home screen (small and medium) and the lock screen (inline, rectangular and circular). It shows the next prayer, a live countdown and today's five times. The app saves 30 days of times for it, so it keeps working even if the app isn't opened for weeks.
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
src/data/duas.js           duas by purpose
src/lib/history.js         daily history, streaks
src/lib/recommend.js       key validation, recommendations
src/lib/storage.js         settings/progress storage with validation
src/lib/qibla.js           Qibla bearing and distance
src/lib/widget.js          writes prayer times for the iOS widget
targets/prayer-widget/     the iOS widget (SwiftUI / WidgetKit)
src/screens/               Onboarding, Counter, Library, Duas, History, Schedule, Qibla
assets/                    icon, adaptive icon, splash, notification icon
```

---

## 1. Run it on your phone (about 10 minutes)

You need [Node.js](https://nodejs.org) 22.13 or newer (an even-numbered version: 22, 24 or 26) on your computer.

```bash
git clone https://github.com/nomanriaz29-spec/misbaha
cd misbaha
npm install
npx expo install --fix      # pins every package to the version tested with Expo SDK 58
npx expo start
```

Install **Expo Go** from the App Store or Play Store and scan the QR code.

> **Notifications in Expo Go:** Local notifications mostly work in Expo Go, but the background refresh does not run there. To test everything exactly as users will get it, make a preview build (step 3) and install that.

## 2. Before you publish, change these

In `app.json`:

- `ios.bundleIdentifier` and `android.package`: this is set to `com.nomanriaz.misbaha`. **You cannot change these after the first store release.**
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
3. **Data safety form:** declare *Approximate location*: collected, *processed ephemerally*, *not shared*, purpose *App functionality*. The Android city-name lookup goes through Google's geocoder, so declaring it is the safe choice. Declare nothing else. There is no account, so answer *no* to data deletion requests.
   **Content rating:** answer the questionnaire. Everything is "no", which gives a rating of Everyone / 3+.
4. **Privacy policy URL:** host `PRIVACY.md` somewhere public. A free GitHub Pages or Notion page works.
5. **Exact alarms:** the app requests `SCHEDULE_EXACT_ALARM` so the azan plays at the exact prayer time. In Play Console's **App content → Exact alarm** declaration, choose that the app delivers time-critical alerts the user turns on (prayer times). On Android 14 and later, users allow it under Settings → Apps → Misbaha → Alarms & reminders, and the app links there from Prayers. The app never requests background location.
6. New personal developer accounts must run a **closed test with at least 12 testers for 14 days** before Google allows a production release. Check the current rule in Play Console.
7. Upload with `npm run submit:android`, or drag the `.aab` into Play Console.

### Apple App Store
1. Join the [Apple Developer Program](https://developer.apple.com/programs/). It costs US$99 per year.
2. Create the app in [App Store Connect](https://appstoreconnect.apple.com) with the same bundle ID as in `app.json`.
3. Add screenshots for 6.9" and 6.5" iPhones, a description, keywords and a privacy policy URL.
4. **App Privacy:** choose *Data Not Collected*. Location is used only on the phone and never sent to you. **Age rating:** 4+.
5. Run `npm run submit:ios`, then submit for review in App Store Connect. Test with TestFlight first.

## Test on an iPhone

**Quick look, free, no Apple account (about 5 minutes).** Install **Expo Go** from the App Store. On your computer, in the project folder, run `npx expo start --tunnel` and scan the QR code with the iPhone camera. Everything works except the widget and the background refresh, which need a real build.

**Full test including the widget (needs the Apple Developer Program, US$99/year):**
1. Join at [developer.apple.com/programs](https://developer.apple.com/programs/) and wait for approval (often 1–2 days).
2. Register your iPhone: `npm run register-iphone`. Open the link it prints on the iPhone and install the profile it offers.
3. On the iPhone: Settings → Privacy & Security → **Developer Mode** → on, then restart.
4. Build: `npm run build:ios:test`. Sign in with your Apple ID when asked, and let EAS create the certificates and profiles. It also sets up the widget's App Group.
5. When the build finishes, open its link on the iPhone and tap **Install**.
6. Open Misbaha once so it saves the prayer times. Then long-press the home screen → **+** → search **Misbaha** → add the widget. For the lock screen: long-press the lock screen → Customize → Lock Screen → add widget.

To test with friends instead, build with `npm run build:ios` and send it to **TestFlight** with `npm run submit:ios`.

## Security

See [SECURITY.md](SECURITY.md) for the security review and the checks to run before every release.

## 5. Updating the app later

**Build numbers are automatic.** EAS keeps the iOS build number and Android version code on its servers (`appVersionSource: remote`) and raises them on every production build. You never edit `buildNumber` or `versionCode`. To release a new store version, change only `"version"` in app.json (for example 1.0.0 → 1.1.0).

**Over-the-air updates (EAS Update).** Changes to JavaScript, text, duas, layout and colours can go straight to installed apps without a new store review:

```bash
npx expo install expo-updates   # one time only
npm run update -- "Fix typo in evening adhkar"
```

The app downloads the update the next time it opens and uses it on the launch after. Use `npm run update:preview -- "message"` to send it only to preview/TestFlight builds first.

Updates can't change native parts: new packages, permissions, sounds, icons, the widget, or app.json plugins. Those need a new `eas build` and store upload. The runtime version uses Expo's *fingerprint* policy, which detects native changes automatically and won't send an update to a build that can't run it.

### Editing content

- To add or edit adhkar, change `src/data/adhkar.js`. To change the daily reminder times, edit `DAILY` in that file.

## Notes on accuracy

Prayer times are calculated, not fetched from a mosque. They usually match published timetables within 1–3 minutes. Users can choose a different method under **Prayers → Calculation** if their local mosque follows another convention.
