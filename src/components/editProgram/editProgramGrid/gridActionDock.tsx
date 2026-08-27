import { JSX, memo, useState } from "react";
import { Platform, View } from "react-native";
import { Text } from "../../primitives/text";
import { Pressable } from "../../primitives/pressable";
import { IconEdit2 } from "../../icons/iconEdit2";
import { IconCloseCircleOutline } from "../../icons/iconCloseCircleOutline";
import { IconKebab } from "../../icons/iconKebab";
import { DropdownMenu, DropdownMenuItem } from "../../dropdownMenu";
import { ActionSheet_show } from "../../../utils/actionSheet";
import { useRemScale } from "../../../utils/useRem";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import { useGridSelection } from "./gridSelectionContext";
import { GridBadge } from "./gridBadge";
import { StringUtils_pluralize } from "../../../utils/string";

// Rendered from NavScreenContent's footer slot, so it is anchored above the tab bar and the scroll
// content is padded by its height — the selection stays reachable no matter where the tapped strip
// has scrolled to.
export const GridActionDock = memo(function GridActionDock(): JSX.Element | null {
  const props = useGridSelection();
  // The tab bar's workout button overhangs its own bar by `-mt-scaled-6` (footer2.tsx), and that
  // overhang grows with the text size while padding does not — plain spacing is deliberately
  // constant at every size. At 1x the button clears the dock's second line on its own; past that it
  // starts sitting on top of it, so the dock buys the room back in the same scaled unit the
  // overhang is measured in, which is what keeps the two tracking each other further up the slider.
  const isTextLarge = useRemScale() >= 1.25;
  if (props == null) {
    return null;
  }
  const target = props.target;
  if (target.kind === "exercises" && target.placements.length === 0) {
    return null;
  }

  // Editing and duplicating both address one exercise; deleting is the only thing that reads
  // naturally over a set, so it is the one action that stays on with several selected.
  const single = target.kind === "exercises" && target.placements.length === 1 ? target.placements[0] : undefined;
  const label =
    target.kind === "day" || target.kind === "week" ? target.name : target.placements.map((p) => p.fullName).join(", ");
  // Distinct exercises, not placements: a placement is one *run* of an exercise, so an undulating
  // day would otherwise report a count several times its actual size.
  // Keyed, so an exercise whose active variation differs between weeks counts once rather than once
  // per spelling.
  // Neither a week nor a day says anything about itself here beyond its own words: what it holds,
  // and how far its verbs reach, is what the grid right above the dock is already showing.
  const description = target.kind === "week" || target.kind === "day" ? target.description : undefined;
  const detailsKey =
    target.kind === "week"
      ? `week-${target.weekIndex}`
      : target.kind === "day"
        ? `day-${target.rowIndexes.join("-")}`
        : undefined;
  // Structural facts only: what the grid can't draw and the strip has no room to say. Everything
  // else about an exercise is a tap away in the editor.
  const badges: string[] = [];
  if (single != null) {
    if (single.notused) {
      badges.push(single.isTemplate ? "tmpl" : "unused");
    }
    if (single.order != null) {
      badges.push(`order ${single.order}`);
    }
    if (single.tags.length > 0) {
      badges.push(`id ${single.tags.join(", ")}`);
    }
  }

  // Editing is the one thing you do over and over while laying a program out, so it keeps an icon.
  // The rest are occasional, and four icons plus a name plus badges stopped fitting the strip at
  // large font scales — the name was being truncated to make room for verbs nobody had reached for.
  //
  // An action that doesn't apply is left out rather than shown greyed: a menu is read as a list of
  // what you can do, and a disabled row in one is a worse answer than a shorter list.
  const overflowActions: IDockAction[] = [];
  if (target.kind === "week") {
    overflowActions.push({ label: "Week stats", onPress: () => props.onShowWeekStats(target.weekIndex) });
    overflowActions.push({ label: "Duplicate week", onPress: () => props.onDuplicateWeek(target.weekIndex) });
    overflowActions.push({
      label: "Delete week",
      isDestructive: true,
      onPress: () => props.onDeleteWeek(target.weekIndex),
    });
  } else if (target.kind === "day") {
    const rowIndexes = target.rowIndexes;
    if (rowIndexes.length === 1) {
      overflowActions.push({ label: "Day stats", onPress: () => props.onShowDayStats(rowIndexes[0]) });
    }
    overflowActions.push({
      label: `Duplicate ${StringUtils_pluralize("day", rowIndexes.length)}`,
      onPress: () => props.onDuplicateDays(rowIndexes),
    });
    overflowActions.push({
      label: `Delete ${StringUtils_pluralize("day", rowIndexes.length)}`,
      isDestructive: true,
      onPress: () => props.onDeleteDays(rowIndexes),
    });
  } else {
    const placements = target.placements;
    if (single != null) {
      overflowActions.push({ label: "Exercise stats", onPress: () => props.onShowExerciseStats(single) });
      overflowActions.push({ label: "Duplicate exercise", onPress: () => props.onDuplicate(single) });
    }
    overflowActions.push({
      label: `Delete ${StringUtils_pluralize("exercise", placements.length)}`,
      isDestructive: true,
      onPress: () => props.onDelete(placements),
    });
  }

  return (
    // The same top edge the editor's dock has (liftoEditorDock.tsx): the dock floats over the grid's
    // own scrolling content, so without a visible edge its background reads as more grid.
    <View
      className={`flex-row items-center gap-1 px-3 pt-2 border-t bg-background-default border-border-neutral ${
        isTextLarge ? "pb-scaled-4" : "pb-2"
      }`}
    >
      <Pressable className="p-1 nm-grid-clear-selection" testID="grid-clear-selection" onPress={props.onClear}>
        <IconCloseCircleOutline size={20} color={Tailwind_semantic().icon.neutral} />
      </Pressable>
      {/* Keyed by what is selected, so picking another week or day starts collapsed again rather
          than inheriting however far the last one was opened. */}
      <DockDetails
        key={detailsKey}
        name={label}
        badges={badges}
        description={description}
        detail={single?.progression}
      />
      <DockButton
        name="grid-action-edit"
        label={target.kind === "week" ? "Edit week" : target.kind === "day" ? "Edit day" : "Edit"}
        disabled={
          (target.kind === "exercises" && single == null) || (target.kind === "day" && target.rowIndexes.length !== 1)
        }
        onPress={() => {
          if (target.kind === "week") {
            props.onEditWeek(target.weekIndex);
          } else if (target.kind === "day") {
            if (target.rowIndexes.length === 1) {
              props.onEditDay(target.rowIndexes[0]);
            }
          } else if (single != null) {
            props.onEdit(single);
          }
        }}
      >
        <IconEdit2 size={24} color={Tailwind_semantic().icon.neutral} />
      </DockButton>
      <DockOverflow actions={overflowActions} />
    </View>
  );
});

