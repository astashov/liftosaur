import { JSX, useCallback, useEffect, useRef } from "react";
import { View, Pressable, Alert } from "react-native";
import { Text } from "../primitives/text";
import { IPlannerExerciseState, IPlannerState } from "../../pages/planner/models/types";
import { IDispatch } from "../../ducks/types";
import { IDayData, ISettings } from "../../types";
import { INavCommon, IState } from "../../models/state";
import { lb } from "lens-shmens";
import { navigationRef } from "../../navigation/navigationRef";
import { useUndoRedo } from "../../pages/builder/utils/undoredo";
import { ILensDispatch } from "../../utils/useLensReducer";
import { useNavOptions } from "../../navigation/useNavOptions";
import { Program_evaluate, Program_getFirstProgramExercise } from "../../models/program";
import {
  PlannerProgramExercise_buildProgress,
  PlannerProgramExercise_getProgressDefaultArgs,
} from "../../pages/planner/models/plannerProgramExercise";
import { EditProgramExerciseWarmups } from "./editProgramExerciseWarmups";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { IconKebab } from "../icons/iconKebab";
import { ActionMenu, IActionMenuAction } from "../actionMenu";
import { EditProgramExerciseProgress } from "./editProgramExerciseProgress";
import { EditProgramExerciseUpdate } from "./editProgramExerciseUpdate";
import {
  EditProgramUiHelpers_changeFirstInstance,
  EditProgramUiHelpers_changeAllInstances,
} from "../editProgram/editProgramUi/editProgramUiHelpers";
import { EditProgramExerciseSets } from "./editProgramExerciseSets";
import { EditProgramExerciseNavbar } from "./editProgramExerciseNavbar";
import { editProgramExerciseTourConfig } from "../tour/editProgramExerciseTourConfig";

interface IProps {
  plannerState: IPlannerExerciseState;
  exerciseKey: string;
  exerciseStateKey: string;
  programId: string;
  dayData: Required<IDayData>;
  dispatch: IDispatch;
  settings: ISettings;
  navCommon: INavCommon;
  editProgramState: IPlannerState;
}

