import { JSX, h } from "preact";
import { IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb, LensBuilder } from "lens-shmens";
import { IDayData, IPlannerProgramDay, IPlannerProgramWeek, ISettings } from "../../types";
import { IconHandle } from "../icons/iconHandle";
import { IconMusclesD } from "../icons/iconMusclesD";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { IconTrash } from "../icons/iconTrash";
import { IconArrowRight } from "../icons/iconArrowRight";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { MarkdownEditorBorderless } from "../markdownEditorBorderless";
import { StringUtils } from "../../utils/string";
import { IconTimerSmall } from "../icons/iconTimerSmall";
import { TimeUtils } from "../../utils/time";
import { PlannerStatsUtils } from "../../pages/planner/models/plannerStatsUtils";
import { DraggableList } from "../draggableList";
import { EditProgramUiExerciseView } from "./editProgramUiExercise";
import { applyChangesInEditor } from "./editProgramUtils";
import { CollectionUtils } from "../../utils/collection";
import { LinkButton } from "../linkButton";
import { UidFactory } from "../../utils/generator";
import { EditProgramV2TextExercises } from "./editProgramV2TextExercises";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { Button } from "../button";
import { IconPlus2 } from "../icons/iconPlus2";
import { ContentGrowingTextarea } from "../contentGrowingTextarea";
import { EditProgramUiHelpers } from "./editProgramUi/editProgramUiHelpers";
import { IDispatch } from "../../ducks/types";
import { IEvaluatedProgram } from "../../models/program";

interface IEditProgramDayViewProps {
  state: IPlannerState;
  day: IPlannerProgramDay;
  dayData: Required<IDayData>;
  isValidProgram: boolean;
  evaluatedProgram: IEvaluatedProgram;
  evaluatedDay: IPlannerEvalResult;
  lbPlannerWeek: LensBuilder<IPlannerState, IPlannerProgramWeek, {}>;
  showDelete: boolean;
  weekIndex: number;
  dayInWeekIndex: number;
  settings: ISettings;
  exerciseFullNames: string[];
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
  handleTouchStart?: (e: TouchEvent | MouseEvent) => void;
}

