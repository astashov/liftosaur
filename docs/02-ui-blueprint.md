# 2 · Living Flow UI: screen & component blueprint

The attached spec describes ColorOS 17's **Living Flow** language through three pillars:
*Luminous Effect*, *Fluid Motion* and *Flexible Feedback*. Its numbers are best-estimate approximations,
not official OPPO values. LiftoDroid applies it as an original interpretation, with no OPPO assets or
branding, and tunes it for one hostile environment: **a gym floor**.

## Gym adaptations of the spec

| Spec says | Gym reality | LiftoDroid |
|---|---|---|
| Touch targets ≥ 48 dp | Chalk, sweat, gloves, an elevated heart rate | In-workout steppers are **72 dp**, primary actions **76 dp**, hero actions **88 dp** (`FlowTargets`) |
| Body text ≥ 4.5:1 | Harsh overhead fluorescents, glare | Secondary text raised to 60–64 %, glass fills thickened (`glassThin` 0.60). Data numerals are 56–88 sp tabular. |
| Glass on floating chrome | Glass costs legibility and battery | Glass only on chrome (top bar, island, pills, steppers). **Content and the set card are near-opaque cards.** |
| Dark: true-black base | 60–90 minute sessions | OLED black is the dark default |
| Glow = state | A glance from across the rack | Card contour glow: **accent** = lift, **rest-blue** = rest, **gold** = PR, **green** = done. State reads by colour *and* by text and shape. |
| Primary nav: floating island | No tab should be one mis-tap away mid-set | The island is **hidden during a workout**. A live workout owns the whole screen. |

## Layers (never more than three)

```
 ┌─ modal ────────  dialogs / sheets: glass.thick + scrim
 ├─ chrome ───────  glass top bar · floating island · ActiveSetFlowCard (opaque, glowing)
 └─ content ──────  scrolling lists marked Modifier.haze(...) so chrome blurs what's beneath
```

## Thumb-reach map (6.5" phone, one hand, right thumb)

```
┌──────────────────────────────┐
│ ░░░░░░░░░ HARD ░░░░░░░░░░░░░ │  status, title, sync pill, discard (rare, deliberate)
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ▒▒▒▒▒▒▒▒▒▒ STRETCH ▒▒▒▒▒▒▒▒▒ │  read-only content: exercise list, set chips (tap = focus)
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │
├──────────────────────────────┤ ← 60 %
│ ██████████ NATURAL █████████ │  every action that happens 20+ times a session:
│ ████████████████████████████ │  Done ✓ · steppers · RPE · Lift / +30 / −15 · Save
│ ████████████████████████████ │  (ActiveSetFlowCard, anchored to the bottom inset)
└──────────────────────────────┘
```

## Screen 1: Up Next (Dashboard)

```
┌──────────────────────────────────────┐
│ Up next                  (⌖ Garage)  │  ← gym chip: glass.thin pill → gym sheet
│                                      │
│ ╭──────────────────────────────────╮ │  flowCard (radius.lg), calm & opaque
│ │ GZCLP                            │ │  caption, accent
│ │ A1                               │ │  display 40
│ │ Week 1 · Day 1                   │ │
│ │ 🏋 Squat            5×3+  100 kg  │ │  one line per exercise: sets×reps, top load
│ │ 🏋 Bench Press      3×10   60 kg  │ │
│ │ 🏋 Lat Pulldown     3×15   45 kg  │ │
│ ╰──────────────────────────────────╯ │
│                                      │
│ ╭──────────────────────────────────╮ │
│ │        ▶  Start workout          │ │  88 dp primary pill, thumb zone
│ ╰──────────────────────────────────╯ │
│  ╭────────────────────────────────╮  │
│  │ (▶ Up next)  ◷ History  ⟋ Prog │  │  floating island: glass.thin, 64 dp,
│  ╰────────────────────────────────╯  │  morphing inner pill, swipeable
└──────────────────────────────────────┘
```

* **Start** is one tap. `GET /workout/next` was prefetched and cached, so it works with no signal.
  The root `AnimatedContent` **morphs** (scale 0.92 → 1, spring.morph) from Up Next into the live workout.
