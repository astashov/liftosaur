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

## Sharing Components Between Web & Native

### Decision: single `.tsx` vs `.tsx` + `.native.tsx`

Default to a **single cross-platform `.tsx`** with `Platform.OS === "web"` checks for tiny differences. Only create a `.native.tsx` variant when the implementation diverges meaningfully (e.g. file picker uses an HTML `<input>` on web vs `@react-native-documents/picker` on native).

**Better pattern when behavior diverges**: extract the platform-specific I/O into a tiny utility (`.ts` + `.native.ts`), and keep the component itself cross-platform. Example — three importer components share one cross-platform file each, with file picking and confirm dialogs delegated to `src/utils/fileImport.ts` / `.native.ts`:

```tsx
// fileImport.ts (web)
export async function FileImport_pickFile(): Promise<string | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = () => { /* ...FileReader... */ };
    input.click();
  });
}
export async function FileImport_confirm(message: string): Promise<boolean> {
  return Promise.resolve(window.confirm(message));
}

// fileImport.native.ts
import { Alert } from "react-native";
import { pick, types } from "@react-native-documents/picker";
import RNFS from "react-native-fs";
export async function FileImport_pickFile(): Promise<string | undefined> {
  const [result] = await pick({ type: [types.json] });
  return await RNFS.readFile(decodeURIComponent(result.uri), "utf8");
}
export async function FileImport_confirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert("Confirm", message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "OK", onPress: () => resolve(true) },
    ]);
  });
}
```

The component then has a single shared `.tsx` that calls these helpers — no `.native.tsx` variant needed.

### Importing web-only modules in cross-platform files

It's safe to `import { Modal } from "./modal"` (a web-only file using `react-dom`) in a cross-platform component, **as long as the actual usage is gated by `Platform.OS === "web"`**. Metro resolves the import but the gated function is never called on native, so it doesn't crash. This avoids needing stub `.native.tsx` files for every web-only dependency.

```tsx
const isWeb = Platform.OS === "web";

return (
  <>
    <View>...navbar...</View>
    {props.helpContent && isWeb && (
      <Modal isHidden={!show} onClose={...}>{...}</Modal>  // never executes on native
    )}
  </>
);
```

Same pattern works for other web-only utilities like `Link` (`<a>`), `createPortal`, `document.body.classList`, etc.

### Web-only DOM events on cross-platform components

If you need to attach DOM-only event handlers (e.g. `onMouseDown` for drag-and-drop) on a cross-platform component, gate with `Platform.OS === "web"` and use `React.createElement("div"|"span", ...)` directly to bypass the RN type system:

```tsx
const dragHandle =
  props.handleTouchStart && Platform.OS === "web"
    ? React.createElement(
        "div",
        { className: "p-2 cursor-move", style: { marginLeft: "-16px" } },
        React.createElement(
          "span",
          { onMouseDown: props.handleTouchStart, onTouchStart: props.handleTouchStart },
          React.createElement(IconHandle)
        )
      )
    : null;
```

The runtime check ensures `createElement("div", ...)` is never invoked on native.

## Native Inputs & Forms

### Uncontrolled TextInput with `setNativeProps`

A controlled `TextInput` round-trips every keystroke through the bridge → laggy. Use uncontrolled mode with a ref + `setNativeProps` to push external value changes:

```tsx
export const Input = memo(forwardRef(function Input(props: IProps): JSX.Element {
  const inputRef = useRef<TextInput>(null);
  const currentValueRef = useRef(String(props.value ?? ""));

  // Sync external value changes WITHOUT making it controlled
  useEffect(() => {
    if (props.value === undefined) return;
    const newStr = String(props.value);
    if (currentValueRef.current !== newStr) {
      currentValueRef.current = newStr;
      inputRef.current?.setNativeProps({ text: newStr });
    }
  }, [props.value]);

  return (
    <TextInput
      ref={inputRef}
      defaultValue={currentValueRef.current}
      onChangeText={(text) => { currentValueRef.current = text; }}
      onBlur={() => props.changeHandler?.({ success: true, data: currentValueRef.current })}
      keyboardType={props.type === "number" ? "numeric" : "default"}
      selectTextOnFocus
    />
  );
}));
```

