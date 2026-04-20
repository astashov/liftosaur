import type { ReactNode } from "react";
import { JSX, Fragment } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../primitives/text";
import { IPlannerProgramExercise, IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { ISettings } from "../../types";
import { IconHandle } from "../icons/iconHandle";
import { SetNumber } from "./editProgramSets";
import { IconArrowRight } from "../icons/iconArrowRight";
import { IconArrowDown2 } from "../icons/iconArrowDown2";
import { ExerciseImage } from "../exerciseImage";
import { equipmentName, IExercise, Exercise_findByName } from "../../models/exercise";
import { IconEdit2 } from "../icons/iconEdit2";
import { lb } from "lens-shmens";
import {
  PlannerProgramExercise_repeatToRangeStr,
  PlannerProgramExercise_warmups,
  PlannerProgramExercise_defaultWarmups,
  PlannerProgramExercise_warmupSetsToDisplaySets,
} from "../../pages/planner/models/plannerProgramExercise";
import { HistoryRecordSet } from "../historyRecordSets";
import { IconDuplicate2 } from "../icons/iconDuplicate2";
import { IconTrash } from "../icons/iconTrash";
import { EditProgramUiHelpers_deleteCurrentInstance } from "./editProgramUi/editProgramUiHelpers";
import { IconGraphsE } from "../icons/iconGraphsE";
import { IconSwap } from "../icons/iconSwap";
import { Thunk_pushToEditProgramExercise } from "../../ducks/thunks";
import { IDispatch } from "../../ducks/types";
import { EditProgramUiProgress } from "./editProgramUiProgress";
import {
  IEvaluatedProgram,
  Program_getNumberOfExerciseInstances,
  Program_getSupersetExercises,
} from "../../models/program";
import { EditProgramUiUpdate } from "./editProgramUiUpdate";
import { EditProgramUiExerciseSetVariations } from "./editProgramUiExerciseSetVariations";
import { EditProgramUiExerciseDescriptions } from "./editProgramUiExerciseDescriptions";
import { pickerStateFromPlannerExercise } from "./editProgramUtils";
import { navigationRef } from "../../navigation/navigationRef";

interface IEditProgramUiExerciseViewProps {
  evaluatedProgram: IEvaluatedProgram;
  plannerExercise: IPlannerProgramExercise;
  ui: IPlannerUi;
  exerciseIndex: number;
  weekIndex: number;
  dayIndex: number;
  settings: ISettings;
  programId: string;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
  dragHandle?: (children: ReactNode) => JSX.Element;
}

export function EditProgramUiExerciseView(props: IEditProgramUiExerciseViewProps): JSX.Element {
  const { weekIndex, dayIndex, exerciseIndex } = props;
  const isCollapsed = props.ui.exerciseUi.collapsed.has(
    `${props.plannerExercise.key}-${props.plannerExercise.dayData.week - 1}-${props.plannerExercise.dayData.dayInWeek - 1}`
  );
  const exercise = Exercise_findByName(props.plannerExercise.name, props.settings.exercises);

  const repeatStr = PlannerProgramExercise_repeatToRangeStr(props.plannerExercise);
  const order = props.plannerExercise.order !== 0 ? props.plannerExercise.order : undefined;
  const orderAndRepeat = [order, repeatStr].filter((s) => s).join(", ");

  return (
    <View
      data-cy={`exercise-${props.plannerExercise.key}`}
      className="my-1 overflow-hidden border bg-background-cardpurple rounded-xl border-border-cardpurple"
    >
      <View className="flex-row items-center">
        {props.dragHandle ? (
          <>
            {props.dragHandle(
              <View className="p-2">
                <IconHandle />
              </View>
            )}
            <View className="mr-2">
              <SetNumber size="sm" setIndex={props.exerciseIndex} />
            </View>
          </>
        ) : (
          <View className="w-16" />
        )}
        <View className="flex-row items-center flex-1" data-cy="planner-ui-exercise-name">
          <View className="flex-1">
            <Text className="text-base font-bold">
              {props.plannerExercise.label ? `${props.plannerExercise.label}: ` : ""}
              {props.plannerExercise.name}
              {props.plannerExercise.equipment != null &&
                props.plannerExercise.equipment !== exercise?.defaultEquipment && (
                  <Text className="text-base font-bold">, {equipmentName(props.plannerExercise.equipment)}</Text>
                )}
              {orderAndRepeat ? <Text className="text-sm font-normal text-text-primary"> [{orderAndRepeat}]</Text> : ""}
            </Text>
          </View>
          {props.plannerExercise.notused && (
            <View className="px-1 ml-3 rounded bg-background-darkgray">
              <Text className="text-xs font-bold text-text-alwayswhite">UNUSED</Text>
            </View>
          )}
          <Pressable
            className="p-2"
            data-cy="edit-exercise-swap"
            testID="edit-exercise-swap"
            onPress={() => {
              const numberOfExerciseInstances = Program_getNumberOfExerciseInstances(
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
                navigationRef.navigate("editExerciseChangeModal", { programId: props.programId });
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
                      state: pickerStateFromPlannerExercise(props.settings, props.plannerExercise),
                      exerciseKey: props.plannerExercise.key,
                      change: "one",
                    }),
                  "Open exercise picker modal"
                );
              }
            }}
          >
            <IconSwap size={12} />
          </Pressable>
        </View>
        <View>
          <Pressable
            className="p-2"
            data-cy="show-exercise-stats"
            testID="show-exercise-stats"
            onPress={() => {
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
              navigationRef.navigate("exerciseStatsModal", { programId: props.programId });
            }}
          >
            <IconGraphsE width={16} height={19} />
          </Pressable>
        </View>
        <View className="py-2 border-l bg-background-default border-border-cardpurple">
          <Pressable
            className="w-10 px-2 items-center nm-edit-exercise-expand-collapse"
            onPress={() => {
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
            {isCollapsed ? <IconArrowRight /> : <IconArrowDown2 />}
          </Pressable>
        </View>
      </View>
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
    </View>
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
    PlannerProgramExercise_warmups(plannerExercise) ||
    (exercise != null ? PlannerProgramExercise_defaultWarmups(exercise, props.settings) : []);
  const displayWarmupSets = PlannerProgramExercise_warmupSetsToDisplaySets(warmupSets);
  const reusingSets = plannerExercise.reuse?.fullName;
  const lbProgram = lb<IPlannerState>().p("current").p("program").pi("planner");
  const supersetGroup = props.plannerExercise.superset?.name;
  const supersetExercises = Program_getSupersetExercises(props.evaluatedProgram, props.plannerExercise);

  return (
    <View>
      <View className="flex-row border-t border-border-cardpurple">
        <View className="flex-1">
          {plannerExercise.descriptions.values.length > 0 && (
            <View className="flex-row border-b border-border-cardpurple">
              <View className="flex-1 px-3 py-1">
                <EditProgramUiExerciseDescriptions plannerExercise={plannerExercise} settings={props.settings} />
              </View>
            </View>
          )}
          <View className="flex-row">
            {exerciseType ? (
              <View className="p-1">
                <View className="p-1 m-1 rounded-lg bg-background-image">
                  <ExerciseImage settings={props.settings} className="w-10" exerciseType={exerciseType} size="small" />
                </View>
              </View>
            ) : (
              <View className="w-2" />
            )}
            <View className="flex-1">
              <View>
                <View className="flex-row items-start my-2">
                  {displayWarmupSets.flat().length > 0 && (
                    <>
                      <View data-cy="ui-warmups-sets">
                        <Text className="pb-1 text-xs text-left text-text-secondary">Warmups</Text>
                        <View>
                          <View>
                            {displayWarmupSets.map((g, gi) => (
                              <HistoryRecordSet key={gi} sets={g} isNext={true} settings={props.settings} />
                            ))}
                          </View>
                        </View>
                      </View>
                      <View className="self-stretch ml-4 mr-4 bg-border-neutral" style={{ width: 1 }} />
                    </>
                  )}
                  <View data-cy="ui-workout-sets">
                    <Text className="pb-1 text-xs text-left text-text-secondary">Workout</Text>
                    {reusingSets && <Text className="pb-1 text-xs text-text-secondary">Reusing {reusingSets}</Text>}
                    <EditProgramUiExerciseSetVariations plannerExercise={plannerExercise} settings={props.settings} />
                  </View>
                </View>
              </View>
            </View>
          </View>
          {supersetGroup && (
            <View className="px-3 pb-2">
              <Text className="text-xs">
                Superset Group: <Text className="font-bold">{supersetGroup}</Text>
                {supersetExercises.length > 0 && (
                  <Text className="text-text-secondary">
                    <Text> (</Text>
                    {supersetExercises.map((ex, i) => {
                      return (
                        <Fragment key={i}>
                          {i > 0 ? ", " : ""}
                          <Text className="font-bold">{ex.name}</Text>
                        </Fragment>
                      );
                    })}
                    <Text>)</Text>
                  </Text>
                )}
              </Text>
            </View>
          )}
          <View className="px-3 pb-2">
            <EditProgramUiProgress evaluatedProgram={props.evaluatedProgram} exercise={props.plannerExercise} />
          </View>
          {props.plannerExercise.update && (
            <View className="px-3 pb-2">
              <EditProgramUiUpdate evaluatedProgram={props.evaluatedProgram} exercise={props.plannerExercise} />
            </View>
          )}
        </View>
        <View className="border-l bg-background-default border-border-cardpurple">
          <View className="items-center">
            <Pressable
              className="p-2"
              data-cy="edit-exercise"
              testID="edit-exercise"
              onPress={() => {
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
                  Thunk_pushToEditProgramExercise(props.plannerExercise.key, props.plannerExercise.dayData)
                );
              }}
            >
              <IconEdit2 />
            </Pressable>
          </View>
          <View className="items-center">
            <Pressable
              className="p-2"
              onPress={() => {
                props.plannerDispatch(
                  lb<IPlannerState>()
                    .p("ui")
                    .p("exercisePicker")
                    .record({
                      state: pickerStateFromPlannerExercise(props.settings, props.plannerExercise),
                      dayData: props.plannerExercise.dayData,
                      exerciseKey: props.plannerExercise.key,
                      change: "duplicate",
                    }),
                  "Open duplicate exercise modal"
                );
              }}
            >
              <IconDuplicate2 />
            </Pressable>
          </View>
          <View className="items-center">
            <Pressable
              className="p-2"
              onPress={() => {
                props.plannerDispatch(
                  lbProgram.recordModify((program) => {
                    return EditProgramUiHelpers_deleteCurrentInstance(
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
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
