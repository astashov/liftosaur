import { JSX, useCallback, useEffect } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { ExercisePickerContent } from "../../components/exercisePicker/bottomSheetExercisePicker";
import {
  Program_evaluate,
  Program_getProgramExerciseForKeyAndShortDayData,
  Program_getExerciseTypesForWeekDay,
} from "../../models/program";
import { Settings_toggleStarredExercise, Settings_changePickerSettings } from "../../models/settings";
import { Exercise_handleCustomExerciseChange } from "../../models/exercise";
import { IState, updateState } from "../../models/state";
import { buildCustomLensDispatch } from "../../ducks/types";
import { lb } from "lens-shmens";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { IPlannerExerciseState, IPlannerState } from "../../pages/planner/models/types";
import { PlannerProgram_replaceExercise } from "../../pages/planner/models/plannerProgram";
import { Exercise_get, Exercise_fullName } from "../../models/exercise";
import { ObjectUtils_clone } from "../../utils/object";
import { UndoingFlag_set } from "../../utils/undoingFlag";
import {
  EditProgramUiHelpers_duplicateCurrentInstance,
  EditProgramUiHelpers_getChangedKeys,
} from "../../components/editProgram/editProgramUi/editProgramUiHelpers";
import type { IRootStackParamList } from "../types";
import type { IExercisePickerSelectedExercise, IPlannerProgram, ISettings, IShortDayData } from "../../types";
import type { IPlannerProgramExercise } from "../../pages/planner/models/types";
import type { ILensDispatch } from "../../utils/useLensReducer";

function onChangeExercise(
  planner: IPlannerProgram,
  settings: ISettings,
  selectedExercises: IExercisePickerSelectedExercise[],
  plannerExercise: IPlannerProgramExercise | undefined,
  dayData: IShortDayData,
  change: "one" | "all" | "duplicate",
  plannerDispatch: ILensDispatch<IPlannerProgram>,
  onStopIsUndoing: () => void,
  onNewKey?: (newKey: string) => void
): void {
  const selectedExercise = selectedExercises[0];
  if (!selectedExercise) {
    return;
  }
  const newExerciseType = selectedExercise.type === "template" ? selectedExercise.name : selectedExercise.exerciseType;
  const newLabel = "label" in selectedExercise ? selectedExercise.label : undefined;
  UndoingFlag_set(true);
  if (plannerExercise) {
    if (change === "one") {
      const newPlanner = PlannerProgram_replaceExercise(
        planner,
        plannerExercise.key,
        newLabel,
        newExerciseType,
        settings,
        { week: dayData.week, dayInWeek: dayData.dayInWeek, day: 1 }
      );
      plannerDispatch(lb<IPlannerProgram>().record(newPlanner), "Replace one exercise in planner");
    } else if (change === "duplicate") {
      const newPlannerProgram = EditProgramUiHelpers_duplicateCurrentInstance(
        planner,
        { week: dayData.week, dayInWeek: dayData.dayInWeek, day: 1 },
        plannerExercise.fullName,
        newLabel,
        newExerciseType,
        settings
      );
      plannerDispatch(lb<IPlannerProgram>().record(newPlannerProgram), "Duplicate exercise in planner");
    } else {
      const newPlanner = PlannerProgram_replaceExercise(
        planner,
        plannerExercise.key,
        newLabel,
        newExerciseType,
        settings
      );
      plannerDispatch(lb<IPlannerProgram>().record(newPlanner), "Replace all exercises in planner");
      if (onNewKey) {
        const changedKeys = EditProgramUiHelpers_getChangedKeys(planner, newPlanner, settings);
        const newKey = changedKeys[plannerExercise.key];
        if (newKey != null) {
          onNewKey(newKey);
        }
      }
    }
  } else {
    const newPlanner = ObjectUtils_clone(planner);
    const day = newPlanner.weeks[dayData.week - 1]?.days[dayData.dayInWeek - 1];
    const exerciseText = day?.exerciseText;
    if (exerciseText != null) {
      let fullName: string | undefined;
      if (typeof newExerciseType === "string") {
        fullName = `${newLabel ? `${newLabel}: ` : ""}${newExerciseType} / used: none`;
      } else if (newExerciseType != null) {
        const exercise = Exercise_get(newExerciseType, settings.exercises);
        fullName = Exercise_fullName(exercise, settings, newLabel);
      }
      if (fullName != null) {
        const newLine = `${fullName} / 1x1 100${settings.units}`;
        const newExerciseText = exerciseText.trim() ? exerciseText + `\n${newLine}` : newLine;
        day.exerciseText = newExerciseText;
        plannerDispatch(lb<IPlannerProgram>().record(newPlanner), "Add exercise to exercise text");
        onStopIsUndoing();
      }
    }
  }
}

