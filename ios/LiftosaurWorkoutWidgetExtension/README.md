# Liftosaur Workout Widget Extension — Xcode setup

This folder holds the source for the **Live Activity / Widget** target. The Swift files,
Info.plist, entitlements, and asset catalog are checked in, but the Xcode target
itself must be created manually before the project can build.

## 1. Add the Widget Extension target

1. Open `ios/Liftosaur.xcworkspace` in Xcode.
2. File → New → Target… → **Widget Extension**.
3. Settings:
   - Product Name: `LiftosaurWorkoutWidgetExtension`
   - Bundle Identifier: `<your_app_bundle_id>.LiftosaurWorkoutWidgetExtension`
   - Team: same as `Liftosaur`
   - Language: Swift
   - **Include Live Activity**: ✅ on
   - Configuration Intent: ❌ off (we use custom AppIntents)
   - Embed in Application: `Liftosaur`
4. When Xcode finishes generating, **delete the auto-generated `LiftosaurWorkoutWidgetExtension`
   group** from the Project Navigator (move all generated `.swift`/`.plist`/`.entitlements`
   files to Trash). Keep the target itself.

## 2. Add this folder to the new target

1. Right-click the project, **Add Files to "Liftosaur"…**
2. Select the entire `ios/LiftosaurWorkoutWidget` folder. Options:
   - Copy items if needed: ❌ off (folder is already in the right place)
   - Create groups
   - Add to targets: **only** `LiftosaurWorkoutWidgetExtension`
3. After adding, verify file membership in the File Inspector — every `*.swift`,
   `Info.plist`, the `.entitlements`, and `Assets.xcassets` should be on
   `LiftosaurWorkoutWidgetExtension` (not on `Liftosaur`).

## 3. Share `WorkoutAttributes.swift` between targets

`ios/Liftosaur/WorkoutAttributes.swift` is the shared `ActivityAttributes` definition.
Both the main app and the widget extension must compile it.

1. Click `ios/Liftosaur/WorkoutAttributes.swift` in the navigator.
2. In the File Inspector → Target Membership, check **both**:
   - `Liftosaur`
   - `LiftosaurWorkoutWidgetExtension`

## 4. Build Settings on `LiftosaurWorkoutWidgetExtension`

- **Info.plist File**: `LiftosaurWorkoutWidget/Info.plist`
- **Code Signing Entitlements**: `LiftosaurWorkoutWidget/LiftosaurWorkoutWidgetExtension.entitlements`
- **Other Swift Flags** (Debug + Release): add `-DWIDGET_EXTENSION`
- **iOS Deployment Target**: 16.2 (or higher)
- **Asset Catalog Compiler — Name**: leave the default (uses
  `LiftosaurWorkoutWidget/Assets.xcassets`)

## 5. Signing & Capabilities (both targets)

On **Liftosaur** and **LiftosaurWorkoutWidgetExtension**:
- Signing & Capabilities → **+ Capability** → **App Groups**
- Add `group.com.liftosaur.workout`

The `Liftosaur.entitlements` and `LiftosaurWorkoutWidgetExtension.entitlements` already
list this group — Xcode will pick it up automatically. If Xcode complains it can't
find the group on your developer account, create it at
[Apple Developer → Identifiers → App Groups](https://developer.apple.com/account/resources/identifiers/list/applicationGroup).

## 6. Verify the Embed Foundation Extensions phase

The `Liftosaur` target should have a build phase **"Embed Foundation Extensions"**
that copies `LiftosaurWorkoutWidgetExtension.appex`. Xcode adds this automatically
when you check "Embed in Application: Liftosaur" in step 1; double-check it exists.

## 7. Refresh CocoaPods

```bash
cd ios && pod install
```

## 8. First build

```bash
xcodebuild -workspace ios/Liftosaur.xcworkspace \
  -scheme Liftosaur \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  build
```

## 9. Smoke test

Run the app on a device or simulator (iOS 16.2+):

1. Start a workout.
2. Lock the screen → a Live Activity should appear with current set / target / rest timer.
3. Tap **+15s / -15s** on the activity. The timer adjusts. (Native polls the
   App Group UserDefaults every 0.5s, emits `onLiveActivityAction` to JS, and JS
   dispatches `Thunk_updateTimer`.)
4. Tap the set-card toggle when `canCompleteFromLiveActivity` is true. The set
   completes, the activity advances.
5. End / discard the workout → the activity ends immediately.

## Notes

- The polling timer in `LiftosaurLiveActivityImpl.swift` writes `appHeartbeat` to the
  App Group's UserDefaults every 0.5s while a Live Activity is active. The widget's
  `checkAndEndActivityIfAppKilled()` (in `WorkoutIntents.swift`) uses that heartbeat
  to terminate stale activities if the app was killed.
- The `WIDGET_EXTENSION` Swift flag toggles the `Button(intent:)` paths in
  `LiveActivityViews.swift` (only valid inside the extension target).
- The unused intents (`OpenWorkoutIntent`, watch sync) from the old app's flow are
  still in `WorkoutIntents.swift` — they currently store the same `completeSet*` keys
  the timer polling drains. No additional wiring needed.
