import type { JSX } from "react";
import { View, Pressable, Platform } from "react-native";
import { lb } from "lens-shmens";
import { Text } from "../primitives/text";
import { Exercise_findByName } from "../../models/exercise";
import { IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { IPlannerProgramWeek, ISettings } from "../../types";
import { CollectionUtils_removeAt, CollectionUtils_compact } from "../../utils/collection";
import { ObjectUtils_clone } from "../../utils/object";
import { StringUtils_nextName } from "../../utils/string";
import { ILensDispatch } from "../../utils/useLensReducer";
import { DraggableList2 } from "../draggableList2";
import { ExerciseImage } from "../exerciseImage";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { IconArrowRight } from "../icons/iconArrowRight";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { IconHandle } from "../icons/iconHandle";
import { IconTrash } from "../icons/iconTrash";
import { PlannerProgram_evaluate } from "../../pages/planner/models/plannerProgram";
import { Button } from "../button";
import { IconPlus2 } from "../icons/iconPlus2";
import { LinkButton } from "../linkButton";
import { ContentGrowingTextarea } from "../contentGrowingTextarea";
import { EditProgramUiHelpers_onDaysChange } from "./editProgramUi/editProgramUiHelpers";
import { useRem } from "../../utils/useRem";

export interface IPlannerContentWeeksProps {
  state: IPlannerState;
  plannerDispatch: ILensDispatch<IPlannerState>;
  settings: ISettings;
}

const SHADOW_STYLE = Platform.select({
  ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowOffset: { width: 0, height: 0 }, shadowRadius: 4 },
  android: { elevation: 2 },
  default: { boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.25)" },
}) as Record<string, unknown>;

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
  const { evaluatedWeeks } = PlannerProgram_evaluate(plannerProgram, props.settings);
  const rem = useRem();

  return (
    <View>
      <View className="px-4">
        <View>
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
        </View>
        <DraggableList2
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
          element={(week, weekIndex, dragHandle) => {
            return (
              <View key={weekIndex} className="flex-row w-full px-2 py-1">
                <View className="flex-col">
                  {dragHandle(
                    <View className="p-2 ml-[-1rem]">
                      <IconHandle />
                    </View>
                  )}
                  <View className="flex-1">
                    <View className="h-full bg-border-neutral" style={{ width: 1 }} />
                  </View>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <View>
                      <Pressable
                        onPress={() => {
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
                        className="items-center w-8 p-2 mr-1 nm-web-editor-expand-collapse-day"
                      >
                        {collapsedWeeks.has(`${weekIndex}`) ? <IconArrowRight /> : <IconArrowDown2 />}
                      </Pressable>
                    </View>
                    <View className="flex-row items-center flex-1 mr-2">
                      <ContentGrowingTextarea
                        className="text-base"
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
                    </View>
                    <View className="flex-row items-center pr-4">
                      <Pressable
                        data-testid="clone-day"
                        testID="clone-day"
                        className="p-2 nm-clone-day-v2"
                        onPress={() => {
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
                      </Pressable>
                      {plannerProgram.weeks.length > 0 && (
                        <Pressable
                          data-testid={`delete-week-v2`}
                          testID="delete-week-v2"
                          className="p-2 nm-delete-week-v2"
                          onPress={() => {
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
                        </Pressable>
                      )}
                    </View>
                  </View>
                  {!collapsedWeeks.has(`${weekIndex}`) && (
                    <View>
                      <DraggableList2
                        items={week.days}
                        mode="vertical"
                        onDragEnd={(startIndex, endIndex) => {
                          EditProgramUiHelpers_onDaysChange(
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
                        element={(day, dayIndex, dayDragHandle) => {
                          const evalResult = evaluatedWeeks[weekIndex][dayIndex];
                          return (
                            <View
                              className="flex-row items-center px-4 py-1 my-1 border rounded-lg border-background-default bg-background-purpledark"
                              style={SHADOW_STYLE}
                            >
                              <View className="flex-row items-center">
                                {dayDragHandle(
                                  <View className="p-2 ml-[-1rem]">
                                    <IconHandle />
                                  </View>
                                )}
                              </View>
                              <View className="flex-1">
                                <ContentGrowingTextarea
                                  className="text-base"
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
                                <View className="flex-row flex-wrap items-center gap-1">
                                  {evalResult.success
                                    ? CollectionUtils_compact(
                                        evalResult.data.map((e) => {
                                          const exercise = Exercise_findByName(e.name, props.settings.exercises);
                                          const exerciseType =
                                            exercise != null ? { id: exercise.id, equipment: e.equipment } : undefined;
                                          if (exerciseType) {
                                            return (
                                              <ExerciseImage
                                                key={`${exerciseType.id}-${exerciseType.equipment}`}
                                                settings={props.settings}
                                                exerciseType={exerciseType}
                                                width={rem * 1.5}
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
                                </View>
                              </View>
                              <View className="flex-row items-center">
                                <Pressable
                                  data-testid="clone-day"
                                  testID="clone-day"
                                  className="p-2 nm-clone-day-v2"
                                  onPress={() => {
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
                                </Pressable>
                                {plannerProgram.weeks.length > 0 && (
                                  <Pressable
                                    data-testid={`delete-week-v2`}
                                    testID="delete-week-v2"
                                    className="p-2 nm-delete-week-v2"
                                    onPress={() => {
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
                                  </Pressable>
                                )}
                              </View>
                            </View>
                          );
                        }}
                      />
                      <View className="py-1">
                        <Button
                          kind="lightgrayv3"
                          name="planner-weeks-add-day"
                          buttonSize="md"
                          className="flex-row items-center justify-center w-full"
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
                          <Text className="ml-2 text-sm font-semibold text-text-link">Add Day</Text>
                        </Button>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
        <View className="pt-1 pb-6 mx-2">
          <Button
            kind="lightgrayv3"
            name="planner-add-week"
            buttonSize="md"
            className="flex-row items-center justify-center w-full"
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
            <Text className="ml-2 text-sm font-semibold text-text-link">Add Week</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
