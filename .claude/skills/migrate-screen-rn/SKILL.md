---
name: migrate-screen-rn
description: One iteration of visual convergence - screenshots the web app and RN app, compares them, fixes the top issues. Run repeatedly until the screens match. Each run is self-contained (fresh context).
argument-hint: [screen-name-or-url-path] [optional: specific area like "sets table" or "header"]
---

# Migrate Screen to React Native — Single Iteration

Target: $ARGUMENTS

> **Prerequisites:** Read `.claude/skills/react-native/SKILL.md` first — it contains all the general RN programming principles (web compatibility, styling, state patterns, component conventions, etc.) that apply to this work.

This is ONE iteration of a visual convergence loop. Each run:
1. Screenshots the existing web app (reference)
2. Screenshots the RN app on iOS simulator (current state)
3. Compares them visually
4. Identifies the top 3-5 most impactful differences
5. Fixes them in the crossplatform components
6. Ends (run again for the next iteration)

## Step 1: Get Web Reference Screenshot

Use the **production** web app as the reference:
```
https://www.liftosaur.com/app
```

Use Playwright MCP:
1. `mcp__playwright__browser_navigate` to `https://www.liftosaur.com/app`
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
1. Read the Preact source from the **main repo** to understand the intended behavior (files in `{main-repo}/src/components/` — i.e. `/Users/anton/projects/liftosaur/src/components/`)
2. Read the crossplatform RN component that needs fixing (files in `crossplatform/components/` in this worktree)
3. Make targeted changes

### Preserve Component Structure
When migrating from Preact to RN, mirror the original component hierarchy as closely as possible:
- Use the **same component names** (e.g., if Preact has `ExerciseSetView`, the RN version should be `ExerciseSetView`, not `SetRow` or `WorkoutSet`)
- Maintain the **same parent→child nesting** — if Preact splits a screen into `Header`, `ExerciseList`, `ExerciseCard`, `SetRow`, keep that breakdown rather than flattening or restructuring
- Keep **props interfaces similar** — same prop names and shapes where feasible
- If a Preact component maps 1:1 to a crossplatform component, name the file the same (e.g., `src/components/WorkoutHeader.tsx` → `crossplatform/components/WorkoutHeader.tsx`)
- Only deviate from the original structure when React Native constraints make it necessary (e.g., FlatList requiring a different data flow)

### Key Directories

**Original Preact source (READ ONLY, use as reference):**
The original app source lives in the **main repo directory**, NOT the worktree. To read Preact originals, resolve paths relative to the main repo root. For example, if this worktree is at `.claude/worktrees/rn-graphs/`, the main repo root is `../../../` (i.e. `/Users/anton/projects/liftosaur/`).
- `{main-repo}/src/components/` — Preact originals (READ ONLY reference)
- `{main-repo}/src/models/`, `{main-repo}/src/utils/` — shared business logic reference

**Crossplatform / RN directories (in this worktree — modify these):**
- `crossplatform/components/` — crossplatform RN components (modify these)
- `crossplatform/components/icons/` — SVG icons using react-native-svg
- `native/src/screens/` — RN screen orchestrators
- `native/src/components/` — RN-only components (e.g., LineChart, graph wrappers, modal sheets)
- Shared business logic is imported via `@shared/` aliases

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
