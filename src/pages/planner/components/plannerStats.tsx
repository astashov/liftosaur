import { JSX, useLayoutEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { Text } from "../../../components/primitives/text";
import { ISetResults, ISetSplit } from "../models/types";
import { ObjectUtils_keys } from "../../../utils/object";
import { PlannerWeekMuscles } from "./plannerWeekMuscles";
import { LinkButton } from "../../../components/linkButton";
import { Pressable } from "../../../components/primitives/pressable";
import { IconMuscleSettings } from "../../../components/icons/iconMuscleSettings";
import { Tailwind_semantic } from "../../../utils/tailwindConfig";
import { IScreenMuscle, ISettings } from "../../../types";
import { n } from "../../../utils/math";
import { Muscle_getMuscleGroupName } from "../../../models/muscle";
import { getNavigationService } from "../../../navigation/navUtils";
import { CollectionUtils_sort } from "../../../utils/collection";
import { TooltipPlacement_place } from "../../../utils/tooltipPlacement";

interface IPlannerWeekStatsProps {
  setResults: ISetResults;
  colorize: boolean;
  frequency: boolean;
  settings: ISettings;
  onEditSettings?: () => void;
  editSettingsLabel?: string;
}

export function PlannerStats(props: IPlannerWeekStatsProps): JSX.Element {
  const { setResults, settings, frequency, onEditSettings } = props;
  return (
    <View className="mb-2" data-testid="planner-stats" testID="planner-stats">
      <Text className="text-sm">
        <Text className="text-sm text-text-secondary">Total Sets:</Text> {setResults.total}
      </Text>
      <Text className="text-sm">
        <Text className="text-sm text-text-secondary">Strength Sets: </Text>
        <Text
          className={`text-sm ${
            props.colorize ? colorPctValue(setResults.total, setResults.strength, settings.planner.strengthSetsPct) : ""
          }`}
        >
          {setResults.strength}
          {setResults.total > 0 ? `, ${Math.round((setResults.strength * 100) / setResults.total)}%` : ""}
        </Text>
      </Text>
      <Text className="mb-2 text-sm">
        <Text className="text-sm text-text-secondary">Hypertrophy Sets: </Text>
        <Text
          className={`text-sm ${
            props.colorize
              ? colorPctValue(setResults.total, setResults.hypertrophy, settings.planner.hypertrophySetsPct)
              : ""
          }`}
        >
          {setResults.hypertrophy}
          {setResults.total > 0 ? `, ${Math.round((setResults.hypertrophy * 100) / setResults.total)}%` : ""}
        </Text>
      </Text>
      <Text className="text-sm">
        <StatLabel label="Upper Sets" />{" "}
        <PlannerSetSplit
          split={setResults.upper}
          settings={settings}
          shouldIncludeFrequency={frequency}
          textSize="text-sm"
        />
      </Text>
      <Text className="text-sm">
        <StatLabel label="Lower Sets" />{" "}
        <PlannerSetSplit
          split={setResults.lower}
          settings={settings}
          shouldIncludeFrequency={frequency}
          textSize="text-sm"
        />
      </Text>
      <Text className="text-sm">
        <StatLabel label="Core Sets" />{" "}
        <PlannerSetSplit
          split={setResults.core}
          settings={settings}
          shouldIncludeFrequency={frequency}
          textSize="text-sm"
        />
      </Text>
      <Text className="text-sm">
        <StatLabel label="Push Sets" />{" "}
        <PlannerSetSplit
          split={setResults.push}
          settings={settings}
          shouldIncludeFrequency={frequency}
          textSize="text-sm"
        />
      </Text>
      <Text className="text-sm">
        <StatLabel label="Pull Sets" />{" "}
        <PlannerSetSplit
          split={setResults.pull}
          settings={settings}
          shouldIncludeFrequency={frequency}
          textSize="text-sm"
        />
      </Text>
      <Text className="mb-4 text-sm">
        <StatLabel label="Legs Sets" />{" "}
        <PlannerSetSplit
          split={setResults.legs}
          settings={settings}
          shouldIncludeFrequency={frequency}
          textSize="text-sm"
        />
      </Text>

      <View className="w-32 mb-2">
        <PlannerWeekMuscles settings={props.settings} data={setResults.muscleGroup} />
      </View>

      {onEditSettings && (
        <View className="py-2">
          {props.editSettingsLabel != null ? (
            <Pressable
              className="flex-row items-center gap-2 nm-planner-stats-edit-settings"
              testID="planner-stats-edit-settings"
              onPress={() => onEditSettings()}
            >
              <IconMuscleSettings color={Tailwind_semantic().text.link} />
              <Text className="text-sm font-semibold text-text-link">{props.editSettingsLabel}</Text>
            </Pressable>
          ) : (
            <LinkButton name="planner-stats-edit-settings" className="text-xs" onClick={() => onEditSettings()}>
              Edit Weekly Muscle Range Settings
            </LinkButton>
          )}
        </View>
      )}

      {ObjectUtils_keys(setResults.muscleGroup).map((muscleGroup) => {
        return (
          <Text key={muscleGroup} className="text-sm">
            <StatLabel label={Muscle_getMuscleGroupName(muscleGroup, props.settings)} />{" "}
            <PlannerSetSplit
              split={setResults.muscleGroup[muscleGroup]}
              settings={settings}
              shouldIncludeFrequency={frequency}
              muscle={props.colorize ? muscleGroup : undefined}
              textSize="text-sm"
            />
          </Text>
        );
      })}
    </View>
  );
}

function StatLabel(props: { label: string }): JSX.Element {
  return <Text className="text-sm text-text-secondary">{props.label}:</Text>;
}

export function PlannerSetSplit(props: {
  split: ISetSplit;
  settings: ISettings;
  shouldIncludeFrequency: boolean;
  muscle?: IScreenMuscle;
  textSize?: string;
}): JSX.Element {
  const { split, settings, shouldIncludeFrequency, muscle } = props;
  const isDesktopWeb = Platform.OS === "web";
  const [tooltipAnchor, setTooltipAnchor] = useState<DOMRect | undefined>(undefined);
  const total = split.strength + split.hypertrophy;
  const frequency = Object.keys(split.frequency).length;
  const setColor = muscle
    ? colorRangeValue(
        total,
        settings.planner.weeklyRangeSets[muscle]?.[0] ?? 0,
        settings.planner.weeklyRangeSets[muscle]?.[1] ?? 0
      )
    : "";
  const setDirection = muscle
    ? directionValue(
        total,
        settings.planner.weeklyRangeSets[muscle]?.[0] ?? 0,
        settings.planner.weeklyRangeSets[muscle]?.[1] ?? 0
      )
    : "";
  const frequencyColor = muscle ? colorThresholdValue(frequency, settings.planner.weeklyFrequency[muscle] ?? 0) : "";

  const handlePress =
    !isDesktopWeb && split.exercises.length > 0
      ? () =>
          getNavigationService().then(({ navigateToModal }) =>
            navigateToModal("setSplitModal", { exercises: split.exercises })
          )
      : undefined;

  const textSize = props.textSize ?? "";

  const totalNode = (
    <Text className={`${textSize} ${setColor}`.trim()}>
      {n(total, 0)}
      {setDirection}
    </Text>
  );

  const trailingNode = (
    <>
      {" "}
      {total > 0 && (
        <Text className={textSize}>
          ({split.strength > 0 && <Text className={textSize}>{n(split.strength, 0)}s</Text>}
          {split.strength > 0 && split.hypertrophy > 0 && ", "}
          {split.hypertrophy > 0 && <Text className={textSize}>{n(split.hypertrophy, 0)}h</Text>})
        </Text>
      )}
      {shouldIncludeFrequency && frequency > 0 && (
        <Text className={`${textSize} ${frequencyColor}`.trim()}>, {Object.keys(split.frequency).length}d</Text>
      )}
    </>
  );

  if (isDesktopWeb) {
    const hasExercises = split.exercises.length > 0;
    return (
      <Text className={textSize}>
        <span
          onMouseEnter={(e) => hasExercises && setTooltipAnchor(e.currentTarget.getBoundingClientRect())}
          onMouseLeave={() => setTooltipAnchor(undefined)}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltipAnchor((anchor) => (anchor == null && hasExercises ? rect : undefined));
          }}
        >
          {totalNode}
          {tooltipAnchor != null && hasExercises && <PlannerStatsTooltip split={split} anchor={tooltipAnchor} />}
        </span>
        {trailingNode}
      </Text>
    );
  }

  return (
    <Text onPress={handlePress} className={textSize}>
      {totalNode}
      {trailingNode}
    </Text>
  );
}

