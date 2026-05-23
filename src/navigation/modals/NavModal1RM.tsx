import { JSX, useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ModalScreenContainer } from "../ModalScreenContainer";
import { FormSheet } from "../FormSheet";
import { ExerciseRM } from "../../components/exerciseRm";
import { Exercise_get, Exercise_toKey, IExercise } from "../../models/exercise";
import { Weight_build } from "../../models/weight";
import { IState, updateState } from "../../models/state";
import { Progress_lbProgress } from "../../models/progress";
import { lb } from "lens-shmens";
import { buildPlannerDispatch } from "../../utils/plannerDispatch";
import { IPlannerState } from "../../pages/planner/models/types";
import type { IRootStackParamList } from "../types";
import { Button } from "../../components/button";

function useCommitRm1(exercise: IExercise | undefined): (rawOrValue: string | number | undefined) => void {
  const { state, dispatch } = useAppState();
  return (rawOrValue) => {
    if (!exercise) {
      return;
    }
    const value = typeof rawOrValue === "number" ? rawOrValue : rawOrValue ? parseFloat(rawOrValue) : undefined;
    if (!value || isNaN(value)) {
      return;
    }
    updateState(
      dispatch,
      [
        lb<IState>()
          .p("storage")
          .p("settings")
          .p("exerciseData")
          .recordModify((data) => {
            const k = Exercise_toKey(exercise);
            return { ...data, [k]: { ...data[k], rm1: Weight_build(value, state.storage.settings.units) } };
          }),
      ],
      "Update 1RM from modal"
    );
  };
}

function NavModal1RMWorkout(props: { progressId: number }): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const { progressId } = props;

  const progress = progressId === 0 ? state.storage.progress?.[0] : state.progress[progressId];
  const exerciseType = progress?.ui?.rm1Modal?.exerciseType;
  const exercise = exerciseType ? Exercise_get(exerciseType, state.storage.settings.exercises) : undefined;
  const pendingInputRef = useRef<string | undefined>(undefined);
  const commitRm1 = useCommitRm1(exercise);

  const onClose = (): void => {
    updateState(
      dispatch,
      [Progress_lbProgress(progressId).pi("ui", {}).p("rm1Modal").record(undefined)],
      "Close 1RM modal"
    );
    navigation.goBack();
  };

  const onSave = (): void => {
    const raw = pendingInputRef.current;
    if (raw !== undefined) {
      commitRm1(raw);
    }
    onClose();
  };

  const shouldGoBack = !progress || !exerciseType;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !exercise) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth>
      <FormSheet>
        <ExerciseRM
          name="1 Rep Max"
          rmKey="rm1"
          exercise={exercise}
          settings={state.storage.settings}
          onInput={(v) => {
            pendingInputRef.current = v;
          }}
          onEditVariable={(value) => {
            pendingInputRef.current = undefined;
            commitRm1(value);
          }}
        />
        <View className="flex-row items-center justify-between gap-4 mt-4">
          <Button name="rm1-modal-cancel" type="button" kind="grayv2" onClick={onClose}>
            Cancel
          </Button>
          <Button name="rm1-modal-save" type="button" kind="purple" onClick={onSave}>
            Save
          </Button>
        </View>
      </FormSheet>
    </ModalScreenContainer>
  );
}

function NavModal1RMPreview(props: { programId: string }): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const { programId } = props;

  const plannerState = state.editProgramStates?.[programId];
  const plannerDispatch = useCallback(
    plannerState
      ? buildPlannerDispatch(dispatch, lb<IState>().p("editProgramStates").p(programId), plannerState)
      : () => {},
    [dispatch, programId, plannerState]
  );

  const previewOneRepMaxModal = plannerState?.ui?.previewOneRepMaxModal;
  const exerciseType = previewOneRepMaxModal?.plannerExercise?.exerciseType;
  const exercise = exerciseType ? Exercise_get(exerciseType, state.storage.settings.exercises) : undefined;
  const pendingInputRef = useRef<string | undefined>(undefined);
  const commitRm1 = useCommitRm1(exercise);

  const onClose = (): void => {
    if (plannerState) {
      plannerDispatch(
        lb<IPlannerState>().pi("ui").p("previewOneRepMaxModal").record(undefined),
        "Close preview 1RM modal"
      );
    }
    navigation.goBack();
  };

  const onSave = (): void => {
    const raw = pendingInputRef.current;
    if (raw !== undefined) {
      commitRm1(raw);
    }
    onClose();
  };

  const shouldGoBack = !plannerState || !exerciseType;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !exercise) {
    return <></>;
  }

  return (
    <ModalScreenContainer onClose={onClose} isFullWidth>
      <FormSheet>
        <ExerciseRM
          name="1 Rep Max"
          rmKey="rm1"
          exercise={exercise}
          settings={state.storage.settings}
          onInput={(v) => {
            pendingInputRef.current = v;
          }}
          onEditVariable={(value) => {
            pendingInputRef.current = undefined;
            commitRm1(value);
          }}
        />
        <View className="flex-row items-center justify-between gap-4 mt-4">
          <Button name="rm1-modal-cancel" type="button" kind="grayv2" onClick={onClose}>
            Cancel
          </Button>
          <Button name="rm1-modal-save" type="button" kind="purple" onClick={onSave}>
            Save
          </Button>
        </View>
      </FormSheet>
    </ModalScreenContainer>
  );
}

export function NavModal1RM(): JSX.Element {
  const route = useRoute<{ key: string; name: "rm1Modal"; params: IRootStackParamList["rm1Modal"] }>();
  const params = route.params;

  if (params.context === "preview") {
    return <NavModal1RMPreview programId={params.programId} />;
  }
  return <NavModal1RMWorkout progressId={params.progressId} />;
}