The change handler fires on blur, not on every keystroke. `currentValueRef` is the source of truth in-memory.

### MenuItemEditable on native

`MenuItemEditable` needs `text`, `number`, `boolean`, `select`, `desktop-select` types. On native:
- `boolean` → `Switch` from `react-native`
- `select` / `desktop-select` → `Pressable` that opens `ActionSheetIOS.showActionSheetWithOptions`
- `text` / `number` → uncontrolled `TextInput` (see pattern above)

Layout: name container with `flex-1`, value container as a regular column — flex-1 on the name pushes the value to the right naturally. Don't put `flex-1 items-end` on a column-direction wrapper (alignItems on the wrong axis).

## Linking External URLs

`Linking` is exported from `react-native` and works on **both** web and native (react-native-web shims it). Use `Linking.openURL(url)` for external links instead of `<a href>`:

```tsx
import { Linking } from "react-native";
function openExternal(url: string): void {
  Linking.openURL(url).catch(() => undefined);
}
<Pressable onPress={() => openExternal("https://discord.com/...")}><Text>Discord</Text></Pressable>
```

## Auto-hidden Features on Native

`SendMessage_isIos()` and `SendMessage_isAndroid()` check `window.webkit.messageHandlers` / `window.JSAndroidBridge` — both return `false` in pure RN. Any code guarded by these checks **auto-hides on native** with no extra work:
- Vibration toggle
- Always-On Display
- Sound section / volume slider
- Native-app-only buttons

If you want similar behavior to render natively, you'd add a `Platform.OS === "ios" || Platform.OS === "android"` check instead.

## window.* Gotchas

These don't exist on RN — replace before sharing code:
- `window.setTimeout` → `setTimeout` (no `window` prefix)
- `window.confirm` → `Alert.alert` (wrap in a Promise for sync-style use)
- `window.pageYOffset` / `window.addEventListener("scroll", ...)` → `ScrollView.onScroll`
- `window.document.*` / `document.body.classList` → only inside `Platform.OS === "web"` branches
- `document.createElement` → only inside web-only utilities

## Navigation: Custom JS Headers in native-stack

`@react-navigation/native-stack` **does** support custom JS-rendered headers. Set both `headerShown: true` and `header:`:

```tsx
const navHeaderScreenOptions = {
  headerShown: true,
  animation: "slide_from_right" as const,
  freezeOnBlur: true,
  header: NavHeader,
};
<MeStack.Navigator screenOptions={navHeaderScreenOptions}>
  <MeStack.Screen name="settings" component={NavScreenSettings} />
  ...
</MeStack.Navigator>
```

### Safe area inset on the header

native-stack renders the JS header at `y=0` (under the status bar). Wrap the navbar in a `View` with `paddingTop: insets.top`:

```tsx
const insets = useSafeAreaInsets();
return (
  <View className="bg-background-default" style={{ paddingTop: insets.top }}>
    <NavbarView ... />
  </View>
);
```

`SafeAreaProvider` must be set up in `App.native.tsx` (it is). On web, `useSafeAreaInsets` returns zeros — no visual change.

### `useNavOptions` works cross-platform

`useNavOptions` calls `navigation.setOptions(...)` in a `useEffect`. native-stack **does** re-call the `header:` function when options change, so screens just call `useNavOptions({ navTitle: "Me" })` and the navbar updates. Same hook works on both web and native.

### Sharing NavHeader between `@react-navigation/stack` (web) and `native-stack`

Don't import `StackHeaderProps` from a specific stack package. Use a loose type with just the fields you need:

```tsx
interface IHeaderProps {
  options: object;
  back?: { title: string | undefined } | undefined;
}
export function NavHeader(props: IHeaderProps): JSX.Element | null { ... }
```

Both `StackHeaderProps` and `NativeStackHeaderProps` are structurally compatible with this shape.

### Standard iOS push animation

