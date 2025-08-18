import { h, JSX, Fragment } from "preact";
import {
  IExercisePickerSelectedExercise,
  IExercisePickerState,
  IPlannerProgram,
  IProgram,
  ISettings,
  IShortDayData,
} from "../../types";
import { IEvaluatedProgram, Program } from "../../models/program";
import { BottomSheetExercisePicker } from "../exercisePicker/bottomSheetExercisePicker";
import { Settings } from "../../models/settings";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IDispatch } from "../../ducks/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { Exercise } from "../../models/exercise";
import { PlannerProgram } from "../../pages/planner/models/plannerProgram";
import { lb } from "lens-shmens";
import { EditProgramUiHelpers } from "./editProgramUi/editProgramUiHelpers";
import { ObjectUtils } from "../../utils/object";

function onChange(
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
  window.isUndoing = true;
  if (plannerExercise) {
    if (change === "one") {
      const newPlanner = PlannerProgram.replaceExercise(
        planner,
        plannerExercise.key,
        newLabel,
        newExerciseType,
        settings,
        {
          week: dayData.week,
          dayInWeek: dayData.dayInWeek,
          day: 1,
        }
      );
      const lb1 = lb<IPlannerProgram>();
      plannerDispatch(lb1.record(newPlanner), "Replace one exercise in planner");
    } else if (change === "duplicate") {
      const newPlannerProgram = EditProgramUiHelpers.duplicateCurrentInstance(
        planner,
        { week: dayData.week, dayInWeek: dayData.dayInWeek, day: 1 },
        plannerExercise.fullName,
        newLabel,
        newExerciseType,
        settings
      );
      plannerDispatch(lb<IPlannerProgram>().record(newPlannerProgram), "Duplicate exercise in planner");
    } else {
      const newPlanner = PlannerProgram.replaceExercise(
        planner,
        plannerExercise.key,
        newLabel,
        newExerciseType,
        settings
      );
      plannerDispatch(lb<IPlannerProgram>().record(newPlanner), "Replace all exercises in planner");
      if (onNewKey) {
        const changedKeys = EditProgramUiHelpers.getChangedKeys(planner, newPlanner, settings);
        const newKey = changedKeys[plannerExercise.key];
        if (newKey != null) {
          onNewKey(newKey);
        }
      }
    }
  } else {
    const newPlanner = ObjectUtils.clone(planner);
    const day = newPlanner.weeks[dayData.week - 1]?.days[dayData.dayInWeek - 1];
    const exerciseText = day?.exerciseText;
    if (exerciseText != null) {
      let fullName: string | undefined;
      if (typeof newExerciseType === "string") {
        fullName = `${newLabel ? `${newLabel}: ` : ""}${newExerciseType} / used: none`;
      } else if (newExerciseType != null) {
        const exercise = Exercise.get(newExerciseType, settings.exercises);
        fullName = Exercise.fullName(exercise, settings, newLabel);
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

interface IEditProgramBottomSheetPickerProps {
  settings: ISettings;
  program: IProgram;
  evaluatedProgram: IEvaluatedProgram;
  exercisePickerState?: IExercisePickerState;
  dayData: IShortDayData;
  plannerExercise?: IPlannerProgramExercise;
  change: "one" | "all" | "duplicate";
  onClose: () => void;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerProgram>;
  pickerDispatch: ILensDispatch<IExercisePickerState>;
  stopIsUndoing: () => void;
  onNewKey?: (newKey: string) => void;
}

export function EditProgramBottomSheetPicker(props: IEditProgramBottomSheetPickerProps): JSX.Element {
  const exercisePickerState = props.exercisePickerState;
  if (!exercisePickerState) {
    return <></>;
  }

  return (
    <BottomSheetExercisePicker
      settings={props.settings}
      isHidden={exercisePickerState == null}
      exercisePicker={exercisePickerState}
      evaluatedProgram={props.evaluatedProgram}
      usedExerciseTypes={Program.getExerciseTypesForWeekDay(
        props.evaluatedProgram,
        props.dayData.week,
        props.dayData.dayInWeek
      )}
      onChoose={(selectedExercises) => {
        const planner = props.program.planner;
        if (planner == null) {
          return;
        }
        onChange(
          planner,
          props.settings,
          selectedExercises,
          props.plannerExercise,
          props.dayData,
          props.change,
          props.plannerDispatch,
          props.stopIsUndoing,
          props.onNewKey
        );
        props.onClose();
      }}
      onChangeCustomExercise={(action, exercise) => {
        Exercise.handleCustomExerciseChange(props.dispatch, action, exercise, props.settings, props.program);
      }}
      onClose={props.onClose}
      onStar={(key) => Settings.toggleStarredExercise(props.dispatch, key)}
      onChangeSettings={(pickerSettings) => Settings.changePickerSettings(props.dispatch, pickerSettings)}
      dispatch={props.pickerDispatch}
    />
  );
}
