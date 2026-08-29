import { JSX, memo, useMemo } from "react";
import { View } from "react-native";
import { Text } from "../../primitives/text";
import { Pressable } from "../../primitives/pressable";
import { useRem } from "../../../utils/useRem";
import { FastText } from "../../primitives/fastText";
import { IFastTextBuild, StyledText, StyledText_remToPx } from "../../../utils/styledText";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import {
  IProgramGridPlacement,
  IProgramGridSelection,
  IProgramGridSchemeToken,
  IProgramGridTokenKind,
  ProgramGrid_hasResolvedLine,
  ProgramGrid_orderSuffix,
} from "../../../pages/planner/models/programGrid";
import { GRID_CELL_INSET_X, GRID_CELL_INSET_Y } from "../../../pages/planner/models/programGridGeometry";
import { GridBadge } from "./gridBadge";

export interface IGridCellProps {
  placement: IProgramGridPlacement;
  width: number;
  height: number;
  showScheme: boolean;
  selection?: IProgramGridSelection;
  onSelect: (placementId: string) => void;
  isResizing: boolean;
}

function buildScheme(tokens: IProgramGridSchemeToken[], isActive: boolean): IFastTextBuild {
  const builder = new StyledText();
  // Syntax coloring is legible on a pale fill and illegible on the strong one, so a selected strip
  // drops it and prints in the inverse text color instead. The colors are what is being given up
  // for the selection to be unmistakable, and only for as long as it is selected.
  if (isActive) {
    for (const token of tokens) {
      builder.add(token.text, {
        color: Tailwind_semantic().text.primaryinverse,
        fontWeight: token.isCurrent ? "700" : undefined,
      });
    }
    return builder.build();
  }
  // The same palette entries the editor's own highlighting uses (liftoEditorBrain's nodeStyles),
  // so a strip and the Liftoscript it stands for are the same colors — rather than the workout
  // screen's reps/weight/rpe family, which is a second opinion about the same tokens.
  const colorByKind: Record<IProgramGridTokenKind, string> = {
    setPart: Tailwind_semantic().syntax.atom,
    weight: Tailwind_semantic().syntax.literal,
    rpe: Tailwind_semantic().syntax.literal,
    timer: Tailwind_semantic().syntax.keyword,
    auto: Tailwind_semantic().syntax.keyword,
    // The editor leaves a `...name` reference unstyled, so it stays the quiet one here too.
    reuse: Tailwind_semantic().text.secondary,
    separator: Tailwind_semantic().text.secondary,
  };
  for (const token of tokens) {
    builder.add(token.text, { color: colorByKind[token.kind], fontWeight: token.isCurrent ? "700" : undefined });
  }
  return builder.build();
}