native-stack `animation` options: `"none"`, `"default"`, `"fade"`, `"fade_from_bottom"`, `"flip"`, `"simple_push"`, `"slide_from_bottom"`, `"slide_from_right"`, `"slide_from_left"`. Use `"slide_from_right"` for the standard iOS push (slide-in + back-swipe gesture).

## Header Shadow on Scroll

### The trick: put the shadow on the OUTERMOST wrapper

iOS shadows extend in all directions from a `View`'s bounds. If you put the shadow on the navbar `View` itself, the top edge of the shadow bleeds into the safe-area area. Solution: put the shadow on the wrapper `View` that extends from `y=0` (very top of screen) to the bottom of the navbar — the top half of the shadow goes off-screen and only the bottom shows.

```tsx
const shadowStyle = options.navIsScrolled
  ? Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 4 },
      default: { boxShadow: "0 4px 4px -2px rgba(0,0,0,0.08)" },
    })
  : undefined;
return (
  <View className="bg-background-default" style={[{ paddingTop: insets.top }, shadowStyle]}>
    <NavbarView ... />
  </View>
);
```

Note the **negative spread** in the web `boxShadow` (`-2px`) — it shrinks the shadow inward so the visible blur is fully below the box rather than wrapping around. CSS doesn't have a "bottom-only shadow" but `0 4px 4px -2px rgba(...)` is the standard trick.

### Detecting scroll state without re-rendering on every scroll

Have the screen's scrollable container (`NavScreenContent`) report scroll state to navigation options, but only when **crossing the threshold** (`scrollY === 0` ↔ `scrollY > 0`). Use a ref to track previous state:

```tsx
const navigation = useNavigation();
const isScrolledRef = useRef(false);
const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
  const isScrolled = e.nativeEvent.contentOffset.y > 0;
  if (isScrolled !== isScrolledRef.current) {
    isScrolledRef.current = isScrolled;
    navigation.setOptions({ navIsScrolled: isScrolled });
  }
}, [navigation]);
return <ScrollView onScroll={onScroll} scrollEventThrottle={16}>...</ScrollView>;
```

`NavHeader` reads `options.navIsScrolled` and applies the shadow style. `setOptions` is only called twice per scroll session (down and back up), not every frame.

## Native Module Installation — Don't Forget the Rebuild

When you `npm install` a package with native code (slider, document picker, anything with iOS/Android folders):

```bash
npm install @react-native-community/slider
cd ios && pod install
# Then REBUILD the iOS app:
npm run ios   # or open Xcode + Cmd+R
```

A Metro reload alone is **not** enough. Symptom: `Unimplemented component: <RNCSlider>` — the JS bridge can't find a native module that hasn't been linked into the binary.

If `npm run ios` fails on Ruby gems (`ffi` errors), open `ios/Liftosaur.xcworkspace` in Xcode and Cmd+R there. Pods are already installed by the earlier `pod install`.

## Preserving `data-cy` for Playwright Tests

Playwright is configured with `testIdAttribute: "data-cy"` in `playwright.config.ts`. When you migrate a web component to use RN primitives, keep `data-cy` alongside `testID`:

```tsx
<Pressable testID={testId} data-cy={testId} onPress={...}>
```

react-native-web passes unknown props through to the underlying DOM element on web; on native it's ignored. TypeScript accepts it because the project's type config doesn't strictly enforce RN's prop types. Don't drop `data-cy` when converting — every `getByTestId(...)` call in `tests/*.spec.ts` depends on it.

## Slider Primitive Pattern

Cross-platform slider lives at `src/components/primitives/slider.tsx` + `slider.native.tsx`:
- web: `React.createElement("input", { type: "range", ... })`
- native: `@react-native-community/slider` with `onSlidingComplete` (not `onValueChange` — that fires on every drag pixel)

Use `step` for discrete snapping. The component takes a simple `{ value, min, max, step?, onChange }` interface so consumers don't need to think about HTML events vs RN events.

## Turbo Modules (RN 0.84+)

Must use ObjC++ with codegen, not Swift or legacy bridge. See memory `feedback_turbo_modules.md` for details.