export function NavModalEditProgramExercisePicker(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "editProgramExercisePickerModal";
    params: IRootStackParamList["editProgramExercisePickerModal"];
  }>();
  const { context, programId, exerciseStateKey, dayData, change, exerciseKey } = route.params;

  const isEditProgram = context === "editProgram";
  const plannerState = isEditProgram
    ? state.editProgramStates?.[programId]
    : exerciseStateKey
      ? state.editProgramExerciseStates?.[exerciseStateKey]
      : undefined;

  const program = plannerState?.current.program;
  const planner = program?.planner;
  const evaluatedProgram = program ? Program_evaluate(program, state.storage.settings) : undefined;

  const exercisePickerState = isEditProgram
    ? (plannerState as IPlannerState | undefined)?.ui.exercisePicker?.state
    : (plannerState as IPlannerExerciseState | undefined)?.ui.exercisePickerState;

  const plannerExercise =
    exerciseKey && evaluatedProgram
      ? Program_getProgramExerciseForKeyAndShortDayData(evaluatedProgram, dayData, exerciseKey)
      : undefined;

  const { programPlannerDispatch, pickerDispatch, stopIsUndoing } = useCallback(() => {
    if (isEditProgram) {
      const base = buildPlannerDispatch(
        dispatch,
        lb<IState>().p("editProgramStates").p(programId),
        plannerState as IPlannerState
      );
      return {
        programPlannerDispatch: buildCustomLensDispatch(
          base,
          lb<IPlannerState>().p("current").p("program").pi("planner")
        ),
        pickerDispatch: buildCustomLensDispatch(base, lb<IPlannerState>().p("ui").pi("exercisePicker").p("state")),
        stopIsUndoing: () => {
          base(
            [
              lb<IPlannerState>()
                .p("ui")
                .recordModify((ui) => ({ ...ui, isUndoing: false })),
            ],
            "stop-is-undoing"
          );
        },
      };
    } else {
      const base = buildPlannerDispatch(
        dispatch,
        lb<IState>().p("editProgramExerciseStates").p(exerciseStateKey!),
        plannerState as IPlannerExerciseState
      );
      return {
        programPlannerDispatch: buildCustomLensDispatch(
          base,
          lb<IPlannerExerciseState>().p("current").p("program").pi("planner")
        ),
        pickerDispatch: buildCustomLensDispatch(base, lb<IPlannerExerciseState>().p("ui").pi("exercisePickerState")),
        stopIsUndoing: () => {
          base(
            [
              lb<IPlannerExerciseState>()
                .p("ui")
                .recordModify((ui) => ({ ...ui, isUndoing: false })),
            ],
            "stop-is-undoing"
          );
        },
      };
    }
  }, [plannerState])();

  const onNewKey =
    !isEditProgram && exerciseStateKey
      ? (newKey: string): void => {
          const oldStateKey = exerciseStateKey;
          const newStateKey = `${programId}_${newKey}`;
          updateState(
            dispatch,
            [
              lb<IState>()
                .p("editProgramExerciseStates")
                .recordModify((states) => {
                  const currentState = states[oldStateKey];
                  if (!currentState) {
                    return states;
                  }
                  return {
                    ...states,
                    [oldStateKey]: { ...currentState, ui: { ...currentState.ui, pendingNewKey: newKey } },
                    [newStateKey]: { ...currentState, ui: { ...currentState.ui, exercisePickerState: undefined } },
                  };
                }),
            ],
            "Update exercise key"
          );
        }
      : undefined;

  const onClose = (): void => {
    if (isEditProgram) {
      const base = buildPlannerDispatch(
        dispatch,
        lb<IState>().p("editProgramStates").p(programId),
        plannerState as IPlannerState
      );
      base(lb<IPlannerState>().p("ui").p("exercisePicker").record(undefined), "Close exercise picker");
    } else if (exerciseStateKey) {
      updateState(
        dispatch,
        [
          lb<IState>()
            .p("editProgramExerciseStates")
            .recordModify((states) => {
              const current = states[exerciseStateKey];
              if (!current) {
                return states;
              }
              return {
                ...states,
                [exerciseStateKey]: { ...current, ui: { ...current.ui, exercisePickerState: undefined } },
              };
            }),
        ],
        "Close exercise picker"
      );
    }
    navigation.goBack();
  };

  const shouldGoBack = !plannerState || !exercisePickerState || !evaluatedProgram || !planner || !program;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack) {
    return <></>;
  }

  return (
    <SheetScreenContainer onClose={onClose}>
      <ExercisePickerContent
        settings={state.storage.settings}
        isLoggedIn={!!state.user?.id}
        exercisePicker={exercisePickerState}
        usedExerciseTypes={Program_getExerciseTypesForWeekDay(evaluatedProgram, dayData.week, dayData.dayInWeek)}
        evaluatedProgram={evaluatedProgram}
        dispatch={pickerDispatch}
        onChoose={(selectedExercises) => {
          onChangeExercise(
            planner,
            state.storage.settings,
            selectedExercises,
            plannerExercise,
            dayData,
            change,
            programPlannerDispatch,
            stopIsUndoing,
            onNewKey
          );
          onClose();
        }}
        onChangeCustomExercise={(action, exercise, notes) => {
          Exercise_handleCustomExerciseChange(dispatch, action, exercise, notes, state.storage.settings, program);
        }}
        onStar={(key) => Settings_toggleStarredExercise(dispatch, key)}
        onChangeSettings={(pickerSettings) => Settings_changePickerSettings(dispatch, pickerSettings)}
        onClose={onClose}
      />
    </SheetScreenContainer>
  );
}