export function ScreenEditProgramExercise(props: IProps): JSX.Element {
  const { plannerState } = props;

  const plannerDispatch: ILensDispatch<IPlannerExerciseState> = useCallback(
    buildPlannerDispatch(
      props.dispatch,
      lb<IState>().p("editProgramExerciseStates").p(props.exerciseStateKey),
      plannerState
    ),
    [plannerState]
  );
  useUndoRedo(plannerState, plannerDispatch);

  const evaluatedProgram = Program_evaluate(plannerState.current.program, props.settings);
  let plannerExercise = evaluatedProgram.weeks[props.dayData.week - 1]?.days[
    props.dayData.dayInWeek - 1
  ].exercises.find((e) => e.key === props.exerciseKey);

  if (!plannerExercise) {
    plannerExercise = Program_getFirstProgramExercise(evaluatedProgram, props.exerciseKey);
  }

  const editProgramState = props.editProgramState;
  const ui = plannerState.ui;
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");

  const exercisePickerState = props.plannerState.ui.exercisePickerState;
  const prevExercisePickerState = useRef(exercisePickerState);
  useEffect(() => {
    if (exercisePickerState && !prevExercisePickerState.current) {
      navigationRef.navigate("editProgramExercisePickerModal", {
        context: "editProgramExercise",
        programId: props.programId,
        exerciseStateKey: props.exerciseStateKey,
        dayData: props.dayData,
        change: "all",
        exerciseKey: props.exerciseKey,
      });
    }
    prevExercisePickerState.current = exercisePickerState;
  }, [exercisePickerState]);

  const toggleProgress = useCallback(() => {
    if (!plannerExercise) {
      return;
    }
    plannerDispatch(
      [
        lb<IPlannerExerciseState>().p("ui").p("isProgressEnabled").record(!plannerState.ui.isProgressEnabled),
        lbProgram.recordModify((program) => {
          return EditProgramUiHelpers_changeFirstInstance(program, plannerExercise!, props.settings, true, (e) => {
            if (plannerState.ui.isProgressEnabled) {
              e.progress = undefined;
            } else {
              const result = PlannerProgramExercise_buildProgress(
                "lp",
                PlannerProgramExercise_getProgressDefaultArgs("lp")
              );
              if (result.success) {
                e.progress = result.data;
              } else {
                Alert.alert(result.error);
              }
            }
          });
        }),
      ],
      "Toggle progress"
    );
  }, [plannerDispatch, plannerExercise, plannerState.ui.isProgressEnabled, props.settings, lbProgram]);

  const toggleUpdate = useCallback(() => {
    if (!plannerExercise) {
      return;
    }
    plannerDispatch(
      [
        lb<IPlannerExerciseState>().p("ui").p("isUpdateEnabled").record(!plannerState.ui.isUpdateEnabled),
        lbProgram.recordModify((program) => {
          return EditProgramUiHelpers_changeFirstInstance(program, plannerExercise!, props.settings, true, (e) => {
            if (plannerState.ui.isUpdateEnabled) {
              e.update = undefined;
            } else {
              e.update = { type: "custom", script: `{~~}` };
            }
          });
        }),
      ],
      "Toggle update"
    );
  }, [plannerDispatch, plannerExercise, plannerState.ui.isUpdateEnabled, props.settings, lbProgram]);

  const toggleUsed = useCallback(() => {
    if (!plannerExercise) {
      return;
    }
    plannerDispatch(
      [
        lbProgram.recordModify((program) => {
          const notused = plannerExercise!.notused;
          return EditProgramUiHelpers_changeAllInstances(
            program,
            plannerExercise!.fullName,
            props.settings,
            true,
            (e) => {
              e.notused = !notused;
            }
          );
        }),
      ],
      "Toggle used status"
    );
  }, [plannerDispatch, plannerExercise, props.settings, lbProgram]);

  const kebabActions: IActionMenuAction[] = plannerExercise
    ? [
        {
          label: `${ui.isProgressEnabled ? "Disable" : "Enable"} Progress`,
          onPress: toggleProgress,
          "data-cy": "program-exercise-toggle-progress",
        },
        {
          label: `${ui.isUpdateEnabled ? "Disable" : "Enable"} Update`,
          onPress: toggleUpdate,
          "data-cy": "program-exercise-toggle-update",
        },
        {
          label: `Make ${plannerExercise.notused ? "Used" : "Unused"}`,
          onPress: toggleUsed,
          "data-cy": "program-exercise-toggle-used",
        },
      ]
    : [];

  useNavOptions({
    navTitle: "Edit Program Exercise",
    navHelpTourId: editProgramExerciseTourConfig.id,
    navSubtitle: plannerExercise?.notused ? (
      <View className="pb-1">
        <View className="self-start px-1 ml-3 rounded bg-background-darkgray">
          <Text className="text-xs font-bold text-text-alwayswhite">UNUSED</Text>
        </View>
      </View>
    ) : undefined,
    navRightButtons: [
      <View key="kebab" className="flex-row items-center">
        <ActionMenu
          actions={kebabActions}
          renderTrigger={(open) => (
            <Pressable
              data-cy="program-exercise-navbar-kebab"
              testID="program-exercise-navbar-kebab"
              className="p-2"
              onPress={open}
            >
              <IconKebab />
            </Pressable>
          )}
        />
      </View>,
    ],
  });

  if (!plannerExercise) {
    return <Text>No such exercise</Text>;
  }

  return (
    <>
      <EditProgramExerciseNavbar
        state={plannerState}
        plannerDispatch={plannerDispatch}
        dispatch={props.dispatch}
        editProgramState={editProgramState}
        programId={props.programId}
        settings={props.settings}
        plannerExercise={plannerExercise}
      />
      <View className="mb-4">
        <EditProgramExerciseWarmups
          plannerExercise={plannerExercise}
          settings={props.settings}
          plannerDispatch={plannerDispatch}
        />
      </View>
      <View className="mb-4">
        {ui.isProgressEnabled && (
          <EditProgramExerciseProgress
            ui={plannerState.ui}
            program={plannerState.current.program}
            plannerExercise={plannerExercise}
            settings={props.settings}
            plannerDispatch={plannerDispatch}
            exerciseStateKey={props.exerciseStateKey}
            programId={props.programId}
          />
        )}
      </View>
      <View className="mb-4">
        {ui.isUpdateEnabled && (
          <EditProgramExerciseUpdate
            ui={plannerState.ui}
            program={plannerState.current.program}
            plannerExercise={plannerExercise}
            settings={props.settings}
            plannerDispatch={plannerDispatch}
            exerciseStateKey={props.exerciseStateKey}
            programId={props.programId}
          />
        )}
      </View>
      <View className="mb-8">
        <EditProgramExerciseSets
          ui={plannerState.ui}
          evaluatedProgram={evaluatedProgram}
          plannerExercise={plannerExercise}
          settings={props.settings}
          plannerDispatch={plannerDispatch}
          exerciseStateKey={props.exerciseStateKey}
          programId={props.programId}
        />
      </View>
    </>
  );
}
