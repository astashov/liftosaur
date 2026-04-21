import { JSX, useState } from "react";
import { View, Alert } from "react-native";
import { Text } from "../primitives/text";
import {
  IPlannerProgramExercise,
  IPlannerExerciseState,
  IProgramExerciseProgressType,
  IPlannerExerciseUi,
  IProgramExerciseProgress,
} from "../../pages/planner/models/types";
import { IProgram, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { LinkButton } from "../linkButton";
import {
  IEvaluatedProgram,
  Program_evaluate,
  Program_getReusingCustomProgressExercises,
  Program_getReusingSetProgressExercises,
} from "../../models/program";
import { PP_iterate2 } from "../../models/pp";
import { MenuItemWrapper } from "../menuItem";
import { InputSelect } from "../inputSelect";
import { lb } from "lens-shmens";
import { EditProgramUiHelpers_changeFirstInstance } from "../editProgram/editProgramUi/editProgramUiHelpers";
import {
  PlannerProgramExercise_buildProgress,
  PlannerProgramExercise_getProgressDefaultArgs,
} from "../../pages/planner/models/plannerProgramExercise";
import { LinearProgressSettings } from "./progressions/linearProgressSettings";
import { DoubleProgressSettings } from "./progressions/doubleProgressSettings";
import { SumRepsProgressSettings } from "./progressions/sumRepsProgressSettings";
import { CustomProgressSettings } from "./progressions/customProgressSettings";
import { CollectionUtils_uniqByExpr } from "../../utils/collection";
import { navigationRef } from "../../navigation/navigationRef";
import { EditProgramUiProgress } from "../editProgram/editProgramUiProgress";
import { ObjectUtils_entries } from "../../utils/object";

interface IEditProgramExerciseProgressProps {
  program: IProgram;
  ui: IPlannerExerciseUi;
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
  exerciseStateKey: string;
  programId: string;
}

function getProgressReuseCandidates(
  key: string,
  notused: boolean,
  evaluatedProgram: IEvaluatedProgram
): [string, string][] {
  const result: Record<string, string> = {};
  PP_iterate2(evaluatedProgram.weeks, (exercise) => {
    if (exercise.key === key) {
      return;
    }
    const progress = exercise.progress;
    if (!progress || progress.type !== "custom" || (!(!notused && exercise.notused) && progress.reuse)) {
      return;
    }
    result[exercise.fullName] = exercise.fullName;
  });
  return ObjectUtils_entries(result);
}

export function EditProgramExerciseProgress(props: IEditProgramExerciseProgressProps): JSX.Element {
  const { plannerExercise } = props;
  const ownProgress = plannerExercise.progress;
  const evaluatedProgram = Program_evaluate(props.program, props.settings);
  const lbUi = lb<IPlannerExerciseState>().p("ui");
  const [isOverriding, setIsOverriding] = useState(false);

  return (
    <View className="px-4 py-2 bg-background-default">
      <View className="flex-row gap-4 pb-2">
        <View className="flex-1">
          <Text className="text-base font-bold">Edit Progress</Text>
        </View>
        {ownProgress?.type === "custom" && !ownProgress.reuse && (
          <View>
            <LinkButton
              className="text-sm"
              data-cy="edit-exercise-progress-edit-script"
              name="edit-exercise-progress-edit-script"
              onClick={() => {
                props.plannerDispatch(
                  lbUi.p("showEditProgressScriptModal").record(true),
                  "Show edit progress script modal"
                );
                navigationRef.navigate("editProgressScriptModal", {
                  exerciseStateKey: props.exerciseStateKey,
                  programId: props.programId,
                });
              }}
            >
              Edit Script
            </LinkButton>
          </View>
        )}
        {ownProgress?.reuse?.source === "overall" && (
          <View>
            <LinkButton
              className="text-sm"
              data-cy="edit-exercise-progress-override"
              name="edit-exercise-progress-override"
              onClick={() => {
                setIsOverriding(true);
              }}
            >
              Override
            </LinkButton>
          </View>
        )}
      </View>
      {ownProgress?.reuse?.source === "overall" && !isOverriding ? (
        <SetReuse evaluatedProgram={evaluatedProgram} exercise={plannerExercise} />
      ) : (
        <ProgressContent
          program={props.program}
          ui={props.ui}
          evaluatedProgram={evaluatedProgram}
          plannerExercise={plannerExercise}
          plannerDispatch={props.plannerDispatch}
          settings={props.settings}
          exerciseStateKey={props.exerciseStateKey}
          programId={props.programId}
        />
      )}
    </View>
  );
}

interface ISetReuseProps {
  evaluatedProgram: IEvaluatedProgram;
  exercise: IPlannerProgramExercise;
}

function SetReuse(props: ISetReuseProps): JSX.Element {
  return (
    <View>
      <EditProgramUiProgress evaluatedProgram={props.evaluatedProgram} exercise={props.exercise} />
    </View>
  );
}

interface IProgressContentProps {
  program: IProgram;
  ui: IPlannerExerciseUi;
  evaluatedProgram: IEvaluatedProgram;
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
  exerciseStateKey: string;
  programId: string;
}

function ProgressContent(props: IProgressContentProps): JSX.Element {
  const { plannerExercise, evaluatedProgram } = props;
  const ownProgress = plannerExercise.progress;
  const reuseCandidates: [string, string][] = [
    ["", "None"],
    ...getProgressReuseCandidates(plannerExercise.key, !!plannerExercise.notused, evaluatedProgram),
  ];
  const reuseFullName = ownProgress?.reuse?.exercise?.fullName;
  const reusingCustomProgressExercises = Program_getReusingCustomProgressExercises(evaluatedProgram, plannerExercise);
  const reusingSetProgressExercises = Program_getReusingSetProgressExercises(evaluatedProgram, plannerExercise);
  const reusingProgressExercises = Array.from(
    new Set(
      CollectionUtils_uniqByExpr([...reusingCustomProgressExercises, ...reusingSetProgressExercises], (e) => e.fullName)
    )
  );
  const cannotReuseOtherProgress = plannerExercise.notused
    ? reusingCustomProgressExercises.filter((e) => e.notused).length > 0
    : reusingCustomProgressExercises.length > 0;

  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const progressTypes: [IProgramExerciseProgressType, string][] = [
    ["lp", "Linear Progression"],
    ["dp", "Double Progression"],
    ["sum", "Sum Reps"],
    ["custom", "Custom"],
  ];
  const [savedProgressTypes, setSavedProgressTypes] = useState<
    Partial<Record<IProgramExerciseProgressType, IProgramExerciseProgress>>
  >({});
  return (
    <>
      {reusingProgressExercises.length > 0 && (
        <View>
          <MenuItemWrapper name="program-exercise-progress-reusing">
            <View className="mb-1">
              <Text className="text-xs">Custom progress of this exercise is reused by:</Text>
              <View>
                {reusingProgressExercises.map((exercise) => (
                  <View key={exercise.fullName} className="flex-row items-start ml-4">
                    <Text className="text-xs">• </Text>
                    <Text className="text-xs font-semibold">{exercise.fullName}</Text>
                  </View>
                ))}
              </View>
            </View>
          </MenuItemWrapper>
        </View>
      )}
      <View>
        <MenuItemWrapper
          name="program-exercise-progress-type"
          onClick={() => {
            if (reusingCustomProgressExercises.length > 0) {
              Alert.alert("You cannot use other progress types if this custom progress is reused by other exercises.");
            }
          }}
        >
          <View className="flex-row items-center py-1">
            <View className="flex-1">
              <Text className="text-sm">Progress:</Text>
            </View>
            <View className="flex-1">
              <InputSelect
                name="program-exercise-progress-type-select"
                values={progressTypes}
                disabled={reusingCustomProgressExercises.length > 0}
                value={plannerExercise.progress?.type}
                onChange={(value) => {
                  props.plannerDispatch(
                    lbProgram.recordModify((program) => {
                      const newPlanner = EditProgramUiHelpers_changeFirstInstance(
                        program,
                        plannerExercise,
                        props.settings,
                        true,
                        (e) => {
                          if (!value) {
                            e.progress = undefined;
                          } else {
                            if (savedProgressTypes[value]) {
                              e.progress = savedProgressTypes[value];
                            } else {
                              const result = PlannerProgramExercise_buildProgress(
                                value,
                                PlannerProgramExercise_getProgressDefaultArgs(value),
                                value === "custom" ? { script: "{~~}" } : undefined
                              );
                              if (result.success) {
                                e.progress = result.data;
                              } else {
                                Alert.alert(result.error);
                              }
                            }
                          }
                        }
                      );
                      if (newPlanner !== program && plannerExercise.progress) {
                        setSavedProgressTypes({
                          ...savedProgressTypes,
                          [plannerExercise.progress.type]: plannerExercise.progress,
                        });
                      }
                      return newPlanner;
                    }),
                    "Change progress type"
                  );
                }}
              />
            </View>
          </View>
        </MenuItemWrapper>
        {ownProgress?.type === "custom" && reuseCandidates.length > 0 && (
          <View>
            <MenuItemWrapper
              name="program-exercise-progress-reuse"
              onClick={() => {
                if (cannotReuseOtherProgress) {
                  Alert.alert("You cannot reuse progress if this custom progress is reused by other USED exercises.");
                }
              }}
            >
              <View className="flex-row items-center py-1">
                <View className="flex-1">
                  <Text className="text-sm">Reuse progress from:</Text>
                </View>
                <View className="flex-1">
                  <InputSelect
                    hint="You can only reuse progress of exercises that don't reuse other exercises"
                    name="program-exercise-progress-reuse-select"
                    values={reuseCandidates}
                    value={reuseFullName}
                    disabled={cannotReuseOtherProgress}
                    placeholder="None"
                    onChange={(fullName) => {
                      props.plannerDispatch(
                        lbProgram.recordModify((program) => {
                          return EditProgramUiHelpers_changeFirstInstance(
                            program,
                            plannerExercise,
                            props.settings,
                            true,
                            (e) => {
                              e.progress = {
                                type: "custom",
                                state: {},
                                stateMetadata: {},
                                reuse: fullName ? { fullName, source: "specific" } : undefined,
                              };
                            }
                          );
                        }),
                        "Update progress reuse"
                      );
                    }}
                  />
                </View>
              </View>
            </MenuItemWrapper>
          </View>
        )}
        {ownProgress?.type === "lp" && (
          <View className="py-2">
            <LinearProgressSettings
              plannerExercise={plannerExercise}
              settings={props.settings}
              plannerDispatch={props.plannerDispatch}
              program={props.program}
            />
          </View>
        )}
        {ownProgress?.type === "dp" && (
          <View className="py-2">
            <DoubleProgressSettings
              plannerExercise={plannerExercise}
              settings={props.settings}
              plannerDispatch={props.plannerDispatch}
              program={props.program}
            />
          </View>
        )}
        {ownProgress?.type === "sum" && (
          <View className="py-2">
            <SumRepsProgressSettings
              plannerExercise={plannerExercise}
              settings={props.settings}
              plannerDispatch={props.plannerDispatch}
              program={props.program}
            />
          </View>
        )}
        {ownProgress?.type === "custom" && (
          <View className="py-2">
            <CustomProgressSettings
              ui={props.ui}
              plannerExercise={plannerExercise}
              settings={props.settings}
              plannerDispatch={props.plannerDispatch}
              program={props.program}
              exerciseStateKey={props.exerciseStateKey}
              programId={props.programId}
            />
          </View>
        )}
      </View>
    </>
  );
}
