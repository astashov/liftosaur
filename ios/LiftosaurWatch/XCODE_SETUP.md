# LiftosaurWatch — Xcode setup steps

The watch source files have been copied into `ios/LiftosaurWatch/`. The Xcode target itself needs to be created via the Xcode UI (hand-editing `project.pbxproj` is fragile).

## 1. Add the watchOS target

1. Open `ios/Liftosaur.xcworkspace` in Xcode.
2. File → New → Target… → **watchOS → App**. Name it `LiftosaurWatch`.
3. Bundle identifier: `com.liftosaur.www.watchkitapp` (must match the App Store record from the old project).
4. Interface: **SwiftUI**. Language: **Swift**.
5. Uncheck "Include Tests" and "Include Notification Scene" (we have our own).
6. When prompted, activate the new scheme.

Xcode will create a stub `LiftosaurWatch/` folder with default `App.swift` / `ContentView.swift`. **Delete** these stub files (move to trash) so the pre-copied real sources can take their place.

## 2. Wire up the pre-copied source files

In Xcode's Project Navigator:

1. Right-click the new `LiftosaurWatch` group → **Add Files to "Liftosaur"…**
2. Select **all files** from `ios/LiftosaurWatch/` on disk:
   - `LiftosaurWatchApp.swift`, `ContentView.swift`, `LiftosaurColor.swift`, `WatchLayout.swift`
   - `Engine/` (12 files)
   - `Views/` (10 files)
   - `Models/WatchModels.swift`
   - `Assets.xcassets`
3. **Uncheck "Copy items if needed"** (they're already in place).
4. Target Membership: tick **LiftosaurWatch** only, untick the main app.
5. For `Info.plist` and `LiftosaurWatch.entitlements`, set them as the watch target's plist/entitlements file in Build Settings (Info.plist File / Code Signing Entitlements).

## 3. Add the QuickJSCore SPM dependency

The watch app's `LiftosaurEngine.swift` depends on the local QuickJS package, which has been copied to `ios/Packages/QuickJSCore/`.

1. File → Add Package Dependencies… → **Add Local…** → select `ios/Packages/QuickJSCore`.
2. Add the `QuickJSCore` product to the **LiftosaurWatch** target only.

## 4. Capabilities

Select the LiftosaurWatch target → Signing & Capabilities:

- **HealthKit** (already in the entitlements file).
- Development team: same as the main app.

## 5. Embed in main app

Xcode does this automatically when you create a watchOS app target inside an iOS project: a "Embed Watch Content" build phase is added to the `Liftosaur` target. Verify it's there.

## 6. Build & run

- Scheme `LiftosaurWatch` → run on watchOS simulator paired with the iPhone simulator running the main app.
- The main app TurboModule `LiftosaurWatch` activates `WCSession` on first JS subscription; the watch's `WatchConnectivityManager` handshakes from its side automatically.

## 7. Verify

- Launch main app on paired iPhone simulator; sign in.
- Launch LiftosaurWatch on the Watch simulator.
- Watch should request storage (event `requestStorage` is emitted to JS, which responds with `NativeWatchBridge_sendStorageToWatch` carrying filtered storage).
- Start a workout on the watch, complete a set; the phone should receive a `watchStorageMerge` event and `Thunk_handleWatchStorageMerge` should merge the new state into Redux.

## Known follow-ups (out of scope for this migration)

- Auth: the watch's `requestAuth` is currently answered with `sendNoAuth` because the new RN app uses a different auth storage than the old WebView cookie store. Wire `NativeWatchBridge_sendAuthToWatch` into the existing auth-completion thunks once the RN auth flow is finalized.
- `updateLiveActivity` / `syncRestTimer` / `endWorkout` events from the watch are emitted but not yet routed to the new Live Activity TurboModule — wire these into `App.native.tsx` alongside the existing live-activity logic as needed.
