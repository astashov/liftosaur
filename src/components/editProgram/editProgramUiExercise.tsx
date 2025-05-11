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
import { GroupHeader } from "../groupHeader";
import { IconArrowDown3 } from "../icons/iconArrowDown3";
import { PlannerKey } from "../../pages/planner/plannerKey";
import { EditProgramUiHelpers } from "./editProgramUi/editProgramUiHelpers";
import { IconGraphsE } from "../icons/iconGraphsE";
import { IconSwap } from "../icons/iconSwap";
import { Thunk } from "../../ducks/thunks";
import { IDispatch } from "../../ducks/types";
import { EditProgramUiProgress } from "./editProgramUiProgress";
import { IEvaluatedProgram } from "../../models/program";

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
  const isCollapsed = props.ui.exerciseUi.collapsed.has(props.plannerExercise.id);
  const exercise = Exercise.findByName(props.plannerExercise.name, props.settings.exercises);
  const exerciseType = exercise != null ? { id: exercise.id, equipment: exercise.equipment } : undefined;

  const repeatStr = PlannerProgramExercise.repeatToRangeStr(props.plannerExercise);
  const order = props.plannerExercise.order !== 0 ? props.plannerExercise.order : undefined;
  const orderAndRepeat = [order, repeatStr].filter((s) => s).join(", ");

  return (
    <div className="my-1 overflow-hidden border bg-purplev3-50 rounded-xl border-purplev3-150">
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
          {props.plannerExercise.label ? `${props.plannerExercise.label}: ` : ""}
          {props.plannerExercise.name}
          {props.plannerExercise.equipment != null &&
            props.plannerExercise.equipment !== exercise?.defaultEquipment && (
              <div className="">, {equipmentName(props.plannerExercise.equipment)}</div>
            )}
          {orderAndRepeat ? <span className="text-sm font-normal text-blackv2"> [{orderAndRepeat}]</span> : ""}
          {props.plannerExercise.notused && (
            <div className="px-1 ml-3 text-xs font-bold text-white rounded bg-grayv2-main">UNUSED</div>
          )}
          <button
            className="p-2"
            onClick={() => {
              props.plannerDispatch(
                lb<IPlannerState>()
                  .p("ui")
                  .p("editExerciseModal")
                  .record({
                    focusedExercise: {
                      weekIndex,
                      dayIndex,
                      exerciseLine: props.plannerExercise.line,
                    },
                    exerciseKey: PlannerKey.fromPlannerExercise(props.plannerExercise, props.settings),
                    fullName: props.plannerExercise.fullName,
                    exerciseType,
                  })
              );
            }}
          >
            <IconSwap size={12} />
          </button>
        </div>
        <div>
          <button
            className="p-2"
            onClick={() => {
              props.plannerDispatch([
                lb<IPlannerState>().p("ui").p("focusedExercise").record({
                  weekIndex,
                  dayIndex,
                  exerciseLine: props.plannerExercise.line,
                }),
                lb<IPlannerState>().p("ui").p("showExerciseStats").record(true),
              ]);
            }}
          >
            <IconGraphsE width={16} height={19} />
          </button>
        </div>
        <div className="py-2 bg-white border-l border-purplev3-150">
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
                    const exKey = props.plannerExercise.id;
                    if (newCollapsed.has(exKey)) {
                      newCollapsed.delete(exKey);
                    } else {
                      newCollapsed.add(exKey);
                    }
                    return newCollapsed;
                  })
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
  const { weekIndex, dayIndex, exerciseIndex } = props;
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
    <div className="flex border-t border-purplev3-150">
      <div className="flex-1">
        <div className="flex">
          {exerciseType ? (
            <div className="px-3">
              <ExerciseImage settings={props.settings} className="w-10" exerciseType={exerciseType} size="small" />
            </div>
          ) : (
            <div className="w-2" />
          )}
          <div className="flex-1">
            <div>
              <div className="flex items-start my-2">
                {displayWarmupSets.flat().length > 0 && (
                  <>
                    <div>
                      <div className="pb-1 text-xs text-left text-grayv2-main">Warmups</div>
                      <div>
                        <div>
                          {displayWarmupSets.map((g) => (
                            <HistoryRecordSet sets={g} isNext={true} settings={props.settings} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="self-stretch ml-4 mr-4 bg-grayv2-200" style={{ width: "1px" }} />
                  </>
                )}
                <div>
                  <div className="pb-1 text-xs text-left text-grayv2-main">Workout</div>
                  {reusingSets && <div className="pb-1 text-xs text-grayv2-main">Reusing {reusingSets}</div>}
                  {PlannerProgramExercise.setVariations(plannerExercise).map((_, i) => {
                    const sets = PlannerProgramExercise.sets(plannerExercise, i);
                    const hasCurrentSets = !!plannerExercise.setVariations[i]?.sets;
                    const globals = plannerExercise.globals;
                    const displayGroups = PlannerProgramExercise.setsToDisplaySets(
                      sets,
                      hasCurrentSets,
                      globals,
                      props.settings
                    );
                    let currentIndex = plannerExercise.setVariations.findIndex((v) => v.isCurrent);
                    currentIndex = currentIndex === -1 ? 0 : currentIndex;
                    return (
                      <div className={`${i > 0 ? "mt-2 pt-2 border-t border-grayv3-200" : ""}`}>
                        <div>
                          {plannerExercise.setVariations.length > 1 && (
                            <GroupHeader
                              highlighted={true}
                              name={`Set Variation ${i + 1}`}
                              rightAddOn={
                                plannerExercise.setVariations.length > 1 && currentIndex === i ? (
                                  <IconArrowDown3 size={14} className="ml-2" style={{ transform: "rotate(90deg)" }} />
                                ) : undefined
                              }
                            />
                          )}
                        </div>
                        <div className="text-right">
                          <div className="flex">
                            <div>
                              {displayGroups.map((g) => (
                                <HistoryRecordSet sets={g} isNext={true} settings={props.settings} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-3 pb-2 text-xs">
          <EditProgramUiProgress evaluatedProgram={props.evaluatedProgram} exercise={props.plannerExercise} />
        </div>
      </div>
      <div className="bg-white border-l border-purplev3-150">
        <div className="text-center">
          <button
            className="p-2"
            onClick={() => {
              if (props.plannerExercise.exerciseType) {
                props.dispatch(
                  Thunk.pushToEditProgramExercise(props.plannerExercise.exerciseType, props.plannerExercise.dayData)
                );
              }
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
                  .p("modalExercise")
                  .record({
                    focusedExercise: {
                      weekIndex,
                      dayIndex,
                      exerciseLine: exerciseIndex,
                    },
                    types: [],
                    muscleGroups: [],
                    exerciseKey: PlannerKey.fromFullName(plannerExercise.fullName, props.settings),
                    fullName: plannerExercise.fullName,
                    exerciseType,
                    change: "duplicate",
                  })
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
                    props.settings
                  );
                })
              );
            }}
          >
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  );
}