* **Gym sheet** (`ModalBottomSheet`, glass.thick, top radius.xl): 72 dp rows, a contour glow on the current
  gym, and a one-line note that weights are rounded to that gym's equipment. A switch calls `PUT /gyms/:id
  {setCurrent:true}` and refetches the preview, because rounding and plates change.

## Screen 2: Live workout tracker

```
┌──────────────────────────────────────┐
│ A1                     (☁ Synced) 🗑 │  glass.regular top bar + progressive blur edge
│ GZCLP · 23m                          │
│ ╭──────────────────────────────────╮ │
│ │ Squat                            │ │  exercise card; contour glows accent when current
│ │ [100×5✓][100×5✓][(100×5)][100×5+]│ │  set chips: ✓ green · current = accent fill ·
│ ╰──────────────────────────────────╯ │  amber text = target may be rewritten (update script)
│ ╭──────────────────────────────────╮ │  tap a chip → focus · long-press a done chip → undo
│ │ Bench Press   [60×10][60×10]…    │ │
│ ╰──────────────────────────────────╯ │
├══════════════════════════════════════┤
│ ╭──────────────────────────────────╮ │  ActiveSetFlowCard: see states below
│ │  Squat                 Set 3/4   │ │
│ │  100 kg                   × 5    │ │  numeralHero 88 sp / numeralLarge 56 sp
│ │  ▮▮▯▯───────  25×1 10×1 5×1 2.5×1│ │  plate strip (one side, kg colour code)
│ │  (⚙)  [        ✓  Done        ]  │ │  76 dp
│ ╰──────────────────────────────────╯ │
└──────────────────────────────────────┘
```

**Sync pill** (glass.thin): `Synced` (green) · `Syncing n` · `Offline · n queued` (amber) ·
`Needs attention` (red). There is always an icon and a label, never colour alone.

### ActiveSetFlowCard: the three core states

```
 READY TO LIFT                     LOGGING SET / RPE                 REST TIMER
╭────────────────────────╮       ╭────────────────────────╮       ╭────────────────────────╮
│ Squat        Set 3/4   │──┐    │ Squat        Set 3/4   │       │        ╭──────╮        │
│                        │  │    │  (−)    REPS    (+)    │       │      ╭╯ REST ╰╮       │
│ 100 kg ──────────┐ × 5 │  │    │          6       ┌──── │ reps  │      │ 1:42   │ ←comet│
│ ▮▮▯▯ 25 10 5 2.5 │     │  │    │  (−)   WEIGHT   (+)│   │       │      ╰╮      ╭╯ glow  │
│ (⚙) [ ✓ Done ]   │     │  │    │      102.5 kg ◀─┘    │ load  │        ╰──────╯        │
╰──────────────────┼─────╯  │    │ ▮▮▯▯ 25 10 5 2.5 1.25 │ plates│ UP NEXT                │
                   │        │    │ RPE (6)(7)(7.5)[8](9) │       │ Squat   100 kg × 5 ◀───┤ load
                   │        │    │ (✕)  [ ✓ Save set ]   │       │ ▮▮▯▯ 25 10 5 2.5       │
                   │        │    ╰────────────────────────╯       │ (−15) [ ⏭ Lift ] (+30) │
                   │        │                                     ╰────────────────────────╯
                   └────────┴── shared elements: "load", "reps", "plates" keyed by setId
