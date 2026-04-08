---
name: react-native
description: Guidelines for writing React Native code in Liftosaur. Use when migrating web components to RN primitives, fixing RN performance issues, or building new RN screens.
disable-model-invocation: true
---

# React Native Development Guidelines

Apply these rules when writing or migrating React Native code in Liftosaur.

## Performance: The #1 Concern

React Native is NOT a browser. Browsers render 6,000 DOM nodes trivially; RN creates a real native view for each component over the JS bridge. Every `<View className="...">` also runs NativeWind's CssInterop at **runtime in JS** (~1ms per View). This means:

### Virtualize Everything

- **Never render a list of items in ScrollView.** Always use FlatList.
- ScrollView renders ALL children upfront. A calendar with 52 weeks = 800+ Views mounted immediately.
- FlatList only renders what's visible + a small buffer.

### FlatList Tuning

- `initialNumToRender`: Set to the number of items visible on screen (typically 2-4). NOT 10.
- `maxToRenderPerBatch`: Can be higher (6) for smooth scroll-ahead rendering.
- `windowSize`: 3-5 is typical. Larger = more off-screen rendering.
- `getItemLayout`: Always provide if items have predictable height/width. Avoids measurement passes.
- `initialScrollIndex`: Use with `getItemLayout` to jump to a position without rendering everything before it.
- `keyExtractor`: Always provide, use stable IDs.
- `removeClippedSubviews={true}`: Consider for long lists to unmount off-screen views.

### onViewableItemsChanged Must Be Stable

FlatList does NOT support changing the `onViewableItemsChanged` callback after mount. Use `useRef`:

```tsx
const onViewableItemsChanged = useRef(
  ({ viewableItems }: { viewableItems: Array<{ item: T }> }) => {
    // Access changing values through refs, not closure
    const currentValue = someValueRef.current;
  }
).current;
```

### renderItem Must Be Memoized

Always wrap `renderItem` in `useCallback`. If the rendered component is complex, make it a `memo()` component.

## Component Migration: HTML → RN

| HTML | RN Primitive | Notes |
|------|-------------|-------|
| `div` | `View` | |
| `span` | `Text` | RN Text does NOT nest inside View implicitly |
| `p` | `Text` | |
| `button` | `Pressable` + `Text` | Never use TouchableOpacity (deprecated) |
| `img` | `Image` | **Must have explicit width/height** |
| `section` | `View` | |
| `h1-h6` | `Text` with className | |
| `ul/li` | `View` | |
| `a` | `Pressable` + `Text` or Link | |
| `svg/path` | `Svg`/`Path` from `./primitives/svg` | |

### Image Gotchas

- RN `Image` requires explicit `width` and `height`. Unlike HTML `img`, it won't size from the source.
- Relative URLs (`/images/foo.png`) don't work on native — there's no webpack dev server proxy.
- Use `HostConfig_resolveUrl(path)` from `src/utils/hostConfig.ts` to prepend the host on native.
- `HostConfig_resolveUrl` is a no-op on web (returns path as-is).

### Shadows

Use `Platform.select` for cross-platform shadows:

```tsx
style={Platform.select({
  ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  android: { elevation: 2 },
  default: {},  // web uses className shadow
})}
```

### CSS Animations → Animated API

CSS `animation` and `@keyframes` don't exist in RN. Use `Animated.View` + `Animated.timing`:

```tsx
const spinValue = useRef(new Animated.Value(0)).current;
useEffect(() => {
  const animation = Animated.loop(
    Animated.timing(spinValue, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
  );
  animation.start();
  return () => animation.stop();
}, []);
const rotate = spinValue.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
return <Animated.View style={{ transform: [{ rotate }] }}>...</Animated.View>;
```

### CSS Transforms

`className="rotate-180"` doesn't work on native for transforms. Use inline style:

```tsx
style={{ transform: [{ rotate: "180deg" }] }}
```

## Text & Fonts

### Custom Text Wrapper

`Text.defaultProps` is broken in React 19 / New Architecture. NativeWind's `@layer base` doesn't work on native. The only reliable way to set a default font is a wrapper component:

```tsx
// src/components/primitives/text.tsx
import { Text as RNText, TextProps, StyleSheet } from "react-native";
const defaultStyle = StyleSheet.create({ text: { fontFamily: "Poppins" } });
export function Text({ style, className, ...props }: TextProps & { className?: string }) {
  return <RNText className={className} style={[defaultStyle.text, style]} {...props} />;
}
```

**All migrated components must import Text from `./primitives/text`, not from `react-native`.**

### Web Font Override

react-native-web's Text sets inline `font-family: System`. Override in `src/index.css`:

```css
* { font-family: inherit !important; }
```

### Font Installation

Font files live in `assets/fonts/`. Linked via `react-native.config.js` `assets` field. After adding new fonts:

```bash
npx react-native-asset
cd ios && pod install
```

