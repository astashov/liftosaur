import { JSX } from "react";
import { View, Pressable } from "react-native";
import { lb } from "lens-shmens";
import { Text } from "../primitives/text";
import { IPlannerExerciseState, IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IExerciseType, IPlannerProgram, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IDispatch } from "../../ducks/types";
import { ExerciseImage } from "../exerciseImage";
import { IconTrash } from "../icons/iconTrash";
import { IconEdit2 } from "../icons/iconEdit2";
import { MenuItem } from "../menuItem";
import { DraggableList2 } from "../draggableList2";
import { CollectionUtils_removeAt } from "../../utils/collection";
import { PlannerProgramExercise_currentExerciseVariationIndex } from "../../pages/planner/models/plannerProgramExercise";
import {
  EditProgramUiHelpers_changeAllInstances,
  EditProgramUiHelpers_getChangedKeys,
} from "../editProgram/editProgramUi/editProgramUiHelpers";
import { EditProgram_migrateExerciseStateKey } from "../../models/editProgram";
import { LinkButton } from "../linkButton";

interface IEditProgramExerciseVariationsProps {
  plannerExercise: IPlannerProgramExercise;
  planner?: IPlannerProgram;
  settings: ISettings;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  dispatch: IDispatch;
  programId: string;
  exerciseStateKey: string;
}

function buildVariationPickerState(
  settings: ISettings,
  exerciseType?: IExerciseType
): IPlannerExerciseState["ui"]["exercisePickerState"] {
  return {
    mode: "program",
    screenStack: ["exercisePicker"],
    sort: exerciseType ? (settings.workoutSettings.pickerSort ?? "name_asc") : "name_asc",
    filters: {},
    exerciseType,
    selectedTab: 0,
    hideLabel: true,
    hideTemplate: true,
    selectedExercises: exerciseType ? [{ type: "adhoc", exerciseType }] : [],
  };
}

