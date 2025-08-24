import { JSX, h, Fragment } from "preact";
import { IPlannerProgramExercise, IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { ISettings } from "../../types";
import { IconHandle } from "../icons/iconHandle";
import { SetNumber } from "./editProgramSets";
import { IconArrowRight } from "../icons/iconArrowRight";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { ExerciseImage } from "../exerciseImage";
import { equipmentName, Exercise, IExercise } from "../../models/exercise";
import { IconEdit2 } from "../icons/iconEdit2";
import { lb } from "lens-shmens";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { HistoryRecordSet } from "../historyRecordSets";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { IconTrash } from "../icons/iconTrash";
import { EditProgramUiHelpers } from "./editProgramUi/editProgramUiHelpers";
import { IconGraphsE } from "../icons/iconGraphsE";
import { IconSwap } from "../icons/iconSwap";
import { Thunk } from "../../ducks/thunks";
import { IDispatch } from "../../ducks/types";
import { EditProgramUiProgress } from "./editProgramUiProgress";
import { IEvaluatedProgram, Program } from "../../models/program";
import { EditProgramUiUpdate } from "./editProgramUiUpdate";
import { EditProgramUiExerciseSetVariations } from "./editProgramUiExerciseSetVariations";
import { EditProgramUiExerciseDescriptions } from "./editProgramUiExerciseDescriptions";
import { pickerStateFromPlannerExercise } from "./editProgramUtils";

interface IEditProgramUiExerciseViewProps {
  evaluatedProgram: IEvaluatedProgram;
  plannerExercise: IPlannerProgramExercise;
  ui: IPlannerUi;
  exerciseIndex: number;
  weekIndex: number;
  dayIndex: number;
  settings: ISettings;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
}

export function EditProgramUiExerciseView(props: IEditProgramUiExerciseViewProps): JSX.Element {
  const { weekIndex, dayIndex, exerciseIndex } = props;
  const isCollapsed = props.ui.exerciseUi.collapsed.has(
    `${props.plannerExercise.key}-${props.plannerExercise.dayData.week - 1}-${props.plannerExercise.dayData.dayInWeek - 1}`
  );
  const exercise = Exercise.findByName(props.plannerExercise.name, props.settings.exercises);

  const repeatStr = PlannerProgramExercise.repeatToRangeStr(props.plannerExercise);
  const order = props.plannerExercise.order !== 0 ? props.plannerExercise.order : undefined;
  const orderAndRepeat = [order, repeatStr].filter((s) => s).join(", ");

  return (
    <div
      id={`edit-program-ui-exercise-${props.plannerExercise.dayData.week}-${props.plannerExercise.dayData.dayInWeek}-${props.plannerExercise.key}`}
      data-cy={`exercise-${props.plannerExercise.key}`}
      className="my-1 overflow-hidden border bg-background-cardpurple rounded-xl border-border-cardpurple"
    >
      <div className="flex items-center">
        <div className="p-2 cursor-move" style={{ touchAction: "none" }}>
          <span onMouseDown={props.handleTouchStart} onTouchStart={props.handleTouchStart}>
            <IconHandle />
          </span>
        </div>
        <div className="mr-2">
          <SetNumber size="sm" setIndex={props.exerciseIndex} />
        </div>
        <div className="flex items-center flex-1 text-base font-bold" data-cy="planner-ui-exercise-name">
          <div>
            {props.plannerExercise.label ? `${props.plannerExercise.label}: ` : ""}
            {props.plannerExercise.name}
            {props.plannerExercise.equipment != null &&
              props.plannerExercise.equipment !== exercise?.defaultEquipment && (
                <span className="">, {equipmentName(props.plannerExercise.equipment)}</span>
              )}
            {orderAndRepeat ? <span className="text-sm font-normal text-text-primary"> [{orderAndRepeat}]</span> : ""}
          </div>
          {props.plannerExercise.notused && (
            <div className="px-1 ml-3 text-xs font-bold rounded text-text-alwayswhite bg-background-darkgray">
              UNUSED
            </div>
          )}
          <button
            className="p-2"
            data-cy="edit-exercise-swap"
            onClick={() => {
              const numberOfExerciseInstances = Program.getNumberOfExerciseInstances(
                props.evaluatedProgram,
                props.plannerExercise.key
              );
              if (numberOfExerciseInstances > 1) {
                props.plannerDispatch(
                  lb<IPlannerState>().p("ui").p("editExerciseModal").record({
                    plannerExercise: props.plannerExercise,
                  }),
                  "Open edit exercise modal"
                );
              } else {
                props.plannerDispatch(
                  lb<IPlannerState>()
                    .p("ui")
                    .p("exercisePicker")
                    .record({
                      dayData: {
                        week: props.plannerExercise.dayData.week,
                        dayInWeek: props.plannerExercise.dayData.dayInWeek,
                      },
                      state: pickerStateFromPlannerExercise(props.plannerExercise),
                      exerciseKey: props.plannerExercise.key,
                      change: "one",
                    }),
                  "Open exercise picker modal"
                );
              }
            }}
          >
            <IconSwap size={12} />
          </button>
        </div>
        <div>
          <button
            className="p-2"
            data-cy="show-exercise-stats"
            onClick={() => {
              props.plannerDispatch(
                [
                  lb<IPlannerState>().p("ui").p("focusedExercise").record({
                    weekIndex,
                    dayIndex,
                    exerciseLine: props.plannerExercise.line,
                  }),
                  lb<IPlannerState>().p("ui").p("showExerciseStats").record(true),
                ],
                "Show exercise stats"
              );
            }}
          >
            <IconGraphsE width={16} height={19} />
          </button>
        </div>
        <div className="py-2 border-l bg-background-default border-border-cardpurple">
          <button
            className="w-10 px-2 text-center nm-edit-exercise-expand-collapse"
            onClick={() => {
              props.plannerDispatch(
                lb<IPlannerState>()
                  .p("ui")
                  .p("exerciseUi")
                  .p("collapsed")
                  .recordModify((collapsed) => {
                    const newCollapsed = new Set(Array.from(collapsed));
                    const exKey = `${props.plannerExercise.key}-${props.plannerExercise.dayData.week - 1}-${props.plannerExercise.dayData.dayInWeek - 1}`;
                    if (newCollapsed.has(exKey)) {
                      newCollapsed.delete(exKey);
                    } else {
                      newCollapsed.add(exKey);
                    }
                    return newCollapsed;
                  }),
                "Toggle exercise collapse"
              );
            }}
          >
            {isCollapsed ? <IconArrowRight className="inline-block" /> : <IconArrowDown2 className="inline-block" />}
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <EditProgramUiExerciseContentView
          weekIndex={weekIndex}
          dayIndex={dayIndex}
          evaluatedProgram={props.evaluatedProgram}
          exerciseIndex={exerciseIndex}
          exercise={exercise}
          plannerExercise={props.plannerExercise}
          settings={props.settings}
          dispatch={props.dispatch}
          plannerDispatch={props.plannerDispatch}
        />
      )}
    </div>
  );
}

