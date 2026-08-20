import { JSX, memo, useMemo } from "react";
import { View } from "react-native";
import { Text } from "../../primitives/text";
import { Pressable } from "../../primitives/pressable";
import { useRem } from "../../../utils/useRem";
import { FastText } from "../../primitives/fastText";
import { StyledText, StyledText_remToPx } from "../../../utils/styledText";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import {
  IProgramGridDensity,
  IProgramGridPlacement,
  IProgramGridSelection,
  IProgramGridTokenKind,
  ProgramGrid_cellScheme,
  ProgramGrid_isRelated,
} from "../../../pages/planner/models/programGrid";
import { GRID_CELL_INSET_X, GRID_CELL_INSET_Y } from "../../../pages/planner/models/programGridGeometry";

export interface IGridCellProps {
  placement: IProgramGridPlacement;
  width: number;
  height: number;
  density: IProgramGridDensity;
  selection?: IProgramGridSelection;
  onSelect: (placementId: string) => void;
  isResizing: boolean;
}

export const GridCell = memo(function GridCell(props: IGridCellProps): JSX.Element {
  const rem = useRem();
  const { placement, selection } = props;
  const scheme = ProgramGrid_cellScheme(placement, props.density);
  const isSelected = selection?.selectedIds.has(placement.id) ?? false;
  const isLinked = selection?.linkedIds.has(placement.id) ?? false;
  const isRelated = ProgramGrid_isRelated(selection, placement.id);
  // Saturated enough to hold their own against the warm day box behind them — the paler purple and
  // grey went muddy on yellow. Resolved values rather than `bg-*` classes so a utility that the
  // scanner never emitted can't silently fall back to transparent; these still follow the theme.
  const background = placement.isOverride
    ? Tailwind_semantic().background.yellowdark
    : placement.isTemplate
      ? Tailwind_semantic().border.prominent
      : Tailwind_semantic().background.cardpurpleselected;
  // Each border is a couple of steps darker than its own fill in light mode and lighter in dark, so
  // strips keep a defined edge against both the fill and the day box behind them. The override's is
  // heavier still — it has to read as a punch-in, not just another card.
  const borderColor = placement.isOverride
    ? Tailwind_semantic().text.cardyellowsubtle
    : placement.isTemplate
      ? Tailwind_semantic().text.secondary
      : Tailwind_semantic().text.purple;
  const built = useMemo(() => {
    // The same palette entries the editor's own highlighting uses (liftoEditorBrain's nodeStyles),
    // so a strip and the Liftoscript it stands for are the same colors — rather than the workout
    // screen's reps/weight/rpe family, which is a second opinion about the same tokens.
    const colorByKind: Record<IProgramGridTokenKind, string> = {
      setPart: Tailwind_semantic().syntax.atom,
      weight: Tailwind_semantic().syntax.literal,
      rpe: Tailwind_semantic().syntax.literal,
      timer: Tailwind_semantic().syntax.keyword,
      auto: Tailwind_semantic().syntax.keyword,
      separator: Tailwind_semantic().text.secondary,
    };
    const builder = new StyledText();
    for (const token of scheme) {
      builder.add(token.text, { color: colorByKind[token.kind] });
    }
    return builder.build();
  }, [scheme]);

  return (
    <Pressable
      style={{
        width: props.width,
        height: props.height,
        paddingHorizontal: GRID_CELL_INSET_X * rem,
        paddingVertical: GRID_CELL_INSET_Y * rem,
        // Unrelated strips recede rather than disappear — the shape of the program stays readable
        // while the reuse relationship is what stands out.
        opacity: isRelated ? 1 : 0.3,
      }}
      testID={`grid-cell-${placement.fullName}-${placement.colStart}`}
      onPress={() => props.onSelect(placement.id)}
    >
      <View
        className="flex-1 overflow-hidden rounded"
        style={{
          borderColor: isSelected || isLinked || props.isResizing ? Tailwind_semantic().icon.purple : borderColor,
          borderWidth: isSelected || props.isResizing ? 2 : placement.isOverride ? 2 : 1,
          borderStyle: placement.isTemplate ? "dashed" : "solid",
        }}
      >
        {/* The fill is translucent so the day boxes underneath stay visible through a strip that
            spans several of them. On web an absolutely positioned sibling paints above in-flow
            ones, so the content needs to be positioned too to stay on top. */}
        {/* Opacity via style, not an `opacity-*` class: the utility is only emitted if the scanner
            happens to generate that step, and a missing one silently renders fully opaque. */}
        <View className="absolute inset-0" style={{ opacity: 0.85, backgroundColor: background }} />
        <View className="relative justify-center flex-1 px-2">
          <Text
            className={`text-xs font-bold ${placement.isTemplate ? "text-text-secondary" : "text-text-primary"}`}
            numberOfLines={1}
          >
            {placement.reuseOf != null ? "↳ " : ""}
            {placement.fullName}
            {placement.isTemplate ? " ·tmpl" : ""}
          </Text>
          {placement.reuseOf != null ? (
            // A reuser's resolved numbers vary week to week; the strip is a pointer, so the numbers
            // live in the source's cells (see the grid RFC's run-length rule).
            <Text className="text-xs text-text-secondary" numberOfLines={1}>
              reuses {placement.reuseOf}
            </Text>
          ) : (
            built.text !== "" && (
              <FastText
                text={built.text}
                fragments={built.fragments}
                numberOfLines={1}
                fontSize={StyledText_remToPx("xs", rem)}
              />
            )
          )}
        </View>
      </View>
    </Pressable>
  );
});
