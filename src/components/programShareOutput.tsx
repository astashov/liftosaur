import { JSX, ReactNode, Ref, forwardRef, useState } from "react";
import { View, LayoutChangeEvent } from "react-native";
import { SvgUri } from "./primitives/svg";
import { ISettings, IPlannerProgram, IPlannerProgramWeek, IPlannerProgramDay } from "../types";
import { PlannerProgram_evaluate } from "../pages/planner/models/plannerProgram";
import { StringUtils_pluralize } from "../utils/string";
import { ExerciseImage } from "./exerciseImage";
import { equipmentName, Exercise_findByNameAndEquipment, Exercise_toKey } from "../models/exercise";
import { IPlannerEvalResult, PlannerExerciseEvaluator } from "../pages/planner/plannerExerciseEvaluator";
import {
  PlannerProgramExercise_sets,
  PlannerProgramExercise_progressionType,
} from "../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise, IPlannerProgramExerciseSet } from "../pages/planner/models/types";
import { Markdown } from "./markdown";
import { Weight_print } from "../models/weight";
import { CollectionUtils_compact, CollectionUtils_inGroupsOf } from "../utils/collection";
import { ProgramQrCode } from "./programQrCode";
import { Equipment_currentEquipment } from "../models/equipment";
import { Text } from "./primitives/text";
import { HostConfig_resolveUrl } from "../utils/hostConfig";

export interface IProgramShareOutputOptions {
  showInfo: boolean;
  showWeekDescription: boolean;
  showDayDescription: boolean;
  showQRCode: boolean;
  columns: number;
  daysToShow: number[];
}

interface IProgramShareOutputProps {
  settings: ISettings;
  program: IPlannerProgram;
  options: IProgramShareOutputOptions;
  url?: string;
}

function Card(props: { children: ReactNode }): JSX.Element {
  return (
    <View
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      }}
      className="py-2 bg-background-default rounded-xl"
    >
      {props.children}
    </View>
  );
}

