import { JSX, useCallback, useEffect, useRef } from "react";
import { View, Pressable } from "react-native";
import { Dialog_alert } from "../../utils/dialog";
import { Text } from "../primitives/text";
import { IPlannerExerciseState, IPlannerState } from "../../pages/planner/models/types";
import { IDispatch } from "../../ducks/types";
import { IDayData, ISettings } from "../../types";
import { INavCommon, IState } from "../../models/state";
import { lb } from "lens-shmens";
import { useIsFocused } from "@react-navigation/native";
import { navigateToModal, getCurrentRouteName } from "../../navigation/navigationService";
import { useUndoRedo } from "../../pages/builder/utils/undoredo";
import { ILensDispatch } from "../../utils/useLensReducer";
import { useNavOptions } from "../../navigation/useNavOptions";
import { Program_evaluateCachedPlanner, Program_getFirstProgramExercise } from "../../models/program";
import {
  PlannerProgramExercise_buildProgress,
  PlannerProgramExercise_getProgressDefaultArgs,
} from "../../pages/planner/models/plannerProgramExercise";
import { EditProgramExerciseWarmups } from "./editProgramExerciseWarmups";
import { EditProgramExerciseVariations } from "./editProgramExerciseVariations";
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

  const evaluatedProgram = Program_evaluateCachedPlanner(plannerState.current.program, props.settings);
  let plannerExercise = evaluatedProgram.weeks[props.dayData.week - 1]?.days[
    props.dayData.dayInWeek - 1
  ]?.exercises.find((e) => e.key === props.exerciseKey);

  if (!plannerExercise) {
    plannerExercise = Program_getFirstProgramExercise(evaluatedProgram, props.exerciseKey);
  }

  const editProgramState = props.editProgramState;
  const ui = plannerState.ui;
  const lbProgram = lb<IPlannerExerciseState>().p("current").p("program").pi("planner");

  const exercisePickerState = props.plannerState.ui.exercisePickerState;
  // See screenProgram.tsx. Open the picker whenever a request is pending but the
  // picker route isn't actually open (so it survives a dropped navigation), but
  // stay a no-op while it's up so `.state` mutations don't re-push it.
  const pickerStateRef = useRef(exercisePickerState);
  pickerStateRef.current = exercisePickerState;
  const navParamsRef = useRef({
    programId: props.programId,
    exerciseStateKey: props.exerciseStateKey,
    dayData: props.dayData,
    exerciseKey: props.exerciseKey,
    change: ui.exercisePickerChange,
    variationIndex: ui.exercisePickerVariationIndex,
  });
  navParamsRef.current = {
    programId: props.programId,
    exerciseStateKey: props.exerciseStateKey,
    dayData: props.dayData,
    exerciseKey: props.exerciseKey,
    change: ui.exercisePickerChange,
    variationIndex: ui.exercisePickerVariationIndex,
  };
  const openPickerIfNeeded = useCallback(() => {
    if (!pickerStateRef.current || getCurrentRouteName() === "editProgramExercisePickerModal") {
      return;
    }
    const p = navParamsRef.current;
    navigateToModal("editProgramExercisePickerModal", {
      context: "editProgramExercise",
      programId: p.programId,
      exerciseStateKey: p.exerciseStateKey,
      dayData: p.dayData,
      change: p.change ?? "all",
      variationIndex: p.variationIndex,
      exerciseKey: p.exerciseKey,
    });
  }, []);
  const navigatedPickerRef = useRef(exercisePickerState);
  useEffect(() => {
    if (exercisePickerState && navigatedPickerRef.current !== exercisePickerState) {
      openPickerIfNeeded();
    }
    navigatedPickerRef.current = exercisePickerState;
  }, [exercisePickerState, openPickerIfNeeded]);
  // Recover a dropped navigation when the screen regains focus (e.g. a competing
  // modal that stole the navigation closed) with a request still pending.
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) {
      openPickerIfNeeded();
    }
  }, [isFocused, openPickerIfNeeded]);

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
                Dialog_alert(result.error);
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
          return EditProgramUiHelpers_changeAllInstances(program, plannerExercise!.key, props.settings, true, (e) => {
            e.notused = !notused;
          });
        }),
      ],
      "Toggle used status"
    );
  }, [plannerDispatch, plannerExercise, props.settings, lbProgram]);

  const toggleExerciseVariations = useCallback(() => {
    plannerDispatch(
      lb<IPlannerExerciseState>()
        .p("ui")
        .p("isExerciseVariationsEnabled")
        .record(!plannerState.ui.isExerciseVariationsEnabled),
      "Toggle exercise variations"
    );
  }, [plannerDispatch, plannerState.ui.isExerciseVariationsEnabled]);

  // Disabling only hides the empty entry point — never a real ladder, so it's offered only when ≤1 rung.
  const canToggleExerciseVariations =
    !ui.isExerciseVariationsEnabled || (plannerExercise?.exerciseVariations?.length ?? 0) <= 1;

  const kebabActions: IActionMenuAction[] = plannerExercise
    ? [
        {
          label: `${ui.isProgressEnabled ? "Disable" : "Enable"} Progress`,
          onPress: toggleProgress,
          testID: "program-exercise-toggle-progress",
        },
        {
          label: `${ui.isUpdateEnabled ? "Disable" : "Enable"} Update`,
          onPress: toggleUpdate,
          testID: "program-exercise-toggle-update",
        },
        ...(canToggleExerciseVariations
          ? [
              {
                label: `${ui.isExerciseVariationsEnabled ? "Disable" : "Enable"} Exercise Variations`,
                onPress: toggleExerciseVariations,
                testID: "program-exercise-toggle-exercise-variations",
              },
            ]
          : []),
        {
          label: `Make ${plannerExercise.notused ? "Used" : "Unused"}`,
          onPress: toggleUsed,
          testID: "program-exercise-toggle-used",
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
              data-testid="program-exercise-navbar-kebab"
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
      {ui.isExerciseVariationsEnabled && (
        <View className="mb-4">
          <EditProgramExerciseVariations
            plannerExercise={plannerExercise}
            planner={plannerState.current.program.planner}
            settings={props.settings}
            plannerDispatch={plannerDispatch}
            dispatch={props.dispatch}
            programId={props.programId}
            exerciseStateKey={props.exerciseStateKey}
          />
        </View>
      )}
      <View className="mb-4">
        {ui.isProgressEnabled && (
          <EditProgramExerciseProgress
            ui={plannerState.ui}
            program={plannerState.current.program}
            evaluatedProgram={evaluatedProgram}
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
            evaluatedProgram={evaluatedProgram}
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
