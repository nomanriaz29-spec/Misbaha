# Security review

_Reviewed 7 November 2026, covering commit "Security hardening and daily history"._

Misbaha has a small attack surface. It has no server, no accounts, no network requests of its own, no payments, no web views and no third-party SDKs. The risks are mostly about **privacy**, **stability against bad saved data** and **supply chain**. Each area below was checked.

## Fixed in this review

| Area | Finding | Fix |
|---|---|---|
| Saved data | Settings, progress and the routine key were read from storage without checks. A stale key after an update (for example a removed dua) or a corrupted file would crash the app on every launch. | Everything read from storage is validated (`storage.js`, `history.js`). Unknown keys, out-of-range numbers and bad coordinates are dropped and replaced with safe defaults. Keys are checked with `hasOwnProperty`, so `__proto__` or `constructor` can't slip through. |
| Notification taps | The routine named in a notification was used without checking it. | It is now checked with `isValidKey` before use. The same check runs on every routine change. |
| Location precision | The exact GPS position was stored. | It is rounded to about 1 km before it is used or saved. That is enough for prayer times (seconds of difference) and the Qibla bearing. |
| Android permissions | The app requested precise location and exact alarms, which it doesn't need. | Only coarse location is requested. `blockedPermissions` strips fine location, background location, exact alarms, overlay and microphone, even if a library tries to add them. |
| Privacy policy | It said location is never sent to any third party, but the city-name lookup uses Apple's or Google's geocoder. | The policy now states this. The store data-safety guidance in the README matches it. |

## Checked and fine

- **No secrets in the repo.** No API keys or tokens exist. `.gitignore` excludes keystores, `.p8`/`.p12` certificates, provisioning profiles and `.env` files.
- **Network.** The app makes no HTTP requests. Prayer times, Qibla and duas are calculated or bundled offline. The only network use is the OS geocoder mentioned above.
- **Notifications** are local only, with no push tokens and no server. Their text contains no personal data.
- **Location** is requested only while the app is in use (iOS "When In Use"). It is never used in the background, and the background task only reschedules notifications.
- **Storage** contains no sensitive data (counts, settings, a city-level location), so AsyncStorage is appropriate. Encrypted storage isn't needed.
- **Deep links.** The `misbaha://` scheme has no handler that acts on link content, so a malicious link can only open the app.
- **Web preview.** All text placed into the page is escaped or set with `textContent`, and saved state is validated on load.
- **Repository** is private.

## Before every release

1. `npx expo install --fix`, then commit `package-lock.json`. Pinned, locked versions protect against a compromised or broken package update. `package.json` currently uses `*` placeholders until this is run once.
2. `npm audit --omit=dev`, then fix anything rated high or critical.
3. Keep your Expo, Apple and Google accounts on two-factor authentication. Let EAS manage signing keys. Never commit a keystore.
4. Run `npx expo-doctor` and fix any warnings.

## Reporting a problem

Email noman.riaz29@gmail.com with details. Please don't open a public issue for a security problem.
