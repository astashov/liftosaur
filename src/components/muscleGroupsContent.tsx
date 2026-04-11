import { JSX, Fragment, useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { Text } from "./primitives/text";
import {
  Muscle_getAvailableMuscleGroups,
  Muscle_getHiddenMuscleGroups,
  Muscle_getMuscleGroupName,
  Muscle_isBuiltInMuscleGroup,
  Muscle_getMusclesFromScreenMuscle,
} from "../models/muscle";
import { IMuscle, IScreenMuscle, ISettings } from "../types";
import { CollectionUtils_sort, CollectionUtils_remove } from "../utils/collection";
import { IconEdit2 } from "./icons/iconEdit2";
import { IconEyeClosed } from "./icons/iconEyeClosed";
import { IconTrash } from "./icons/iconTrash";
import { LinkButton } from "./linkButton";
import { MenuItemWrapper } from "./menuItem";
import { MuscleGroupImage } from "./muscleGroupImage";
import { BottomSheetMuscleGroupMusclePicker } from "./bottomSheetMuscleGroupMusclePicker";
import { StringUtils_dashcase } from "../utils/string";
import { useModal } from "../navigation/ModalStateContext";
import { getNavigationRef } from "../navigation/navUtils";
import { Dialog_prompt } from "../utils/dialog";

interface IProps {
  settings: ISettings;
  useInlineModals?: boolean;
  onCreate: (name: string) => void;
  onDelete: (muscleGroup: IScreenMuscle) => void;
  onUpdate?: (muscleGroup: IScreenMuscle, muscles: IMuscle[]) => void;
  onRestore: (muscleGroup: IScreenMuscle) => void;
}

export function MuscleGroupsContent(props: IProps): JSX.Element {
  const visibleMuscleGroups = Muscle_getAvailableMuscleGroups(props.settings);
  const hiddenMuscleGroups = Muscle_getHiddenMuscleGroups(props.settings);
  const [showMusclePicker, setShowMusclePicker] = useState<IScreenMuscle | undefined>(undefined);

  const openTextInput = useModal("textInputModal", (name) => {
    props.onCreate(name);
  });

  const handleAddMuscleGroup = async (): Promise<void> => {
    if (Platform.OS === "web") {
      openTextInput({
        title: "Enter new group name",
        inputLabel: "Name",
        placeholder: "My Group Name",
        submitLabel: "Add",
        dataCyPrefix: "modal-new-muscle-group",
      });
    } else {
      const name = await Dialog_prompt("Enter new group name");
      if (name && name.trim()) {
        props.onCreate(name.trim());
      }
    }
  };

  return (
    <View>
      {visibleMuscleGroups.map((muscleGroup) => {
        const muscleGroupName = Muscle_getMuscleGroupName(muscleGroup, props.settings);
        const muscleGroupSlug = StringUtils_dashcase(muscleGroupName);
        const isBuiltin = Muscle_isBuiltInMuscleGroup(muscleGroup);
        return (
          <MenuItemWrapper key={muscleGroup} name={`muscle-group-${muscleGroup}`}>
            <View className="flex-row items-center gap-4">
              <View className="w-12">
                <MuscleGroupImage muscleGroup={muscleGroup} size={48} />
              </View>
              <View className="flex-1 py-2">
                <Text className="text-base font-bold">{muscleGroupName}</Text>
                <Text className="text-xs text-text-secondary">
                  {CollectionUtils_sort(Muscle_getMusclesFromScreenMuscle(muscleGroup, props.settings), (a, b) =>
                    a.localeCompare(b)
                  ).join(", ")}
                </Text>
              </View>
              <View className="flex-row">
                <Pressable
                  className="p-2"
                  testID={`edit-muscle-group-${muscleGroupSlug}`}
                  data-cy={`edit-muscle-group-${muscleGroupSlug}`}
                  onPress={() => {
                    if (props.useInlineModals) {
                      setShowMusclePicker(muscleGroup);
                    } else {
                      getNavigationRef().then(({ navigationRef: ref }) =>
                        ref.navigate("muscleGroupMusclePickerModal", { muscleGroup })
                      );
                    }
                  }}
                >
                  <IconEdit2 />
                </Pressable>
                <Pressable
                  className="p-2"
                  testID={`delete-muscle-group-${muscleGroupSlug}`}
                  data-cy={`delete-muscle-group-${muscleGroupSlug}`}
                  onPress={() => {
                    props.onDelete(muscleGroup);
                  }}
                >
                  {isBuiltin ? <IconEyeClosed /> : <IconTrash />}
                </Pressable>
              </View>
            </View>
          </MenuItemWrapper>
        );
      })}
      <View className="pb-4">
        <LinkButton
          name="add-muscle-group"
          data-cy="add-muscle-group"
          className="text-sm"
          onClick={handleAddMuscleGroup}
        >
          Add custom muscle group
        </LinkButton>
      </View>
      {hiddenMuscleGroups.length > 0 && (
        <View className="flex-row flex-wrap pb-6">
          <Text className="text-xs text-text-secondary">Unhide muscle groups: </Text>
          {hiddenMuscleGroups.map((muscleGroup, i) => {
            const muscleGroupName = Muscle_getMuscleGroupName(muscleGroup, props.settings);
            const muscleGroupSlug = StringUtils_dashcase(muscleGroupName);
            return (
              <Fragment key={muscleGroup}>
                {i !== 0 ? <Text className="text-xs text-text-secondary">, </Text> : null}
                <LinkButton
                  data-cy={`unhide-muscle-group-${muscleGroupSlug}`}
                  name="unhide-muscle-group"
                  className="text-xs"
                  onClick={() => props.onRestore(muscleGroup)}
                >
                  {muscleGroupName}
                </LinkButton>
              </Fragment>
            );
          })}
        </View>
      )}
      {props.useInlineModals && showMusclePicker && Platform.OS === "web" && (
        <BottomSheetMuscleGroupMusclePicker
          settings={props.settings}
          muscleGroup={showMusclePicker}
          onClose={() => setShowMusclePicker(undefined)}
          onSelect={(muscle) => {
            const existingMuscles = Muscle_getMusclesFromScreenMuscle(showMusclePicker, props.settings);
            const newMuscles = existingMuscles.includes(muscle)
              ? CollectionUtils_remove(existingMuscles, muscle)
              : [...existingMuscles, muscle];
            props.onUpdate?.(showMusclePicker, newMuscles);
          }}
        />
      )}
    </View>
  );
}
