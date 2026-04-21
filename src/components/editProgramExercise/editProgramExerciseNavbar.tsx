import type { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../primitives/text";
import { IPlannerExerciseState, IPlannerProgramExercise, IPlannerState } from "../../pages/planner/models/types";
import { IconUndo } from "../icons/iconUndo";
import { ILensDispatch } from "../../utils/useLensReducer";
import { canRedo, canUndo, redo, undo } from "../../pages/builder/utils/undoredo";
import { Button } from "../button";
import { IDispatch } from "../../ducks/types";
import { lb } from "lens-shmens";
import { Thunk_pullScreen } from "../../ducks/thunks";
import { IState, updateState } from "../../models/state";
import { CollectionUtils_setBy } from "../../utils/collection";
import { ExerciseImage } from "../exerciseImage";
import { equipmentName, Exercise_get } from "../../models/exercise";
import { ISettings } from "../../types";
import { IconSwap } from "../icons/iconSwap";
import { delayfn } from "../../utils/throttler";
import { ReactUtils_usePropToRef } from "../../utils/react";
import { pickerStateFromPlannerExercise } from "../editProgram/editProgramUtils";
import { Tailwind_semantic } from "../../utils/tailwindConfig";

interface IEditProgramExerciseNavbarProps {
  state: IPlannerExerciseState;
  editProgramState: IPlannerState;
  programId: string;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
}

export function EditProgramExerciseNavbar(props: IEditProgramExerciseNavbarProps): JSX.Element {
  const exerciseType = props.plannerExercise.exerciseType;
  const exercise = exerciseType ? Exercise_get(exerciseType, props.settings.exercises) : undefined;
  const stateRef = ReactUtils_usePropToRef(props.state);
  const editProgramStateRef = ReactUtils_usePropToRef(props.editProgramState);

  const undoEnabled = canUndo(props.state);
  const redoEnabled = canRedo(props.state);

  return (
    <View className="flex-row items-center justify-between gap-2 py-1 pl-2 pr-4 border-b bg-background-default border-background-subtle">
      <View className="flex-row items-center">
        <Pressable
          data-cy="nm-program-undo"
          testID="nm-program-undo"
          className="p-2"
          disabled={!undoEnabled}
          onPress={() => undo(props.plannerDispatch, props.state)}
        >
          <IconUndo
            width={20}
            height={20}
            color={!undoEnabled ? Tailwind_semantic().icon.light : Tailwind_semantic().icon.neutral}
          />
        </Pressable>
        <Pressable
          data-cy="nm-program-redo"
          testID="nm-program-redo"
          className="p-2"
          disabled={!redoEnabled}
          onPress={() => redo(props.plannerDispatch, props.state)}
        >
          <View style={{ transform: [{ scaleX: -1 }] }}>
            <IconUndo
              width={20}
              height={20}
              color={!redoEnabled ? Tailwind_semantic().icon.light : Tailwind_semantic().icon.neutral}
            />
          </View>
        </Pressable>
      </View>
      <View className="flex-row items-center flex-1 gap-2">
        {exerciseType && (
          <View>
            <ExerciseImage settings={props.settings} className="w-6" exerciseType={exerciseType} size="small" />
          </View>
        )}
        <View className="flex-row items-center flex-1 gap-1">
          <View className="flex-1">
            <Text className="text-xs">
              {props.plannerExercise.label ? `${props.plannerExercise.label}: ` : ""}
              {props.plannerExercise.name}
              {props.plannerExercise.equipment != null && props.plannerExercise.equipment !== exercise?.defaultEquipment
                ? `, ${equipmentName(props.plannerExercise.equipment)}`
                : ""}
            </Text>
          </View>
          <View>
            <Pressable
              className="p-2"
              data-cy="edit-program-exercise-change"
              testID="edit-program-exercise-change"
              onPress={() => {
                props.plannerDispatch(
                  lb<IPlannerExerciseState>()
                    .p("ui")
                    .p("exercisePickerState")
                    .record(pickerStateFromPlannerExercise(props.settings, props.plannerExercise)),
                  "Open exercise modal"
                );
              }}
            >
              <IconSwap size={12} />
            </Pressable>
          </View>
        </View>
      </View>
      <View className="flex-row items-center">
        <Button
          name="save-program-exercise"
          kind="purple"
          buttonSize="md"
          className="keyboard-close"
          data-cy="save-program-exercise"
          onClick={delayfn(() => {
            const updatedProgram = stateRef.current.current.program;
            if (stateRef.current.ui.fromWorkout) {
              const lensUpdates = [
                lb<IState>()
                  .p("storage")
                  .p("programs")
                  .recordModify((programs) => {
                    return CollectionUtils_setBy(programs, "id", updatedProgram.id, updatedProgram);
                  }),
              ];
              if (editProgramStateRef.current) {
                lensUpdates.push(
                  lb<IState>()
                    .p("editProgramStates")
                    .p(props.programId)
                    .p("current")
                    .p("program")
                    .record(updatedProgram)
                );
              }
              updateState(props.dispatch, lensUpdates, "Save program changes");
            } else {
              updateState(
                props.dispatch,
                [
                  lb<IState>()
                    .p("editProgramStates")
                    .p(props.programId)
                    .p("current")
                    .p("program")
                    .record(updatedProgram),
                ],
                "Update program from edit exercise"
              );
            }
            props.dispatch(Thunk_pullScreen());
          }, 50)}
        >
          Save
        </Button>
      </View>
    </View>
  );
}
