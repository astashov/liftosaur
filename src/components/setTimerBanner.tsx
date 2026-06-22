import { JSX, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "./primitives/text";
import { Button } from "./button";
import { IDispatch } from "../ducks/types";
import { IExerciseType, IHistoryRecord, IProgressUi, ISettings } from "../types";
import { TimeUtils_formatMMSS } from "../utils/time";
import { WorkoutExerciseSetTarget } from "./workoutExerciseSet";
import { ExerciseImage } from "./exerciseImage";
import { Exercise_get, Exercise_nameWithEquipment } from "../models/exercise";
import { Thunk_completeSetWithTimer, Thunk_advanceSetTimer } from "../ducks/thunks";

function useSetTimerTick(isActive: boolean): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }
    const intervalId = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(intervalId);
  }, [isActive]);
}

interface ISetTimerBannerContentProps {
  progress: IHistoryRecord;
  settings: ISettings;
  setTimerModal: NonNullable<IProgressUi["setTimerModal"]>;
  dispatch: IDispatch;
  onClose: () => void;
}

export function SetTimerBannerContent(props: ISetTimerBannerContentProps): JSX.Element | null {
  const { progress, dispatch, setTimerModal, settings, onClose } = props;
  const { entryIndex, setIndex, startedAt } = setTimerModal;
  const entry = progress.entries[entryIndex];
  const set = entry?.sets[setIndex];

  const completedRef = useRef(false);

  // The same modal walks through several timed sets in an `auto` circuit; reset the
  // guard whenever it advances to a different set (new startedAt).
  useEffect(() => {
    completedRef.current = false;
  }, [entryIndex, setIndex, startedAt]);

  useSetTimerTick(set != null);

  const target = set?.setTimer ?? 0;
  const restTarget = set?.timer ?? 0;
  const isAuto = !!set?.auto;
  const elapsedMs = Math.max(0, Date.now() - startedAt);

  // After a timed set is recorded we only auto-advance the banner for continuous `auto` circuits with
  // no rest (EMOM-style). An `auto` set *with* rest closes the banner and lets the corner rest timer
  // run — it reopens the next set's banner when the rest expires (see RestTimer). A non-auto set just
  // closes; its next set is started explicitly via the play button.
  const completeAndProceed = (recordedSeconds: number): void => {
    dispatch(Thunk_completeSetWithTimer(entryIndex, setIndex, recordedSeconds));
    if (isAuto && restTarget === 0) {
      dispatch(Thunk_advanceSetTimer());
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (set == null || !isAuto) {
      return;
    }
    if (target > 0 && elapsedMs >= target * 1000 && !completedRef.current) {
      completedRef.current = true;
      dispatch(Thunk_completeSetWithTimer(entryIndex, setIndex, target));
      if (restTarget > 0) {
        onClose();
      } else {
        dispatch(Thunk_advanceSetTimer());
      }
    }
  }, [elapsedMs, isAuto, target, restTarget, set, entryIndex, setIndex, dispatch, onClose]);

  if (set == null || entry == null) {
    return null;
  }

  const elapsedSec = Math.round(elapsedMs / 1000);
  const pct = target > 0 ? Math.min(1, elapsedMs / (target * 1000)) : 0;
  const elapsedLabel = TimeUtils_formatMMSS(elapsedMs);

  function onStopAndRecord(): void {
    completeAndProceed(elapsedSec);
  }

  function onLogKeepTiming(): void {
    dispatch(Thunk_completeSetWithTimer(entryIndex, setIndex, elapsedSec));
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
        <Button
          name="set-timer-stop-record"
          data-testid="set-timer-stop-record"
          kind="purple"
          onPress={onStopAndRecord}
        >
          Stop &amp; record · {elapsedLabel}
        </Button>
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
