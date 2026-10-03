import { JSX, useMemo } from "react";
import { lb } from "lens-shmens";
import { Modal } from "../../../components/modal";
import { ExercisePickerContent } from "../../../components/exercisePicker/bottomSheetExercisePicker";
import { buildCustomLensDispatch } from "../../../ducks/types";
import {
  Program_evaluate,
  Program_getExerciseTypesForWeekDay,
  Program_getProgramExerciseForKeyAndShortDayData,
} from "../../../models/program";
import { ProgramExercisePickerChange_apply } from "../../../models/programExercisePickerChange";
import { Exercise_applyCustomExerciseChange } from "../../../models/exercise";
import { Settings_toggleStarred } from "../../../models/settings";
import { UndoingFlag_set } from "../../../utils/undoingFlag";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { ISettings } from "../../../types";
import { IExercisePickerUi, IPlannerState } from "../models/types";

export function ModalPlannerExercisePicker(props: {
  picker: IExercisePickerUi;
  state: IPlannerState;
  settings: ISettings;
  isLoggedIn: boolean;
  dispatch: ILensDispatch<IPlannerState>;
  onChangeSettings: (settings: ISettings) => void;
}): JSX.Element {
  const { picker, state, settings, dispatch } = props;
  const program = state.current.program;
  const evaluatedProgram = useMemo(() => Program_evaluate(program, settings), [program, settings]);
  const plannerExercise =
    picker.exerciseKey != null
      ? Program_getProgramExerciseForKeyAndShortDayData(evaluatedProgram, picker.dayData, picker.exerciseKey)
      : undefined;
  const usedExerciseTypes = useMemo(
    () => Program_getExerciseTypesForWeekDay(evaluatedProgram, picker.dayData.week, picker.dayData.dayInWeek),
    [evaluatedProgram, picker.dayData.week, picker.dayData.dayInWeek]
  );
  const pickerDispatch = useMemo(
    () => buildCustomLensDispatch(dispatch, lb<IPlannerState>().p("ui").pi("exercisePicker").p("state")),
    [dispatch]
  );
  const onClose = (): void => {
    dispatch(lb<IPlannerState>().p("ui").p("exercisePicker").record(undefined), "Close exercise picker");
  };

  return (
    <Modal isFullWidth={true} isFullHeight={true} noPaddings={true} shouldShowClose={false} onClose={onClose}>
      <ExercisePickerContent
        settings={settings}
        isLoggedIn={props.isLoggedIn}
        exercisePicker={picker.state}
        usedExerciseTypes={usedExerciseTypes}
        evaluatedProgram={evaluatedProgram}
        dispatch={pickerDispatch}
        onClose={onClose}
        onStar={(key) => props.onChangeSettings({ ...settings, starredExercises: Settings_toggleStarred(settings.starredExercises, key) })}
        onChangeSettings={(pickerSettings) =>
          props.onChangeSettings({ ...settings, workoutSettings: { ...settings.workoutSettings, ...pickerSettings } })
        }
        onChangeCustomExercise={(action, exercise, notes) => {
          const result = Exercise_applyCustomExerciseChange(action, exercise, notes, settings, program);
          props.onChangeSettings(result.settings);
          if (result.program?.planner) {
            dispatch(
              lb<IPlannerState>().p("current").p("program").pi("planner").record(result.program.planner),
              "Rename custom exercise"
            );
          }
        }}
        onChoose={(selectedExercises) => {
          const planner = program.planner;
          const result =
            planner != null
              ? ProgramExercisePickerChange_apply({
                  planner,
                  settings,
                  selectedExercises,
                  plannerExercise,
                  dayData: picker.dayData,
                  change: picker.change,
                  variationIndex: undefined,
                })
              : undefined;
          if (result != null) {
            UndoingFlag_set(true);
            dispatch(lb<IPlannerState>().p("current").p("program").pi("planner").record(result.planner), result.description);
            dispatch(lb<IPlannerState>().p("ui").recordModify((ui) => ui), "stop-is-undoing");
          }
          onClose();
        }}
      />
    </Modal>
  );
}