Then do a full rebuild + reinstall on simulator (incremental builds don't pick up new resources).

## Testing Attributes

Always keep **both** `data-cy` and `testID` on interactive/testable elements:

```tsx
<View data-cy="history-entry-exercise" testID="history-entry-exercise">
```

- `data-cy` is for Playwright web tests (webapp)
- `testID` is for native testing

## Touch Gesture Conflicts

**Never wrap a scrollable component (FlatList, ScrollView) inside a Pressable.** The Pressable captures touch gestures before the scrollable can handle swipes. Instead, put the `onPress` handler on individual items inside the list.

## FlatList pagingEnabled Alignment

When using `pagingEnabled`, the snap points are based on the FlatList's **visible width**. If you measure width via `onLayout`, measure the container the FlatList sits in directly — not a parent with padding/margin. Otherwise items and snap points will be misaligned.

## Markdown

The web app uses a full `<Markdown>` component with many extensions. For the mobile app, use `<SimpleMarkdown>` from `src/components/simpleMarkdown.tsx` — lightweight renderer using markdown-it + RN primitives.

## Navigation

- Uses `@react-navigation/native-stack` with `formSheet` presentation for modals
- Screen components in `src/navigation/screens/`
- Prefer a single `.tsx` file that works on both web and native over `.native.tsx` + `.tsx` pairs
- **Never re-export from the same module name in `.native.tsx`** — Metro resolves `.native.tsx` first, creating an infinite import loop

## Host Configuration

`src/utils/hostConfig.ts` provides `HostConfig_imageHost()` and `HostConfig_resolveUrl(path)`. Toggle the `baseHost` constant for local/stage/prod, similar to `Settings.swift` on the iOS side:

```tsx
const baseHost = "https://local.liftosaur.com:8080";
// const baseHost = "https://stage.liftosaur.com";
// const baseHost = "https://www.liftosaur.com";
```

## Modals / Bottom Sheets

### formSheet Has Scroll Glitches

`presentation: "formSheet"` uses iOS `UISheetPresentationController`, which has a gesture recognizer that **conflicts with FlatList/ScrollView scrolling**. Symptoms: first ~30px of scroll is glitchy after the modal opens. The glitch scales with the number of Views in FlatList items (7 day-cells = fine, 14+ = glitch). This is a react-native-screens issue.

**Solution**: Use `presentation: "transparentModal"` with a custom `SheetScreenContainer.native.tsx` that builds the sheet UI manually:
- `Animated.View` for slide-up/down animation
- `PanResponder` on the grabber for drag-to-dismiss
- Semi-transparent overlay with tap-to-dismiss
- Control height via `useWindowDimensions`

The web version (`SheetScreenContainer.tsx`) uses `createPortal` — incompatible with native. The `.native.tsx` version replaces it entirely.

### CSS Grid Replacement

CSS `grid grid-cols-7` doesn't exist in RN. Use `flexDirection: 'row', flexWrap: 'wrap'` with `width: "14.285%"` per cell:

```tsx
<View className="flex-row flex-wrap">
  {days.map((day) => (
    <View key={day} style={{ width: "14.285%" }} className="items-center justify-center p-2">
      ...
    </View>
  ))}
</View>
```

## FlatList scrollToIndex for Distant Items

`scrollToIndex` fails when the target item hasn't been rendered yet. Two approaches:

### Option A: getItemLayout (estimated heights)

Pre-compute estimated heights so FlatList knows every item's position upfront. Then `scrollToIndex` works for any index instantly. Follow with a second `scrollToIndex` after ~200ms to correct to the actual measured position:

```tsx
const itemLayouts = useMemo(() => {
  const layouts = [];
  let offset = 0;
  for (const item of data) {
    const length = estimateItemHeight(item);
    layouts.push({ length, offset });
    offset += length;
  }
  return layouts;
}, [data]);

// On FlatList:
getItemLayout={(_, index) => ({ ...itemLayouts[index], index })}

// When scrolling:
flatListRef.current.scrollToIndex({ index, animated: false });
setTimeout(() => {
  flatListRef.current?.scrollToIndex({ index, animated: false });
}, 200);
```

### Option B: No getItemLayout

Without `getItemLayout`, `scrollToOffset` is clamped to rendered content size. The `onScrollToIndexFailed` + retry pattern creates loops. Avoid this for long lists.

## Inverted FlatList for Chronological Data

For lists that should show newest-first but display in ascending visual order (oldest at top, newest at bottom), use descending data + `inverted={true}`:

```tsx
<FlatList data={descendingData} inverted />
```

This starts the scroll at the bottom (newest item) without needing `initialScrollIndex` or `scrollToEnd`.

## Turbo Modules (RN 0.84+)

Must use ObjC++ with codegen, not Swift or legacy bridge. See memory `feedback_turbo_modules.md` for details.
