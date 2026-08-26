import { JSX, memo, useState } from "react";
import { View } from "react-native";
import { Text } from "../../primitives/text";
import { Pressable } from "../../primitives/pressable";
import { IconEdit2 } from "../../icons/iconEdit2";
import { IconDuplicate2 } from "../../icons/iconDuplicate2";
import { IconTrash } from "../../icons/iconTrash";
import { IconCloseCircleOutline } from "../../icons/iconCloseCircleOutline";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import { useGridSelection } from "./gridSelectionContext";
import { StringUtils_pluralize } from "../../../utils/string";

// Rendered from NavScreenContent's footer slot, so it is anchored above the tab bar and the scroll
// content is padded by its height — the selection stays reachable no matter where the tapped strip
// has scrolled to.
export const GridActionDock = memo(function GridActionDock(): JSX.Element | null {
  const props = useGridSelection();
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
  const exerciseCount = target.kind === "day" ? new Set(target.placements.map((p) => p.key)).size : 0;
  // A week says nothing about itself here: how many days and exercises it has is what the grid
  // above the dock is already showing. Its own description is not, so that is what it gets.
  const caption =
    target.kind === "day"
      ? `${exerciseCount === 0 ? "empty" : `${exerciseCount} ${StringUtils_pluralize("exercise", exerciseCount)}`} · in every week`
      : undefined;

  return (
    // The same top edge the editor's dock has (liftoEditorDock.tsx): the dock floats over the grid's
    // own scrolling content, so without a visible edge its background reads as more grid.
    <View className="flex-row items-center gap-1 px-3 py-2 border-t bg-background-default border-border-neutral">
      <Pressable className="p-1 nm-grid-clear-selection" testID="grid-clear-selection" onPress={props.onClear}>
        <IconCloseCircleOutline size={20} color={Tailwind_semantic().icon.neutral} />
      </Pressable>
      {target.kind === "week" ? (
        // Keyed by week, so picking another one starts collapsed again rather than inheriting
        // however far the last one was opened.
        <DockWeek key={target.weekIndex} name={target.name} description={target.description} />
      ) : (
        <View className="flex-1 ml-1">
          <Text className="text-sm font-bold text-text-primary" numberOfLines={2}>
            {label}
          </Text>
          {caption != null && (
            <Text className="text-xs text-text-secondary" numberOfLines={1}>
              {caption}
            </Text>
          )}
        </View>
      )}
      {target.kind !== "day" && (
        <DockButton
          name="grid-action-edit"
          label={target.kind === "week" ? "Edit week" : "Edit"}
          disabled={target.kind === "exercises" && single == null}
          onPress={() => {
            if (target.kind === "week") {
              props.onEditWeek(target.weekIndex);
            } else if (single != null) {
              props.onEdit(single);
            }
          }}
        >
          <IconEdit2 size={24} color={Tailwind_semantic().icon.neutral} />
        </DockButton>
      )}
      <DockButton
        name="grid-action-duplicate"
        label={
          target.kind === "day"
            ? `Duplicate ${StringUtils_pluralize("day", target.rowIndexes.length)}`
            : target.kind === "week"
              ? "Duplicate week"
              : "Duplicate"
        }
        disabled={target.kind === "exercises" && single == null}
        onPress={() => {
          if (target.kind === "day") {
            props.onDuplicateDays(target.rowIndexes);
          } else if (target.kind === "week") {
            props.onDuplicateWeek(target.weekIndex);
          } else if (single != null) {
            props.onDuplicate(single);
          }
        }}
      >
        <IconDuplicate2 width={20} height={21} />
      </DockButton>
      <DockButton
        name="grid-action-delete"
        label={
          target.kind === "day"
            ? `Delete ${StringUtils_pluralize("day", target.rowIndexes.length)}`
            : target.kind === "week"
              ? "Delete week"
              : "Delete"
        }
        onPress={() => {
          if (target.kind === "day") {
            props.onDeleteDays(target.rowIndexes);
          } else if (target.kind === "week") {
            props.onDeleteWeek(target.weekIndex);
          } else {
            props.onDelete(target.placements);
          }
        }}
      >
        <IconTrash width={17} height={21} color={Tailwind_semantic().icon.red} />
      </DockButton>
    </View>
  );
});

// A description is as long as its author wanted it to be, and the dock is one strip above the tab
// bar — so it shows the first line and opens on a tap for the rest. The ellipsis is spelled out
// rather than left to truncation: a description whose first line happens to fit would otherwise look
// like the whole of it.
function DockWeek(props: { name: string; description?: string }): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const description = props.description;
  const firstLine = description?.split("\n")[0] ?? "";
  const hasMore = description != null && description.trim().length > firstLine.length;
  return (
    <Pressable
      className="flex-1 ml-1 nm-grid-week-details"
      testID="grid-week-details"
      disabled={description == null}
      onPress={() => setIsExpanded((current) => !current)}
    >
      <Text className="text-sm font-bold text-text-primary" numberOfLines={2}>
        {props.name}
      </Text>
      {description != null && (
        <Text className="text-xs text-text-secondary" numberOfLines={isExpanded ? 6 : 1}>
          {isExpanded ? description : `${firstLine}${hasMore ? "…" : ""}`}
        </Text>
      )}
    </Pressable>
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
