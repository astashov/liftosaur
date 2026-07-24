import { JSX, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { IExerciseType, IHistoryRecord, IProgramState, ISettings } from "../types";
import { TimeUtils_formatMMSS } from "../utils/time";
import { WorkoutExerciseSetTarget } from "./workoutExerciseSet";
import { ExerciseImage } from "./exerciseImage";
import { Exercise_get, Exercise_nameWithEquipment } from "../models/exercise";
import { Thunk_recordSetTimer, Thunk_checkSetTimer } from "../ducks/thunks";
import { Progress_isSetTimerCheckDue } from "../models/progress";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { IPlannerProgramExercise } from "../pages/planner/models/types";

// Re-renders the clock every 250ms and calls onTick so `auto` circuits advance/complete on time. All the
// advance/complete/rest logic lives in the model (Progress_checkSetTimer) — this just provides the clock tick.
function useSetTimerTick(isActive: boolean, onTick: () => void): void {
  const [, setTick] = useState(0);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }
    const intervalId = setInterval(() => {
      setTick((t) => t + 1);
      onTickRef.current();
    }, 250);
    return () => clearInterval(intervalId);
  }, [isActive]);
}

interface ISetTimerBannerContentProps {
  progress: IHistoryRecord;
  settings: ISettings;
  setTimerModal: NonNullable<IHistoryRecord["setTimer"]>;
  dispatch: IDispatch;
  onClose: () => void;
  // In the playground the progress isn't in global state, so the record/tick thunks can't resolve it.
  // Dispatch the underlying card actions directly instead, mirroring how ModalAmrap handles the playground.
  isPlayground?: boolean;
  programExercise?: IPlannerProgramExercise;
  otherStates?: IByExercise<IProgramState>;
}

export function SetTimerBannerContent(props: ISetTimerBannerContentProps): JSX.Element | null {
  const { progress, dispatch, setTimerModal, settings, onClose, isPlayground } = props;
  const { entryIndex, setIndex, startedAt } = setTimerModal;
  const entry = progress.entries[entryIndex];
  const set = entry?.sets[setIndex];

  useSetTimerTick(set != null, () => {
    if (isPlayground) {
      // The thunk gates on this internally; the playground dispatches the card action directly, so gate here
      // too — otherwise every 250ms tick writes playground state even when no transition is due.
      if (Progress_isSetTimerCheckDue(progress, Date.now())) {
        dispatch({
          type: "CheckSetTimerAction",
          programExercise: props.programExercise,
          otherStates: props.otherStates,
          isPlayground: true,
        });
      }
    } else {
      dispatch(Thunk_checkSetTimer());
    }
  });

  const target = set?.setTimer ?? 0;
  const elapsedMs = Math.max(0, Date.now() - startedAt);

  // For a timed AMRAP set the amrap modal stacks on top while this modal stays mounted underneath (see
  // Progress_proceedAfterTimedSet). Hide the clock so it isn't visible behind the amrap sheet.
  if (set == null || entry == null || progress.amrapModal != null) {
    return null;
  }

  const pct = target > 0 ? Math.min(1, elapsedMs / (target * 1000)) : 0;
  const elapsedLabel = TimeUtils_formatMMSS(elapsedMs);

  function recordSetTimer(keepTiming: boolean): void {
    if (isPlayground) {
      dispatch({
        type: "CompleteSetAction",
        entryIndex,
        setIndex,
        mode: "workout",
        programExercise: props.programExercise,
        otherStates: props.otherStates,
        forceUpdateEntryIndex: false,
        isExternal: false,
        isPlayground: true,
        keepSetTimerRunning: keepTiming,
      });
    } else {
      dispatch(Thunk_recordSetTimer(entryIndex, setIndex, keepTiming));
    }
  }

  function onStopAndRecord(): void {
    recordSetTimer(false);
  }

  function onLogKeepTiming(): void {
    recordSetTimer(true);
  }

  const isCompleted = !!set.isCompleted;

  return (
    <View className="px-4 pt-2 pb-6">
      <BannerHeader
        exerciseType={entry.exercise}
        settings={settings}
        subtitle={
          <View className="flex-row items-center flex-wrap">
            <Text className="text-text-secondary text-sm">
              Set {setIndex + 1} of {entry.sets.length}
              {" - "}
            </Text>
            <WorkoutExerciseSetTarget set={set} setType="program" />
          </View>
        }
      />
      <View className="items-center my-6">
        <Text
          className="font-bold text-text-primary"
          style={{ fontSize: 64, lineHeight: 72 }}
          data-testid="set-timer-current"
          testID="set-timer-current"
        >
          {elapsedLabel}
        </Text>
        <Text className="text-text-secondary">
          of <Text className="font-semibold text-syntax-timer">{TimeUtils_formatMMSS(target * 1000)}</Text> target
        </Text>
      </View>
      <ProgressBar pct={pct} />
      <View className="flex-row justify-between mt-1">
        <Text className="text-xs text-text-secondary">0:00</Text>
        <Text className="text-xs text-text-secondary">{TimeUtils_formatMMSS(target * 1000)}</Text>
      </View>
      <View className="mt-6 gap-2">
        {/* Once the set is logged there's nothing left to record — only "Discard & close" remains. */}
        {!isCompleted && (
          <Button
            name="set-timer-stop-record"
            data-testid="set-timer-stop-record"
            kind="purple"
            onPress={onStopAndRecord}
          >
            Stop &amp; record · {elapsedLabel}
          </Button>
        )}
        {!isCompleted && (
          <Button
            name="set-timer-log-keep"
            data-testid="set-timer-log-keep"
            kind="lightpurple"
            onPress={onLogKeepTiming}
          >
            Log {elapsedLabel}, keep timing
          </Button>
        )}
        <Button name="set-timer-discard" data-testid="set-timer-discard" kind="transparent-purple" onPress={onClose}>
          Discard &amp; close
        </Button>
      </View>
    </View>
  );
}

function BannerHeader(props: { exerciseType: IExerciseType; settings: ISettings; subtitle: JSX.Element }): JSX.Element {
  const exercise = Exercise_get(props.exerciseType, props.settings.exercises);
  return (
    <View className="flex-row items-center">
      <View className="self-start rounded-lg bg-background-image">
        <ExerciseImage settings={props.settings} width={48} exerciseType={props.exerciseType} size="small" />
      </View>
      <View className="flex-1 min-w-0 ml-2">
        <Text className="text-xl font-bold text-text-primary">
          {Exercise_nameWithEquipment(exercise, props.settings)}
        </Text>
        {props.subtitle}
      </View>
    </View>
  );
}

function ProgressBar(props: { pct: number }): JSX.Element {
  return (
    <View className="h-2 overflow-hidden rounded-full bg-background-neutral">
      <View
        className="h-full rounded-full bg-button-primarybackground"
        style={{ width: `${Math.round(props.pct * 100)}%` }}
      />
    </View>
  );
}
