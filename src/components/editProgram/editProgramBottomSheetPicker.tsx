import { h, JSX, Fragment } from "preact";
import {
  IExercisePickerSelectedExercise,
  IExercisePickerState,
  IPlannerProgram,
  IProgram,
  ISettings,
  IShortDayData,
} from "../../types";
import { IEvaluatedProgram, Program_getExerciseTypesForWeekDay } from "../../models/program";
import { BottomSheetExercisePicker } from "../exercisePicker/bottomSheetExercisePicker";
import { Settings_toggleStarredExercise, Settings_changePickerSettings } from "../../models/settings";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IDispatch } from "../../ducks/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { Exercise_get, Exercise_fullName, Exercise_handleCustomExerciseChange } from "../../models/exercise";
import { PlannerProgram_replaceExercise } from "../../pages/planner/models/plannerProgram";
import { lb } from "lens-shmens";
import {
  EditProgramUiHelpers_duplicateCurrentInstance,
  EditProgramUiHelpers_getChangedKeys,
} from "./editProgramUi/editProgramUiHelpers";
import { ObjectUtils_clone } from "../../utils/object";

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
      const newPlanner = PlannerProgram_replaceExercise(
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

interface IEditProgramBottomSheetPickerProps {
  settings: ISettings;
  program: IProgram;
  evaluatedProgram: IEvaluatedProgram;
  exercisePickerState?: IExercisePickerState;
  isLoggedIn: boolean;
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
      isLoggedIn={props.isLoggedIn}
      evaluatedProgram={props.evaluatedProgram}
      usedExerciseTypes={Program_getExerciseTypesForWeekDay(
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
      onChangeCustomExercise={(action, exercise, notes) => {
        Exercise_handleCustomExerciseChange(props.dispatch, action, exercise, notes, props.settings, props.program);
      }}
      onClose={props.onClose}
      onStar={(key) => Settings_toggleStarredExercise(props.dispatch, key)}
      onChangeSettings={(pickerSettings) => Settings_changePickerSettings(props.dispatch, pickerSettings)}
      dispatch={props.pickerDispatch}
    />
  );
}
