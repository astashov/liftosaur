import type { JSX } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../primitives/text";
import { IPlannerProgramExercise, IPlannerExerciseState } from "../../pages/planner/models/types";
import { IPercentage, IPlannerProgram, ISettings, IWeight } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import {
  PlannerProgramExercise_degroupWarmupSets,
  PlannerProgramExercise_defaultWarmups,
  PlannerProgramExercise_warmupSetsToDisplaySets,
} from "../../pages/planner/models/plannerProgramExercise";
import { Exercise_findByName } from "../../models/exercise";
import { lb } from "lens-shmens";
import { LinkButton } from "../linkButton";
import { HistoryRecordSet } from "../historyRecordSets";
import {
  EditProgramUiHelpers_changeFirstInstance,
  EditProgramUiHelpers_changeAllInstances,
} from "../editProgram/editProgramUi/editProgramUiHelpers";
import { ObjectUtils_clone } from "../../utils/object";
import { SwipeableRow } from "../swipeableRow";
import { InputNumber2 } from "../inputNumber2";
import { InputWeight2 } from "../inputWeight2";
import { IconPlus2 } from "../icons/iconPlus2";
import { Tailwind_colors } from "../../utils/tailwindConfig";
import { Weight_buildPct } from "../../models/weight";
import { CollectionUtils_removeAt } from "../../utils/collection";

