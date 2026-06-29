# iOS Setup & Release Handoff

The `ios/` Capacitor project is scaffolded and committed. The web build is the
source of truth; the native shell wraps it. Everything below the first section
needs **macOS + Xcode** and your Apple Developer account — it can't be done in
the Linux CI/dev container.

App identity (already set in `capacitor.config.ts` and the Xcode project):

- **App name:** Tally
- **Bundle ID:** `com.glp1companion.app`

---

## What's already wired (no action needed)

- iOS platform scaffolded (`ios/`), committed to git. The inner `ios/.gitignore`
  excludes `Pods/`, `build/`, the copied web assets (`App/App/public`), and the
  generated `capacitor.config.json` / `config.xml`.
- `Info.plist` usage strings for **Photo progress** (the only feature that touches
  a native capability today):
  - `NSCameraUsageDescription` — take a progress photo
  - `NSPhotoLibraryUsageDescription` — choose a progress photo
- Local notifications (reminders) — `@capacitor/local-notifications` needs no
  entitlement; the user grants permission at runtime.

## Standard build loop (your Mac)

```bash
npm ci
npm run build          # produces dist/
npx cap sync ios       # copies dist/ into ios/ and runs pod install
npx cap open ios       # opens App.xcworkspace in Xcode
```

Then in Xcode → **Signing & Capabilities**: select your Team, confirm the bundle
ID `com.glp1companion.app`, and let Xcode manage signing. Pick a device/simulator
and Run. Re-run `npx cap sync ios` after every web change.

> First run on a Mac without CocoaPods: `sudo gem install cocoapods` (or
> `brew install cocoapods`), then `npx cap sync ios`.

---

## Gated follow-ups (do these when you tackle each feature)

These are **deliberately not** in the project yet. Declaring an entitlement for a
capability the app doesn't actually call is a common App Store rejection, so each
goes in only when its code path is real.

### 1. HealthKit (weight sync) — `src/lib/health.ts`

`health.ts` is currently a native-gated scaffold; it does not query HealthKit yet.
When you wire a real HealthKit plugin:

1. Add a HealthKit Capacitor plugin (a dependency decision — confirm first).
2. Xcode → Signing & Capabilities → **+ Capability → HealthKit**.
3. Add to `Info.plist`:
   - `NSHealthShareUsageDescription` — "Tally reads your weight readings so you
     don't have to type them in." (read access only; we don't write to Health)
4. The HealthKit entitlement requires a provisioning profile that includes it —
   Xcode-managed signing handles this once the capability is added.

### 2. Remote push / APNs — `src/lib/notify.ts`

The reminder feature uses **local** notifications (no APNs needed). Remote push
registration exists in code but is gated. When you turn it on:

1. Apple Developer portal → **Keys** → create an APNs Auth Key (`.p8`); note the
   Key ID and Team ID. Wire it into your push provider.
2. Xcode → Signing & Capabilities → **+ Capability → Push Notifications**.
3. Xcode → **+ Capability → Background Modes** → check **Remote notifications**.
4. Confirm `AppDelegate.swift` forwards the APNs token to Capacitor (the
   `@capacitor/push-notifications` docs cover the `didRegisterForRemoteNotifications`
   hooks).

### 3. In-app purchase / subscription (deferred by decision)

The billing core already has an `apple_iap` channel, but no StoreKit library is
wired. When ready:

1. App Store Connect → create the app record (bundle ID `com.glp1companion.app`),
   then create the subscription product(s) and note the product IDs.
2. Choose + add a StoreKit library (RevenueCat or `@capacitor-community/in-app-purchases`)
   — a dependency decision; confirm first. Build the adapter that calls the core's
   `applyPurchase(...)` on a confirmed transaction, and wire **Restore Purchases**.
3. Xcode → **+ Capability → In-App Purchase**.
4. Test with a StoreKit configuration file / sandbox tester before submitting.

### 4. App icon & launch screen

The scaffold ships placeholder icon/splash assets. Replace
`ios/App/App/Assets.xcassets/AppIcon.appiconset/` and `Splash.imageset/` with the
Tally brand assets (see `docs/brand/`) before submitting.

---

## App Store submission checklist (high level)

- App icon + screenshots for required device sizes
- Privacy "nutrition label" in App Store Connect — disclose: progress photos and
  health/weight data are stored **on device** and not transmitted
- Privacy policy URL
- If compounded mode or any clinical content ships: complete the legal/clinician
  review first (tracked separately)
