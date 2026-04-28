import { JSX, Fragment } from "react";
import { View, Pressable } from "react-native";
import { Text } from "./primitives/text";
import { Progress_getSupersetGroups } from "../models/progress";
import { IHistoryRecord, IHistoryEntry, ISettings } from "../types";
import { ObjectUtils_entriesNonnull } from "../utils/object";
import { Button } from "./button";
import { Exercise_get, Exercise_fullName } from "../models/exercise";
import { StringUtils_dashcase } from "../utils/string";
import { useModal } from "../navigation/ModalStateContext";

export interface IBottomSheetWorkoutSupersetContentProps {
  onSelect: (name: string | undefined) => void;
  progress: IHistoryRecord;
  entry: IHistoryEntry;
  settings: ISettings;
  onClose: () => void;
}

export function BottomSheetWorkoutSupersetContent(props: IBottomSheetWorkoutSupersetContentProps): JSX.Element {
  const supersetGroups = Progress_getSupersetGroups(props.progress.entries);

  const openTextInput = useModal("textInputModal", (name) => {
    props.onSelect(name);
    props.onClose();
  });

  return (
    <View>
      <View className="py-2 mt-2">
        <Text className="text-lg font-semibold text-center">Select Superset Group</Text>
      </View>
      <View className="pb-4">
        <Pressable
          data-testid="superset-group-none"
          testID="superset-group-none"
          className={`${props.entry.superset == null ? "bg-background-cardpurple" : ""} px-4 py-1 border-b border-border-neutral`}
          style={{ minHeight: 48, justifyContent: "center" }}
          onPress={() => {
            props.onSelect(undefined);
            props.onClose();
          }}
        >
          <Text className="font-bold">None</Text>
        </Pressable>
        {ObjectUtils_entriesNonnull(supersetGroups).map(([name, entries]) => {
          const isSelected = props.entry.superset === name;
          return (
            <Pressable
              key={name}
              data-testid={`superset-group-${StringUtils_dashcase(name)}`}
              testID={`superset-group-${StringUtils_dashcase(name)}`}
              className={`${isSelected ? "bg-background-cardpurple" : ""} px-4 py-1 border-b border-border-neutral`}
              style={{ minHeight: 48, justifyContent: "center" }}
              onPress={() => {
                props.onSelect(name);
                props.onClose();
              }}
            >
              <Text className="text-base font-bold">{name}</Text>
              {entries.length > 0 && (
                <Text className="text-xs text-text-secondary">
                  {entries.map((e, i) => {
                    const exercise = Exercise_get(e.exercise, props.settings.exercises);
                    return (
                      <Fragment key={`${e.exercise.id}_${e.exercise.equipment}`}>
                        {i !== 0 ? ", " : ""}
                        <Text className="font-bold">{Exercise_fullName(exercise, props.settings)}</Text>
                      </Fragment>
                    );
                  })}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
      <View className="w-full px-4 pt-2 pb-2">
        <Button
          className="w-full"
          name="superset-create-group"
          kind="purple"
          buttonSize="lg"
          onClick={() => {
            openTextInput({
              title: "Enter new group name",
              inputLabel: "Name",
              placeholder: "My Group Name",
              submitLabel: "Add",
              dataCyPrefix: "modal-new-superset",
            });
          }}
          data-testid="superset-create-group"
          testID="superset-create-group"
        >
          Create New Group
        </Button>
      </View>
    </View>
  );
}