```

| | Ready | Logging | Holding (timed) | Resting | Complete |
|---|---|---|---|---|---|
| Glow | accent | accent | accent → green at target | rest-blue (gold on PR) | green |
| Radius | 32 | 32 | 32 | **40**: rounder, calmer | 32 |
| Primary | **Done** (as prescribed), or **Log reps/set** if input is required | **Save set**, disabled until a required RPE is picked | **Stop** / **Switch side** (88 dp) | **Lift** (skip rest) | **Finish workout** (88 dp) |
| Secondary | ⚙ Adjust | ✕ Cancel | | −15 s · +30 s | |

"Requires input" follows the API's `missing_set_input` table exactly: `isAmrap`, `askWeight`,
`logRpe`, non-empty `promptedVars`, or a unilateral timed set. A plain prescribed set is
**one tap from Ready to Rest**.

### Fluid state morphing

* The container is one `AnimatedContent` inside `SharedTransitionLayout`, with a
  `SizeTransform(spring.morph)`, so the card **grows** from Ready into Logging and **shrinks** back.
  Content cross-fades with a 0.94 → 1 scale-in and a 1 → 1.03 scale-out.
* The **load numeral, reps, and plate strip are shared elements.** "100 kg" physically travels from
  the hero position into the weight stepper, and from Rest's *Up next* line into the next Ready hero.
  The card never jumps or cuts.
* Contour glow colour and corner radius animate on `spring.gentle` / `spring.morph`, so a state change
  reads as **light shifting**.
* Under reduced motion, every spring becomes a 150 ms tween or snap (`FlowMotion(reduced = true)`).

## Screen 3: Rest (lock screen / notification)

```
┌ LiftoDroid · 2 waiting to sync ─────────── 1:42 ┐   ongoing, VISIBILITY_PUBLIC
│ Resting                                         │   count-down chronometer
│ Next: Squat  100 kg × 5                         │
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░                              │   progress = elapsed / total
│ [ −15s ]        [ +30s ]        [ Skip ]        │   service actions, no unlock
└─────────────────────────────────────────────────┘
At 0:00 → "Rest over. Time to lift." (heads-up, CATEGORY_ALARM, auto-dismiss after 15 s)
```

## Screen 4: History & Progress

```
 HISTORY                                   PROGRESS
┌──────────────────────────────┐          ┌──────────────────────────────┐
│ History                      │          │ Progress                     │
│ ╭──────────────────────────╮ │          │ [Squat,Barbell](Bench)(OHP)→ │ chips, most-trained first
│ │ A1                 12.4k kg│ │          │ ╭──────────────────────────╮ │
│ │ Tue 14 Oct · GZCLP · 58 min│ │          │ │ Estimated 1RM            │ │
│ │ Squat      4 sets · top 5×100│ │       │ │ Best 142.5 kg · 9 Oct    │ │
│ │ Bench      3 sets · top 10×60│ │       │ │ 140 kg   14 Oct 2026     │ │ readout (scrub)
│ │ +2 more                  │ │          │ │ ───────╱‾‾╲__╱‾‾‾‾◉      │ │ 2 dp line, glow head
│ ╰──────────────────────────╯ │          │ ╰──────────────────────────╯ │
│  tap → expands in place      │          │ ╭ Volume per session ──────╮ │ bars, 4 dp rounded ends
│  (animateContentSize morph)  │          │ ╰──────────────────────────╯ │
│                              │          │ ╭ Rep records ─────────────╮ │ table, not a chart
│                              │          │ │ 1 RM ............ 140 kg │ │
│                              │          │ │ 5 RM ............ 120 kg │ │
│  ╭────────────────────────╮  │          │ ╰──────────────────────────╯ │
│  │ ▶  (◷ History)  ⟋      │  │          │ ╭ Bodyweight ──────────────╮ │
│  ╰────────────────────────╯  │          │ ╰──────────────────────────╯ │
└──────────────────────────────┘          └──────────────────────────────┘
```

Charts follow the dataviz rules: one series and one axis per chart, never dual-axis. e1RM and volume
are **separate** charts. The grid is recessive. The direct label marks only the latest point, and the
readout uses text tokens, never the series colour. Scrubbing gives a crosshair with a haptic detent
per session, the touch analogue of a hover tooltip. `chartSeries` was validated separately from
the UI accent: the dark-mode accent `#9E7BFF` failed the chart lightness band, so marks use `#8F66FF`.

## Component inventory → Living Flow mapping

