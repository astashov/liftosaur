import { JSX, memo, useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useProgressiveItems } from "../utils/useProgressiveItems";
import { Text } from "./primitives/text";
import { Exercise_find } from "../models/exercise";
import { Muscle_normalizeUnifiedPoints, Muscle_getUnifiedPointsForDay } from "../models/muscle";
import {
  Program_evaluate,
  Program_getListOfDays,
  Program_getProgramDay,
  Program_getProgramDayUsedExercises,
} from "../models/program";
import { IProgram, ISettings, IScreenMuscle, IStats } from "../types";
import type { IEvaluatedProgram } from "../models/program";
import { CollectionUtils_findBy, CollectionUtils_compact } from "../utils/collection";
import { ObjectUtils_keys } from "../utils/object";
import { ExerciseImage } from "./exerciseImage";
import { IconArrowRight } from "./icons/iconArrowRight";
import { MenuItemWrapper } from "./menuItem";
import { MenuItemEditable } from "./menuItemEditable";
import { IMuscleStyle, BackMusclesSvg } from "./muscles/images/backMusclesSvg";
import { FrontMusclesSvg } from "./muscles/images/frontMusclesSvg";

const MUSCLE_CONTOUR = { fill: "#28839F" };
const MUSCLE_COLUMN_STYLE = { width: 48 };

interface INextDayPickerDayProps {
  evaluatedProgram: IEvaluatedProgram;
  dayId: string;
  dayName: string;
  dayIndex: number;
  highlightedDay?: number;
  stats: IStats;
  settings: ISettings;
  onSelect: (programId: string, day: number) => void;
}

function NextDayPickerDayImpl(props: INextDayPickerDayProps): JSX.Element | null {
  const { evaluatedProgram, dayIndex, settings, stats, onSelect } = props;
  const day = useMemo(() => Program_getProgramDay(evaluatedProgram, dayIndex + 1), [evaluatedProgram, dayIndex]);
  const exerciseTypes = useMemo(() => {
    if (!day) {
      return [];
    }
    return CollectionUtils_compact(
      Program_getProgramDayUsedExercises(day).map((exercise) =>
        Exercise_find(exercise.exerciseType, settings.exercises)
      )
    );
  }, [day, settings.exercises]);
  const muscleData = useMemo(() => {
    if (!day) {
      return {};
    }
    const points = Muscle_normalizeUnifiedPoints(Muscle_getUnifiedPointsForDay(evaluatedProgram, day, stats, settings));
    return ObjectUtils_keys(points.screenMusclePoints).reduce<Partial<Record<IScreenMuscle, IMuscleStyle>>>(
      (acc, key) => {
        const value = points.screenMusclePoints[key];
        acc[key] = { opacity: value, fill: "#28839F" };
        return acc;
      },
      {}
    );
  }, [day, evaluatedProgram, stats, settings]);
  const handlePress = useCallback(() => {
    onSelect(evaluatedProgram.id, dayIndex + 1);
  }, [onSelect, evaluatedProgram.id, dayIndex]);
  if (!day) {
    return null;
  }
  return (
    <View className="px-2">
      <MenuItemWrapper name={`next-day-picker-${dayIndex + 1}`} onClick={handlePress}>
        <View
          className={`flex-row px-2 py-2 ${dayIndex + 1 === props.highlightedDay ? "bg-background-purpledark" : ""}`}
        >
          <View className="flex-1">
            <Text>{props.dayName}</Text>
            <View className="flex-row flex-wrap">
              {exerciseTypes.map((e) => (
                <ExerciseImage key={e.id} settings={settings} exerciseType={e} size="small" className="w-6 mr-1" />
              ))}
            </View>
          </View>
          <View className="flex-row items-center" style={MUSCLE_COLUMN_STYLE}>
            <View className="relative flex-1">
              <BackMusclesSvg muscles={muscleData} contour={MUSCLE_CONTOUR} />
            </View>
            <View className="relative flex-1">
              <FrontMusclesSvg muscles={muscleData} contour={MUSCLE_CONTOUR} />
            </View>
          </View>
          <View className="flex-row items-center py-2 pl-2">
            <IconArrowRight color="#a0aec0" />
          </View>
        </View>
      </MenuItemWrapper>
    </View>
  );
}

export const NextDayPickerDay = memo(NextDayPickerDayImpl);

interface INextDayPickerProps {
  initialCurrentProgramId?: string;
  allPrograms: IProgram[];
  stats: IStats;
  settings: ISettings;
  onSelect: (programId: string, day: number) => void;
}

export function NextDayPicker(props: INextDayPickerProps): JSX.Element {
  const { allPrograms, settings } = props;
  const [currentProgramId, setCurrentProgramId] = useState(props.initialCurrentProgramId);
  const programsValues = useMemo<[string, string][]>(() => allPrograms.map((p) => [p.id, p.name]), [allPrograms]);
  const currentProgram = useMemo(
    () =>
      (currentProgramId ? CollectionUtils_findBy(allPrograms, "id", currentProgramId) : undefined) ?? allPrograms[0],
    [currentProgramId, allPrograms]
  );
  const evaluatedProgram = useMemo(
    () => (currentProgram ? Program_evaluate(currentProgram, settings) : undefined),
    [currentProgram, settings]
  );
  const days = useMemo<[string, string][]>(
    () => (evaluatedProgram ? Program_getListOfDays(evaluatedProgram) : []),
    [evaluatedProgram]
  );
  const visibleDays = useProgressiveItems(days, { initialBatch: 12, batchSize: 8 });
  const handleProgramChange = useCallback((value?: string) => {
    if (value) {
      setCurrentProgramId(value);
    }
  }, []);

  if (!currentProgram || !evaluatedProgram) {
    return (
      <View className="mx-4">
        <Text>No Programs</Text>
      </View>
    );
  }

  return (
    <View>
      <View className="mx-0">
        {allPrograms.length > 1 && (
          <MenuItemEditable
            type="select"
            name="Program"
            value={evaluatedProgram.id}
            values={programsValues}
            onChange={handleProgramChange}
          />
        )}
        {visibleDays.map(([dayId, dayName], dayIndex) => (
          <NextDayPickerDay
            key={dayId}
            evaluatedProgram={evaluatedProgram}
            dayId={dayId}
            dayName={dayName}
            dayIndex={dayIndex}
            highlightedDay={currentProgram.nextDay}
            stats={props.stats}
            settings={props.settings}
            onSelect={props.onSelect}
          />
        ))}
      </View>
    </View>
  );
}
