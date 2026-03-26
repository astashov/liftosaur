---
name: migrate-screen-rn
description: One iteration of visual convergence - screenshots the web app and RN app, compares them, fixes the top issues. Run repeatedly until the screens match. Each run is self-contained (fresh context).
argument-hint: [screen-name-or-url-path] [optional: specific area like "sets table" or "header"]
---

# Migrate Screen to React Native — Single Iteration

Target: $ARGUMENTS

This is ONE iteration of a visual convergence loop. Each run:
1. Screenshots the existing web app (reference)
2. Screenshots the RN app on iOS simulator (current state)
3. Compares them visually
4. Identifies the top 3-5 most impactful differences
5. Fixes them in the crossplatform components
6. Ends (run again for the next iteration)

## Web Compatibility Constraint

ALL components must work with **react-native-web**. This means:
- Only use react-native primitives that react-native-web supports (View, Text, Pressable, TextInput, FlatList, ScrollView, Modal, Image, Animated, PanResponder, Platform, Alert, useWindowDimensions, etc.)
- Use `className` for Tailwind styling (NativeWind on native, standard Tailwind CSS on web)
- Use `react-native-svg` for icons (web shim exists at `crossplatform/web/react-native-svg.tsx`)
- Do NOT use native-only libraries without web fallbacks
- When choosing dependencies, prefer ones with react-native-web support
- For platform-specific behavior, use `Platform.OS === "web"` checks
- For confirmations: `Alert.alert()` on native, `window.confirm()` on web

## Step 1: Get Web Reference Screenshot

Read `localdomain.js` to get the domain prefix. Web app URL pattern:
```
https://{main}.liftosaur.com:{port}/app
```

Use Playwright MCP:
1. `mcp__playwright__browser_navigate` to the URL
2. `mcp__playwright__browser_snapshot` to see page structure
3. Navigate to the target screen (interact as needed — tap buttons, scroll)
4. `mcp__playwright__browser_take_screenshot` — this is the REFERENCE

If focusing on a specific area (e.g., "sets table"), scroll/navigate to show that area prominently.

## Step 2: Get RN App Screenshot

Use mobile-mcp:
1. `mcp__mobile-mcp__mobile_take_screenshot` to see current state
2. If not on the right screen, use `mcp__mobile-mcp__mobile_list_elements_on_screen` and `mcp__mobile-mcp__mobile_click_on_screen_at_coordinates` to navigate
3. Take the screenshot showing the same content/state as the web reference

## Step 3: Compare and Identify Issues

With both screenshots visible, identify differences in priority order:

**P0 — Missing/broken functionality:** Actions that don't work, missing modals, non-functional inputs
**P1 — Missing elements:** Components, sections, or text that exist on web but not RN
**P2 — Layout:** Wrong alignment, spacing, sizing, flex direction
**P3 — Visual:** Wrong colors, fonts, borders, rounded corners, icons

Pick the **top 3-5 most impactful issues** to fix in this iteration. Don't try to fix everything at once.

## Step 4: Fix the Issues

For each issue:
1. Read the Preact source to understand the intended behavior (files in `src/components/`)
2. Read the crossplatform RN component that needs fixing (files in `crossplatform/components/`)
3. Make targeted changes

### Preserve Component Structure
When migrating from Preact to RN, mirror the original component hierarchy as closely as possible:
- Use the **same component names** (e.g., if Preact has `ExerciseSetView`, the RN version should be `ExerciseSetView`, not `SetRow` or `WorkoutSet`)
- Maintain the **same parent→child nesting** — if Preact splits a screen into `Header`, `ExerciseList`, `ExerciseCard`, `SetRow`, keep that breakdown rather than flattening or restructuring
- Keep **props interfaces similar** — same prop names and shapes where feasible
- If a Preact component maps 1:1 to a crossplatform component, name the file the same (e.g., `src/components/WorkoutHeader.tsx` → `crossplatform/components/WorkoutHeader.tsx`)
- Only deviate from the original structure when React Native constraints make it necessary (e.g., FlatList requiring a different data flow)

