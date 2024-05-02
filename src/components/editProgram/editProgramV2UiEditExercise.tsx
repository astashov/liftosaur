import { h, JSX } from "preact";
import { Exercise } from "../../models/exercise";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { focusedToStr, IPlannerProgramExercise, IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { ISettings, IDayData } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { ExerciseImage } from "../exerciseImage";
import { IconHandle } from "../icons/iconHandle";
import { SetNumber } from "./editProgramSets";
import { IconCloseCircleOutline } from "../icons/iconCloseCircleOutline";
import { IconSwap } from "../icons/iconSwap";
import { lb } from "lens-shmens";
import { EditProgramUiWarmups } from "./editProgramUi/editProgramUiWarmups";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { EditProgramUiReuseSets } from "./editProgramUi/editProgramUiReuseSets";

interface IEditProgramV2UiEditExerciseProps {
  evaluatedWeeks: IPlannerEvalResult[][];
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  exerciseLine: number;
  dayData: Required<IDayData>;
  ui: IPlannerUi;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramV2UiEditExercise(props: IEditProgramV2UiEditExerciseProps): JSX.Element {
  const { plannerExercise, exerciseLine } = props;
  const { week, dayInWeek } = props.dayData;
  const weekIndex = week - 1;
  const dayIndex = dayInWeek - 1;
  const exercise = Exercise.findByName(plannerExercise.name, props.settings.exercises);
  const exerciseType = exercise != null ? { id: exercise.id, equipment: plannerExercise.equipment } : undefined;
  const repeatStr = PlannerProgramExercise.repeatToRangeStr(plannerExercise);

  return (
    <div
      className="px-2 py-1 mb-2 bg-orange-100 rounded-lg"
      style={{ border: "1px solid rgb(125 103 189 / 15%)", userSelect: "none", minHeight: "5rem" }}
    >
      <div className="flex items-center">
        <div className="flex items-center flex-1">
          {props.handleTouchStart && (
            <div className="p-2 mr-1 cursor-move" style={{ touchAction: "none" }}>
              <span onMouseDown={props.handleTouchStart} onTouchStart={props.handleTouchStart}>
                <IconHandle />
              </span>
            </div>
          )}
          <div>
            <SetNumber setIndex={props.exerciseLine} />
          </div>
          {repeatStr && <div className="ml-4 text-xs font-bold text-grayv2-main">[{repeatStr}]</div>}
        </div>
        <div className="">
          <button
            data-cy="edit-exercise"
            className="px-2 align-middle ls-edit-day-v2 button nm-edit-day-v2"
            onClick={() => {
              props.plannerDispatch(
                lb<IPlannerState>()
                  .p("ui")
                  .p("exerciseUi")
                  .p("edit")
                  .recordModify((edit) => {
                    const newEdit = new Set(Array.from(edit));
                    const key = focusedToStr({ weekIndex, dayIndex, exerciseLine });
                    newEdit.delete(key);
                    return newEdit;
                  })
              );
            }}
          >
            <IconCloseCircleOutline />
          </button>
        </div>
      </div>
      <div className="flex items-center flex-1">
        {exerciseType && (
          <div className="mr-3">
            <ExerciseImage settings={props.settings} className="w-8" exerciseType={exerciseType} size="small" />
          </div>
        )}
        <div className="flex items-center flex-1 mr-2 text-lg">
          <div>
            {plannerExercise.label ? `${plannerExercise.label}: ` : ""}
            {plannerExercise.name}
          </div>
          <div>
            <button className="w-8 p-2 mr-1 text-center nm-edit-program-v2-expand-collapse-exercise" onClick={() => {}}>
              <IconSwap />
            </button>
          </div>
        </div>
      </div>
      <EditProgramUiReuseSets
        plannerDispatch={props.plannerDispatch}
        plannerExercise={plannerExercise}
        settings={props.settings}
        dayData={props.dayData}
        exerciseLine={exerciseLine}
        evaluatedWeeks={props.evaluatedWeeks}
      />
      <EditProgramUiWarmups
        plannerDispatch={props.plannerDispatch}
        plannerExercise={plannerExercise}
        settings={props.settings}
      />
    </div>
  );
}
