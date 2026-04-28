import type { JSX, ReactNode } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../primitives/text";
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
import { StringUtils_nextName, StringUtils_pluralize } from "../../utils/string";
import { IconTimerSmall } from "../icons/iconTimerSmall";
import { TimeUtils_formatHOrMin } from "../../utils/time";
import { PlannerStatsUtils_dayApproxTimeMs } from "../../pages/planner/models/plannerStatsUtils";
import { DraggableList2 } from "../draggableList2";
import { EditProgramUiExerciseView } from "./editProgramUiExercise";
import { applyChangesInEditor, pickerStateFromPlannerExercise } from "./editProgramUtils";
import { CollectionUtils_removeAt } from "../../utils/collection";
import { LinkButton } from "../linkButton";
import { UidFactory_generateUid } from "../../utils/generator";
import { EditProgramV2TextExercises } from "./editProgramV2TextExercises";
import { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import { Button } from "../button";
import { IconPlus2 } from "../icons/iconPlus2";
import { ContentGrowingTextarea } from "../contentGrowingTextarea";
import {
  EditProgramUiHelpers_onDaysChange,
  EditProgramUiHelpers_changeCurrentInstancePosition,
} from "./editProgramUi/editProgramUiHelpers";
import { IDispatch } from "../../ducks/types";
import { IEvaluatedProgram } from "../../models/program";
import { navigationRef } from "../../navigation/navigationRef";

interface IEditProgramDayViewProps {
  state: IPlannerState;
  day: IPlannerProgramDay;
  dayData: Required<IDayData>;
  isValidProgram: boolean;
  evaluatedProgram: IEvaluatedProgram;
  evaluatedDay: IPlannerEvalResult;
  lbPlannerWeek: LensBuilder<IPlannerState, IPlannerProgramWeek, {}, undefined>;
  showDelete: boolean;
  weekIndex: number;
  dayInWeekIndex: number;
  settings: ISettings;
  exerciseFullNames: string[];
  programId: string;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
  dragHandle?: (children: ReactNode) => JSX.Element;
}

export function EditProgramUiDayView(props: IEditProgramDayViewProps): JSX.Element {
  const lbPlannerDay = props.lbPlannerWeek.p("days").i(props.dayInWeekIndex);
  const ui = props.state.ui;
  const isCollapsed = ui.dayUi.collapsed.has(`${props.weekIndex}-${props.dayInWeekIndex}`);
  const lbPlanner = lb<IPlannerState>().p("current").p("program").pi("planner");
  const days = props.state.current.program.planner!.weeks[props.weekIndex].days;

  return (
    <View
      key={props.day.id}
      className="p-1 my-1 border bg-background-default rounded-2xl border-border-neutral"
      data-cy={`edit-day-${props.weekIndex + 1}-${props.dayInWeekIndex + 1}`} data-testid={`edit-day-${props.weekIndex + 1}-${props.dayInWeekIndex + 1}`} testID={`edit-day-${props.weekIndex + 1}-${props.dayInWeekIndex + 1}`}
    >
      <View className="flex-row items-center">
        {props.dragHandle ? (
          props.dragHandle(
            <View className="p-2">
              <IconHandle />
            </View>
          )
        ) : (
          <View className="p-2">
            <IconHandle />
          </View>
        )}
        <View className="flex-1">
          <ContentGrowingTextarea
            className="text-base font-bold"
            value={props.day.name}
            onInput={(newValue) => {
              if (newValue) {
                props.plannerDispatch(lbPlannerDay.p("name").record(newValue), "Update day name");
              }
            }}
          />
        </View>
        <View className="flex-row items-center">
          <View>
            <Pressable
              data-cy="edit-day-muscles-d" data-testid="edit-day-muscles-d"
              testID="edit-day-muscles-d"
              className="px-2 nm-day-muscles-d"
              onPress={() => {
                props.plannerDispatch(
                  lb<IPlannerState>().p("ui").p("showDayStats").record(props.dayInWeekIndex),
                  "Show day stats"
                );
                navigationRef.navigate("dayStatsModal", { programId: props.programId });
              }}
            >
              <IconMusclesD size={20} />
            </Pressable>
          </View>
          <View>
            <Pressable
              data-cy="edit-day-clone" data-testid="edit-day-clone"
              testID="edit-day-clone"
              className="px-2 nm-clone-day"
              onPress={() => {
                const newName = StringUtils_nextName(props.day.name);
                const newDay = { name: newName, exerciseText: props.day.exerciseText, id: UidFactory_generateUid(8) };
                applyChangesInEditor(props.plannerDispatch, () => {
                  EditProgramUiHelpers_onDaysChange(
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
                          .recordModify((days2) => {
                            const newDays = [
                              ...days2.slice(0, props.dayInWeekIndex + 1),
                              newDay,
                              ...days2.slice(props.dayInWeekIndex + 1),
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
            </Pressable>
          </View>
          {props.showDelete && (
            <View>
              <Pressable
                data-cy="edit-day-delete" data-testid="edit-day-delete"
                testID="edit-day-delete"
                className="px-2 nm-delete-day"
                onPress={() => {
                  applyChangesInEditor(props.plannerDispatch, () => {
                    EditProgramUiHelpers_onDaysChange(
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
                            .recordModify((days2) => {
                              return CollectionUtils_removeAt(days2, props.dayInWeekIndex);
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
              </Pressable>
            </View>
          )}
          <View>
            <Pressable
              className="w-8 pl-1 pr-2 items-center nm-edit-day-expand-collapse-day"
              onPress={() => {
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
              {isCollapsed ? <IconArrowRight /> : <IconArrowDown2 />}
            </Pressable>
          </View>
        </View>
      </View>
      {!isCollapsed && (
        <EditProgramUiDayContentView
          evaluatedProgram={props.evaluatedProgram}
          isValidProgram={props.isValidProgram}
          day={props.day}
          dispatch={props.dispatch}
          programId={props.programId}
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
    </View>
  );
}

interface IEditProgramDayContentViewProps {
  day: IPlannerProgramDay;
  dispatch: IDispatch;
  programId: string;
  plannerDispatch: ILensDispatch<IPlannerState>;
  evaluatedProgram: IEvaluatedProgram;
  lbPlannerDay: LensBuilder<IPlannerState, IPlannerProgramDay, {}, undefined>;
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
  const duration = TimeUtils_formatHOrMin(
    PlannerStatsUtils_dayApproxTimeMs(evaluatedDay.success ? evaluatedDay.data : [], props.settings.timers.workout || 0)
  );
  const { weekIndex, dayIndex } = props;
  const lbPlanner = lb<IPlannerState>().p("current").p("program").pi("planner");
  const allExercisesCollapsed = evaluatedDay.success
    ? evaluatedDay.data.every((e) => {
        return props.ui.exerciseUi.collapsed.has(`${e.key}-${props.weekIndex}-${props.dayIndex}`);
      })
    : false;
  const usedExercises = evaluatedDay.success ? evaluatedDay.data.filter((d) => !d.notused) : [];
  const notUsedExercises = evaluatedDay.success ? evaluatedDay.data.filter((d) => d.notused) : [];
  return (
    <View className="px-1">
      <View className="px-1">
        <MarkdownEditorBorderless
          value={props.day.description}
          placeholder={`Day description in Markdown...`}
          debounceMs={500}
          onChange={(v) => {
            props.plannerDispatch(props.lbPlannerDay.p("description").record(v), "Update day description");
          }}
        />
      </View>
      <View className="flex-row items-center gap-2 pt-1 pl-2">
        {evaluatedDay.success && (
          <View>
            <Text className="text-xs">
              {evaluatedDay.data.length} {StringUtils_pluralize("exercise", evaluatedDay.data.length)}
            </Text>
          </View>
        )}
        <View className="flex-row items-center py-1">
          <View>
            <IconTimerSmall />
          </View>
          <View>
            <Text className="text-xs">
              {duration.value} {duration.unit}
            </Text>
          </View>
        </View>
        {props.ui.mode === "ui" && evaluatedDay.success && (
          <View className="ml-auto mr-2">
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
          </View>
        )}
      </View>
      <View className="pt-2">
        {props.ui.mode === "ui" && props.isValidProgram && evaluatedDay.success ? (
          <View>
            <DraggableList2
              items={usedExercises}
              mode="vertical"
              onDragEnd={(startIndex, endIndex) => {
                props.plannerDispatch(
                  lbPlanner.recordModify((program) => {
                    const fullName = usedExercises[startIndex].fullName;
                    return EditProgramUiHelpers_changeCurrentInstancePosition(
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
              element={(exercise, exerciseIndex, dragHandle) => {
                return (
                  <EditProgramUiExerciseView
                    ui={props.ui}
                    plannerExercise={exercise}
                    evaluatedProgram={props.evaluatedProgram}
                    dispatch={props.dispatch}
                    programId={props.programId}
                    plannerDispatch={props.plannerDispatch}
                    weekIndex={props.weekIndex}
                    dayIndex={props.dayIndex}
                    exerciseIndex={exerciseIndex}
                    settings={props.settings}
                    dragHandle={dragHandle}
                  />
                );
              }}
            />
            {notUsedExercises.map((exercise, exerciseIndex) => (
              <EditProgramUiExerciseView
                key={exercise.key || exerciseIndex}
                ui={props.ui}
                plannerExercise={exercise}
                evaluatedProgram={props.evaluatedProgram}
                dispatch={props.dispatch}
                programId={props.programId}
                plannerDispatch={props.plannerDispatch}
                weekIndex={props.weekIndex}
                dayIndex={props.dayIndex}
                exerciseIndex={exerciseIndex}
                settings={props.settings}
              />
            ))}
            <View className="py-1">
              <Button
                kind="lightgrayv3"
                buttonSize="md"
                data-cy="add-exercise" data-testid="add-exercise" testID="add-exercise"
                name="add-exercise"
                className="flex-row items-center justify-center w-full"
                onClick={() => {
                  props.plannerDispatch(
                    lb<IPlannerState>()
                      .p("ui")
                      .p("exercisePicker")
                      .record({
                        dayData: {
                          week: weekIndex + 1,
                          dayInWeek: dayIndex + 1,
                        },
                        change: "all",
                        state: pickerStateFromPlannerExercise(props.settings),
                      }),
                    "Open add exercise picker"
                  );
                }}
              >
                <IconPlus2 size={12} />
                <Text className="ml-2 text-sm text-text-link font-semibold">Add Exercise</Text>
              </Button>
            </View>
          </View>
        ) : (
          <View className="flex-row">
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
          </View>
        )}
      </View>
    </View>
  );
}
