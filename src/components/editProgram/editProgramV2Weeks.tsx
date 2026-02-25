import { lb } from "lens-shmens";
import { h, JSX } from "preact";
import { Exercise_findByName } from "../../models/exercise";
import { IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { IPlannerProgramWeek, ISettings } from "../../types";
import { CollectionUtils_removeAt, CollectionUtils_compact } from "../../utils/collection";
import { ObjectUtils_clone } from "../../utils/object";
import { StringUtils_nextName } from "../../utils/string";
import { ILensDispatch } from "../../utils/useLensReducer";
import { DraggableList } from "../draggableList";
import { ExerciseImage } from "../exerciseImage";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { IconArrowRight } from "../icons/iconArrowRight";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { IconHandle } from "../icons/iconHandle";
import { IconTrash } from "../icons/iconTrash";
import { PlannerProgram } from "../../pages/planner/models/plannerProgram";
import { Button } from "../button";
import { IconPlus2 } from "../icons/iconPlus2";
import { LinkButton } from "../linkButton";
import { ContentGrowingTextarea } from "../contentGrowingTextarea";
import { EditProgramUiHelpers } from "./editProgramUi/editProgramUiHelpers";

export interface IPlannerContentWeeksProps {
  state: IPlannerState;
  plannerDispatch: ILensDispatch<IPlannerState>;
  settings: ISettings;
}

function onWeeksChange(
  plannerDispatch: ILensDispatch<IPlannerState>,
  ui: IPlannerUi,
  weeks: IPlannerProgramWeek[],
  cb: (order: boolean[]) => void
): void {
  const lbUi = lb<IPlannerState>().p("ui");
  const collapsedOrder = weeks.map((d, i) => {
    return ui.weekUi.collapsed.has(`${i}`);
  });
  cb(collapsedOrder);
  plannerDispatch(
    [
      lbUi.p("dayUi").p("collapsed").record(new Set()),
      lbUi
        .p("weekUi")
        .p("collapsed")
        .recordModify((collapsed) => {
          const newCollapsed = new Set<string>(collapsed);
          for (let i = 0; i < collapsedOrder.length; i++) {
            if (collapsedOrder[i]) {
              newCollapsed.add(`${i}`);
            } else {
              newCollapsed.delete(`${i}`);
            }
          }
          return newCollapsed;
        }),
    ],
    "Update week collapse state"
  );
}

export function EditProgramV2Weeks(props: IPlannerContentWeeksProps): JSX.Element {
  const collapsedWeeks = props.state.ui.weekUi.collapsed;

  const program = props.state.current.program;
  const plannerProgram = program.planner!;
  const ui = props.state.ui;

  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const { evaluatedWeeks } = PlannerProgram.evaluate(plannerProgram, props.settings);

  return (
    <div>
      <div className="px-4">
        <div>
          <LinkButton
            name="collapse-all-weeks"
            className="text-xs font-normal"
            onClick={() => {
              props.plannerDispatch(
                lb<IPlannerState>()
                  .p("ui")
                  .p("weekUi")
                  .p("collapsed")
                  .recordModify((collapsed) => {
                    if (collapsed.size > 0) {
                      return new Set<string>();
                    } else {
                      const newCollapsed = new Set<string>();
                      for (
                        let weekIndex = 0;
                        weekIndex < props.state.current.program.planner!.weeks.length;
                        weekIndex++
                      ) {
                        newCollapsed.add(`${weekIndex}`);
                      }
                      return newCollapsed;
                    }
                  }),
                "Toggle all weeks collapse"
              );
            }}
          >
            {props.state.ui.weekUi.collapsed.size > 0 ? "Expand" : "Collapse"} all weeks
          </LinkButton>
        </div>
        <DraggableList
          items={plannerProgram.weeks}
          mode="vertical"
          onDragEnd={(startIndex, endIndex) => {
            onWeeksChange(props.plannerDispatch, ui, props.state.current.program.planner!.weeks, (order) => {
              props.plannerDispatch(
                [
                  lbProgram.p("weeks").recordModify((weeks) => {
                    const newWeeks = [...weeks];
                    const [weekToMove] = newWeeks.splice(startIndex, 1);
                    newWeeks.splice(endIndex, 0, weekToMove);
                    return newWeeks;
                  }),
                ],
                "Reorder weeks"
              );
              const [weekToMove] = order.splice(startIndex, 1);
              order.splice(endIndex, 0, weekToMove);
            });
          }}
          element={(week, weekIndex, handleTouchStart) => {
            return (
              <section key={weekIndex} className="flex w-full px-2 py-1 text-left">
                <div className="flex flex-col">
                  <div className="p-2 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
                    <span onMouseDown={handleTouchStart} onTouchStart={handleTouchStart}>
                      <IconHandle />
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-full bg-border-neutral" style={{ width: "1px" }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex">
                    <div>
                      <button
                        title={collapsedWeeks.has(`${weekIndex}`) ? "Expand week" : "Collapse week"}
                        onClick={() => {
                          props.plannerDispatch(
                            lb<IPlannerState>()
                              .p("ui")
                              .p("weekUi")
                              .p("collapsed")
                              .recordModify((collapsed) => {
                                const newCollapsed = new Set(Array.from(collapsed));
                                const exKey = `${weekIndex}`;
                                if (newCollapsed.has(exKey)) {
                                  newCollapsed.delete(exKey);
                                } else {
                                  newCollapsed.add(exKey);
                                }
                                return newCollapsed;
                              }),
                            "Toggle week collapse"
                          );
                        }}
                        className="w-8 p-2 mr-1 text-center nm-web-editor-expand-collapse-day"
                      >
                        {collapsedWeeks.has(`${weekIndex}`) ? (
                          <IconArrowRight className="inline-block" />
                        ) : (
                          <IconArrowDown2 className="inline-block" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center flex-1 mr-2 text-base">
                      <ContentGrowingTextarea
                        value={week.name}
                        onInput={(weekName) => {
                          if (weekName) {
                            props.plannerDispatch(
                              lbProgram.p("weeks").i(weekIndex).p("name").record(weekName),
                              "Update week name"
                            );
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center pr-4">
                      <button
                        data-cy="clone-day"
                        className="p-2 align-middle ls-clone-day-v2 button nm-clone-day-v2"
                        onClick={() => {
                          const newName = StringUtils_nextName(week.name);
                          const newWeek = { ...ObjectUtils_clone(week), name: newName };
                          onWeeksChange(
                            props.plannerDispatch,
                            ui,
                            props.state.current.program.planner!.weeks,
                            (order) => {
                              props.plannerDispatch(
                                lbProgram.p("weeks").recordModify((weeks) => {
                                  return [...weeks.slice(0, weekIndex + 1), newWeek, ...weeks.slice(weekIndex + 1)];
                                }),
                                "Duplicate week"
                              );
                              order.splice(weekIndex + 1, 0, order[weekIndex]);
                            }
                          );
                        }}
                      >
                        <IconDuplicate2 />
                      </button>
                      {plannerProgram.weeks.length > 0 && (
                        <button
                          data-cy={`delete-week-v2`}
                          className="p-2 align-middle ls-delete-week-v2 button nm-delete-week-v2"
                          onClick={() => {
                            onWeeksChange(
                              props.plannerDispatch,
                              ui,
                              props.state.current.program.planner!.weeks,
                              (order) => {
                                props.plannerDispatch(
                                  lbProgram.p("weeks").recordModify((weeks) => {
                                    return CollectionUtils_removeAt(weeks, weekIndex);
                                  }),
                                  "Delete week"
                                );
                                order.splice(weekIndex, 1);
                              }
                            );
                          }}
                        >
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  </div>
                  {!collapsedWeeks.has(`${weekIndex}`) && (
                    <div>
                      <DraggableList
                        items={week.days}
                        mode="vertical"
                        onDragEnd={(startIndex, endIndex) => {
                          EditProgramUiHelpers.onDaysChange(
                            props.plannerDispatch,
                            props.state.ui,
                            weekIndex,
                            week.days,
                            (order) => {
                              props.plannerDispatch(
                                [
                                  lbProgram
                                    .p("weeks")
                                    .i(weekIndex)
                                    .p("days")
                                    .recordModify((days) => {
                                      const newDays = [...days];
                                      const [daysToMove] = newDays.splice(startIndex, 1);
                                      newDays.splice(endIndex, 0, daysToMove);
                                      return newDays;
                                    }),
                                ],
                                "Reorder days"
                              );
                              const [daysToMove] = order.splice(startIndex, 1);
                              order.splice(endIndex, 0, daysToMove);
                            }
                          );
                        }}
                        element={(day, dayIndex, handleTouchStart2) => {
                          const evalResult = evaluatedWeeks[weekIndex][dayIndex];
                          return (
                            <div
                              className="flex items-center px-4 py-1 my-1 border border-background-default rounded-lg bg-background-purpledark"
                              style={{ boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.25)" }}
                            >
                              <div className="flex items-center">
                                <div className="p-2 cursor-move" style={{ marginLeft: "-16px", touchAction: "none" }}>
                                  <span onMouseDown={handleTouchStart2} onTouchStart={handleTouchStart2}>
                                    <IconHandle />
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="text-base">
                                  <ContentGrowingTextarea
                                    value={day.name}
                                    onInput={(dayName) => {
                                      if (dayName) {
                                        props.plannerDispatch(
                                          lbProgram
                                            .p("weeks")
                                            .i(weekIndex)
                                            .p("days")
                                            .i(dayIndex)
                                            .p("name")
                                            .record(dayName),
                                          "Update day name"
                                        );
                                      }
                                    }}
                                  />
                                </div>
                                <div>
                                  {evalResult.success
                                    ? CollectionUtils_compact(
                                        evalResult.data.map((e) => {
                                          const exercise = Exercise_findByName(e.name, props.settings.exercises);
                                          const exerciseType =
                                            exercise != null ? { id: exercise.id, equipment: e.equipment } : undefined;
                                          if (exerciseType) {
                                            return (
                                              <ExerciseImage
                                                settings={props.settings}
                                                exerciseType={exerciseType}
                                                size="small"
                                                className="w-6 mr-1"
                                              />
                                            );
                                          } else {
                                            return undefined;
                                          }
                                        })
                                      )
                                    : []}
                                </div>
                              </div>
                              <div className="flex items-center">
                                <button
                                  data-cy="clone-day"
                                  className="p-2 align-middle ls-clone-day-v2 button nm-clone-day-v2"
                                  onClick={() => {
                                    const newName = StringUtils_nextName(day.name);
                                    const newDay = { ...ObjectUtils_clone(day), name: newName };
                                    props.plannerDispatch(
                                      lbProgram
                                        .p("weeks")
                                        .i(weekIndex)
                                        .p("days")
                                        .recordModify((days) => {
                                          return [...days.slice(0, dayIndex + 1), newDay, ...days.slice(dayIndex + 1)];
                                        }),
                                      "Duplicate day"
                                    );
                                  }}
                                >
                                  <IconDuplicate2 />
                                </button>
                                {plannerProgram.weeks.length > 0 && (
                                  <button
                                    data-cy={`delete-week-v2`}
                                    className="p-2 align-middle ls-delete-week-v2 button nm-delete-week-v2"
                                    onClick={() => {
                                      props.plannerDispatch(
                                        lbProgram
                                          .p("weeks")
                                          .i(weekIndex)
                                          .p("days")
                                          .recordModify((days) => {
                                            return CollectionUtils_removeAt(days, dayIndex);
                                          }),
                                        "Delete day"
                                      );
                                    }}
                                  >
                                    <IconTrash />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <div className="py-1">
                        <Button
                          kind="lightgrayv3"
                          name="planner-weeks-add-day"
                          buttonSize="md"
                          className="flex items-center justify-center w-full text-sm text-center"
                          onClick={() => {
                            props.plannerDispatch(
                              lbProgram
                                .p("weeks")
                                .i(weekIndex)
                                .p("days")
                                .recordModify((days) => [
                                  ...days,
                                  {
                                    name: `Day ${days.length + 1}`,
                                    exerciseText: "",
                                  },
                                ]),
                              "Add new day"
                            );
                          }}
                        >
                          <IconPlus2 size={12} />
                          <span className="ml-2">Add Day</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          }}
        />
        <div className="pt-1 pb-6 mx-2">
          <Button
            kind="lightgrayv3"
            name="planner-add-week"
            buttonSize="md"
            className="flex items-center justify-center w-full text-sm text-center"
            onClick={() => {
              props.plannerDispatch(
                lbProgram.p("weeks").recordModify((weeks) => [
                  ...weeks,
                  {
                    name: `Week ${weeks.length + 1}`,
                    days: [],
                  },
                ]),
                "Add new week"
              );
            }}
          >
            <IconPlus2 size={12} />
            <span className="ml-2">Add Week</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