function PlannerStatsTooltip(props: { split: ISetSplit; anchor: DOMRect }): JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | undefined>(undefined);
  const { anchor } = props;
  useLayoutEffect(() => {
    const el = ref.current;
    if (el != null) {
      const size = { width: el.offsetWidth, height: el.offsetHeight };
      setPosition(
        TooltipPlacement_place(anchor, size, {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
        })
      );
    }
  }, [anchor]);
  const exercises = CollectionUtils_sort(props.split.exercises, (a, b) => {
    if ((a.isSynergist && b.isSynergist) || (!a.isSynergist && !b.isSynergist)) {
      return a.exerciseName.localeCompare(b.exerciseName);
    } else if (a.isSynergist) {
      return 1;
    } else {
      return -1;
    }
  });
  if (exercises.length === 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="fixed z-50 px-3 py-2 text-xs border bg-background-default border-border-neutral rounded-xl text-text-primary"
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position == null ? "hidden" : "visible",
      }}
    >
      <ul style={{ minWidth: "14rem" }}>
        {exercises.map((exercise) => {
          const totalSets = exercise.strengthSets + exercise.hypertrophySets;
          return (
            <li
              key={exercise.exerciseName}
              className={`font-bold ${exercise.isSynergist ? "text-text-secondary" : "text-text-primary"}`}
            >
              {exercise.exerciseName}: {n(totalSets)} ({n(exercise.strengthSets)}s, {n(exercise.hypertrophySets)}h)
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function colorPctValue(total: number, num: number, target: number): string {
  const strengthPct = total > 0 ? Math.round((num * 100) / total) : 0;
  if (strengthPct >= target) {
    return "text-text-success";
  } else if (strengthPct >= target - 10) {
    return "text-icon-yellow";
  } else {
    return "text-text-error";
  }
}

export function colorRangeValue(value: number, min: number, max: number): string {
  if (value >= min && value <= max) {
    return "text-text-success";
  } else if (value >= min * 0.7 && value <= max * 1.3) {
    return "text-icon-yellow";
  } else {
    return "text-text-error";
  }
}

export function directionValue(value: number, min: number, max: number): string {
  if (value < min) {
    return "↑";
  } else if (value > max) {
    return "↓";
  } else {
    return "";
  }
}

function colorThresholdValue(value: number, threshold: number): string {
  if (value >= threshold) {
    return "text-text-success";
  } else if (value >= threshold * 0.5) {
    return "text-icon-yellow";
  } else {
    return "text-text-error";
  }
}
