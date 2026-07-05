import { JSX, memo, ReactNode } from "react";
import { View, Pressable } from "react-native";
import { PerfTracker_recordEvent, PerfTracker_getSessionId } from "../../utils/perfTracker";
import { PerfEnabled_tier2 } from "../../utils/perfEnabled";
import { PerfProfiler } from "../../utils/perfProfiler";
import { Text } from "../primitives/text";
import { FastText } from "../primitives/fastText";
import { StyledText, StyledText_cls } from "../../utils/styledText";
import { useRem } from "../../utils/useRem";
import { IPlannerProgramExercise, IPlannerState } from "../../pages/planner/models/types";
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
  PlannerProgramExercise_currentExerciseVariationIndex,
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
import { navigateToModal } from "../../navigation/navigationService";

function onExerciseProfile(
  id: string,
  phase: "mount" | "update" | "nested-update",
  actualDuration: number,
  baseDuration: number
): void {
  if (!PerfEnabled_tier2()) {
    return;
  }
  if (actualDuration < 1) {
    return;
  }
  PerfTracker_recordEvent({
    type: "profile",
    session: PerfTracker_getSessionId(),
    id,
    phase,
    actual_ms: actualDuration,
    base_ms: baseDuration,
    ts: Date.now(),
  });
}

interface IEditProgramUiExerciseViewProps {
  evaluatedProgram: IEvaluatedProgram;
  plannerExercise: IPlannerProgramExercise;
  isCollapsed: boolean;
  exerciseIndex: number;
  weekIndex: number;
  dayIndex: number;
  settings: ISettings;
  programId: string;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
  dragHandle?: (children: ReactNode) => JSX.Element;
}

export const EditProgramUiExerciseView = memo(function EditProgramUiExerciseView(
  props: IEditProgramUiExerciseViewProps
): JSX.Element {
  const { weekIndex, dayIndex, exerciseIndex, isCollapsed } = props;
  const exercise = Exercise_findByName(props.plannerExercise.name, props.settings.exercises);

  const repeatStr = PlannerProgramExercise_repeatToRangeStr(props.plannerExercise);
  const order = props.plannerExercise.order !== 0 ? props.plannerExercise.order : undefined;
  const orderAndRepeat = [order, repeatStr].filter((s) => s).join(", ");

  return (
    <PerfProfiler id="ExerciseView" onRender={onExerciseProfile}>
      <View
        data-testid={`exercise-${props.plannerExercise.key}`}
        testID={`exercise-${props.plannerExercise.key}`}
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
          <View
            className="flex-row items-center flex-1"
            data-testid="planner-ui-exercise-name"
            testID="planner-ui-exercise-name"
          >
            <View className="flex-1 leading-tight">
              <ExerciseNameLine
                label={props.plannerExercise.label}
                name={props.plannerExercise.name}
                equipment={
                  props.plannerExercise.equipment != null &&
                  props.plannerExercise.equipment !== exercise?.defaultEquipment
                    ? equipmentName(props.plannerExercise.equipment)
                    : undefined
                }
                orderAndRepeat={orderAndRepeat || undefined}
              />
              <ExerciseVariationsLine plannerExercise={props.plannerExercise} />
            </View>
            {props.plannerExercise.notused && (
              <View className="px-1 ml-3 rounded bg-background-darkgray">
                <Text className="text-xs font-bold text-text-alwayswhite">UNUSED</Text>
              </View>
            )}
            <Pressable
              className="p-2"
              data-testid="edit-exercise-swap"
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
                  navigateToModal("editExerciseChangeModal", { programId: props.programId });
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
              data-testid="show-exercise-stats"
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
                navigateToModal("exerciseStatsModal", { programId: props.programId });
              }}
            >
              <IconGraphsE width={16} height={19} />
            </Pressable>
          </View>
          <View className="py-4 border-l bg-background-default border-border-cardpurple">
            <Pressable
              className="items-center w-10 px-2 nm-edit-exercise-expand-collapse"
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
          <PerfProfiler id="ExerciseView.content" onRender={onExerciseProfile}>
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
          </PerfProfiler>
        )}
      </View>
    </PerfProfiler>
  );
});

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

