import { JSX, Fragment } from "react";
import { View, Pressable, Platform } from "react-native";
import { Text } from "../primitives/text";
import { IEvaluatedProgram, Program_getSupersetGroups } from "../../models/program";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";

import { ISettings } from "../../types";
import { ObjectUtils_entriesNonnull } from "../../utils/object";
import { Button } from "../button";
import { StringUtils_dashcase } from "../../utils/string";
import { useModal } from "../../navigation/ModalStateContext";

interface IBottomSheetEditProgramExerciseSupersetProps {
  onSelect: (name: string | undefined) => void;
  plannerExercise: IPlannerProgramExercise;
  evaluatedProgram: IEvaluatedProgram;
  settings: ISettings;
  isHidden: boolean;
  onClose: () => void;
}

export type IBottomSheetEditProgramExerciseSupersetContentProps = Omit<
  IBottomSheetEditProgramExerciseSupersetProps,
  "isHidden"
>;

export function BottomSheetEditProgramExerciseSupersetContent(
  props: IBottomSheetEditProgramExerciseSupersetContentProps
): JSX.Element {
  const supersetGroups = Program_getSupersetGroups(props.evaluatedProgram, props.plannerExercise.dayData);

  const openTextInput = useModal("textInputModal", (name) => {
    props.onSelect(name);
  });

  const footerShadowStyle = Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 4 },
    android: { elevation: 4 },
    default: { boxShadow: "0 -4px 4px 0 rgba(0, 0, 0, 0.05)" as unknown as undefined },
  });

  return (
    <View className="flex-1">
      <View className="relative py-2 mt-2">
        <Text className="text-lg font-semibold text-center">Select Superset Group</Text>
      </View>
      <View className="flex-1 pb-4">
        <Pressable
          key="none"
          data-cy="superset-group-none"
          testID="superset-group-none"
          className={`${props.plannerExercise.superset == null ? "bg-background-cardpurple" : ""} px-4 py-1 border-b border-border-neutral min-h-12 justify-center`}
          onPress={() => {
            props.onSelect(undefined);
          }}
        >
          <Text className="font-bold">None</Text>
        </Pressable>
        {ObjectUtils_entriesNonnull(supersetGroups).map(([name, plannerExercises]) => {
          const isSelected = props.plannerExercise.superset?.name === name;
          return (
            <Pressable
              key={name}
              data-cy={`superset-group-${StringUtils_dashcase(name)}`}
              testID={`superset-group-${StringUtils_dashcase(name)}`}
              className={`${isSelected ? "bg-background-cardpurple" : ""} px-4 py-1 border-b border-border-neutral min-h-12 justify-center`}
              onPress={() => {
                props.onSelect(name);
              }}
            >
              <View>
                <Text className="text-base font-bold">{name}</Text>
                {plannerExercises.length > 0 && (
                  <View className="flex-row flex-wrap">
                    {plannerExercises.map((e, i) => {
                      return (
                        <Fragment key={e.fullName}>
                          {i !== 0 ? <Text className="text-xs text-text-secondary">, </Text> : null}
                          <Text className="text-xs font-bold text-text-secondary">{e.fullName}</Text>
                        </Fragment>
                      );
                    })}
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View className="w-full px-4 py-2" style={footerShadowStyle}>
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
          data-cy="superset-create-group"
        >
          Create New Group
        </Button>
      </View>
    </View>
  );
}