export function EditProgramUiDayView(props: IEditProgramDayViewProps): JSX.Element {
  const lbPlannerDay = props.lbPlannerWeek.p("days").i(props.dayInWeekIndex);
  const ui = props.state.ui;
  const isCollapsed = ui.dayUi.collapsed.has(`${props.weekIndex}-${props.dayInWeekIndex}`);
  const lbPlanner = lb<IPlannerState>().p("current").p("program").pi("planner");
  const days = props.state.current.program.planner!.weeks[props.weekIndex].days;

  return (
    <div
      key={props.day.id}
      className="p-1 my-1 bg-white border rounded-2xl border-grayv3-300"
      data-cy={`edit-day-${props.weekIndex + 1}-${props.dayInWeekIndex + 1}`}
    >
      <div className="flex items-center">
        <div className="p-2 cursor-move" style={{ touchAction: "none" }}>
          <span onMouseDown={props.handleTouchStart} onTouchStart={props.handleTouchStart}>
            <IconHandle />
          </span>
        </div>
        <h3 className="flex-1 text-base font-bold">
          <ContentGrowingTextarea
            value={props.day.name}
            onInput={(newValue) => {
              if (newValue) {
                props.plannerDispatch(lbPlannerDay.p("name").record(newValue), "Update day name");
              }
            }}
          />
        </h3>
        <div className="flex items-center">
          <div>
            <button
              data-cy="edit-day-muscles-d"
              className="px-2 align-middle ls-edit-day button nm-day-muscles-d"
              onClick={() => {
                props.plannerDispatch(lb<IPlannerState>().p("ui").p("showDayStats").record(props.dayInWeekIndex), "Show day stats");
              }}
            >
              <IconMusclesD size={20} />
            </button>
          </div>
          <div>
            <button
              data-cy="edit-day-clone"
              className="px-2 align-middle ls-clone-day button nm-clone-day"
              onClick={() => {
                const newName = StringUtils.nextName(props.day.name);
                const newDay = { name: newName, exerciseText: props.day.exerciseText, id: UidFactory.generateUid(8) };
                applyChangesInEditor(props.plannerDispatch, () => {
                  EditProgramUiHelpers.onDaysChange(
                    props.plannerDispatch,
                    props.state.ui,
                    props.weekIndex,
                    days,
                    (order) => {
                      props.plannerDispatch(
                        lbPlanner
                          .p("weeks")
                          .i(props.weekIndex)
                          .p("days")
                          .recordModify((days) => {
                            const newDays = [
                              ...days.slice(0, props.dayInWeekIndex + 1),
                              newDay,
                              ...days.slice(props.dayInWeekIndex + 1),
                            ];
                            return newDays;
                          }),
                        "Clone day"
                      );
                      order.splice(props.dayInWeekIndex + 1, 0, order[props.dayInWeekIndex]);
                    }
                  );
                });
              }}
            >
              <IconDuplicate2 />
            </button>
          </div>
          {props.showDelete && (
            <div>
              <button
                data-cy="edit-day-delete"
                className="px-2 align-middle ls-delete-day button nm-delete-day"
                onClick={() => {
                  applyChangesInEditor(props.plannerDispatch, () => {
                    EditProgramUiHelpers.onDaysChange(
                      props.plannerDispatch,
                      props.state.ui,
                      props.weekIndex,
                      days,
                      (order) => {
                        props.plannerDispatch(
                          lbPlanner
                            .p("weeks")
                            .i(props.weekIndex)
                            .p("days")
                            .recordModify((days) => {
                              return CollectionUtils.removeAt(days, props.dayInWeekIndex);
                            }),
                          "Delete day"
                        );
                        order.splice(props.dayInWeekIndex, 1);
                      }
                    );
                  });
                }}
              >
                <IconTrash />
              </button>
            </div>
          )}
          <div>
            <button
              className="w-8 pl-1 pr-2 text-center nm-edit-day-expand-collapse-day"
              onClick={() => {
                props.plannerDispatch(
                  lb<IPlannerState>()
                    .p("ui")
                    .p("dayUi")
                    .p("collapsed")
                    .recordModify((collapsed) => {
                      const newCollapsed = new Set(Array.from(collapsed));
                      const key = `${props.weekIndex}-${props.dayInWeekIndex}`;
                      if (newCollapsed.has(key)) {
                        newCollapsed.delete(key);
                      } else {
                        newCollapsed.add(key);
                      }
                      return newCollapsed;
                    }),
                  "Toggle day collapse"
                );
              }}
            >
              {isCollapsed ? <IconArrowRight className="inline-block" /> : <IconArrowDown2 className="inline-block" />}
            </button>
          </div>
        </div>
      </div>
      {!isCollapsed && (
        <EditProgramUiDayContentView
          evaluatedProgram={props.evaluatedProgram}
          isValidProgram={props.isValidProgram}
          day={props.day}
          dispatch={props.dispatch}
          settings={props.settings}
          ui={ui}
          dayData={props.dayData}
          exerciseFullNames={props.exerciseFullNames}
          plannerDispatch={props.plannerDispatch}
          lbPlannerDay={lbPlannerDay}
          evaluatedDay={props.evaluatedDay}
          weekIndex={props.weekIndex}
          dayIndex={props.dayInWeekIndex}
        />
      )}
    </div>
  );
}

interface IEditProgramDayContentViewProps {
  day: IPlannerProgramDay;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
  evaluatedProgram: IEvaluatedProgram;
  lbPlannerDay: LensBuilder<IPlannerState, IPlannerProgramDay, {}>;
  ui: IPlannerUi;
  isValidProgram: boolean;
  dayData: Required<IDayData>;
  weekIndex: number;
  exerciseFullNames: string[];
  dayIndex: number;
  settings: ISettings;
  evaluatedDay: IPlannerEvalResult;
}

