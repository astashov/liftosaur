import { h, JSX } from "preact";
import { IEvaluatedProgram, IEvaluatedProgramWeek } from "../../models/program";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { ObjectUtils } from "../../utils/object";
import { ExerciseImage } from "../exerciseImage";
import { ISettings } from "../../types";
import { HistoryRecordSet } from "../historyRecordSets";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";

interface IProps {
  evaluatedProgram: IEvaluatedProgram;
  settings: ISettings;
  weekIndex: number;
  week: IEvaluatedProgramWeek;
}

export function ExercisePickerAllProgramExercises(props: IProps): JSX.Element {
  const exercisesToDays = props.week.days.reduce<Record<string, IPlannerProgramExercise[]>>((acc, day) => {
    day.exercises.forEach((exercise) => {
      if (!acc[exercise.key]) {
        acc[exercise.key] = [];
      }
      acc[exercise.key].push(exercise);
    });
    return acc;
  }, {});
  return (
    <div>
      {ObjectUtils.keys(exercisesToDays).map((exerciseKey) => {
        const exercises = exercisesToDays[exerciseKey];
        const exerciseType = exercises[0].exerciseType;
        if (exerciseType == null) {
          return null;
        }
        return (
          <div key={exerciseKey} className="flex gap-2 px-2 pb-2 mb-4 border-b border-grayv3-100">
            <div className="pl-2">
              <ExerciseImage settings={props.settings} exerciseType={exerciseType} size="small" className="w-10" />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-base font-semibold">{exercises[0].name}</h3>
            </div>
            <ul>
              {exercises.map((exercise) => {
                const currentSetVariation = PlannerProgramExercise.currentEvaluatedSetVariation(exercise);
                const displayGroups = PlannerProgramExercise.evaluatedSetsToDisplaySets(
                  currentSetVariation.sets,
                  props.settings
                );
                return (
                  <li key={exercise.id} className="pb-1">
                    <label className="flex w-full text-right tap-2">
                      <div>
                        <div className="px-1 pb-1 text-xs text-grayv3-main">Day {exercise.dayData.dayInWeek}</div>
                        {displayGroups.map((g) => (
                          <HistoryRecordSet sets={g} isNext={true} settings={props.settings} />
                        ))}
                      </div>
                      <div>
                        <span className="px-2 pb-2 radio">
                          <input
                            type="radio"
                            name={`picker-program-exercise-${props.weekIndex}`}
                            value={JSON.stringify({
                              key: exercise.key,
                              week: exercise.dayData.week,
                              dayInWeek: exercise.dayData.dayInWeek,
                            })}
                          />
                        </span>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
