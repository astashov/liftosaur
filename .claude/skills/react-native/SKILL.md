---
name: react-native
description: General React Native programming principles, patterns, and conventions for this project. Referenced by other skills (e.g., migrate-screen-rn). Apply these when writing or reviewing any RN code.
---

# React Native Development Principles

These are the general programming principles and conventions for React Native development in this project. They apply to all RN work — new screens, bug fixes, refactors, and migrations.

## Web Compatibility Constraint

ALL components must work with **react-native-web**. This means:
- Only use react-native primitives that react-native-web supports (View, Text, Pressable, TextInput, FlatList, ScrollView, Modal, Image, Animated, PanResponder, Platform, Alert, useWindowDimensions, etc.)
- Use `className` for Tailwind styling (NativeWind on native, standard Tailwind CSS on web)
- Use `react-native-svg` for icons (web shim exists at `crossplatform/web/react-native-svg.tsx`)
- Do NOT use native-only libraries without web fallbacks
- When choosing dependencies, prefer ones with react-native-web support
- For platform-specific behavior, use `Platform.OS === "web"` checks
- For confirmations: `Alert.alert()` on native, `window.confirm()` on web

## Project Structure

```
crossplatform/components/       — Crossplatform RN components (View, Text, Pressable + NativeWind)
crossplatform/components/icons/ — SVG icons using react-native-svg
native/src/screens/             — RN screen orchestrators
native/src/components/          — RN-only components (e.g., LineChart, graph wrappers, modal sheets)
native/src/utils/               — Platform-specific utilities (.native.ts / .ts pairs)
native/src/context/             — React contexts (StoreContext, DispatchContext, NativeAppProvider)
native/src/navigation/          — Navigation setup, screen map, migrated screen registry
native/src/store/               — State store, native storage bridge
src/models/, src/utils/         — Shared business logic (imported via @shared/ aliases)
src/ducks/                      — Redux-like reducer, thunks, action types
```

## TypeScript: Avoid `any`

- **Never use `any`** unless there is genuinely no other option. Prefer `unknown`, generics, or concrete types.
- When importing from `@shared/`, use the actual types from `@shared/types` or the relevant module — don't cast to `any`.
- For event handlers, use the correct React Native event types (e.g., `GestureResponderEvent`, `NativeSyntheticEvent<TextInputChangeEventData>`).
- For dynamic data, use `unknown` and narrow with type guards instead of `any`.
- If a third-party library lacks types, write a minimal type declaration rather than using `any`.
- `as any` casts are a code smell — if you need one, add a comment explaining why no better option exists.

## Keep Business Logic Out of Views

Components should be thin UI layers. State manipulation, data transformations, and business rules belong in `@shared/models/`, `@shared/utils/`, or `@shared/ducks/` — not inline in components.

**Belongs in components (view-specific):** touch/gesture handling, scroll behavior, layout decisions, animation, conditional rendering, calling shared helpers and dispatching results.

**Belongs in shared modules (not components):** data filtering/sorting/grouping, state update construction (lens recordings), validation, formatting, CSV/JSON generation, import parsing, any logic that doesn't depend on React lifecycle.

When you see business logic inlined in a component, extract it to a shared module so both web and RN versions can use the same logic.

## Component Patterns

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

## State Update Patterns

```tsx
import { updateProgress, updateState, updateSettings } from "@shared/models/state";
import { lb } from "lens-shmens";
import type { IHistoryRecord, ISettings } from "@shared/types";

// Update progress (current workout)
updateProgress(dispatch, [
  lb<IHistoryRecord>().pi("ui").p("currentEntryIndex").record(index)
], "description");

// Dispatch actions
dispatch({ type: "CompleteSetAction", setIndex, entryIndex, ... });

// Update settings with lens
dispatch({
  type: "UpdateSettings",
  lensRecording: lb<ISettings>().p("units").record("kg"),
  desc: "Change weight units",
});

// Thunks also work — dispatch accepts both actions and thunks
import { Thunk_importStorage } from "@shared/ducks/thunks";
dispatch(Thunk_importStorage(jsonContents));
```

## Styling: Always Use NativeWind (className), Not StyleSheet

- **Always** use `className` with Tailwind classes for styling. Never use `StyleSheet.create` — the codebase uses NativeWind which maps Tailwind classes to native styles.
- Use semantic color classes: `text-text-primary`, `text-text-secondary`, `text-text-link`, `bg-background-default`, `bg-background-neutral`, `border-border-neutral`, etc.
- For colors not available as Tailwind classes (e.g., dynamic chart colors), use the `style` prop with `Tailwind_semantic()` / `Tailwind_colors()` from `@shared/utils/tailwindConfig`.

## Semantic Color Keys

