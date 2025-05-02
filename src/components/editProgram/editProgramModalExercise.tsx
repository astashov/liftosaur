import { h, JSX, Fragment } from "preact";
import { ICustomExercise, IExerciseKind, IMuscle, ISettings } from "../../types";
import { lb } from "lens-shmens";
import { EditProgram } from "../../models/editProgram";
import { Exercise } from "../../models/exercise";
import { Program } from "../../models/program";
import { updateSettings } from "../../models/state";
import { PlannerProgram } from "../../pages/planner/models/plannerProgram";
import { IPlannerState } from "../../pages/planner/models/types";
import { StringUtils } from "../../utils/string";
import { ModalExercise } from "../modalExercise";
import { EditProgramUiHelpers } from "./editProgramUi/editProgramUiHelpers";
import { IDispatch } from "../../ducks/types";
import { ILensDispatch } from "../../utils/useLensReducer";

interface IEditProgramModalExerciseProps {
  settings: ISettings;
  plannerState: IPlannerState;
  plannerDispatch: ILensDispatch<IPlannerState>;
  dispatch: IDispatch;
}

export function EditProgramModalExercise(props: IEditProgramModalExerciseProps): JSX.Element {
  const plannerState = props.plannerState;
  const planner = plannerState.current.program.planner!;
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const modalExerciseUi = plannerState.ui.modalExercise;
  if (!modalExerciseUi) {
    return <></>;
  }
  const plannerDispatch = props.plannerDispatch;

  return (
    <ModalExercise
      isHidden={!modalExerciseUi}
      onChange={(exerciseType, shouldClose) => {
        window.isUndoing = true;
        if (shouldClose) {
          plannerDispatch([
            lb<IPlannerState>().p("ui").p("modalExercise").record(undefined),
            lb<IPlannerState>().p("ui").p("showDayStats").record(undefined),
            lb<IPlannerState>().p("ui").p("focusedExercise").record(undefined),
          ]);
        }
        if (modalExerciseUi.exerciseType && modalExerciseUi.exerciseKey) {
          if (!exerciseType) {
            return;
          }
          if (modalExerciseUi.change === "one") {
            const focusedExercise = modalExerciseUi.focusedExercise;
            const newPlanner = PlannerProgram.replaceExercise(
              planner,
              modalExerciseUi.exerciseKey,
              exerciseType,
              props.settings,
              { week: focusedExercise.weekIndex + 1, dayInWeek: focusedExercise.dayIndex + 1, day: 1 }
            );
            plannerDispatch([lbProgram.record(newPlanner)]);
          } else if (modalExerciseUi.change === "duplicate") {
            const focusedExercise = modalExerciseUi.focusedExercise;
            const exercise = Exercise.find(exerciseType, props.settings.exercises);
            if (exercise && modalExerciseUi.fullName) {
              const newPlannerProgram = EditProgramUiHelpers.duplicateCurrentInstance(
                planner,
                { week: focusedExercise.weekIndex + 1, dayInWeek: focusedExercise.dayIndex + 1, day: 1 },
                modalExerciseUi.fullName,
                exerciseType,
                props.settings
              );
              plannerDispatch([lbProgram.record(newPlannerProgram)]);
            }
          } else {
            const newPlanner = PlannerProgram.replaceExercise(
              planner,
              modalExerciseUi.exerciseKey,
              exerciseType,
              props.settings
            );
            plannerDispatch([lbProgram.record(newPlanner)]);
          }
        } else {
          plannerDispatch([
            lbProgram
              .p("weeks")
              .i(modalExerciseUi.focusedExercise.weekIndex)
              .p("days")
              .i(modalExerciseUi.focusedExercise.dayIndex)
              .p("exerciseText")
              .recordModify((exerciseText) => {
                if (!exerciseType) {
                  return exerciseText;
                }
                const exercise = Exercise.getById(exerciseType.id, props.settings.exercises);
                return exerciseText + `\n${exercise.name} / 1x1 100${props.settings.units}`;
              }),
          ]);
        }
        plannerDispatch(
          [
            lb<IPlannerState>()
              .p("ui")
              .recordModify((ui) => ui),
          ],
          "stop-is-undoing"
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
          const newProgram = Program.changeExerciseName(exercise.name, name, plannerState.current.program, {
            ...props.settings,
            exercises,
          });
          window.isUndoing = true;
          EditProgram.updateProgram(props.dispatch, newProgram);
          plannerDispatch(lbProgram.record(newProgram.planner!));
          plannerDispatch(lbProgram.record(newProgram.planner!), "stop-is-undoing");
        }
        if (shouldClose) {
          plannerDispatch(lb<IPlannerState>().p("ui").p("modalExercise").record(undefined));
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
    />
  );
}