function EditProgramUiDayContentView(props: IEditProgramDayContentViewProps): JSX.Element {
  const { evaluatedDay } = props;
  const duration = TimeUtils.formatHOrMin(
    PlannerStatsUtils.dayApproxTimeMs(evaluatedDay.success ? evaluatedDay.data : [], props.settings.timers.workout || 0)
  );
  const { weekIndex, dayIndex } = props;
  const lbPlanner = lb<IPlannerState>().p("current").p("program").pi("planner");
  const allExercisesCollapsed = evaluatedDay.success
    ? evaluatedDay.data.every((e) => {
        return props.ui.exerciseUi.collapsed.has(`${e.key}-${props.weekIndex}-${props.dayIndex}`);
      })
    : false;
  return (
    <div className="px-1">
      <div className="px-1">
        <MarkdownEditorBorderless
          value={props.day.description}
          placeholder={`Day description in Markdown...`}
          onChange={(v) => {
            props.plannerDispatch(props.lbPlannerDay.p("description").record(v), "Update day description");
          }}
        />
      </div>
      <div className="flex items-center gap-2 pt-1 pl-2 text-xs">
        {evaluatedDay.success && (
          <div>
            {evaluatedDay.data.length} {StringUtils.pluralize("exercise", evaluatedDay.data.length)}
          </div>
        )}
        <div className="flex items-center py-1">
          <div>
            <IconTimerSmall />
          </div>
          <div>
            {duration.value} {duration.unit}
          </div>
        </div>
        {props.ui.mode === "ui" && evaluatedDay.success && (
          <div className="ml-auto mr-2">
            <LinkButton
              name="collapse-all-exercises"
              className="text-xs font-normal"
              onClick={() => {
                props.plannerDispatch(
                  lb<IPlannerState>()
                    .p("ui")
                    .p("exerciseUi")
                    .p("collapsed")
                    .recordModify((collapsed) => {
                      const newCollapsed = new Set<string>(collapsed);
                      const exercises = evaluatedDay.data;
                      for (const exercise of exercises) {
                        const key = `${exercise.key}-${props.weekIndex}-${props.dayIndex}`;
                        if (allExercisesCollapsed) {
                          newCollapsed.delete(key);
                        } else {
                          newCollapsed.add(key);
                        }
                      }
                      return newCollapsed;
                    }),
                  "Toggle all exercises"
                );
              }}
            >
              {allExercisesCollapsed ? "Expand" : "Collapse"} all exercises
            </LinkButton>
          </div>
        )}
      </div>
      <div className="pt-2">
        {props.ui.mode === "ui" && props.isValidProgram && evaluatedDay.success ? (
          <div>
            <DraggableList
              items={evaluatedDay.data}
              mode="vertical"
              onDragEnd={(startIndex, endIndex) => {
                props.plannerDispatch(
                  lbPlanner.recordModify((program) => {
                    const fullName = evaluatedDay.data[startIndex].fullName;
                    return EditProgramUiHelpers.changeCurrentInstancePosition(
                      program,
                      props.dayData,
                      fullName,
                      startIndex,
                      endIndex,
                      props.settings
                    );
                  }),
                  "Reorder exercise"
                );
              }}
              element={(exercise, exerciseIndex, handleTouchStart) => {
                return (
                  <EditProgramUiExerciseView
                    ui={props.ui}
                    plannerExercise={exercise}
                    evaluatedProgram={props.evaluatedProgram}
                    dispatch={props.dispatch}
                    plannerDispatch={props.plannerDispatch}
                    weekIndex={props.weekIndex}
                    dayIndex={props.dayIndex}
                    exerciseIndex={exerciseIndex}
                    settings={props.settings}
                    handleTouchStart={handleTouchStart}
                  />
                );
              }}
            />
            <div className="py-1">
              <Button
                kind="lightgrayv3"
                buttonSize="md"
                data-cy="add-exercise"
                name="add-exercise"
                className="flex items-center justify-center w-full text-sm text-center"
                onClick={() => {
                  props.plannerDispatch(
                    lb<IPlannerState>()
                      .p("ui")
                      .p("modalExercise")
                      .record({
                        focusedExercise: {
                          weekIndex: weekIndex,
                          dayIndex: dayIndex,
                          exerciseLine: evaluatedDay.data.length,
                        },
                        types: [],
                        muscleGroups: [],
                      }),
                    "Open add exercise modal"
                  );
                }}
              >
                <IconPlus2 size={12} />
                <span className="ml-2">Add Exercise</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex">
            <EditProgramV2TextExercises
              weekIndex={weekIndex}
              dayIndex={dayIndex}
              plannerDay={props.day}
              exerciseFullNames={props.exerciseFullNames}
              plannerDispatch={props.plannerDispatch}
              lbProgram={lbPlanner}
              evaluatedDay={evaluatedDay}
              settings={props.settings}
              ui={props.ui}
            />
          </div>
        )}
      </div>
    </div>
  );
}