The semantic color object from `Tailwind_semantic()` uses **flat keys**, not nested:
```tsx
// CORRECT
sem.button.primarybackground
sem.button.primarylabel
sem.text.error
sem.border.neutral

// WRONG — these don't exist
sem.button.primary.bg
sem.button.primary.text
```

## Avoid Unnecessary useMemo / useCallback

- Only use `useMemo` when computing from large datasets (e.g., sorting/filtering all history records, running collectors over history). Do NOT wrap small static derivations, simple object literals, or handler functions in `useMemo`/`useCallback`.
- Inline event handlers directly in JSX when the handler is simple (e.g., `onPress={() => dispatch({ type: "Foo" })}`).
- `dispatch` from context never changes — don't put it in dependency arrays or wrap handlers that only use it.
- `renderItem` for FlatList: a plain function is fine; wrapping in `useMemo` is premature optimization.
- When in doubt, don't memoize. Only add memoization when you have evidence of a performance problem.

## List Rendering

**Prefer Legend List over FlatList.** Legend List (`@legendapp/list`) is a high-performance drop-in FlatList replacement. It's pure JS (zero native code), supports **react-native-web** (critical for this project), and works on both old and new architecture. Recycling is opt-in via the `recycleItems` prop.

FlashList v2 (`@shopify/flash-list`) is the other major option — more battle-tested and higher adoption — but it **lacks web support**, which rules it out for this project.

```tsx
import { LegendList } from "@legendapp/list";

<LegendList
  data={items}
  renderItem={renderItem}
  estimatedItemSize={80}
  keyExtractor={(item) => String(item.id)}
  recycleItems={true}  // opt-in cell recycling for long lists
/>
```

Key rules:
- **Never use array index as `key` or `keyExtractor`** — causes state mismatches on reorder/insert/delete. Always use stable unique IDs.
- **Enable `recycleItems`** for long lists (100+ items) where scroll performance matters. Without it, Legend List still virtualizes but doesn't reuse component instances.
- For plain FlatList (when a third-party list isn't needed): provide `getItemLayout` for fixed-height items, tune `windowSize` (lower = less off-screen rendering) and `maxToRenderPerBatch` (10-15 is optimal), use `removeClippedSubviews={true}` for long lists.

## useEffect Cleanup and Memory Leaks

Always return cleanup functions from `useEffect` that:
- Remove event listeners and subscriptions
- Cancel timers (`clearTimeout`, `clearInterval`)
- Abort fetch requests via `AbortController`

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetchData({ signal: controller.signal }).then(setData);
  return () => controller.abort();
}, []);
```

Closures in async callbacks capture stale state/refs. Always check if the component is still mounted (via AbortController signal or a ref flag) before calling setState in async callbacks.

## useFocusEffect for Screen Lifecycle

Use `useFocusEffect` from `@react-navigation/native` (not `useEffect`) for work that should start when a screen gains focus and stop when it loses focus. Screens in a stack stay mounted when you navigate away — `useEffect` cleanup won't fire.

```tsx
import { useFocusEffect } from "@react-navigation/native";

useFocusEffect(
  useCallback(() => {
    const interval = setInterval(pollData, 5000);
    return () => clearInterval(interval);
  }, [])
);
```

This applies to: polling, websocket connections, timers, location tracking, sensor subscriptions — anything that should pause when the screen isn't visible.

## Accessibility

- **`accessibilityLabel`** on all interactive elements — screen readers verbalize this string.
- **`accessibilityRole`** (`"button"`, `"link"`, `"header"`, `"image"`, `"search"`) to convey element purpose.
- **`accessibilityHint`** when the action result isn't clear from the label (e.g., "Opens the settings page").
- **`accessibilityState`** for `selected`, `disabled`, `checked`, `expanded` states.
- **Minimum 44x44pt touch targets** for all interactive elements (Apple HIG / WCAG guideline).
- Group related elements with `accessible={true}` on a parent `View` so screen readers treat them as a single unit.

## Avoid Inline Style Objects

`style={{ margin: 10 }}` creates a new object reference every render, defeating `React.memo` on child components. When `className` isn't an option (third-party components, dynamic colors from `Tailwind_semantic()`):

- **Hoist static style objects** outside the component.
- **Memoize dynamic styles** that depend on props/state with `useMemo`.

```tsx
// GOOD — stable reference
const sliderStyle = { flex: 1, marginHorizontal: 8 };
<Slider style={sliderStyle} ... />

// GOOD — memoized dynamic style
const barStyle = useMemo(() => ({ backgroundColor: sem.button.primarybackground }), [sem]);

// BAD — new object every render
<Slider style={{ flex: 1, marginHorizontal: 8 }} ... />
```

## Defer Heavy Work After Transitions

Use `InteractionManager.runAfterInteractions()` to defer expensive computation until navigation transitions complete. This keeps animations smooth at 60fps.

```tsx
import { InteractionManager } from "react-native";