export const EditProgramUiExerciseContentView = memo(function EditProgramUiExerciseContentView(
  props: IEditProgramUiExerciseContentViewProps
): JSX.Element {
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
                      <View data-testid="ui-warmups-sets" testID="ui-warmups-sets">
                        <Text className="pb-1 text-xs text-left text-text-secondary">Warmups</Text>
                        <View>
                          <View>
                            {displayWarmupSets.map((g, gi) => (
                              <HistoryRecordSet key={gi} sets={g} isNext={true} units={props.settings.units} />
                            ))}
                          </View>
                        </View>
                      </View>
                      <View className="self-stretch ml-4 mr-4 bg-border-neutral" style={{ width: 1 }} />
                    </>
                  )}
                  <View data-testid="ui-workout-sets" testID="ui-workout-sets">
                    <Text className="pb-1 text-xs text-left text-text-secondary">Workout</Text>
                    {reusingSets && <Text className="pb-1 text-xs text-text-secondary">Reusing {reusingSets}</Text>}
                    <PerfProfiler id="ExerciseView.setVariations" onRender={onExerciseProfile}>
                      <EditProgramUiExerciseSetVariations plannerExercise={plannerExercise} settings={props.settings} />
                    </PerfProfiler>
                  </View>
                </View>
              </View>
            </View>
          </View>
          {supersetGroup && (
            <View className="px-3 pb-2">
              <SupersetLine group={supersetGroup} exerciseNames={supersetExercises.map((ex) => ex.name)} />
            </View>
          )}
          <View className="px-3 pb-2">
            <PerfProfiler id="ExerciseView.progress" onRender={onExerciseProfile}>
              <EditProgramUiProgress evaluatedProgram={props.evaluatedProgram} exercise={props.plannerExercise} />
            </PerfProfiler>
          </View>
          {props.plannerExercise.update && (
            <View className="px-3 pb-2">
              <PerfProfiler id="ExerciseView.update" onRender={onExerciseProfile}>
                <EditProgramUiUpdate evaluatedProgram={props.evaluatedProgram} exercise={props.plannerExercise} />
              </PerfProfiler>
            </View>
          )}
        </View>
        <View className="border-l bg-background-default border-border-cardpurple">
          <View className="items-center">
            <Pressable
              className="p-2"
              data-testid="edit-exercise"
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
});

function ExerciseNameLine(props: {
  label?: string;
  name: string;
  equipment?: string;
  orderAndRepeat?: string;
}): JSX.Element {
  const cls = StyledText_cls(useRem());
  const builder = new StyledText();
  if (props.label) {
    builder.add(`${props.label}: `);
  }
  builder.add(props.name);
  if (props.equipment) {
    builder.add(`, ${props.equipment}`);
  }
  if (props.orderAndRepeat) {
    builder.add(` [${props.orderAndRepeat}]`, cls("text-sm font-normal"));
  }
  const built = builder.build();
  return <FastText text={built.text} fragments={built.fragments} {...cls("text-base font-bold text-text-primary")} />;
}

function ExerciseVariationsLine(props: { plannerExercise: IPlannerProgramExercise }): JSX.Element | null {
  const variations = props.plannerExercise.exerciseVariations ?? [];
  const cls = StyledText_cls(useRem());
  if (variations.length <= 1) {
    return null;
  }
  const currentIndex = PlannerProgramExercise_currentExerciseVariationIndex(props.plannerExercise);
  const otherNames = variations.filter((_, i) => i !== currentIndex).map((v) => v.name);
  const builder = new StyledText();
  builder.add("Variations: ");
  otherNames.forEach((name, i) => {
    builder.add(i > 0 ? ", " : "");
    builder.add(name, cls("font-semibold"));
  });
  const built = builder.build();
  return <FastText text={built.text} fragments={built.fragments} {...cls("text-xs text-text-secondary")} />;
}

function SupersetLine(props: { group: string; exerciseNames: string[] }): JSX.Element {
  const cls = StyledText_cls(useRem());
  const secondary = cls("text-text-secondary");
  const builder = new StyledText();
  builder.add("Superset Group: ");
  builder.add(props.group, cls("font-bold"));
  if (props.exerciseNames.length > 0) {
    builder.add(" (", secondary);
    props.exerciseNames.forEach((name, i) => {
      builder.add(i > 0 ? ", " : "", secondary);
      builder.add(name, cls("font-bold text-text-secondary"));
    });
    builder.add(")", secondary);
  }
  const built = builder.build();
  return <FastText text={built.text} fragments={built.fragments} {...cls("text-xs text-text-primary")} />;
}