interface IEditProgramUiExerciseContentViewProps {
  exercise?: IExercise;
  evaluatedProgram: IEvaluatedProgram;
  exerciseIndex: number;
  weekIndex: number;
  dayIndex: number;
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramUiExerciseContentView(props: IEditProgramUiExerciseContentViewProps): JSX.Element {
  const plannerExercise = props.plannerExercise;
  const exercise = props.exercise;
  const exerciseType = exercise != null ? { id: exercise.id, equipment: props.plannerExercise.equipment } : undefined;
  const warmupSets =
    PlannerProgramExercise.warmups(plannerExercise) ||
    (exercise != null ? PlannerProgramExercise.defaultWarmups(exercise, props.settings) : []);
  const displayWarmupSets = PlannerProgramExercise.warmupSetsToDisplaySets(warmupSets);
  const reusingSets = plannerExercise.reuse?.fullName;
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");

  return (
    <div>
      <div className="flex border-t border-border-cardpurple">
        <div className="flex-1">
          {plannerExercise.descriptions.values.length > 0 && (
            <div className="flex border-b border-border-cardpurple">
              <div className="flex-1 px-3 py-1">
                <EditProgramUiExerciseDescriptions plannerExercise={plannerExercise} settings={props.settings} />
              </div>
            </div>
          )}
          <div className="flex">
            {exerciseType ? (
              <div className="p-1">
                <div className="p-1 m-1 rounded-lg bg-background-image">
                  <ExerciseImage settings={props.settings} className="w-10" exerciseType={exerciseType} size="small" />
                </div>
              </div>
            ) : (
              <div className="w-2" />
            )}
            <div className="flex-1">
              <div>
                <div className="flex items-start my-2">
                  {displayWarmupSets.flat().length > 0 && (
                    <>
                      <div data-cy="ui-warmups-sets">
                        <div className="pb-1 text-xs text-left text-text-secondary">Warmups</div>
                        <div>
                          <div>
                            {displayWarmupSets.map((g) => (
                              <HistoryRecordSet sets={g} isNext={true} settings={props.settings} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="self-stretch ml-4 mr-4 bg-border-neutral" style={{ width: "1px" }} />
                    </>
                  )}
                  <div data-cy="ui-workout-sets">
                    <div className="pb-1 text-xs text-left text-text-secondary">Workout</div>
                    {reusingSets && <div className="pb-1 text-xs text-text-secondary">Reusing {reusingSets}</div>}
                    <EditProgramUiExerciseSetVariations plannerExercise={plannerExercise} settings={props.settings} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-3 pb-2 text-xs">
            <EditProgramUiProgress evaluatedProgram={props.evaluatedProgram} exercise={props.plannerExercise} />
          </div>
          {props.plannerExercise.update && (
            <div className="px-3 pb-2 text-xs">
              <EditProgramUiUpdate evaluatedProgram={props.evaluatedProgram} exercise={props.plannerExercise} />
            </div>
          )}
        </div>
        <div className="border-l bg-background-default border-border-cardpurple">
          <div className="text-center">
            <button
              className="p-2"
              data-cy="edit-exercise"
              onClick={() => {
                props.plannerDispatch(
                  lb<IPlannerState>()
                    .p("ui")
                    .p("focusedDay")
                    .record({
                      ...props.plannerExercise.dayData,
                      key: props.plannerExercise.key,
                    }),
                  "Focus on exercise day"
                );
                props.dispatch(
                  Thunk.pushToEditProgramExercise(props.plannerExercise.key, props.plannerExercise.dayData)
                );
              }}
            >
              <IconEdit2 />
            </button>
          </div>
          <div className="text-center">
            <button
              className="p-2"
              onClick={() => {
                props.plannerDispatch(
                  lb<IPlannerState>()
                    .p("ui")
                    .p("exercisePicker")
                    .record({
                      state: pickerStateFromPlannerExercise(props.plannerExercise),
                      dayData: props.plannerExercise.dayData,
                      exerciseKey: props.plannerExercise.key,
                      change: "duplicate",
                    }),
                  "Open duplicate exercise modal"
                );
              }}
            >
              <IconDuplicate2 />
            </button>
          </div>
          <div className="text-center">
            <button
              className="p-2"
              onClick={() => {
                props.plannerDispatch(
                  lbProgram.recordModify((program) => {
                    return EditProgramUiHelpers.deleteCurrentInstance(
                      program,
                      plannerExercise.dayData,
                      plannerExercise.fullName,
                      props.settings,
                      false,
                      true
                    );
                  }),
                  "Delete exercise instance"
                );
              }}
            >
              <IconTrash />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
