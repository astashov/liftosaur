import { JSX, h } from "preact";
import { Exercise } from "../models/exercise";
import { Muscle } from "../models/muscle";
import { Program } from "../models/program";
import { IProgram, ISettings, IScreenMuscle } from "../types";
import { CollectionUtils } from "../utils/collection";
import { ObjectUtils } from "../utils/object";
import { ExerciseImage } from "./exerciseImage";
import { IconArrowRight } from "./icons/iconArrowRight";
import { MenuItemWrapper } from "./menuItem";
import { MenuItemEditable } from "./menuItemEditable";
import { IMuscleStyle, BackMusclesSvg } from "./muscles/images/backMusclesSvg";
import { FrontMusclesSvg } from "./muscles/images/frontMusclesSvg";
import { useState } from "preact/hooks";

interface INextDayPickerProps {
  initialCurrentProgramId?: string;
  allPrograms: IProgram[];
  settings: ISettings;
  onSelect: (programId: string, day: number) => void;
}

export function NextDayPicker(props: INextDayPickerProps): JSX.Element {
  const programsValues = props.allPrograms.map<[string, string]>((p) => [p.id, p.name]);
  const [currentProgramId, setCurrentProgramId] = useState(props.initialCurrentProgramId);
  const currentProgram =
    (currentProgramId ? CollectionUtils.findBy(props.allPrograms, "id", currentProgramId) : undefined) ??
    props.allPrograms[0];
  if (!currentProgram) {
    return <div>No Programs</div>;
  }
  const evaluatedProgram = Program.evaluate(currentProgram, props.settings);
  const days = Program.getListOfDays(evaluatedProgram);

  return (
    <div>
      <div className="mx-4">
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
        {days.map(([dayId, dayName], dayIndex) => {
          const day = Program.getProgramDay(evaluatedProgram, dayIndex + 1);
          if (!day) {
            return null;
          }
          const exerciseTypes = CollectionUtils.compact(
            Program.getProgramDayExercises(day).map((exercise) => {
              return Exercise.find(exercise.exerciseType, props.settings.exercises);
            })
          );
          const points = Muscle.normalizeUnifiedPoints(
            Muscle.getUnifiedPointsForDay(evaluatedProgram, day, props.settings)
          );
          const muscleData = ObjectUtils.keys(points.screenMusclePoints).reduce<
            Partial<Record<IScreenMuscle, IMuscleStyle>>
          >((memo, key) => {
            const value = points.screenMusclePoints[key];
            memo[key] = { opacity: value, fill: "#28839F" };
            return memo;
          }, {});
          return (
            <div className="px-2">
              <MenuItemWrapper
                name={`next-day-picker-${dayIndex + 1}`}
                key={dayId}
                onClick={() => {
                  props.onSelect(evaluatedProgram.id, dayIndex + 1);
                }}
              >
                <div className={`flex px-2 py-2 ${dayIndex + 1 === currentProgram.nextDay ? "bg-purplev3-100" : ""}`}>
                  <div className="flex-1">
                    <div>{dayName}</div>
                    <div>
                      {exerciseTypes.map((e) => (
                        <ExerciseImage settings={props.settings} exerciseType={e} size="small" className="w-6 mr-1" />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center w-12">
                    <div className="relative flex-1">
                      <BackMusclesSvg muscles={muscleData} contour={{ fill: "#28839F" }} />
                    </div>
                    <div className="relative flex-1">
                      <FrontMusclesSvg muscles={muscleData} contour={{ fill: "#28839F" }} />
                    </div>
                  </div>
                  <div className="flex items-center py-2 pl-2">
                    <IconArrowRight style={{ color: "#a0aec0" }} />
                  </div>
                </div>
              </MenuItemWrapper>
            </div>
          );
        })}
      </div>
    </div>
  );
}
