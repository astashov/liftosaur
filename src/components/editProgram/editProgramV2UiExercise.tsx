import { lb } from "lens-shmens";
import { h, JSX, Fragment } from "preact";
import { Exercise, equipmentName } from "../../models/exercise";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { focusedToStr, IPlannerProgramExercise, IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { PlannerKey } from "../../pages/planner/plannerKey";
import { IDayData, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { ExerciseImage } from "../exerciseImage";
import { GroupHeader } from "../groupHeader";
import { HistoryRecordSet } from "../historyRecordSets";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { IconArrowRight } from "../icons/iconArrowRight";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { IconEditSquare } from "../icons/iconEditSquare";
import { IconHandle } from "../icons/iconHandle";
import { IconTrash } from "../icons/iconTrash";
import { SetNumber } from "./editProgramSets";
import { EditProgramUiDescriptions } from "./editProgramUi/editProgramUiDescriptions";
import { EditProgramUiHelpers } from "./editProgramUi/editProgramUiHelpers";
import { EditProgramUiProgress } from "./editProgramUi/editProgramUiProgress";
import { EditProgramUiUpdate } from "./editProgramUi/editProgramUiUpdate";

interface IEditProgramV2UiExerciseProps {
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  dayData: Required<IDayData>;
  exerciseLine: number;
  ui: IPlannerUi;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramV2UiExercise(props: IEditProgramV2UiExerciseProps): JSX.Element {
  const { plannerExercise, exerciseLine } = props;
  const { week, dayInWeek } = props.dayData;
  const key = PlannerKey.fromPlannerExercise(plannerExercise, props.settings);
  const weekIndex = week - 1;
  const dayIndex = dayInWeek - 1;
  const exercise = Exercise.findByName(plannerExercise.name, props.settings.exercises);
  const exerciseType = exercise != null ? { id: exercise.id, equipment: plannerExercise.equipment } : undefined;
  const warmupSets =
    PlannerProgramExercise.warmups(plannerExercise) ||
    (exercise != null ? PlannerProgramExercise.defaultWarmups(exercise, props.settings) : []);
  const displayWarmupSets = PlannerProgramExercise.warmupSetsToDisplaySets(warmupSets);
  const isCollapsed = props.ui.exerciseUi.collapsed.has(focusedToStr({ weekIndex, dayIndex, exerciseLine }));
  const reusingSets = plannerExercise.reuse?.fullName;
  const repeatStr = PlannerProgramExercise.repeatToRangeStr(plannerExercise);
  const order = plannerExercise.order !== 0 ? plannerExercise.order : undefined;
  const orderAndRepeat = [order, repeatStr].filter((s) => s).join(", ");
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");

  return (
    <div
      data-cy={`exercise-${key}`}
      className="px-2 py-1 mb-2 rounded-lg bg-purplev2-100"
      style={{ border: "1px solid rgb(125 103 189 / 15%)", minHeight: "5rem" }}
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
          {orderAndRepeat && <div className="ml-4 text-xs font-bold text-grayv2-main">[{orderAndRepeat}]</div>}
          {plannerExercise.notused && (
            <div className="px-1 ml-3 text-xs font-bold text-white rounded bg-grayv2-main">UNUSED</div>
          )}
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
                    const exKey = focusedToStr({ weekIndex, dayIndex, exerciseLine });
                    newEdit.add(exKey);
                    return newEdit;
                  })
              );
            }}
          >
            <IconEditSquare />
          </button>
          <button
            data-cy="clone-exercise"
            className="px-2 align-middle ls-clone-day-v2 button nm-clone-day-v2"
            onClick={() => {
              props.plannerDispatch(
                lb<IPlannerState>()
                  .p("ui")
                  .p("modalExercise")
                  .record({
                    focusedExercise: {
                      weekIndex,
                      dayIndex,
                      exerciseLine,
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
          <button
            data-cy={`delete-exercise`}
            className="px-2 align-middle ls-delete-day-v2 button nm-delete-day-v2"
            onClick={() => {
              props.plannerDispatch(
                lbProgram.recordModify((program) => {
                  return EditProgramUiHelpers.deleteCurrentInstance(
                    program,
                    props.dayData,
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
      <div className="flex items-center flex-1">
        {exerciseType && (
          <div className="mr-3">
            <ExerciseImage settings={props.settings} className="w-8" exerciseType={exerciseType} size="small" />
          </div>
        )}
        <div className="flex items-center flex-1 mr-2 text-lg">
          <div data-cy="planner-ui-exercise-name">
            {plannerExercise.label ? `${plannerExercise.label}: ` : ""}
            {plannerExercise.name}
            {plannerExercise.equipment != null && plannerExercise.equipment !== exercise?.defaultEquipment && (
              <div className="text-xs text-grayv2-main">{equipmentName(plannerExercise.equipment)}</div>
            )}
          </div>
          <div>
            <button
              className="w-8 p-2 mr-1 text-center nm-edit-program-v2-expand-collapse-exercise"
              data-cy="collapse-exercise"
              onClick={() => {
                props.plannerDispatch(
                  lb<IPlannerState>()
                    .p("ui")
                    .p("exerciseUi")
                    .p("collapsed")
                    .recordModify((collapsed) => {
                      const newCollapsed = new Set(Array.from(collapsed));
                      const exKey = focusedToStr({ weekIndex, dayIndex, exerciseLine });
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
      </div>
      {!isCollapsed && (
        <>
          {plannerExercise.descriptions.values.length > 0 && (
            <EditProgramUiDescriptions header="Descriptions" showCurrent={true} plannerExercise={plannerExercise} />
          )}
          <div className="px-1">
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
                <div>
                  <div>
                    {plannerExercise.setVariations.length > 1 && (
                      <GroupHeader
                        highlighted={true}
                        name={`Set Variation ${i + 1}`}
                        rightAddOn={
                          plannerExercise.setVariations.length > 1 && currentIndex === i ? (
                            <div className="px-1 text-xs font-bold text-white rounded bg-grayv2-main">CURRENT</div>
                          ) : undefined
                        }
                      />
                    )}
                  </div>
                  <div className="flex items-start my-2">
                    {displayWarmupSets.flat().length > 0 && (
                      <>
                        <div>
                          <div className="text-xs text-left text-grayv2-main">Warmups</div>
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
                      <div className="text-xs text-left text-grayv2-main">Workout</div>
                      {reusingSets && <div className="text-xs text-grayv2-main">Reusing {reusingSets}</div>}
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
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-1 pb-2 text-xs text-grayv2-main">
            <EditProgramUiProgress exercise={plannerExercise} settings={props.settings} />
            <EditProgramUiUpdate exercise={plannerExercise} settings={props.settings} />
          </div>
        </>
      )}
    </div>
  );
}
