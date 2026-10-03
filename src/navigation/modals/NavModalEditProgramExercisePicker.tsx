import { JSX, useCallback, useEffect, useMemo, useRef } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { TransparentModal } from "../TransparentModal";
import { useClearOnModalRemove } from "../useClearOnModalRemove";
import { ExercisePickerContent } from "../../components/exercisePicker/bottomSheetExercisePicker";
import {
  Program_evaluate,
  Program_getProgramExerciseForKeyAndShortDayData,
  Program_getExerciseTypesForWeekDay,
} from "../../models/program";
import { Settings_toggleStarredExercise, Settings_changePickerSettings } from "../../models/settings";
import { Exercise_handleCustomExerciseChange } from "../../models/exercise";
import { IState } from "../../models/state";
import { buildCustomLensDispatch } from "../../ducks/types";
import { lb } from "lens-shmens";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { IPlannerState } from "../../pages/planner/models/types";
import { UndoingFlag_set } from "../../utils/undoingFlag";
import {
  IProgramExercisePickerChange,
  ProgramExercisePickerChange_apply,
} from "../../models/programExercisePickerChange";
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
  change: IProgramExercisePickerChange,
  variationIndex: number | undefined,
  plannerDispatch: ILensDispatch<IPlannerProgram>,
  onStopIsUndoing: () => void
): void {
  if (!selectedExercises[0]) {
    return;
  }
  UndoingFlag_set(true);
  const result = ProgramExercisePickerChange_apply({
    planner,
    settings,
    selectedExercises,
    plannerExercise,
    dayData,
    change,
    variationIndex,
  });
  if (result == null) {
    return;
  }
  plannerDispatch(lb<IPlannerProgram>().record(result.planner), result.description);
  if (result.isAdd) {
    onStopIsUndoing();
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
  const { programId, dayData, change, exerciseKey, variationIndex } = route.params;

  const plannerState = state.editProgramStates?.[programId];
  const program = plannerState?.current.program;
  const planner = program?.planner;
  const evaluatedProgram = program ? Program_evaluate(program, state.storage.settings) : undefined;
  const exercisePickerState = plannerState?.ui.exercisePicker?.state;

  const plannerExercise =
    exerciseKey && evaluatedProgram
      ? Program_getProgramExerciseForKeyAndShortDayData(evaluatedProgram, dayData, exerciseKey)
      : undefined;

  const plannerStateRef = useRef(plannerState);
  plannerStateRef.current = plannerState;

  const { base, programPlannerDispatch, pickerDispatch, stopIsUndoing } = useMemo(() => {
    const plannerBase = buildPlannerDispatch(
      dispatch,
      lb<IState>().p("editProgramStates").p(programId),
      () => plannerStateRef.current as IPlannerState
    );
    return {
      base: plannerBase,
      programPlannerDispatch: buildCustomLensDispatch(
        plannerBase,
        lb<IPlannerState>().p("current").p("program").pi("planner")
      ),
      pickerDispatch: buildCustomLensDispatch(plannerBase, lb<IPlannerState>().p("ui").pi("exercisePicker").p("state")),
      stopIsUndoing: () => {
        plannerBase(
          [
            lb<IPlannerState>()
              .p("ui")
              .recordModify((ui) => ({ ...ui, isUndoing: false })),
          ],
          "stop-is-undoing"
        );
      },
    };
  }, [dispatch, programId]);

  const settingsRef = useRef(state.storage.settings);
  settingsRef.current = state.storage.settings;
  const programRef = useRef(program);
  programRef.current = program;
  const plannerRef = useRef(planner);
  plannerRef.current = planner;
  const plannerExerciseRef = useRef(plannerExercise);
  plannerExerciseRef.current = plannerExercise;

  const clearExercisePicker = useCallback((): void => {
    base(lb<IPlannerState>().p("ui").p("exercisePicker").record(undefined), "Close exercise picker");
  }, [base]);
  useClearOnModalRemove(clearExercisePicker);

  const onClose = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

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
        variationIndex,
        programPlannerDispatch,
        stopIsUndoing
      );
      onClose();
    },
    [dayData, change, variationIndex, programPlannerDispatch, stopIsUndoing, onClose]
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
