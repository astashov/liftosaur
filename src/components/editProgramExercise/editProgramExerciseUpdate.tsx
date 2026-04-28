import { JSX, useState } from "react";
import { View, Pressable, Alert } from "react-native";
import { Text } from "../primitives/text";
import { IPlannerProgramExercise, IPlannerExerciseState, IPlannerExerciseUi } from "../../pages/planner/models/types";
import { IProgram, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { LinkButton } from "../linkButton";
import { IEvaluatedProgram, Program_evaluate, Program_getReusingUpdateExercises } from "../../models/program";
import { PP_iterate2 } from "../../models/pp";
import { MenuItemWrapper } from "../menuItem";
import { InputSelect } from "../inputSelect";
import { lb } from "lens-shmens";
import { EditProgramUiHelpers_changeFirstInstance } from "../editProgram/editProgramUi/editProgramUiHelpers";
import { ObjectUtils_entries } from "../../utils/object";
import { EditProgramUiUpdate } from "../editProgram/editProgramUiUpdate";
import { navigationRef } from "../../navigation/navigationRef";
import { CollectionUtils_uniqBy } from "../../utils/collection";

interface IEditProgramExerciseUpdateProps {
  program: IProgram;
  ui: IPlannerExerciseUi;
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
  exerciseStateKey: string;
  programId: string;
}

function getUpdateReuseCandidates(
  key: string,
  notused: boolean,
  evaluatedProgram: IEvaluatedProgram
): [string, string][] {
  const result: Record<string, string> = { "": "None" };
  PP_iterate2(evaluatedProgram.weeks, (exercise) => {
    if (exercise.key === key) {
      return;
    }
    const update = exercise.update;
    if (!update || update.type !== "custom" || (!(!notused && exercise.notused) && update.reuse)) {
      return;
    }
    result[exercise.key] = exercise.fullName;
  });
  return ObjectUtils_entries(result);
}

export function EditProgramExerciseUpdate(props: IEditProgramExerciseUpdateProps): JSX.Element {
  const { plannerExercise } = props;
  const ownUpdate = plannerExercise.update;
  const evaluatedProgram = Program_evaluate(props.program, props.settings);
  const lbUi = lb<IPlannerExerciseState>().p("ui");
  const [isOverriding, setIsOverriding] = useState(false);

  return (
    <View className="px-4 py-2 bg-background-default">
      <View className="flex-row gap-4 pb-2">
        <View className="flex-1">
          <Text className="text-base font-bold">Edit Update</Text>
        </View>
        {ownUpdate?.type === "custom" && !ownUpdate.reuse && (
          <View>
            <LinkButton
              className="text-sm"
              data-cy="edit-exercise-update-edit-script" data-testid="edit-exercise-update-edit-script" testID="edit-exercise-update-edit-script"
              name="edit-exercise-update-edit-script"
              onClick={() => {
                props.plannerDispatch(
                  lbUi.p("showEditUpdateScriptModal").record(true),
                  "Show edit update script modal"
                );
                navigationRef.navigate("editUpdateScriptModal", {
                  exerciseStateKey: props.exerciseStateKey,
                  programId: props.programId,
                });
              }}
            >
              Edit Script
            </LinkButton>
          </View>
        )}
        {ownUpdate?.reuse?.source === "overall" && !isOverriding && (
          <View>
            <LinkButton
              className="text-sm"
              data-cy="edit-exercise-update-override" data-testid="edit-exercise-update-override" testID="edit-exercise-update-override"
              name="edit-exercise-update-override"
              onClick={() => {
                setIsOverriding(true);
              }}
            >
              Override
            </LinkButton>
          </View>
        )}
      </View>
      {ownUpdate?.reuse?.source === "overall" && !isOverriding ? (
        <SetReuse evaluatedProgram={evaluatedProgram} exercise={plannerExercise} />
      ) : (
        <UpdateContent
          program={props.program}
          ui={props.ui}
          evaluatedProgram={evaluatedProgram}
          plannerExercise={plannerExercise}
          plannerDispatch={props.plannerDispatch}
          settings={props.settings}
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
      <EditProgramUiUpdate evaluatedProgram={props.evaluatedProgram} exercise={props.exercise} />
    </View>
  );
}

interface IUpdateContentProps {
  program: IProgram;
  ui: IPlannerExerciseUi;
  evaluatedProgram: IEvaluatedProgram;
  plannerExercise: IPlannerProgramExercise;
  plannerDispatch: ILensDispatch<IPlannerExerciseState>;
  settings: ISettings;
}

function UpdateContent(props: IUpdateContentProps): JSX.Element {
  const { plannerExercise, evaluatedProgram } = props;
  const ownUpdate = plannerExercise.update;
  const reuseCandidates = getUpdateReuseCandidates(plannerExercise.key, !!plannerExercise.notused, evaluatedProgram);
  const reuseKey = ownUpdate?.reuse?.exercise?.key;
  const reusingUpdateExercises = CollectionUtils_uniqBy(
    Program_getReusingUpdateExercises(evaluatedProgram, plannerExercise),
    "fullName"
  );
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");
  const cannotReuseOtherUpdates = plannerExercise.notused
    ? reusingUpdateExercises.filter((e) => e.notused).length > 0
    : reusingUpdateExercises.length > 0;
  return (
    <>
      {reusingUpdateExercises.length > 0 && (
        <View>
          <MenuItemWrapper isBorderless name="program-exercise-update-reusing">
            <View className="mb-1">
              <Text className="text-xs">Custom update of this exercise is reused by:</Text>
              <View>
                {reusingUpdateExercises.map((exercise) => (
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
        {ownUpdate?.type === "custom" && reuseCandidates.length > 0 && (
          <View>
            <MenuItemWrapper
              isBorderless
              name="program-exercise-update-reuse"
              onClick={() => {
                if (cannotReuseOtherUpdates) {
                  Alert.alert("You cannot reuse update if this custom update is reused by other USED exercises.");
                }
              }}
            >
              <Pressable
                className="flex-row items-center py-1"
                onPress={() => {
                  if (cannotReuseOtherUpdates) {
                    Alert.alert("You cannot reuse update if this custom update is reused by other USED exercises.");
                  }
                }}
              >
                <View className="flex-1">
                  <Text className="text-sm">Reuse update from:</Text>
                </View>
                <View className="flex-1">
                  <InputSelect
                    hint="You can only reuse update of exercises that don't reuse other exercises"
                    name="program-exercise-update-reuse-select"
                    values={reuseCandidates}
                    value={reuseKey}
                    disabled={cannotReuseOtherUpdates}
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
                              if (fullName) {
                                e.update = {
                                  type: "custom",
                                  reuse: fullName ? { fullName, source: "specific" } : undefined,
                                };
                              } else {
                                e.update = {
                                  type: "custom",
                                  reuse: undefined,
                                  script: "{~~}",
                                };
                              }
                            }
                          );
                        }),
                        "Change update reuse"
                      );
                    }}
                  />
                </View>
              </Pressable>
            </MenuItemWrapper>
          </View>
        )}
      </View>
    </>
  );
}
