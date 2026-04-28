import { JSX, useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../primitives/text";
import { Switch } from "../primitives/switch";
import {
  IPlannerExerciseState,
  IPlannerExerciseUi,
  IPlannerProgramExercise,
  IPlannerProgramExerciseEvaluatedSetVariation,
} from "../../pages/planner/models/types";
import { ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IconPlus2 } from "../icons/iconPlus2";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { EditProgramExerciseSet, computeEditSetColumnWidths } from "./editProgramExerciseSet";
import { EditProgramUiHelpers_changeCurrentInstanceExercise } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { UidFactory_generateUid } from "../../utils/generator";
import { IconTrash } from "../icons/iconTrash";
import { CollectionUtils_removeAt } from "../../utils/collection";
import {
  PlannerProgramExercise_currentEvaluatedSetVariationIndex,
  PlannerProgramExercise_addSet,
} from "../../pages/planner/models/plannerProgramExercise";

interface IEditProgramExerciseSetVariationProps {
  name: string;
  areSetVariationsEnabled: boolean;
  plannerExercise: IPlannerProgramExercise;
  ui: IPlannerExerciseUi;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  setVariationIndex: number;
  setVariation: IPlannerProgramExerciseEvaluatedSetVariation;
  settings: ISettings;
  exerciseStateKey: string;
  programId: string;
}

export function EditProgramExerciseSetVariation(props: IEditProgramExerciseSetVariationProps): JSX.Element {
  const { setVariation } = props;
  const hasRpe = props.setVariation.sets.some((set) => set.rpe != null);
  const hasWeight = props.setVariation.sets.some((set) => set.weight != null);
  const hasMinReps = props.setVariation.sets.some((set) => set.minrep != null);
  const hasTimer = props.setVariation.sets.some((set) => set.timer != null);
  const [setIds, setSetIds] = useState<string[]>(setVariation.sets.map(() => UidFactory_generateUid(4)));
  const currentIndex = PlannerProgramExercise_currentEvaluatedSetVariationIndex(props.plannerExercise);
  const remValue = props.settings.textSize ?? 16;
  const columnWidths = computeEditSetColumnWidths(remValue, { hasMinReps, hasWeight, hasRpe, hasTimer });

  return (
    <View className="border rounded-lg bg-background-subtlecardpurple border-border-cardpurple">
      <View className="flex-row items-center gap-4 pt-2 pb-1 pl-4 pr-2">
        <View className="flex-1">
          <Text className="font-semibold">{props.name}</Text>
        </View>
        {props.areSetVariationsEnabled && (
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center">
              <Text className="mr-2 text-xs">Is Current?</Text>
              <Switch
                value={currentIndex === props.setVariationIndex}
                onValueChange={() => {
                  EditProgramUiHelpers_changeCurrentInstanceExercise(
                    props.plannerDispatch,
                    props.plannerExercise,
                    props.settings,
                    (ex) => {
                      for (let i = 0; i < ex.evaluatedSetVariations.length; i++) {
                        ex.evaluatedSetVariations[i].isCurrent = i === props.setVariationIndex;
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
                    ex.evaluatedSetVariations = CollectionUtils_removeAt(
                      ex.evaluatedSetVariations,
                      props.setVariationIndex
                    );
                  }
                );
              }}
            >
              <IconTrash />
            </Pressable>
          </View>
        )}
      </View>
      <View className="w-full">
        <View className="flex-row border-b border-border-cardpurple">
          <View style={columnWidths.set} className="items-center justify-end py-1">
            <Text className="text-xs text-text-secondary">Set</Text>
          </View>
          {hasMinReps && (
            <>
              <View style={columnWidths.minReps} className="items-center justify-end py-1">
                <Text className="text-xs text-center text-text-secondary">{"Min\nReps"}</Text>
              </View>
              <View style={columnWidths.dash} />
            </>
          )}
          <View style={columnWidths.reps} className="items-center justify-end py-1">
            <Text className="text-xs text-center text-text-secondary">{hasMinReps ? "Max\nReps" : "Reps"}</Text>
          </View>
          {hasWeight && (
            <>
              <View style={columnWidths.x} />
              <View style={columnWidths.weight} className="items-center justify-end py-1">
                <Text className="text-xs text-text-secondary">Weight</Text>
              </View>
            </>
          )}
          {hasRpe && (
            <View style={columnWidths.rpe} className="items-center justify-end py-1">
              <Text className="text-xs text-text-secondary">RPE</Text>
            </View>
          )}
          {hasTimer && (
            <View style={columnWidths.timer} className="items-center justify-end py-1">
              <Text className="text-xs text-text-secondary">Timer</Text>
            </View>
          )}
        </View>
        <View>
          {setVariation.sets.map((set, setIndex) => {
            return (
              <EditProgramExerciseSet
                key={setIds[setIndex]}
                ui={props.ui}
                setIds={setIds}
                setSetIds={setSetIds}
                set={set}
                setIndex={setIndex}
                setVariationIndex={props.setVariationIndex}
                plannerExercise={props.plannerExercise}
                plannerDispatch={props.plannerDispatch}
                columnWidths={columnWidths}
                settings={props.settings}
                exerciseStateKey={props.exerciseStateKey}
                programId={props.programId}
                opts={{ hasMinReps, hasWeight, hasRpe, hasTimer }}
              />
            );
          })}
        </View>
      </View>
      <View className="flex-row">
        <Pressable
          className="flex-row items-center justify-center flex-1 py-2 m-2 rounded-md bg-background-purpledark"
          data-testid="add-set"
          testID="add-set"
          onPress={() => {
            EditProgramUiHelpers_changeCurrentInstanceExercise(
              props.plannerDispatch,
              props.plannerExercise,
              props.settings,
              (ex) => {
                PlannerProgramExercise_addSet(ex, props.setVariationIndex, props.settings);
              }
            );
            setSetIds((prev) => [...prev, UidFactory_generateUid(4)]);
          }}
        >
          <IconPlus2 size={10} color={Tailwind_semantic().text.link} />
          <Text className="ml-2 text-xs font-semibold text-text-link">Add Set</Text>
        </Pressable>
      </View>
    </View>
  );
}
