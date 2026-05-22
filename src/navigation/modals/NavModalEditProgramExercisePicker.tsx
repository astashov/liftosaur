import { JSX, useCallback, useEffect, useMemo, useRef } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { TransparentModal } from "../TransparentModal";
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
import type {
  ICustomExercise,
  IExercisePickerSelectedExercise,
  IPlannerProgram,
  ISettings,
  IShortDayData,
} from "../../types";
import type { IExercisePickerSettings } from "../../components/exercisePicker/exercisePickerSettings";
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

  const plannerStateRef = useRef(plannerState);
  plannerStateRef.current = plannerState;

  const { programPlannerDispatch, pickerDispatch, stopIsUndoing } = useMemo(() => {
    if (isEditProgram) {
      const base = buildPlannerDispatch(
        dispatch,
        lb<IState>().p("editProgramStates").p(programId),
        () => plannerStateRef.current as IPlannerState
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
        () => plannerStateRef.current as IPlannerExerciseState
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
  }, [dispatch, programId, exerciseStateKey, isEditProgram]);

  const onNewKey = useCallback(
    (newKey: string): void => {
      if (isEditProgram || !exerciseStateKey) {
        return;
      }
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
    },
    [dispatch, isEditProgram, exerciseStateKey, programId]
  );
  const onNewKeyOrUndefined = !isEditProgram && exerciseStateKey ? onNewKey : undefined;

  const settingsRef = useRef(state.storage.settings);
  settingsRef.current = state.storage.settings;
  const programRef = useRef(program);
  programRef.current = program;
  const plannerRef = useRef(planner);
  plannerRef.current = planner;
  const plannerExerciseRef = useRef(plannerExercise);
  plannerExerciseRef.current = plannerExercise;

  const onClose = useCallback((): void => {
    if (isEditProgram) {
      const base = buildPlannerDispatch(
        dispatch,
        lb<IState>().p("editProgramStates").p(programId),
        () => plannerStateRef.current as IPlannerState
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
  }, [dispatch, isEditProgram, exerciseStateKey, programId, navigation]);

  const onChoose = useCallback(
    (selectedExercises: IExercisePickerSelectedExercise[]) => {
      const currentPlanner = plannerRef.current;
      if (!currentPlanner) {
        return;
      }
      onChangeExercise(
        currentPlanner,
        settingsRef.current,
        selectedExercises,
        plannerExerciseRef.current,
        dayData,
        change,
        programPlannerDispatch,
        stopIsUndoing,
        onNewKeyOrUndefined
      );
      onClose();
    },
    [dayData, change, programPlannerDispatch, stopIsUndoing, onNewKeyOrUndefined, onClose]
  );

  const onChangeCustomExercise = useCallback(
    (action: "upsert" | "delete", exercise: ICustomExercise, notes?: string) => {
      Exercise_handleCustomExerciseChange(dispatch, action, exercise, notes, settingsRef.current, programRef.current);
    },
    [dispatch]
  );

  const onStar = useCallback((key: string) => Settings_toggleStarredExercise(dispatch, key), [dispatch]);
  const onChangeSettings = useCallback(
    (pickerSettings: IExercisePickerSettings) => Settings_changePickerSettings(dispatch, pickerSettings),
    [dispatch]
  );

  const usedExerciseTypes = useMemo(
    () =>
      evaluatedProgram ? Program_getExerciseTypesForWeekDay(evaluatedProgram, dayData.week, dayData.dayInWeek) : [],
    [evaluatedProgram, dayData.week, dayData.dayInWeek]
  );

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
      <TransparentModal onClose={onClose}>
        <ExercisePickerContent
          settings={state.storage.settings}
          isLoggedIn={!!state.user?.id}
          exercisePicker={exercisePickerState}
          usedExerciseTypes={usedExerciseTypes}
          evaluatedProgram={evaluatedProgram}
          dispatch={pickerDispatch}
          onChoose={onChoose}
          onChangeCustomExercise={onChangeCustomExercise}
          onStar={onStar}
          onChangeSettings={onChangeSettings}
          onClose={onClose}
        />
      </TransparentModal>
    </SheetScreenContainer>
  );
}