export function EditProgramExerciseVariations(props: IEditProgramExerciseVariationsProps): JSX.Element {
  const { plannerExercise, planner, settings, plannerDispatch } = props;
  const variations = plannerExercise.exerciseVariations ?? [];
  // A plain exercise carries no `!`, so the active rung is derived (findIndex → 0), not the raw isCurrent flag.
  const currentIndex = PlannerProgramExercise_currentExerciseVariationIndex(plannerExercise);
  const lbUi = lb<IPlannerExerciseState>().p("ui");
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");

  // The ladder is part of the exercise's composite identity, so add/remove/reorder re-key it. Apply the
  // mutation to every instance (they must stay identical), then migrate the keyed edit state if the key
  // changed. "Make current" moves the `!` marker only, which the key ignores — so it re-keys to nothing.
  const applyChange = (desc: string, cb: (exercise: IPlannerProgramExercise) => void): void => {
    if (!planner) {
      return;
    }
    const newPlanner = EditProgramUiHelpers_changeAllInstances(planner, plannerExercise.key, settings, true, cb);
    plannerDispatch(lbProgram.record(newPlanner), desc);
    const changedKeys = EditProgramUiHelpers_getChangedKeys(planner, newPlanner, settings);
    const newKey = changedKeys[plannerExercise.key];
    if (newKey != null) {
      EditProgram_migrateExerciseStateKey(props.dispatch, props.programId, props.exerciseStateKey, newKey);
    }
  };

  // `getExerciseName` serializes a lone rung via `ex.exerciseType` (the active type), so keep it in sync
  // with whichever variation is current after the mutation.
  const syncActiveType = (ex: IPlannerProgramExercise): void => {
    const vs = ex.exerciseVariations ?? [];
    const idx = vs.findIndex((v) => v.isCurrent);
    const current = vs[idx === -1 ? 0 : idx];
    if (current?.exerciseType != null) {
      ex.exerciseType = current.exerciseType;
    }
  };

  const makeCurrent = (index: number): void => {
    applyChange("Make exercise variation current", (ex) => {
      (ex.exerciseVariations ?? []).forEach((v, i) => {
        v.isCurrent = i === index;
      });
      syncActiveType(ex);
    });
  };

  const removeVariation = (index: number): void => {
    applyChange("Remove exercise variation", (ex) => {
      const wasCurrent = ex.exerciseVariations?.[index]?.isCurrent ?? false;
      const next = CollectionUtils_removeAt(ex.exerciseVariations ?? [], index);
      if (wasCurrent && next.length > 0 && !next.some((v) => v.isCurrent)) {
        next[0].isCurrent = true;
      }
      ex.exerciseVariations = next;
      syncActiveType(ex);
    });
  };

  const reorderVariation = (startIndex: number, endIndex: number): void => {
    if (startIndex === endIndex) {
      return;
    }
    applyChange("Reorder exercise variation", (ex) => {
      const vs = ex.exerciseVariations ?? [];
      // Reordering the ladder must not change WHICH exercise is current — pin currency to the exercise, not
      // the slot. Capture the active rung, move, then re-mark it (implicit index-0 current becomes explicit).
      const activeIdx = vs.findIndex((v) => v.isCurrent);
      const activeRef = vs[activeIdx === -1 ? 0 : activeIdx];
      const next = [...vs];
      const [moved] = next.splice(startIndex, 1);
      next.splice(endIndex, 0, moved);
      next.forEach((v) => {
        v.isCurrent = v === activeRef;
      });
      ex.exerciseVariations = next;
      syncActiveType(ex);
    });
  };

  const openPicker = (change: "variationAdd" | "variationEdit", variationIndex?: number): void => {
    const seed = variationIndex != null ? variations[variationIndex]?.exerciseType : undefined;
    plannerDispatch(
      [
        lbUi.p("exercisePickerState").record(buildVariationPickerState(settings, seed)),
        lbUi.p("exercisePickerChange").record(change),
        lbUi.p("exercisePickerVariationIndex").record(variationIndex),
      ],
      "Open exercise variation picker"
    );
  };

  return (
    <View className="px-4 py-3" data-testid="exercise-variations" testID="exercise-variations">
      <View className="flex-row items-center gap-4 pb-2">
        <View className="flex-1">
          <Text className="text-base font-bold">Exercise Variations</Text>
          <Text className="text-xs text-text-secondary">
            The active movement shows in the header. Add alternates below and switch which one is current.
          </Text>
        </View>
      </View>
      <DraggableList2
        items={variations}
        mode="vertical"
        onDragEnd={reorderVariation}
        element={(variation, index, dragHandle) => {
          const isCurrent = index === currentIndex;
          return (
            <View data-testid={`exercise-variation-${index + 1}`} testID={`exercise-variation-${index + 1}`}>
              <MenuItem
                name={variation.name}
                dragHandle={dragHandle}
                prefix={
                  <View className="flex-row items-center pr-2">
                    {variation.exerciseType != null ? (
                      <View className="p-1 rounded-lg bg-background-image">
                        <ExerciseImage
                          settings={settings}
                          className="w-8"
                          exerciseType={variation.exerciseType}
                          size="small"
                        />
                      </View>
                    ) : (
                      <View className="w-2" />
                    )}
                  </View>
                }
                addons={
                  <View className="pb-1" style={{ marginTop: -8 }}>
                    {isCurrent ? (
                      <Text className="text-xs text-text-secondary">current</Text>
                    ) : (
                      <LinkButton
                        className="text-xs"
                        name={`exercise-variation-make-current-${index + 1}`}
                        onPress={() => makeCurrent(index)}
                      >
                        Make current
                      </LinkButton>
                    )}
                  </View>
                }
                value={
                  isCurrent ? undefined : (
                    <View className="flex-row items-center gap-1">
                      <Pressable
                        data-testid={`exercise-variation-edit-${index + 1}`}
                        testID={`exercise-variation-edit-${index + 1}`}
                        className="px-2"
                        onPress={() => openPicker("variationEdit", index)}
                      >
                        <IconEdit2 />
                      </Pressable>
                      <Pressable
                        data-testid={`exercise-variation-remove-${index + 1}`}
                        testID={`exercise-variation-remove-${index + 1}`}
                        className="px-2"
                        onPress={() => removeVariation(index)}
                      >
                        <IconTrash />
                      </Pressable>
                    </View>
                  )
                }
              />
            </View>
          );
        }}
      />
      <View>
        <LinkButton className="text-sm" name="exercise-variations-add" onPress={() => openPicker("variationAdd")}>
          Add Exercise
        </LinkButton>
      </View>
    </View>
  );
}