| Component | File | Living Flow treatment |
|---|---|---|
| `Modifier.glass` | `components/Glass.kt` | Haze backdrop blur (24/32/44 dp) + tint fill + 1 dp gradient contour + optional state glow halo. Opaque when blur is unavailable or transparency is reduced. |
| `Modifier.flowCard` | `components/Glass.kt` | Calm opaque content card. The contour becomes accent glow when focused. |
| `Modifier.flowPressable` | `components/Pressable.kt` | spring.press compress (0.96, small 0.92) → spring.release rebound, radial touch glow at the finger, haptic tick |
| `FlowButton` | `components/Pressable.kt` | Pill (radius.full). Primary / Tonal / Glass / Danger. 76–88 dp in-workout. |
| `FlowIconButton` | `components/Pressable.kt` | Circular glass, 72 dp. Long-press repeat for the weight stepper. |
| `FloatingIsland` | `shell/FloatingIsland.kt` | Glass pill nav. The indicator's two edges ride different springs, so it **stretches** toward the target and settles. Horizontal swipe across the bar switches tabs with a detent tick. |
| `LuminousRing` | `workout/ActiveSetFlowCard.kt` | Sweep-gradient arc + "comet" glow head at the leading edge: light as progress |
| `PlateStrip` | `workout/ActiveSetFlowCard.kt` | One side of the bar. Plate height scales with mass; kg competition colours. |
| `TrendChart` | `components/TrendChart.kt` | Line/bar, scrub crosshair, luminous latest point |

## Motion & haptics spec

| Interaction | Animation token | Haptic |
|---|---|---|
| Press any control | spring.press → scale 0.96 / 0.92 | `TextHandleMove` light tick |
| Release | spring.release (ζ 0.55, one overshoot) | |
| Ready → Logging → Rest | SizeTransform spring.morph + shared bounds + fade/scale | |
| Set logged | | `EFFECT_CLICK`, one firm click |
| New e1RM PR on log | Glow → gold, "New estimated 1RM" | Rising triple (40·60·140 ms, amp 120→255) |
| Rest 3 · 2 · 1 s | Ring comet approaches the top | 18 ms ticks with rising amplitude (90/150/220) |
| Rest over | Glow → accent, card morphs to Ready | Long–short–long (220·80·260 ms), screen on or off |
| Island tab change / swipe | Indicator edge springs (press vs morph) | Detent tick per tab |
| Chart scrub | Crosshair snaps per point | Detent tick per point |
| Rejected input | | `EFFECT_DOUBLE_CLICK` |
| Reduced motion | Every spring → 150 ms tween or snap. No overshoot or stretch. | Unchanged. Haptics are always supplementary. |

## Accessibility & verification checklist

| Check | Status | Notes |
|---|---|---|
| Body text ≥ 4.5:1 over worst-case backdrop | ✅ by construction | Body text sits on opaque cards. Text on glass is limited to labels and captions over fills of ≥ 0.60. |
| Reduced transparency | ✅ | `FlowColors.opaque()` is used automatically below API 31, and via `UserPrefs.reduceTransparency` (stored in DataStore and read by `FlowTheme`). An on-screen toggle is the remaining step: Settings screen, see README roadmap. |
| Reduced motion | ✅ | `ANIMATOR_DURATION_SCALE == 0` → `FlowMotion(reduced = true)` |
| Touch targets | ✅ | 48 dp minimum everywhere. 72–88 dp for in-workout controls. |
| Screen reader | ✅ | Icon buttons have content descriptions. Steppers are polite live regions. Chips describe "Set 2, 5 reps at 100, done. Long-press to undo". |
| Colour-only state | ✅ | Every glow state also has a text label (Set n/m, REST, New estimated 1RM, sync pill text). |
| Font scale 200 % | ⚠️ needs device pass | Layouts use `defaultMinSize`, never fixed heights, for text-bearing controls. The 88 sp numeral is the risk to verify. |
| Dark / light | ✅ | Both token sets. Dark is the OLED gym default. |
| Frame rate on mid-range hardware | ⚠️ needs device pass | At most 3 blur layers visible. The ring redraws per frame only while resting. |
| No trademarked OPPO assets | ✅ | Original icons, no OPPO Sans bundled (system sans + tabular figures) |
