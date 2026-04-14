import { JSX, useState } from "react";
import { View } from "react-native";
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
import { CollectionUtils_findBy, CollectionUtils_compact } from "../utils/collection";
import { ObjectUtils_keys } from "../utils/object";
import { ExerciseImage } from "./exerciseImage";
import { IconArrowRight } from "./icons/iconArrowRight";
import { MenuItemWrapper } from "./menuItem";
import { MenuItemEditable } from "./menuItemEditable";
import { IMuscleStyle, BackMusclesSvg } from "./muscles/images/backMusclesSvg";
import { FrontMusclesSvg } from "./muscles/images/frontMusclesSvg";

interface INextDayPickerProps {
  initialCurrentProgramId?: string;
  allPrograms: IProgram[];
  stats: IStats;
  settings: ISettings;
  onSelect: (programId: string, day: number) => void;
}

export function NextDayPicker(props: INextDayPickerProps): JSX.Element {
  const programsValues = props.allPrograms.map<[string, string]>((p) => [p.id, p.name]);
  const [currentProgramId, setCurrentProgramId] = useState(props.initialCurrentProgramId);
  const currentProgram =
    (currentProgramId ? CollectionUtils_findBy(props.allPrograms, "id", currentProgramId) : undefined) ??
    props.allPrograms[0];
  if (!currentProgram) {
    return (
      <View className="mx-4">
        <Text>No Programs</Text>
      </View>
    );
  }
  const evaluatedProgram = Program_evaluate(currentProgram, props.settings);
  const days = Program_getListOfDays(evaluatedProgram);

  return (
    <View>
      <View className="mx-4">
        {props.allPrograms.length > 1 && (
          <MenuItemEditable
            type="select"
            name="Program"
            value={evaluatedProgram.id}
            values={programsValues}
            onChange={(value) => {
              if (value) {
                setCurrentProgramId(value);
              }
            }}
          />
        )}
        {days.map(([dayId, dayName], dayIndex) => {
          const day = Program_getProgramDay(evaluatedProgram, dayIndex + 1);
          if (!day) {
            return null;
          }
          const exerciseTypes = CollectionUtils_compact(
            Program_getProgramDayUsedExercises(day).map((exercise) => {
              return Exercise_find(exercise.exerciseType, props.settings.exercises);
            })
          );
          const points = Muscle_normalizeUnifiedPoints(
            Muscle_getUnifiedPointsForDay(evaluatedProgram, day, props.stats, props.settings)
          );
          const muscleData = ObjectUtils_keys(points.screenMusclePoints).reduce<
            Partial<Record<IScreenMuscle, IMuscleStyle>>
          >((memo, key) => {
            const value = points.screenMusclePoints[key];
            memo[key] = { opacity: value, fill: "#28839F" };
            return memo;
          }, {});
          return (
            <View className="px-2" key={dayId}>
              <MenuItemWrapper
                name={`next-day-picker-${dayIndex + 1}`}
                onClick={() => {
                  props.onSelect(evaluatedProgram.id, dayIndex + 1);
                }}
              >
                <View
                  className={`flex-row px-2 py-2 ${dayIndex + 1 === currentProgram.nextDay ? "bg-background-purpledark" : ""}`}
                >
                  <View className="flex-1">
                    <Text>{dayName}</Text>
                    <View className="flex-row flex-wrap">
                      {exerciseTypes.map((e) => (
                        <ExerciseImage
                          key={e.id}
                          settings={props.settings}
                          exerciseType={e}
                          size="small"
                          className="w-6 mr-1"
                        />
                      ))}
                    </View>
                  </View>
                  <View className="flex-row items-center" style={{ width: 48 }}>
                    <View className="relative flex-1">
                      <BackMusclesSvg muscles={muscleData} contour={{ fill: "#28839F" }} />
                    </View>
                    <View className="relative flex-1">
                      <FrontMusclesSvg muscles={muscleData} contour={{ fill: "#28839F" }} />
                    </View>
                  </View>
                  <View className="flex-row items-center py-2 pl-2">
                    <IconArrowRight color="#a0aec0" />
                  </View>
                </View>
              </MenuItemWrapper>
            </View>
          );
        })}
      </View>
    </View>
  );
}