### Key Directories
- `crossplatform/components/` — crossplatform RN components (modify these)
- `crossplatform/components/icons/` — SVG icons using react-native-svg
- `native/src/screens/` — RN screen orchestrators
- `native/src/components/` — RN-only components (e.g., LineChart, graph wrappers, modal sheets)
- `src/components/` — Preact originals (READ ONLY, use as reference)
- `src/models/`, `src/utils/` — shared business logic (import via `@shared/`, don't modify)

### TypeScript: Avoid `any`
- **Never use `any`** unless there is genuinely no other option. Prefer `unknown`, generics, or concrete types.
- When importing from `@shared/`, use the actual types from `@shared/types` or the relevant module — don't cast to `any`.
- For event handlers, use the correct React Native event types (e.g., `GestureResponderEvent`, `NativeSyntheticEvent<TextInputChangeEventData>`).
- For dynamic data, use `unknown` and narrow with type guards instead of `any`.
- If a third-party library lacks types, write a minimal type declaration rather than using `any`.
- `as any` casts are a code smell — if you need one, add a comment explaining why no better option exists.

### Component Patterns
```tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { someFunction } from "@shared/models/someModel";
import { SomeIcon } from "./icons/SomeIcon";

// Use className for Tailwind (works on both web via Tailwind CSS and native via NativeWind)
<View className="flex-row items-center px-4 py-2 bg-background-default">
  <Text className="text-sm font-semibold text-text-primary">Hello</Text>
</View>
```

### State Update Patterns
```tsx
import { updateProgress, updateState, updateSettings } from "@shared/models/state";
import { lb } from "lens-shmens";
import type { IHistoryRecord } from "@shared/types";

// Update progress (current workout)
updateProgress(dispatch, [
  lb<IHistoryRecord>().pi("ui").p("currentEntryIndex").record(index)
], "description");

// Dispatch actions
dispatch({ type: "CompleteSetAction", setIndex, entryIndex, ... });
```

### Styling: Always Use NativeWind (className), Not StyleSheet
- **Always** use `className` with Tailwind classes for styling. Never use `StyleSheet.create` — the codebase uses NativeWind which maps Tailwind classes to native styles.
- Use semantic color classes: `text-text-primary`, `text-text-secondary`, `text-text-link`, `bg-background-default`, `bg-background-neutral`, `border-border-neutral`, etc.
- For colors not available as Tailwind classes (e.g., dynamic chart colors), use the `style` prop with `Tailwind_semantic()` / `Tailwind_colors()` from `@shared/utils/tailwindConfig`.

### Avoid Unnecessary useMemo / useCallback
- Only use `useMemo` when computing from large datasets (e.g., sorting/filtering all history records, running collectors over history). Do NOT wrap small static derivations, simple object literals, or handler functions in `useMemo`/`useCallback`.
- Inline event handlers directly in JSX when the handler is simple (e.g., `onPress={() => dispatch({ type: "Foo" })}`).
- `dispatch` from context never changes — don't put it in dependency arrays or wrap handlers that only use it.
- `renderItem` for FlatList: a plain function is fine; wrapping in `useMemo` is premature optimization.
- When in doubt, don't memoize. Only add memoization when you have evidence of a performance problem.

### Charts and Graphs (LineChart Component)

The Graphs screen uses a custom SVG chart (`native/src/components/LineChart.tsx`) instead of a third-party library. Key decisions and patterns:

**Why custom?** No RN chart library supports pinch-to-zoom + react-native-web + reasonable bundle size. Victory Native XL requires Skia (~3MB WASM on web). react-native-gifted-charts lacks pinch zoom. So we built a custom chart using `react-native-svg` + `react-native-gesture-handler`.

**Architecture:**
- `LineChart.tsx` — Core SVG chart with gesture support (pinch zoom, cursor tracking, axes, grid, series, vertical overlay lines)
- `GraphExercise.tsx` / `GraphMuscleGroup.tsx` / `GraphStats.tsx` — Wrapper components that prepare data and render tooltips
- `src/models/graphData.ts` — Shared pure functions for data computation (used by both web/Preact and RN)

**Gesture handling pattern — use `.runOnJS(true)`, not Reanimated:**
```tsx
// CORRECT: gestures run on JS thread, no Reanimated needed
const pinchGesture = Gesture.Pinch()
  .runOnJS(true)
  .onStart((e) => { /* direct setState here */ })
  .onUpdate((e) => { /* direct setState here */ });

const panGesture = Gesture.Pan()
  .runOnJS(true)
  .minPointers(1)
  .maxPointers(1)
  .onStart((e) => { setCursorIndex(findNearest(e.x)); });
```
Since SVG re-renders on the JS thread anyway, there is zero benefit to running gesture callbacks on the UI thread. Using `.runOnJS(true)` avoids the entire `useSharedValue` → `useAnimatedReaction` → `runOnJS` chain. Do NOT import `runOnJS` from `react-native-reanimated` (deprecated) or `react-native-worklets` for chart gestures.

**Pinch zoom state — use `useRef`, not shared values:**
```tsx
// Mutable state that doesn't need re-render during pinch
const pinchState = React.useRef({ focalX: 0, startXMin: 0, startXMax: 0 });
```

**Scale math — plain functions, no d3:**
```tsx
const toPixelX = (val: number): number => ((val - xMin) / (xMax - xMin)) * plotWidth + PADDING_LEFT;
const toValueX = (px: number): number => ((px - PADDING_LEFT) / plotWidth) * (xMax - xMin) + xMin;
```

**Extract shared data functions** to `src/models/graphData.ts` (imported as `@shared/models/graphData`) so both the web Preact components and RN components can use them. Example: `GraphData_exerciseData()`, `GraphData_weightStats()`, `GraphData_xRange()`.

### Adding New Screens

Pattern for registering a new native RN screen:
1. Create screen in `native/src/screens/FooScreen.tsx`
2. Register in `native/src/screens/registerScreens.ts`: `MigratedScreens_register("foo", FooScreen as IScreenComponent)`
3. Screen name must exist in `native/src/navigation/screenMap.ts` (`IScreenName` type)
4. For modal sheets: add to `AppNavigator.tsx` as a `RootStack.Screen` with `presentation: "formSheet"`

## Step 5: Verify (Optional)

If time permits, re-screenshot the RN app after fixes to verify improvement. Otherwise, the next invocation will capture the new state.

## Step 6: Persist Progress

Since context is cleared between runs, write the iteration summary to a persistent file so the next invocation knows what was done and what remains.

**Progress file:** `crossplatform/MIGRATE_PROGRESS.md`

At the end of each iteration, read the existing file (if any), then **append** a new entry:

```markdown
## Iteration N — YYYY-MM-DD HH:MM

### Fixed
- [what was fixed, with file paths]

### Remaining issues (priority order)
- [P0] ...
- [P1] ...
- [P2] ...

### Notes
- [any context the next iteration needs, e.g. "the AMRAP modal needs the edit target sheet wired up first"]
```

### Signaling completion

If after comparing the screenshots you determine there are **no meaningful remaining differences** (all functionality works, layout matches, colors/spacing are correct), write this as the LAST line of `crossplatform/MIGRATE_PROGRESS.md`:

```
<!-- STATUS: COMPLETE -->
```

The loop runner script checks for this line to know when to stop automatically.

## Step 0 (Start of Each Run): Read Progress

At the **very start** of each invocation, before taking screenshots, read `crossplatform/MIGRATE_PROGRESS.md` to understand:
- What was already fixed (don't re-investigate solved issues)
- What the previous iteration flagged as remaining (prioritize these)
- Any notes/context from prior runs

If the file doesn't exist, this is the first iteration — start from scratch.

## Step 7: Code Quality Review (Subagent)

After fixing issues in Step 4, launch a **background subagent** to independently review all files you changed in this iteration. The subagent should check for:

- **No `any` types** — flag every `any` and suggest a concrete type, `unknown`, or generic
- **Modern React Native best practices** — functional components, hooks (not class components), proper `useMemo`/`useCallback` usage where needed
- **Correct React Native APIs** — e.g., `StyleSheet.create` only when needed, proper use of `Animated` vs `Reanimated`, correct event types
- **Performance** — unnecessary re-renders, missing `key` props in lists, heavy computation inside render
- **Accessibility** — `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` on interactive elements
- **Platform safety** — no web-only APIs used without `Platform.OS` checks, no bare `window`/`document` access
- **react-native-web compatibility** — all components must work on web via RNW. No native-only modules without web fallbacks, no `NativeModules` or `requireNativeComponent` without `Platform.OS` guards, no RN APIs unsupported by RNW (check `react-native-web` docs if unsure). Verify: `className` for Tailwind styling, `Pressable` instead of `TouchableOpacity` (better RNW support), no `PixelRatio`/`Appearance` usage that behaves differently on web, `Linking.openURL` instead of `window.open`, `Animated` API (not `react-native-reanimated`) unless a web-compatible version is configured. Platform-specific files (`.web.ts`/`.native.ts`) are acceptable as a tradeoff when they improve the native experience, but the web version must always remain functional
- **Import hygiene** — no unused imports, correct use of `@shared/` aliases, type-only imports use `import type`
- **Dead code** — no unused variables, functions, or parameters; remove rather than prefix with `_` unless required by a callback signature

Prompt for the subagent:
```
Review the following files that were just modified during a web→React Native migration iteration. Check for: any types (suggest concrete replacements), modern RN best practices (hooks, functional components, proper memoization), correct RN APIs, performance issues (unnecessary re-renders, missing keys), accessibility props on interactive elements, platform safety (no bare window/document without Platform.OS checks), and import hygiene (unused imports, type-only imports). For each issue found, output the file path, line number, the problem, and a suggested fix. Files to review: [LIST OF CHANGED FILES]
```

Apply any valid fixes the subagent finds before finishing the iteration.