export const GridCell = memo(function GridCell(props: IGridCellProps): JSX.Element {
  const rem = useRem();
  const { placement, selection } = props;
  const scheme = props.showScheme ? placement.scheme : [];
  const isSelected = selection?.selectedIds.has(placement.id) ?? false;
  // Reuse partners and the other runs of the same exercise share one step between them: both answer
  // "where else does this go", and the strip's own family already says which kind of thing it is.
  const isReached =
    (selection?.linkedIds.has(placement.id) ?? false) || (selection?.sameExerciseIds.has(placement.id) ?? false);
  const isActive = isSelected || props.isResizing;
  // Every strip belongs to one color family, and the family says what kind of thing it is. How far
  // along that family it is fired says how the current selection relates to it: pale at rest, one
  // step up when the selection reaches it, the strong end when it *is* the selection — dark on light
  // themes, light on dark ones.
  //
  // All three are fills rather than borders. Selection was a border weight once, and a reuse partner
  // a border color, and both were nearly invisible next to each other on a strip of the same hue; a
  // fill is legible from across the grid, which is the distance you actually read this from.
  //
  // Resolved values rather than `bg-*` classes so a utility that the scanner never emitted can't
  // silently fall back to transparent; these still follow the theme.
  const family = placement.isOverride ? "override" : placement.notused ? "notused" : "exercise";
  const fills = {
    override: [
      Tailwind_semantic().background.gridoverride,
      Tailwind_semantic().background.gridoverridereached,
      Tailwind_semantic().background.gridoverrideactive,
    ],
    notused: [
      Tailwind_semantic().background.gridnotused,
      Tailwind_semantic().background.gridnotusedreached,
      Tailwind_semantic().background.gridnotusedactive,
    ],
    exercise: [
      Tailwind_semantic().background.gridexercise,
      Tailwind_semantic().background.gridexercisereached,
      Tailwind_semantic().background.gridexerciseactive,
    ],
  }[family];
  const background = isActive ? fills[2] : isReached ? fills[1] : fills[0];
  // A resting border is a couple of steps darker than its own fill in light mode and lighter in
  // dark, so strips keep a defined edge against both the fill and the day box behind them. The
  // override's is heavier still — it has to read as a punch-in, not just another card.
  //
  // Anything the selection touches borrows the strong tone for its edge as well. On a selected strip
  // that is its own fill, so it reads as one solid block rather than a filled card in a frame; on a
  // reached one it sharpens a step that is deliberately gentle — the mid fill is only one rung above
  // resting, and on its own it was easy to miss.
  const borderColor =
    isActive || isReached
      ? fills[2]
      : {
          override: Tailwind_semantic().text.cardyellowsubtle,
          notused: Tailwind_semantic().border.gridnotused,
          exercise: Tailwind_semantic().border.gridexercise,
        }[family];
  const built = useMemo(() => buildScheme(scheme, isActive), [scheme, isActive]);
  // Only for a line whose scheme is a `...reference` that resolves to something; `resolved` is empty
  // for everything else, so an ordinary strip keeps its two lines even in a grid tall enough for
  // three. The same predicate the geometry used to give this lane its height — a strip that fails it
  // gets no row at all, rather than a blank line in a lane that was never made room for one.
  const showScheme = props.showScheme;
  const builtResolved = useMemo(
    () =>
      showScheme && ProgramGrid_hasResolvedLine(placement)
        ? placement.resolved.map((section) => ({ ...section, built: buildScheme(section.tokens, isActive) }))
        : [],
    [placement, showScheme, isActive]
  );

  const nameColor = isActive
    ? Tailwind_semantic().text.primaryinverse
    : placement.notused
      ? Tailwind_semantic().text.secondary
      : Tailwind_semantic().text.primary;

  // One node rather than a nested <Text> per rung: the ladder is drawn on every strip of every week,
  // and on Android a nested span needs its own font family to change weight at all.
  const name = useMemo(() => {
    const builder = new StyledText();
    placement.nameParts.forEach((part, index) => {
      if (index > 0) {
        builder.add(" | ", { fontWeight: "400" });
      }
      builder.add(part.text, { fontWeight: part.isCurrent ? "700" : "400" });
    });
    return builder.build();
  }, [placement.nameParts]);

  return (
    <Pressable
      style={
        {
          width: props.width,
          height: props.height,
          paddingHorizontal: GRID_CELL_INSET_X * rem,
          paddingVertical: GRID_CELL_INSET_Y * rem,
          // A strip is the most-dragged thing in the grid, so it says "pick me up" rather than
          // "click me". Set here rather than inherited from the drag handle above, because
          // react-native-web gives every Pressable a cursor of its own. `grab` is outside RN's
          // CursorValue, hence the cast — it is dropped on native, which has no cursor anyway.
          cursor: "grab",
        } as object
      }
      testID={`grid-cell-${placement.fullName}-${placement.colStart}`}
      onPress={() => props.onSelect(placement.id)}
    >
      <View
        className="flex-1 overflow-hidden rounded"
        style={{
          borderColor,
          borderWidth: isActive || placement.isOverride ? 2 : 1,
        }}
      >
        {/* The fill is translucent so the day boxes underneath stay visible through a strip that
            spans several of them. On web an absolutely positioned sibling paints above in-flow
            ones, so the content needs to be positioned too to stay on top. */}
        {/* Opacity via style, not an `opacity-*` class: the utility is only emitted if the scanner
            happens to generate that step, and a missing one silently renders fully opaque. */}
        {/* Translucent only while pale — a selected strip is opaque, because the day box showing
            through the strong fill is exactly what would mute it back down. */}
        <View className="absolute inset-0" style={{ opacity: isActive ? 1 : 0.85, backgroundColor: background }} />
        {/* The same bar the workout screen draws down the side of supersetted entries
            (historyEntry.tsx), in the same colors — inside the strip rather than beside it, because
            here there is no gutter to hang it in. It sits above the fill and outside the content's
            padding, so it reads as part of the strip's edge. */}
        {placement.supersetColor != null && (
          <View
            testID="grid-cell-superset-line"
            className="absolute top-0 bottom-0 left-0"
            style={{ width: 3, backgroundColor: placement.supersetColor }}
          />
        )}
        <View className="relative justify-center flex-1 px-2">
          <View className="flex-row items-center">
            <FastText
              text={name.text}
              fragments={name.fragments}
              color={nameColor}
              fontSize={StyledText_remToPx("xs", rem)}
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            />
            {/* Split off the name rather than written into it, so it is the name that gives way in
                a narrow column: `Squat, Barb…[1]` still says which exercise runs first, and
                `Squat, Barbell…` says nothing about order at all. */}
            {placement.order != null && (
              <Text className="text-xs font-bold shrink-0" style={{ color: nameColor }} numberOfLines={1}>
                {ProgramGrid_orderSuffix(placement)}
              </Text>
            )}
            {/* Only what a strip is already shaped to carry. An exercise's tags are just as
                invisible, but a cell is one column wide and the dock is the whole screen.
                And it goes at the same width the scheme does: the badge is fixed-size, so a column
                too narrow for numbers is one where it crowds the name down to nothing rather than
                sharing the room with it. Zoomed that far out the question is which exercises are
                where, and the green fill still answers what kind of thing this is. */}
            {props.showScheme && placement.notused && (
              <GridBadge label={placement.isTemplate ? "tmpl" : "unused"} isInverse={isActive} />
            )}
          </View>
          {built.text !== "" && (
            <FastText
              text={built.text}
              fragments={built.fragments}
              numberOfLines={1}
              fontSize={StyledText_remToPx("xs", rem)}
            />
          )}
          {/* What the reference above resolves to. Laid out as sections against the week columns
              the strip covers rather than as one line, because a reusing line reads the same every
              week while what it reuses need not — and one strip printing week 1's numbers over four
              weeks that run something else is worse than printing none.

              No dividers between them: the strip is one thing, and a rule down the middle of it
              starts an argument about whether it is still one thing. Where the numbers do change,
              the change itself is the boundary — and each section clips to its own column, so a
              section too narrow for its numbers ellipsizes instead of running into the next one's.

              `flex` rather than a width, so the sections split whatever the strip is actually wide —
              including mid-resize, when it is wider than its columns. */}
          {builtResolved.length > 0 && (
            <View className="flex-row" testID="grid-cell-resolved">
              {builtResolved.map((section, index) => (
                <View
                  key={index}
                  className="overflow-hidden"
                  style={{
                    flex: section.colEnd - section.colStart + 1,
                    paddingRight: index < builtResolved.length - 1 ? GRID_CELL_INSET_X * rem : 0,
                  }}
                >
                  <FastText
                    text={section.built.text}
                    fragments={section.built.fragments}
                    numberOfLines={1}
                    fontSize={StyledText_remToPx("xs", rem)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});
