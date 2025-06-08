import { h, JSX, Fragment } from "preact";
import { ICustomExercise, IExerciseKind, IExerciseType, IMuscle, IPlannerProgram, ISettings } from "../../types";
import { lb } from "lens-shmens";
import { Exercise } from "../../models/exercise";
import { IEvaluatedProgram, Program } from "../../models/program";
import { updateSettings } from "../../models/state";
import { PlannerProgram } from "../../pages/planner/models/plannerProgram";
import { IModalExerciseUi } from "../../pages/planner/models/types";
import { StringUtils } from "../../utils/string";
import { ModalExercise } from "../modalExercise";
import { EditProgramUiHelpers } from "./editProgramUi/editProgramUiHelpers";
import { IDispatch } from "../../ducks/types";
import { PlannerExerciseEvaluator } from "../../pages/planner/plannerExerciseEvaluator";
import { ObjectUtils } from "../../utils/object";

function onChange(
  planner: IPlannerProgram,
  settings: ISettings,
  modalExerciseUi: IModalExerciseUi | undefined,
  exerciseType: IExerciseType | string | undefined,
  newLabel: string | undefined,
  shouldClose: boolean,
  onProgramChange: (program: IPlannerProgram) => void,
  onUiChange: (modalExerciseUi?: IModalExerciseUi) => void,
  onStopIsUndoing: () => void
): void {
  if (!modalExerciseUi) {
    return;
  }
  window.isUndoing = true;
  if (shouldClose) {
    onUiChange(undefined);
  }
  if (modalExerciseUi.exerciseKey) {
    if (!exerciseType) {
      return;
    }
    if (modalExerciseUi.change === "one") {
      const focusedExercise = modalExerciseUi.focusedExercise;
      const newPlanner = PlannerProgram.replaceExercise(planner, modalExerciseUi.exerciseKey, exerciseType, settings, {
        week: focusedExercise.weekIndex + 1,
        dayInWeek: focusedExercise.dayIndex + 1,
        day: 1,
      });
      onProgramChange(newPlanner);
    } else if (modalExerciseUi.change === "duplicate") {
      const focusedExercise = modalExerciseUi.focusedExercise;
      if (modalExerciseUi.fullName) {
        const newPlannerProgram = EditProgramUiHelpers.duplicateCurrentInstance(
          planner,
          { week: focusedExercise.weekIndex + 1, dayInWeek: focusedExercise.dayIndex + 1, day: 1 },
          modalExerciseUi.fullName,
          newLabel,
          exerciseType,
          settings
        );
        onProgramChange(newPlannerProgram);
      }
    } else {
      const newPlanner = PlannerProgram.replaceExercise(planner, modalExerciseUi.exerciseKey, exerciseType, settings);
      onProgramChange(newPlanner);
    }
  } else {
    const newPlanner = ObjectUtils.clone(planner);
    const day =
      newPlanner.weeks[modalExerciseUi.focusedExercise.weekIndex]?.days[modalExerciseUi.focusedExercise.dayIndex];
    const exerciseText = day?.exerciseText;
    if (exerciseText != null) {
      let fullName: string | undefined;
      if (typeof exerciseType === "string") {
        fullName = `${newLabel ? `${newLabel}: ` : ""}${exerciseType} / used: none`;
      } else if (exerciseType != null) {
        const exercise = Exercise.get(exerciseType, settings.exercises);
        fullName = Exercise.fullName(exercise, settings, newLabel);
      }
      if (fullName != null) {
        const newLine = `${fullName} / 1x1 100${settings.units}`;
        const newExerciseText = exerciseText.trim() ? exerciseText + `\n${newLine}` : newLine;
        day.exerciseText = newExerciseText;
        onProgramChange(newPlanner);
        onStopIsUndoing();
      }
    }
  }
}

interface IEditProgramModalExerciseProps {
  settings: ISettings;
  evaluatedProgram: IEvaluatedProgram;
  planner: IPlannerProgram;
  modalExerciseUi?: IModalExerciseUi;
  onProgramChange: (program: IPlannerProgram) => void;
  onUiChange: (modalExerciseUi?: IModalExerciseUi) => void;
  onStopIsUndoing: () => void;
  dispatch: IDispatch;
}

export function EditProgramModalExercise(props: IEditProgramModalExerciseProps): JSX.Element {
  const planner = props.planner;
  const modalExerciseUi = props.modalExerciseUi;
  if (!modalExerciseUi) {
    return <></>;
  }
  const fullName = modalExerciseUi.fullName;
  const { label, name } = fullName ? PlannerExerciseEvaluator.extractNameParts(fullName, props.settings.exercises) : {};

  return (
    <ModalExercise
      isHidden={!modalExerciseUi}
      onChange={(exerciseType, newLabel, shouldClose) => {
        onChange(
          planner,
          props.settings,
          modalExerciseUi,
          exerciseType,
          newLabel,
          shouldClose,
          props.onProgramChange,
          props.onUiChange,
          props.onStopIsUndoing
        );
      }}
      onCreateOrUpdate={(
        shouldClose: boolean,
        name: string,
        targetMuscles: IMuscle[],
        synergistMuscles: IMuscle[],
        types: IExerciseKind[],
        smallImageUrl?: string,
        largeImageUrl?: string,
        exercise?: ICustomExercise
      ) => {
        const exercises = Exercise.createOrUpdateCustomExercise(
          props.settings.exercises,
          name,
          targetMuscles,
          synergistMuscles,
          types,
          smallImageUrl,
          largeImageUrl,
          exercise
        );
        updateSettings(props.dispatch, lb<ISettings>().p("exercises").record(exercises));
        if (exercise) {
          const program = ObjectUtils.clone({ ...Program.create("Temp"), planner });
          const newProgram = Program.changeExerciseName(exercise.name, name, program, {
            ...props.settings,
            exercises,
          });
          window.isUndoing = true;
          props.onProgramChange(newProgram.planner!);
          props.onStopIsUndoing();
        }
        if (shouldClose) {
          props.onUiChange(undefined);
        }
      }}
      onDelete={(id) => {
        updateSettings(
          props.dispatch,
          lb<ISettings>()
            .p("exercises")
            .recordModify((exercises) => {
              const exercise = exercises[id];
              return exercise != null ? { ...exercises, [id]: { ...exercise, isDeleted: true } } : exercises;
            })
        );
      }}
      settings={props.settings}
      customExerciseName={modalExerciseUi.customExerciseName}
      exerciseType={modalExerciseUi.exerciseType}
      initialFilterTypes={[...modalExerciseUi.muscleGroups, ...modalExerciseUi.types].map(StringUtils.capitalize)}
      label={label}
      onLabelChange={(label) => {
        if (fullName == null) {
          return;
        }
        if (modalExerciseUi.change === "duplicate") {
          return;
        }
        EditProgramUiHelpers.changeLabel(
          planner,
          modalExerciseUi,
          props.onProgramChange,
          props.onUiChange,
          fullName,
          label,
          props.settings,
          {
            week: modalExerciseUi.focusedExercise.weekIndex + 1,
            dayInWeek: modalExerciseUi.focusedExercise.dayIndex + 1,
            day: 1,
          },
          modalExerciseUi.change
        );
      }}
      onSaveAsTemplate={(newName, newLabel) => {
        onChange(
          planner,
          props.settings,
          modalExerciseUi,
          newName,
          newLabel,
          true,
          props.onProgramChange,
          props.onUiChange,
          props.onStopIsUndoing
        );
      }}
      templateName={name}
    />
  );
}
