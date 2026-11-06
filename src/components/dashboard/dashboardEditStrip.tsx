import { JSX } from "react";
import { Pressable, View } from "react-native";
import { IconUndo } from "../icons/iconUndo";
import { IconUiMode } from "../icons/iconUiMode";
import { IconFullTextMode } from "../icons/iconFullTextMode";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

export type IDashboardEditMode = "ui" | "text";

interface IDashboardEditStripProps {
  mode: IDashboardEditMode;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onMode: (mode: IDashboardEditMode) => void;
}

function undoColor(isEnabled: boolean): string {
  return isEnabled ? Tailwind_semantic().icon.neutral : Tailwind_semantic().icon.light;
}

export function DashboardEditStrip(props: IDashboardEditStripProps): JSX.Element {
  return (
    <View className="flex-row items-center justify-between px-2 py-2 border-b bg-background-default border-background-subtle">
      <View className="flex-row items-center">
        <Pressable
          testID="dashboard-edit-undo"
          data-testid="dashboard-edit-undo"
          className="px-2 py-2"
          disabled={!props.canUndo}
          onPress={props.onUndo}
        >
          <IconUndo width={20} height={20} color={undoColor(props.canUndo)} />
        </Pressable>
        <Pressable
          testID="dashboard-edit-redo"
          data-testid="dashboard-edit-redo"
          className="px-2 py-2"
          disabled={!props.canRedo}
          onPress={props.onRedo}
        >
          <View style={{ transform: [{ scaleX: -1 }] }}>
            <IconUndo width={20} height={20} color={undoColor(props.canRedo)} />
          </View>
        </Pressable>
      </View>
      <View className="flex-row items-center">
        <DashboardEditModeButton
          name="dashboard-edit-mode-ui"
          isSelected={props.mode === "ui"}
          onPress={() => props.onMode("ui")}
        >
          {(color) => <IconUiMode color={color} />}
        </DashboardEditModeButton>
        <DashboardEditModeButton
          name="dashboard-edit-mode-text"
          isSelected={props.mode === "text"}
          onPress={() => props.onMode("text")}
        >
          {(color) => <IconFullTextMode color={color} />}
        </DashboardEditModeButton>
      </View>
    </View>
  );
}

function DashboardEditModeButton(props: {
  name: string;
  isSelected: boolean;
  onPress: () => void;
  children: (color: string) => JSX.Element;
}): JSX.Element {
  return (
    <Pressable
      testID={props.name}
      data-testid={props.name}
      className={`px-2 py-2 rounded ${props.isSelected ? "bg-purplev3-200" : ""}`}
      onPress={props.isSelected ? undefined : props.onPress}
    >
      {props.children(props.isSelected ? Tailwind_semantic().icon.purple : Tailwind_semantic().icon.neutral)}
    </Pressable>
  );
}
