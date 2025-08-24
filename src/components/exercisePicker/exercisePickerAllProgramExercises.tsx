import { h, JSX } from "preact";
import { IEvaluatedProgram, IEvaluatedProgramWeek } from "../../models/program";
import { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { ObjectUtils } from "../../utils/object";
import { ExerciseImage } from "../exerciseImage";
import { IExercisePickerState, IExerciseType, ISettings } from "../../types";
import { HistoryRecordSet } from "../historyRecordSets";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { ILensDispatch } from "../../utils/useLensReducer";
import { Exercise } from "../../models/exercise";
import { ExercisePickerUtils } from "./exercisePickerUtils";
import { StringUtils } from "../../utils/string";

interface IProps {
  evaluatedProgram: IEvaluatedProgram;
  state: IExercisePickerState;
  usedExerciseTypes: IExerciseType[];
  dispatch: ILensDispatch<IExercisePickerState>;
  settings: ISettings;
  week: IEvaluatedProgramWeek;
}

export function ExercisePickerAllProgramExercises(props: IProps): JSX.Element {
  const isMultiselect = ExercisePickerUtils.getIsMultiselect(props.state);
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
        const isAllDisabled = exercises.every((exercise) => {
          const exerciseType = exercise.exerciseType;
          if (exerciseType == null) {
            return true;
          }
          const isSelected = props.state.selectedExercises.some((ex) => {
            return (
              ex.type === "program" &&
              exerciseType &&
              Exercise.eq(ex.exerciseType, exerciseType) &&
              ex.week === exercise.dayData.week &&
              ex.dayInWeek === exercise.dayData.dayInWeek
            );
          });
          const isDisabled = props.state.selectedExercises.some(
            (ex) => "exerciseType" in ex && Exercise.eq(ex.exerciseType, exerciseType)
          );
          const isUsedForDay = props.usedExerciseTypes.some((et) => Exercise.eq(et, exerciseType));
          return isMultiselect ? isUsedForDay || (isDisabled && !isSelected) : isUsedForDay;
        });
        return (
          <div
            key={exerciseKey}
            className={`flex gap-2 px-2 pb-2 mb-4 border-b border-background-subtle ${isAllDisabled ? "opacity-40" : ""}`}
          >
            <div className="pl-1">
              <div className="p-1 rounded-lg bg-background-image">
                <ExerciseImage settings={props.settings} exerciseType={exerciseType} size="small" className="w-10" />
              </div>
            </div>
            <div className="flex-1 pt-1">
              <h3 className="text-base font-semibold">{exercises[0].name}</h3>
            </div>
            <ul>
              {exercises.map((exercise) => {
                const exerciseType = exercise.exerciseType;
                if (exerciseType == null) {
                  return null;
                }
                const isSelected = props.state.selectedExercises.some((ex) => {
                  return (
                    ex.type === "program" &&
                    exerciseType &&
                    Exercise.eq(ex.exerciseType, exerciseType) &&
                    ex.week === exercise.dayData.week &&
                    ex.dayInWeek === exercise.dayData.dayInWeek
                  );
                });
                const isDisabled = props.state.selectedExercises.some(
                  (ex) => "exerciseType" in ex && Exercise.eq(ex.exerciseType, exerciseType)
                );
                const isUsedForDay = props.usedExerciseTypes.some((et) => Exercise.eq(et, exerciseType));
                const currentSetVariation = PlannerProgramExercise.currentEvaluatedSetVariation(exercise);
                const displayGroups = PlannerProgramExercise.evaluatedSetsToDisplaySets(
                  currentSetVariation.sets,
                  props.settings
                );
                const isItemDisabled = isMultiselect ? isUsedForDay || (isDisabled && !isSelected) : isUsedForDay;
                return (
                  <li key={exercise.id} className={`pb-1 ${isItemDisabled && !isAllDisabled ? "opacity-40" : ""}`}>
                    <label className="flex w-full text-right tap-2">
                      <div>
                        <div className="px-1 pb-1 text-xs text-text-secondary">Day {exercise.dayData.dayInWeek}</div>
                        {displayGroups.map((g) => (
                          <HistoryRecordSet sets={g} isNext={true} settings={props.settings} />
                        ))}
                      </div>
                      <div>
                        <span className="px-2 pb-2 radio">
                          {!isMultiselect ? (
                            <span className="px-2 pb-2 radio">
                              <input
                                type="radio"
                                disabled={isUsedForDay}
                                name={`picker-program-exercise-${exercise.dayData.week}`}
                                data-cy={`exercise-picker-program-${StringUtils.dashcase(exercise.name)}-${exercise.dayData.week}-${exercise.dayData.dayInWeek}`}
                                value={JSON.stringify({
                                  key: exercise.key,
                                  week: exercise.dayData.week,
                                  dayInWeek: exercise.dayData.dayInWeek,
                                })}
                                checked={isSelected}
                                onChange={() => {
                                  ExercisePickerUtils.chooseProgramExercise(
                                    props.dispatch,
                                    exerciseType,
                                    exercise.dayData.week,
                                    exercise.dayData.dayInWeek,
                                    props.state
                                  );
                                }}
                              />
                            </span>
                          ) : (
                            <label className="block p-2">
                              <input
                                checked={isSelected}
                                disabled={isUsedForDay || (isDisabled && !isSelected)}
                                className="checkbox checkbox-purple text-text-purple"
                                data-cy={`exercise-picker-program-${StringUtils.dashcase(exercise.name)}-${exercise.dayData.week}-${exercise.dayData.dayInWeek}`}
                                type="checkbox"
                                onChange={() => {
                                  ExercisePickerUtils.chooseProgramExercise(
                                    props.dispatch,
                                    exerciseType,
                                    exercise.dayData.week,
                                    exercise.dayData.dayInWeek,
                                    props.state
                                  );
                                }}
                              />
                            </label>
                          )}
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
