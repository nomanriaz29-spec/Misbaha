# Ratb — Tasbeeh counter with prayer reminders

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
- **Home-screen widgets on Android and iPhone.** Prayers → Home screen widgets lists them; on Android the **Add** button puts one on the home screen in one tap.
  - Android: **Prayer times** (4×2, next prayer + today's five times), **Today's prayers** (2×2, all five times), **Next prayer** (2×1), **Verse of the day** (4×2). All resize, follow light/dark mode and the app language, and open the app when tapped. Android refreshes them every 30 minutes and whenever the app opens, so the highlighted "next" prayer can trail the real time by up to 30 minutes; the times themselves are always right.
  - iPhone: **Prayer times**, **Today's prayers** (small square with all five times, or the next three on the lock screen) and **Verse of the day**.
- **iOS prayer widget** ([preview](docs/widget-preview.png)) for the home screen (small and medium) and the lock screen (inline, rectangular and circular). It shows the next prayer, a live countdown and today's five times. The app saves 30 days of times for it, so it keeps working even if the app isn't opened for weeks.
- **Verse of the day widget** (iOS: small, medium, large and lock screen). Each day at midnight it shows a new verse in Arabic with its meaning in the app's language (English or Urdu; Arabic shows the verse alone). Verses come from a hand-picked list of 142 that stand on their own (duas, mercy, patience, gratitude); the list runs through fully before any verse repeats, and everyone sees the same verse on the same day. Tapping it opens that verse in the Quran reader. The app saves 30 days ahead, so it keeps changing even if the app isn't opened. Add verses in `src/lib/verseOfDay.js`.
- **Salah tracker.** Tick each of the five prayers once prayed: in History (any past day too), in the Prayers times grid, with the **Prayed ✓** button on each prayer notification (works without opening the app), or on the widgets. Shows today's count, a streak of days with all five, this week out of 35 and the last 7 days.
  - Widgets: iPhone small/medium (tap a prayer on the widget to tick it, iOS 17) and lock screen (dots, or a ring with n/5); Android 4×1 (tap to tick). Ticks made on the iPhone widget are merged into the app when it next opens; the newest tick wins.
- **My mosque** (Prayers → My mosque). Finds the closest mosques from OpenStreetMap (only when you tap the button; the location is rounded to ~1 km), or you type the name. Set each jamaat as minutes after the azan or a fixed time, plus a Jumu'ah time for Fridays. Jamaat times show in the prayer grid, and an optional reminder comes 10–30 minutes before each jamaat. Calculated azan times were checked against published timetables for Lahore and Karachi (within a few minutes); the differences between Lahore mosques are their own jamaat times and schools, which this setting covers.
- **Notification check** (Prayers): how many reminders the phone is holding and the next one, any scheduling error, and a "Send a test notification" button, plus what to check in iPhone Settings if alerts don't arrive.
- **Your own dhikr** (Adhkar → Your dhikr → Add). Name, optional Arabic and meaning, and a target of 33, 100, 1000, none or any number. They count, show in history and can be edited or deleted; up to 50.
- **Quran reader** (Quran button). All 114 surahs in the Tanzil Simple Arabic text, with English (Pickthall) or Urdu (Jalandhry) translation that can be hidden, adjustable text size, search by name or number, "continue reading", and bookmarks (long-press a verse). On Fridays a Surah al-Kahf card appears at the top. Works fully offline.
- **Islamic calendar.** The Hijri date sits under the counter (Umm al-Qura, adjustable ±2 days for local moon sighting). Optional reminders: **Friday** Surah al-Kahf and salawat at 10:00 (tapping opens al-Kahf), **white days** the evening before the 13th of each Hijri month, and **Ramadan mode**, which shows the iftar or suhoor countdown on the counter and sends a suhoor reminder 30 minutes before Fajr.
- **Pocket mode** for counting without looking: a black full-screen counter where any tap counts, with a tap vibration on each count, a long double buzz every 33 and a success buzz at the target. Press and hold to leave. (Counting with the volume buttons isn't allowed on iPhone by App Store rule 2.5.9, so this is the alternative.)
- **English, Arabic and Urdu** (Prayers → Language, or follow the phone). Arabic and Urdu switch the whole layout to right-to-left, and the app restarts once to apply it. Notifications, routines, duas and the widget follow the chosen language.
- **Apple Watch app** (in `targets/watch/`, part of the iPhone app from version 1.1). Tap or turn the Digital Crown to count, with haptics; the routines step through on their own.
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
targets/watch/             the Apple Watch app (SwiftUI), built into the iPhone app
ci/WidgetSnapshot.swift    widget tests run on an iOS simulator by GitHub Actions
src/i18n/                  English, Arabic and Urdu text (en.js, ar.js, ur.js, content.js)
src/lib/hijri.js           Hijri date (Umm al-Qura table)
src/lib/quran.js           Quran data loading, bookmarks
src/lib/custom.js          your own dhikr
src/data/quran/            Quran text and translations (Tanzil)
src/screens/               Onboarding, Counter, Library, CustomEditor, Duas, Quran, History, Schedule, Qibla
src/components/            Sheet, PocketMode
src/widgets/model.js       what every widget shows (shared by Android and tests)
src/widgets/android/       Android home-screen widgets (react-native-android-widget)
assets/widget-preview/     pictures shown in Android's widget picker
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
- `name` if you want a different store name. "Ratb" may already be taken on the stores.

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
5. **Exact alarms:** the app requests `SCHEDULE_EXACT_ALARM` so the azan plays at the exact prayer time. In Play Console's **App content → Exact alarm** declaration, choose that the app delivers time-critical alerts the user turns on (prayer times). On Android 14 and later, users allow it under Settings → Apps → Ratb → Alarms & reminders, and the app links there from Prayers. The app never requests background location.
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
6. Open Ratb once so it saves the prayer times. Then long-press the home screen → **+** → search **Ratb** → add the widget. For the lock screen: long-press the lock screen → Customize → Lock Screen → add widget.

To test with friends instead, build with `npm run build:ios` and send it to **TestFlight** with `npm run submit:ios`.

## Apple Watch

The watch app's code is in `targets/watch/` and ships inside the iPhone app from version 1.1. Every push compiles it for watchOS 10 on GitHub and takes App Store screenshots of it on a watch simulator (`ci/WatchShots.swift`; the PNGs land in `watch/` on the `ci-widget-snapshots` branch).

To release it:

1. Run `npx expo prebuild --clean` if you build locally, then `eas build -p ios --profile production`. The first time, EAS asks to create the watch app's bundle ID (`com.nomanriaz.misbaha.watchkitapp`); say yes.
2. In App Store Connect, create version 1.1, attach the new build, and add the watch screenshots under Apple Watch.

The watch app counts on its own (counts reset each day). It does not sync with the phone yet.

## Widget tests

`.github/workflows/ios-check.yml` runs on every push to `main`. It compiles the widget and the watch app with Xcode, then runs `ci/WidgetSnapshot.swift` on an iPhone simulator: it checks the data the app writes, the next-prayer logic (including after Isha and when the saved days run out), Arabic labels, and renders every widget size. The pictures land on the `ci-widget-snapshots` branch.

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