interface IEditProgramExerciseWarmupsProps {
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

function changeWeight(
  planner: IPlannerProgram,
  settings: ISettings,
  plannerExercise: IPlannerProgramExercise,
  setIndex: number,
  value: IWeight | IPercentage
): IPlannerProgram {
  return EditProgramUiHelpers_changeFirstInstance(planner, plannerExercise, settings, true, (e) => {
    e.warmupSets = PlannerProgramExercise_degroupWarmupSets(e.warmupSets || []);
    if (e.warmupSets[setIndex] != null) {
      if (value.unit === "%") {
        e.warmupSets[setIndex].percentage = value.value;
        e.warmupSets[setIndex].weight = undefined;
      } else {
        e.warmupSets[setIndex].weight = value;
        e.warmupSets[setIndex].percentage = undefined;
      }
    }
  });
}

function changeReps(
  planner: IPlannerProgram,
  settings: ISettings,
  plannerExercise: IPlannerProgramExercise,
  setIndex: number,
  value: number
): IPlannerProgram {
  return EditProgramUiHelpers_changeFirstInstance(planner, plannerExercise, settings, true, (e) => {
    e.warmupSets = PlannerProgramExercise_degroupWarmupSets(e.warmupSets || []);
    if (e.warmupSets[setIndex] != null) {
      e.warmupSets[setIndex].reps = value;
    }
  });
}

export function EditProgramExerciseWarmups(props: IEditProgramExerciseWarmupsProps): JSX.Element {
  const { plannerExercise } = props;

  const ownWarmups = plannerExercise.warmupSets
    ? PlannerProgramExercise_degroupWarmupSets(plannerExercise.warmupSets)
    : undefined;
  const reuseWarmups = plannerExercise.reuse?.exercise?.warmupSets;
  const exercise = Exercise_findByName(plannerExercise.name, props.settings.exercises);
  const defaultWarmups = exercise ? PlannerProgramExercise_defaultWarmups(exercise, props.settings) : [];
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const displayWarmupSets = PlannerProgramExercise_warmupSetsToDisplaySets(
    ownWarmups || reuseWarmups || defaultWarmups
  );

  return (
    <View className="px-4 py-2 bg-background-default">
      <View className="flex-row items-center gap-4 pb-2">
        <View className="flex-1">
          <Text className="text-base font-bold">Edit Warmups</Text>
        </View>
        <View>
          <LinkButton
            className="text-sm"
            data-testid="edit-exercise-warmups-customize"
            testID="edit-exercise-warmups-customize"
            name="customize-warmups"
            onClick={() => {
              props.plannerDispatch(
                lbProgram.recordModify((program) => {
                  if (ownWarmups == null) {
                    return EditProgramUiHelpers_changeFirstInstance(
                      program,
                      plannerExercise,
                      props.settings,
                      true,
                      (e) => {
                        e.warmupSets = ObjectUtils_clone(reuseWarmups) || defaultWarmups;
                      }
                    );
                  } else {
                    return EditProgramUiHelpers_changeAllInstances(
                      program,
                      plannerExercise.fullName,
                      props.settings,
                      true,
                      (e) => {
                        e.warmupSets = undefined;
                      }
                    );
                  }
                }),
                "Customize warmups"
              );
            }}
          >
            {reuseWarmups
              ? ownWarmups != null
                ? "Switch to reused"
                : "Override"
              : ownWarmups != null
                ? "Switch to default"
                : "Customize"}
          </LinkButton>
        </View>
      </View>
      {ownWarmups == null ? (
        <View className="flex-row gap-2 py-2 pl-3 pr-2 border rounded-lg bg-background-subtlecardpurple border-border-cardpurple">
          <View className="flex-1">
            {reuseWarmups ? (
              <Text className="text-sm">Reused from</Text>
            ) : (
              <Text className="text-sm font-semibold">Default warmups</Text>
            )}
          </View>
          <View>
            {displayWarmupSets.map((g, i) => (
              <HistoryRecordSet key={i} sets={g} isNext={true} settings={props.settings} />
            ))}
          </View>
        </View>
      ) : (
        <View className="overflow-hidden border rounded-lg bg-background-subtlecardpurple border-border-cardpurple">
          <View className="w-full">
            <View className="flex-row border-b border-border-neutral">
              <View className="w-12 px-2 py-1">
                <Text className="text-xs text-text-secondary">Set</Text>
              </View>
              <View className="items-center flex-1 py-1">
                <Text className="text-xs text-text-secondary">Reps</Text>
              </View>
              <View className="w-3" />
              <View className="items-center flex-1 py-1 pr-6">
                <Text className="text-xs text-text-secondary">Weight</Text>
              </View>
            </View>
            <View>
              {ownWarmups.map((set, setIndex) => {
                return (
                  <SwipeableRow
                    key={setIndex}
                    width={64}
                    openThreshold={15}
                    closeThreshold={55}
                    scrollThreshold={7}
                    initiateTreshold={8}
                  >
                    {({ style, close, moveRef }) => (
                      <View
                        ref={moveRef as unknown as React.RefObject<View>}
                        data-testid="warmup-set"
                        testID="warmup-set"
                        style={style as object}
                      >
                        <View className="flex-row items-center border-b border-border-neutral">
                          <View className="w-12 px-2 py-1" data-testid="warmup-set-number" testID="warmup-set-number">
                            <Text className="text-sm">{setIndex + 1}</Text>
                          </View>
                          <View className="items-center justify-center flex-1 py-2">
                            <InputNumber2
                              width={3.5}
                              data-testid="reps-value"
                              name="set-reps"
                              onInput={(value) => {
                                if (value != null && !isNaN(value)) {
                                  props.plannerDispatch(
                                    lbProgram.recordModify((program) => {
                                      return changeReps(program, props.settings, plannerExercise, setIndex, value);
                                    }),
                                    "Change warmup reps"
                                  );
                                }
                              }}
                              onBlur={(value) => {
                                if (value != null && !isNaN(value)) {
                                  props.plannerDispatch(
                                    lbProgram.recordModify((program) => {
                                      return changeReps(program, props.settings, plannerExercise, setIndex, value);
                                    }),
                                    "Change warmup reps"
                                  );
                                }
                              }}
                              value={set.reps}
                              min={0}
                              max={9999}
                              step={1}
                            />
                          </View>
                          <View
                            className="items-center justify-center w-3 py-2"
                            data-testid="warmup-set-x"
                            testID="warmup-set-x"
                          >
                            <Text>×</Text>
                          </View>
                          <View className="items-center justify-center flex-1 py-2">
                            <View className="flex-row items-center">
                              <InputWeight2
                                name="set-weight"
                                exerciseType={plannerExercise.exerciseType}
                                data-testid="weight-value"
                                testID="weight-value"
                                units={["lb", "kg", "%"] as const}
                                onBlur={(value) => {
                                  if (value != null) {
                                    props.plannerDispatch(
                                      lbProgram.recordModify((program) => {
                                        return changeWeight(program, props.settings, plannerExercise, setIndex, value);
                                      }),
                                      "Change warmup weight"
                                    );
                                  }
                                }}
                                onInput={(value) => {
                                  if (value != null) {
                                    props.plannerDispatch(
                                      lbProgram.recordModify((program) => {
                                        return changeWeight(program, props.settings, plannerExercise, setIndex, value);
                                      }),
                                      "Change warmup weight"
                                    );
                                  }
                                }}
                                subscription={undefined}
                                value={
                                  set.weight ? set.weight : set.percentage ? Weight_buildPct(set.percentage) : undefined
                                }
                                max={9999}
                                min={-9999}
                                settings={props.settings}
                              />
                              <Text className="ml-1 text-xs">
                                {set.weight ? set.weight.unit : set.percentage != null ? "%" : ""}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View
                          style={{
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            left: "100%",
                            flexDirection: "row",
                            width: 64,
                            marginLeft: 1,
                          }}
                        >
                          <Pressable
                            data-testid="delete-warmup-set"
                            testID="delete-warmup-set"
                            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
                            className="bg-background-darkred"
                            onPress={() => {
                              close();
                              props.plannerDispatch(
                                lbProgram.recordModify((program) => {
                                  return EditProgramUiHelpers_changeFirstInstance(
                                    program,
                                    plannerExercise,
                                    props.settings,
                                    true,
                                    (e) => {
                                      e.warmupSets = PlannerProgramExercise_degroupWarmupSets(e.warmupSets || []);
                                      e.warmupSets = CollectionUtils_removeAt(e.warmupSets, setIndex);
                                    }
                                  );
                                }),
                                "Delete warmup set"
                              );
                            }}
                          >
                            <Text className="text-text-alwayswhite">Delete</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </SwipeableRow>
                );
              })}
            </View>
          </View>
          <View className="flex-row">
            <Pressable
              className="flex-row items-center justify-center flex-1 py-2 m-2 rounded-md bg-background-purpledark"
              data-testid="add-warmup-set"
              testID="add-warmup-set"
              onPress={() => {
                props.plannerDispatch(
                  lbProgram.recordModify((program) => {
                    return EditProgramUiHelpers_changeFirstInstance(
                      program,
                      plannerExercise,
                      props.settings,
                      true,
                      (e) => {
                        const lastReps = e.warmupSets?.[e.warmupSets.length - 1]?.reps ?? 5;
                        const lastWeight = e.warmupSets?.[e.warmupSets.length - 1]?.weight;
                        let lastPercentage = e.warmupSets?.[e.warmupSets.length - 1]?.percentage;
                        if (lastWeight == null && lastPercentage == null) {
                          lastPercentage = 50;
                        }
                        e.warmupSets = [
                          ...(e.warmupSets || []),
                          {
                            type: "warmup",
                            numberOfSets: 1,
                            reps: lastReps,
                            weight: lastWeight,
                            percentage: lastPercentage,
                          },
                        ];
                      }
                    );
                  }),
                  "Add warmup set"
                );
              }}
            >
              <IconPlus2 size={10} color={Tailwind_colors().blue[400]} />
              <Text className="ml-2 text-xs font-semibold text-text-link">Add Warmup Set</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