export const ProgramShareOutput = forwardRef((props: IProgramShareOutputProps, ref: Ref<View>): JSX.Element => {
  const options = props.options;
  const { evaluatedWeeks } = PlannerProgram_evaluate(props.program, props.settings);
  const minDays = Math.min(...evaluatedWeeks.map((week) => week.length));
  const maxDays = Math.max(...evaluatedWeeks.map((week) => week.length));
  const [contentWidth, setContentWidth] = useState<number | undefined>(undefined);
  let dayIndex = 0;

  const onContentLayout = (e: LayoutChangeEvent): void => {
    setContentWidth(e.nativeEvent.layout.width);
  };

  return (
    <View ref={ref} collapsable={false} style={{ alignSelf: "flex-start" }}>
      <View
        className="flex-row gap-2 px-2 pt-2 bg-background-subtle"
        style={contentWidth ? { width: contentWidth } : undefined}
      >
        <View className="flex-1">
          {options.showInfo && (
            <View className="flex-row items-center gap-2 px-1 pt-2">
              <Text className="text-4xl">🏋️</Text>
              <View className="flex-1">
                <Text className="mb-1 text-xl font-bold">{props.program.name}</Text>
                <Text className="text-base text-text-secondary">
                  {props.program.weeks.length > 1 && (
                    <Text className="text-base text-text-secondary">{props.program.weeks.length} weeks, </Text>
                  )}
                  {minDays === maxDays ? (
                    <Text className="text-base text-text-secondary">
                      {minDays} {StringUtils_pluralize("day", minDays)}
                    </Text>
                  ) : (
                    <Text className="text-base text-text-secondary">
                      {minDays}-{maxDays} days
                    </Text>
                  )}
                </Text>
              </View>
            </View>
          )}
        </View>
        {props.url && options.showQRCode && <ProgramQrCode url={props.url} size={80} />}
      </View>
      <View className="p-2 bg-background-subtle" style={{ alignSelf: "flex-start" }} onLayout={onContentLayout}>
        {props.program.weeks.map((week, weekIndex) => {
          const visibleDays = CollectionUtils_compact(
            week.days.map((day) => {
              const shouldInclude = options.daysToShow.includes(dayIndex);
              let result = undefined;
              if (shouldInclude) {
                result = { day, dayIndex };
              }
              dayIndex += 1;
              return result;
            })
          );
          const groupedDays = CollectionUtils_inGroupsOf(options.columns, visibleDays);
          return (
            <View key={weekIndex} style={{ alignSelf: "flex-start" }}>
              {options.showWeekDescription && week.description && visibleDays.length > 0 && (
                <View className="mt-2">
                  <Card>
                    <View className="px-4 pt-1">
                      <Markdown value={week.description} />
                    </View>
                  </Card>
                </View>
              )}
              {groupedDays.map((days, gi) => {
                return (
                  <View key={gi} className="flex-row gap-2">
                    {days.map((day) => {
                      const evaluatedDay = findDayInEvaluatedWeeks(evaluatedWeeks, day.dayIndex);
                      if (evaluatedDay == null) {
                        return null;
                      }
                      return (
                        <View key={day.dayIndex} className="mt-2" style={{ width: 384 }}>
                          <Workout
                            isMultiweek={props.program.weeks.length > 1}
                            week={week}
                            day={day.day}
                            exercises={evaluatedDay.filter((e) => !e.notused)}
                            settings={props.settings}
                            options={props.options}
                          />
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          );
        })}
        <View className="flex-row items-center justify-end mt-1">
          <SvgUri uri={HostConfig_resolveUrl("/images/logo.svg")} width={24} height={24} style={{ marginRight: 4 }} />
          <Text className="text-sm font-bold">Liftosaur</Text>
        </View>
      </View>
    </View>
  );
});

function findDayInEvaluatedWeeks(
  evaluatedWeeks: IPlannerEvalResult[][],
  dayIndex: number
): IPlannerProgramExercise[] | undefined {
  let currentDayIndex = 0;
  for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex++) {
    const week = evaluatedWeeks[weekIndex];
    for (let dayInWeekIndex = 0; dayInWeekIndex < week.length; dayInWeekIndex++) {
      const day = week[dayInWeekIndex];
      if (currentDayIndex === dayIndex) {
        return day.success ? day.data : undefined;
      }
      currentDayIndex += 1;
    }
  }
  return undefined;
}

interface IWorkoutProps {
  options: IProgramShareOutputOptions;
  week: IPlannerProgramWeek;
  day: IPlannerProgramDay;
  exercises: IPlannerProgramExercise[];
  settings: ISettings;
  isMultiweek: boolean;
}

function Workout(props: IWorkoutProps): JSX.Element {
  const { week, day, exercises } = props;
  const setsNumber = exercises
    .map((e) => PlannerProgramExercise_sets(e).reduce((m, a) => m + (a.repRange?.numberOfSets || 0), 0))
    .reduce((a, b) => a + b, 0);
  return (
    <Card>
      <View className="px-2">
        <Text className="px-2 py-1 text-lg font-bold">
          {props.isMultiweek ? `${week.name} ` : ""}
          {day.name}
        </Text>
      </View>
      <Text className="px-4 text-base text-text-secondary">
        {exercises.length} {StringUtils_pluralize("exercise", exercises.length)}
        {" · "}
        {setsNumber} {StringUtils_pluralize("set", setsNumber)}
      </Text>
      {day.description && (
        <View className="px-2 py-1 mx-4 my-2 rounded-md bg-background-subtle">
          <Markdown value={day.description} />
        </View>
      )}
      {exercises.map((plannerProgramExercise, i) => {
        const { name, equipment } = PlannerExerciseEvaluator.extractNameParts(
          plannerProgramExercise.fullName,
          props.settings.exercises
        );
        const allEquipment = Equipment_currentEquipment(props.settings);
        const nameAndEquipment = `${name}${equipment ? `, ${equipmentName(equipment, allEquipment)}` : ""}`;
        const exercise = Exercise_findByNameAndEquipment(nameAndEquipment, props.settings.exercises);
        if (!exercise) {
          return null;
        }
        const descriptions = plannerProgramExercise.descriptions.values.filter((d) => d.isCurrent);
        if (descriptions.length === 0) {
          const firstDescription = plannerProgramExercise.descriptions.values[0];
          if (firstDescription != null) {
            descriptions.push(firstDescription);
          }
        }

        return (
          <View key={i} className={`mx-4 pb-4 ${i > 0 ? "pt-2 border-t border-border-neutral" : ""}`}>
            <View className="flex-row items-stretch pl-1" style={{ paddingRight: 1 }} key={Exercise_toKey(exercise)}>
              <View className="flex-row items-center w-12 pr-2">
                <ExerciseImage suppressCustom={true} exerciseType={exercise} size="small" settings={props.settings} />
              </View>
              <View className="flex-col justify-center flex-1">
                <View className="flex-row items-center w-full gap-2">
                  <Text className="flex-1 text-base font-bold">{plannerProgramExercise.fullName}</Text>
                  <View className="flex-col pr-2">
                    {PlannerProgramExercise_sets(plannerProgramExercise).map((set, si) => {
                      return <Set key={si} set={set} />;
                    })}
                  </View>
                </View>
              </View>
            </View>
            <View>
              <Progression exercise={plannerProgramExercise} />
            </View>
            {descriptions.length > 0 && (
              <View className="px-2 py-1 mt-2 rounded-md bg-background-subtle">
                {descriptions.map((d) => (
                  <Markdown key={d.value} value={d.value} />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </Card>
  );
}

interface ISetProps {
  set: IPlannerProgramExerciseSet;
}

function Set(props: ISetProps): JSX.Element | null {
  const set = props.set;
  const repRange = set.repRange;
  if (!repRange) {
    return null;
  }
  return (
    <Text className="text-base leading-4 text-right text-text-secondary">
      {repRange.numberOfSets > 1 && (
        <Text className="text-base text-text-secondary">
          <Text className="text-base font-semibold text-text-purple">{repRange.numberOfSets}</Text>
          <Text className="text-xs text-text-secondary"> × </Text>
        </Text>
      )}
      {repRange.minrep == null ? (
        <Text className="text-base font-semibold text-text-primary">{repRange.maxrep}</Text>
      ) : (
        <Text className="text-base text-text-secondary">
          <Text className="text-base font-semibold text-text-primary">{repRange.minrep}</Text>
          <Text className="text-base text-text-secondary">-</Text>
          <Text className="text-base font-semibold text-text-primary">{repRange.maxrep}</Text>
        </Text>
      )}
      {repRange.isAmrap && <Text className="text-base font-semibold text-text-primary">+</Text>}
      {set.weight ? (
        <Text className="text-base text-text-secondary">
          <Text className="text-xs text-text-secondary"> × </Text>
          <Text className="text-base text-text-primary">{set.weight.value}</Text>
          {set.askWeight && <Text className="text-base font-semibold text-text-primary">+</Text>}
          <Text className="text-xs text-text-secondary">{set.weight.unit}</Text>
        </Text>
      ) : set.percentage ? (
        <Text className="text-base text-text-secondary">
          <Text className="text-xs text-text-secondary"> × </Text>
          <Text className="text-base text-text-primary">{set.percentage}</Text>
          {set.askWeight && <Text className="text-base font-semibold text-text-primary">+</Text>}
          <Text className="text-xs text-text-secondary">%</Text>
        </Text>
      ) : null}
      {set.rpe != null && (
        <Text className="ml-1 text-base text-greenv2-900">
          <Text className="text-xs text-greenv2-900">@</Text>
          <Text className="text-sm text-greenv2-900">{set.rpe}</Text>
        </Text>
      )}
      {set.logRpe && <Text className="text-base text-greenv2-900">+</Text>}
      {set.timer != null && (
        <Text className="ml-1 text-xs text-purplev2-900">
          {set.timer}
          <Text className="text-xs text-purplev2-900">s</Text>
        </Text>
      )}
    </Text>
  );
}

interface IProgressionProps {
  exercise: IPlannerProgramExercise;
}

export function Progression(props: IProgressionProps): JSX.Element | null {
  const type = PlannerProgramExercise_progressionType(props.exercise);
  if (type == null) {
    return null;
  }
  switch (type.type) {
    case "linear":
      return (
        <Text className="text-sm">
          <Text className="text-sm font-bold">Linear Progression:</Text>
          <Text className="text-sm"> </Text>
          <Text className="text-sm font-bold text-text-success">+{Weight_print(type.increase)}</Text>
          {(type.successesRequired || 0 > 1) && (
            <Text className="text-sm">
              <Text className="text-sm"> after </Text>
              <Text className="text-sm font-bold text-text-success">{type.successesRequired}</Text>
              <Text className="text-sm"> successes</Text>
            </Text>
          )}
          {type.decrease != null && type.decrease.value > 0 && (
            <Text className="text-sm">
              <Text className="text-sm">, </Text>
              <Text className="text-sm font-bold text-text-error">{Weight_print(type.decrease)}</Text>
            </Text>
          )}
          {type.decrease != null && type.decrease.value > 0 && (
            <Text className="text-sm">
              <Text className="text-sm"> after </Text>
              <Text className="text-sm font-bold text-text-error">{type.failuresRequired}</Text>
              <Text className="text-sm"> failures</Text>
            </Text>
          )}
          <Text className="text-sm">.</Text>
        </Text>
      );
    case "double":
      return (
        <Text className="text-sm">
          <Text className="text-sm font-bold">Double Progression</Text>
          <Text className="text-sm">: </Text>
          <Text className="text-sm font-bold text-text-success">+{Weight_print(type.increase)}</Text>
          <Text className="text-sm"> within </Text>
          <Text className="text-sm font-bold">{type.minReps}</Text>
          <Text className="text-sm">-</Text>
          <Text className="text-sm font-bold">{type.maxReps}</Text>
          <Text className="text-sm"> rep range.</Text>
        </Text>
      );
    case "sumreps":
      return (
        <Text className="text-sm">
          <Text className="text-sm font-bold">Sum Reps Progression</Text>
          <Text className="text-sm">: </Text>
          <Text className="text-sm font-bold text-text-success">+{Weight_print(type.increase)}</Text>
          <Text className="text-sm"> if sum of all reps is at least </Text>
          <Text className="text-sm font-bold">{type.reps}</Text>
          <Text className="text-sm">.</Text>
        </Text>
      );
    case "custom":
      return (
        <Text className="text-sm">
          <Text className="text-sm font-bold">Custom Progression</Text>
        </Text>
      );
  }
}
