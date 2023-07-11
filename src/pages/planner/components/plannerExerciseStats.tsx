import { h, JSX, Fragment } from "preact";
import { ExerciseImage } from "../../../components/exerciseImage";
import { Exercise } from "../../../models/exercise";
import { StringUtils } from "../../../utils/string";
import { PlannerProgramExercise } from "../models/plannerProgramExercise";
import { IPlannerProgram, IPlannerSettings } from "../models/types";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";

interface IPlannerExerciseStatsProps {
  program: IPlannerProgram;
  settings: IPlannerSettings;
  evaluatedWeeks: IPlannerEvalResult[][];
  weekIndex: number;
  dayIndex: number;
  exerciseLine: number;
}

export function PlannerExerciseStats(props: IPlannerExerciseStatsProps): JSX.Element {
  const evaluatedWeek = props.evaluatedWeeks[props.weekIndex];
  const evaluatedDay = evaluatedWeek[props.dayIndex];

  if (!evaluatedDay.success) {
    return <></>;
  }

  console.log(evaluatedDay.data, props.exerciseLine);
  const evaluatedExercise = evaluatedDay.data.find((e) => e.line === props.exerciseLine);
  if (!evaluatedExercise) {
    return <></>;
  }

  const exercise = Exercise.findByName(evaluatedExercise.name, {});
  if (!exercise) {
    return <></>;
  }

  const targetMuscles = Exercise.targetMuscles(exercise, {});
  const synergeticMuscles = Exercise.synergistMuscles(exercise, {});
  const targetMuscleGroups = Exercise.targetMusclesGroups(exercise, {}).map((w) => StringUtils.capitalize(w));
  const synergeticMuscleGroups = Exercise.synergistMusclesGroups(exercise, {})
    .map((w) => StringUtils.capitalize(w))
    .filter((w) => targetMuscleGroups.indexOf(w) === -1);

  return (
    <div className="p-4 mt-2 bg-yellow-100 border border-yellow-800 rounded-lg">
      <div className="flex mb-2">
        <div className="w-12 mr-4">
          <ExerciseImage exerciseType={exercise} size="small" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold">{evaluatedExercise.name}: </h3>
          <div>
            <span className="text-grayv2-main">Sets this day: </span>
            <span>{PlannerProgramExercise.numberOfSets(evaluatedExercise)}</span>
          </div>
          <div>
            <span className="text-grayv2-main">Sets this week: </span>
            <span>{PlannerProgramExercise.numberOfSetsThisWeek(evaluatedExercise.name, evaluatedWeek)}</span>
          </div>
        </div>
      </div>
      <div className="mt-1">
        <span className="text-grayv2-main">Target Muscles: </span>
        <span className="font-bold">{targetMuscles.join(", ")}</span>
      </div>
      <div>
        <span className="text-grayv2-main">Synergetic Muscles: </span>
        <span className="font-bold">{synergeticMuscles.join(", ")}</span>
      </div>
      <div className="mt-1">
        <span className="text-grayv2-main">Target Muscles Groups: </span>
        <span className="font-bold">{targetMuscleGroups.join(", ")}</span>
      </div>
      <div>
        <span className="text-grayv2-main">Synergetic Muscle Groups: </span>
        <span className="font-bold">{synergeticMuscleGroups.join(", ")}</span>
      </div>
    </div>
  );
}