useEffect(() => {
  const task = InteractionManager.runAfterInteractions(() => {
    const result = expensiveComputation(data);
    setProcessedData(result);
  });
  return () => task.cancel();
}, [data]);
```

This is relevant for screens that sort/filter large datasets, parse imported data, or build complex derived state on mount.

## Image Handling

- **Resize images upstream** — serve appropriately sized images from CDN/API rather than downloading full-resolution and scaling down on device.
- **Keep list item images under 100KB.** Use WebP for better compression.
- **Preload critical images** before they enter the viewport.
- Provide explicit `width` and `height` to `Image` components to avoid layout shifts.

## Production Build Hygiene

- **Strip `console.log` in production** — console calls bottleneck the JS thread. Use `babel-plugin-transform-remove-console` in `babel.config.js` under `env.production`.
- **Always test performance in release mode** — debug builds lack compiler optimizations and give misleading profiling results.

## Adding New Screens

Pattern for registering a new native RN screen:
1. Create screen in `native/src/screens/FooScreen.tsx`
2. Register in `native/src/screens/registerScreens.ts`: `MigratedScreens_register("foo", FooScreen as IScreenComponent)`
3. Screen name must exist in `native/src/navigation/screenMap.ts` (`IScreenName` type)
4. For modal sheets: add to `AppNavigator.tsx` as a `RootStack.Screen` with `presentation: "formSheet"`

## Navigation from Native Screens

Native screens navigate to other screens (including WebView-backed ones) via:
```tsx
dispatch({ type: "PushScreen", screen: "account", params: { key: "value" } });
```
This flows through `defaultOnActions` → `env.navigate` → `NavigationRef_navigate`, which pushes onto the native stack. If the target screen is migrated, it renders natively; otherwise, it renders in a `PooledWebViewScreen`.

## Screen State Hook

Use `useStoreStateWhenFocused()` (not `useStoreState()`) in screen components. It only updates state when the screen is focused, avoiding unnecessary re-renders for background tabs.

## Reusable Crossplatform Components

Before creating inline components in a screen, check if a crossplatform version exists or should be created. Existing reusable components:

- **`crossplatform/components/MenuItem.tsx`** — Pressable row with name, optional value text, value color, arrow icon. Props: `name`, `value?`, `valueColor?`, `onPress?`, `showArrow?`, `prefix?`, `expandName?`.
- **`crossplatform/components/MenuItemEditable.tsx`** — Discriminated union with three variants:
  - `type: "boolean"` — label + native `Switch`. Props: `name`, `value: boolean`, `onChange: (v: boolean) => void`, `subtitle?`.
  - `type: "select"` — label + segmented control pill buttons. Props: `name`, `value: string`, `options: [string, string][]`, `onChange: (v: string) => void`.
  - `type: "text"` — label + `TextInput` with blur-commit. Props: `name`, `value: string`, `onChange: (v: string) => void`, `placeholder?`.
- **`crossplatform/components/GroupHeader.tsx`** — Section header with optional help icon, collapse, addons. Props: `name`, `topPadding?`, `help?`, `children?` (collapsible), etc.
- **`crossplatform/components/Button.tsx`** — Pressable button with color variants (`purple`, `orange`, `grayv2`, etc.) and sizes.
- **`crossplatform/components/LinkButton.tsx`** — Text link button.

When building a screen that has menu items, toggles, or selects, use these instead of creating inline equivalents.

## Platform-Specific Files for Native-Only Dependencies

When a feature requires a native-only library (e.g., `react-native-share`, `react-native-document-picker`), use the `.native.ts` / `.ts` file pair pattern:

```
native/src/utils/foo.native.ts   ← iOS/Android (uses native library)
native/src/utils/foo.ts          ← Web fallback (uses DOM APIs)
```

Metro picks `.native.ts` for iOS/Android builds; webpack picks `.ts` for web builds. Both files must export the same API.

**Existing platform-specific utilities:**
- **`native/src/utils/fileExport`** — `FileExport_share(filename, contents)`: native uses `react-native-share` (share sheet), web uses `Blob` + download link.
- **`native/src/utils/fileImport`** — `FileImport_pickAndRead(fileTypes)`, `FileImport_confirm(title, message, onConfirm)`, `docTypes`: native uses `react-native-document-picker` + `Alert`, web uses `<input type="file">` + `confirm()`.

## Slider Component

The `@react-native-community/slider` package is used for range inputs (volume, text size). It requires `style` prop (not `className`) for layout since NativeWind doesn't support this third-party component:
```tsx
<Slider style={{ flex: 1, marginHorizontal: 8 }} ... />
```

## Charts and Graphs (LineChart Component)

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
