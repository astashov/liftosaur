import { JSX, useEffect, useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Text, TextRaw, Text_resolveFontFamily } from "./primitives/text";
import { Button } from "./button";
import { Svg, Path } from "./primitives/svg";
import { IDispatch } from "../ducks/types";
import { IExerciseType, IHistoryRecord, IProgramState, ISettings } from "../types";
import { TimeUtils_formatMMSS } from "../utils/time";
import { WorkoutExerciseSetTarget } from "./workoutExerciseSet";
import { ExerciseImage } from "./exerciseImage";
import { Exercise_get, Exercise_nameWithEquipment } from "../models/exercise";
import {
  Thunk_recordSetTimer,
  Thunk_checkSetTimer,
  Thunk_playGetReadyCue,
  Thunk_startSetTimerWork,
} from "../ducks/thunks";
import { Progress_isSetTimerCheckDue, IActiveSetTimer } from "../models/progress";
import { Tailwind_semantic } from "../utils/tailwindConfig";
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
  setTimerModal: IActiveSetTimer;
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
  const isGetReady = setTimerModal.phase === "getReady";
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
  const elapsedMs = isGetReady ? 0 : Math.max(0, Date.now() - startedAt);
  const getReadyTotal = setTimerModal.phase === "getReady" ? setTimerModal.getReady : 0;
  const getReadyLeft = isGetReady
    ? Math.max(0, Math.ceil((getReadyTotal * 1000 - (Date.now() - startedAt)) / 1000))
    : 0;

  const lastCueRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!isGetReady || isPlayground) {
      lastCueRef.current = undefined;
      return;
    }
    if (getReadyLeft > 0 && getReadyLeft <= MAX_HAPTIC_CUE_SECONDS && lastCueRef.current !== getReadyLeft) {
      lastCueRef.current = getReadyLeft;
      dispatch(Thunk_playGetReadyCue());
    }
  }, [isGetReady, isPlayground, getReadyLeft, dispatch]);

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

  function onStartNow(): void {
    if (isPlayground) {
      dispatch({ type: "StartSetTimerWorkAction" });
    } else {
      dispatch(Thunk_startSetTimerWork());
    }
  }

  if (isGetReady) {
    return (
      <View className="px-4 pt-2 pb-6">
        <BannerHeader
          exerciseType={entry.exercise}
          settings={settings}
          subtitle={
            <Text className="text-text-secondary text-sm">
              Set {setIndex + 1} of {entry.sets.length}
            </Text>
          }
        />
        <GetReadyRing secondsLeft={getReadyLeft} total={getReadyTotal} target={target} onPress={onStartNow} />
        <View className="mt-6 gap-2">
          <Button name="set-timer-start-now" data-testid="set-timer-start-now" kind="purple" onPress={onStartNow}>
            Start now
          </Button>
          <Button name="set-timer-discard" data-testid="set-timer-discard" kind="transparent-purple" onPress={onClose}>
            Discard &amp; close
          </Button>
        </View>
      </View>
    );
  }

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

// A long countdown would otherwise buzz every second the whole way down.
const MAX_HAPTIC_CUE_SECONDS = 5;

const RING_SIZE = 200;
const RING_RADIUS = 78;
const RING_VISIBLE_GAP_PX = 9;
// Past this the per-second ticks are too thin to read, so the ring falls back to one draining arc.
const MAX_RING_SEGMENTS = 12;

function polar(center: number, radius: number, angle: number): { x: number; y: number } {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: center + radius * Math.cos(radians), y: center + radius * Math.sin(radians) };
}

function arcPath(center: number, radius: number, fromAngle: number, toAngle: number): string {
  const start = polar(center, radius, fromAngle);
  const end = polar(center, radius, toAngle);
  const largeArc = toAngle - fromAngle > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(
    2
  )} ${end.y.toFixed(2)}`;
}

function GetReadyRing(props: { secondsLeft: number; total: number; target: number; onPress: () => void }): JSX.Element {
  const { secondsLeft, total, target } = props;
  const semantic = Tailwind_semantic();
  const stroke = 10;
  const center = RING_SIZE / 2;
  const segments = Math.min(total, MAX_RING_SEGMENTS);
  const paths: { d: string; isSpent: boolean }[] = [];
  if (total > 0 && total <= MAX_RING_SEGMENTS) {
    const segAngle = 360 / segments;
    // strokeLinecap="round" bulges each segment by half the stroke at both ends, so the gap has to
    // cover a whole stroke width on top of the gap you want to see, or the caps close it up.
    const gapArcPx = RING_VISIBLE_GAP_PX + stroke;
    const gap = Math.min(segAngle * 0.5, (gapArcPx / (2 * Math.PI * RING_RADIUS)) * 360);
    for (let i = 0; i < segments; i += 1) {
      paths.push({
        d: arcPath(center, RING_RADIUS, i * segAngle + gap / 2, (i + 1) * segAngle - gap / 2),
        isSpent: i >= secondsLeft,
      });
    }
  } else if (total > 0) {
    paths.push({ d: arcPath(center, RING_RADIUS, 0, 359.99), isSpent: true });
    const sweep = Math.max(0.01, Math.min(359.99, (secondsLeft / total) * 360));
    paths.push({ d: arcPath(center, RING_RADIUS, 0, sweep), isSpent: false });
  }

  return (
    <View className="items-center px-4 py-6 mt-4 border rounded-2xl bg-background-cardyellow border-border-cardyellow">
      <Pressable
        onPress={props.onPress}
        style={{ width: RING_SIZE, height: RING_SIZE }}
        data-testid="set-timer-get-ready-ring"
        testID="set-timer-get-ready-ring"
      >
        <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
          {paths.map((p, i) => (
            <Path
              key={i}
              d={p.d}
              fill="none"
              stroke={p.isSpent ? semantic.border.cardyellow : semantic.button.orangebackground}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
          ))}
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          {/* TextRaw, not Text: Text injects text-base whenever the className carries no size token, and an
              arbitrary `text-[96px]` never reaches the stylesheet, so on web the digit rendered at 16px.
              No lineHeight either - anything under Poppins' natural line height clips the glyph on iOS. */}
          <TextRaw
            style={{
              fontFamily: Text_resolveFontFamily("font-bold"),
              fontWeight: Platform.OS === "android" ? undefined : "bold",
              fontSize: 96,
              color: semantic.text.cardyellow,
              width: "100%",
              textAlign: "center",
              includeFontPadding: false,
            }}
            data-testid="set-timer-get-ready-current"
            testID="set-timer-get-ready-current"
          >
            {secondsLeft}
          </TextRaw>
        </View>
      </Pressable>
      <Text className="text-lg font-bold text-text-cardyellow">Get Ready</Text>
      {target > 0 && <Text className="text-sm text-text-secondary">then {TimeUtils_formatMMSS(target * 1000)}</Text>}
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
