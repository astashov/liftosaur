import { JSX, memo } from "react";
import { View } from "react-native";
import { Text } from "../primitives/text";
import { Pressable } from "../primitives/pressable";
import { IconEdit2 } from "../icons/iconEdit2";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { IconTrash } from "../icons/iconTrash";
import { IconCloseCircleOutline } from "../icons/iconCloseCircleOutline";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { useGridSelection } from "./gridSelectionContext";

// Rendered from NavScreenContent's footer slot, so it is anchored above the tab bar and the scroll
// content is padded by its height — the selection stays reachable no matter where the tapped strip
// has scrolled to.
export const GridActionDock = memo(function GridActionDock(): JSX.Element | null {
  const props = useGridSelection();
  const placements = props?.placements ?? [];
  if (props == null || placements.length === 0) {
    return null;
  }
  // Editing and duplicating both address one exercise; deleting is the only thing that reads
  // naturally over a set, so it is the one action that stays on with several selected.
  const single = placements.length === 1 ? placements[0] : undefined;
  // Naming what is selected beats counting it — the count is obvious from the names, and which
  // exercises are about to be deleted is the thing worth being sure about.
  const label = placements.map((p) => p.fullName).join(", ");

  return (
    <View className="flex-row items-center gap-1 px-3 py-2 border-t bg-background-default border-background-subtle">
      <Pressable className="p-1 nm-grid-clear-selection" testID="grid-clear-selection" onPress={props.onClear}>
        <IconCloseCircleOutline size={20} color={Tailwind_semantic().icon.neutral} />
      </Pressable>
      <Text className="flex-1 ml-1 text-sm font-bold text-text-primary" numberOfLines={2}>
        {label}
      </Text>
      <DockButton
        name="grid-action-edit"
        label="Edit"
        disabled={single == null}
        onPress={() => single != null && props.onEdit(single)}
      >
        <IconEdit2 size={18} color={Tailwind_semantic().icon.neutral} />
      </DockButton>
      <DockButton
        name="grid-action-duplicate"
        label="Duplicate"
        disabled={single == null}
        onPress={() => single != null && props.onDuplicate(single)}
      >
        <IconDuplicate2 />
      </DockButton>
      <DockButton name="grid-action-delete" label="Delete" onPress={() => props.onDelete(placements)}>
        <IconTrash width={15} height={18} color={Tailwind_semantic().icon.red} />
      </DockButton>
    </View>
  );
});

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
