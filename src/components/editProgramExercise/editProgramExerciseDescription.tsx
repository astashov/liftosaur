import type { JSX } from "react";
import { View, Pressable, Switch } from "react-native";
import { Text } from "../primitives/text";
import {
  IPlannerExerciseState,
  IPlannerProgramExercise,
  IPlannerProgramExerciseDescription,
} from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { EditProgramUiHelpers_changeCurrentInstanceExercise } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { IconTrash } from "../icons/iconTrash";
import { CollectionUtils_removeAt } from "../../utils/collection";
import { PlannerProgramExercise_currentDescriptionIndex } from "../../pages/planner/models/plannerProgramExercise";
import { MarkdownEditorBorderless } from "../markdownEditorBorderless";

interface IEditProgramExerciseDescriptionProps {
  isMultiple: boolean;
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  descriptionIndex: number;
  description: IPlannerProgramExerciseDescription;
  settings: ISettings;
}

export function EditProgramExerciseDescription(props: IEditProgramExerciseDescriptionProps): JSX.Element {
  const { description } = props;
  const currentIndex = PlannerProgramExercise_currentDescriptionIndex(props.plannerExercise);

  return (
    <View className="border rounded-lg bg-background-cardpurple border-border-purple">
      {props.isMultiple && (
        <View className="flex-row items-center gap-4 pt-2 pb-1 pl-4 pr-2">
          <View className="flex-1">
            <Text className="font-semibold">Description {props.descriptionIndex + 1}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center">
              <Text className="mr-2 text-xs">Is Current?</Text>
              <Switch
                value={currentIndex === props.descriptionIndex}
                onValueChange={() => {
                  EditProgramUiHelpers_changeCurrentInstanceExercise(
                    props.plannerDispatch,
                    props.plannerExercise,
                    props.settings,
                    (ex) => {
                      for (let i = 0; i < ex.descriptions.values.length; i++) {
                        ex.descriptions.values[i].isCurrent = i === props.descriptionIndex;
                      }
                    }
                  );
                }}
              />
            </View>
            <Pressable
              className="p-2"
              onPress={() => {
                EditProgramUiHelpers_changeCurrentInstanceExercise(
                  props.plannerDispatch,
                  props.plannerExercise,
                  props.settings,
                  (ex) => {
                    ex.descriptions.values = CollectionUtils_removeAt(ex.descriptions.values, props.descriptionIndex);
                  }
                );
              }}
            >
              <IconTrash />
            </Pressable>
          </View>
        </View>
      )}
      <View className="p-2">
        <MarkdownEditorBorderless
          value={description.value}
          isTransparent={true}
          debounceMs={500}
          placeholder={`Exercise description in Markdown...`}
          onChange={(v) => {
            EditProgramUiHelpers_changeCurrentInstanceExercise(
              props.plannerDispatch,
              props.plannerExercise,
              props.settings,
              (ex) => {
                ex.descriptions.values[props.descriptionIndex].value = v;
              }
            );
          }}
        />
      </View>
    </View>
  );
}