// A description is as long as its author wanted it to be, and the dock is one strip above the tab
// bar — so it shows the first line and opens on a tap for the rest. The ellipsis is spelled out
// rather than left to truncation: a description whose first line happens to fit would otherwise look
// like the whole of it.
function DockDetails(props: { name: string; badges?: string[]; description?: string; detail?: string }): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const description = props.description;
  const firstLine = description?.split("\n")[0] ?? "";
  const hasMore = description != null && description.trim().length > firstLine.length;
  const badges = props.badges ?? [];
  return (
    <Pressable
      className="flex-1 ml-1 nm-grid-details"
      testID="grid-details"
      disabled={description == null}
      onPress={() => setIsExpanded((current) => !current)}
    >
      <View className="flex-row items-center">
        {/* Shrinks rather than fills: `flex-1` here would push the badges to the far edge of the
            dock, where they read as belonging to the buttons instead of to the name. */}
        <Text className="text-sm font-bold shrink text-text-primary" numberOfLines={2}>
          {props.name}
        </Text>
        {badges.map((badge) => (
          <GridBadge key={badge} label={badge} />
        ))}
      </View>
      {description != null && (
        <Text className="text-xs text-text-secondary" numberOfLines={isExpanded ? 6 : 1}>
          {isExpanded ? description : `${firstLine}${hasMore ? "…" : ""}`}
        </Text>
      )}
      {props.detail != null && (
        <Text className="text-xs text-text-secondary" numberOfLines={1}>
          {props.detail}
        </Text>
      )}
    </Pressable>
  );
}

interface IDockAction {
  label: string;
  isDestructive?: boolean;
  onPress: () => void;
}

// The same two-platform overflow the workout screen's exercise card uses (workoutExerciseCard.tsx):
// a native action sheet, a dropdown on web. Vertical dots, because the dock is a horizontal strip
// and a horizontal ⋯ reads as more of the same row rather than as something that opens.
function DockOverflow(props: { actions: IDockAction[] }): JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);
  const actions = props.actions;
  if (actions.length === 0) {
    return null;
  }
  const onPress = (): void => {
    if (Platform.OS === "web") {
      setIsOpen(true);
      return;
    }
    const labels = actions.map((a) => a.label).concat("Cancel");
    ActionSheet_show(
      {
        options: labels,
        cancelButtonIndex: labels.length - 1,
        destructiveButtonIndex: actions.findIndex((a) => a.isDestructive),
      },
      (buttonIndex) => {
        if (buttonIndex != null && buttonIndex < actions.length) {
          actions[buttonIndex].onPress();
        }
      }
    );
  };
  return (
    <View className="relative">
      <DockButton name="grid-action-more" label="More actions" onPress={onPress}>
        <IconKebab isVertical={true} color={Tailwind_semantic().icon.neutral} />
      </DockButton>
      {Platform.OS === "web" && isOpen && (
        // The dock sits on the bottom edge, so the menu has to grow upwards — hence a negative top
        // and no tip, which points the wrong way from down here.
        <DropdownMenu
          rightOffset="1rem"
          topOffset={`-${actions.length * 2.5 + 0.5}rem`}
          hideTip={true}
          onClose={() => setIsOpen(false)}
        >
          {actions.map((action, i) => (
            <DropdownMenuItem
              key={action.label}
              isTop={i === 0}
              // Both, because DropdownMenuItem drops `testID` and only spreads DOM attributes.
              data-testid={`grid-more-${action.label}`}
              testID={`grid-more-${action.label}`}
              className={action.isDestructive ? "text-text-error" : undefined}
              onClick={() => {
                setIsOpen(false);
                action.onPress();
              }}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
      )}
    </View>
  );
}

interface IDockButtonProps {
  name: string;
  label: string;
  disabled?: boolean;
  onPress: () => void;
  children: JSX.Element;
}

function DockButton(props: IDockButtonProps): JSX.Element {
  return (
    <Pressable
      className={`items-center justify-center p-2 rounded nm-${props.name}`}
      testID={props.name}
      // The icons carry the meaning visually; this is what carries it to a screen reader.
      accessibilityLabel={props.label}
      disabled={props.disabled}
      onPress={props.onPress}
      style={{ opacity: props.disabled ? 0.35 : 1 }}
    >
      {props.children}
    </Pressable>
  );
}
