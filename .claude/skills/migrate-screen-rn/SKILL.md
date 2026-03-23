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

### Key Directories
- `crossplatform/components/` — crossplatform RN components (modify these)
- `crossplatform/components/icons/` — SVG icons using react-native-svg
- `native/src/screens/` — RN screen orchestrators
- `src/components/` — Preact originals (READ ONLY, use as reference)
- `src/models/`, `src/utils/` — shared business logic (import via `@shared/`, don't modify)

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
