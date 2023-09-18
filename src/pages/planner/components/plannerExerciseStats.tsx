import { h, JSX, Fragment } from "preact";
import { ExerciseImage } from "../../../components/exerciseImage";
import { Exercise } from "../../../models/exercise";
import { Weight } from "../../../models/weight";
import { StringUtils } from "../../../utils/string";
import { PlannerProgramExercise } from "../models/plannerProgramExercise";
import { IPlannerProgram, IPlannerProgramExercise, IPlannerSettings } from "../models/types";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { PlannerGraph } from "../plannerGraph";

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

  const evaluatedExercise = evaluatedDay.data.find((e) => e.line === props.exerciseLine);
  if (!evaluatedExercise) {
    return <></>;
  }

  const customExercises = props.settings.customExercises;
  const exercise = Exercise.findByName(evaluatedExercise.name, customExercises);
  if (!exercise) {
    return <></>;
  }

  const targetMuscles = Exercise.targetMuscles(exercise, customExercises);
  const synergeticMuscles = Exercise.synergistMuscles(exercise, customExercises);
  const targetMuscleGroups = Exercise.targetMusclesGroups(exercise, customExercises).map((w) =>
    StringUtils.capitalize(w)
  );
  const synergeticMuscleGroups = Exercise.synergistMusclesGroups(exercise, customExercises)
    .map((w) => StringUtils.capitalize(w))
    .filter((w) => targetMuscleGroups.indexOf(w) === -1);

  const intensityGraphData = getIntensityPerWeeks(props.evaluatedWeeks, props.dayIndex, exercise.name);
  const volumeGraphData = getVolumePerWeeks(props.evaluatedWeeks, props.dayIndex, exercise.name);
  const intensityKey = JSON.stringify(intensityGraphData);
  const volumeKey = JSON.stringify(volumeGraphData);

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
        <span className="text-grayv2-main">Synergist Muscles: </span>
        <span className="font-bold">{synergeticMuscles.join(", ")}</span>
      </div>
      <div className="mt-1">
        <span className="text-grayv2-main">Target Muscles Groups: </span>
        <span className="font-bold">{targetMuscleGroups.join(", ")}</span>
      </div>
      <div>
        <span className="text-grayv2-main">Synergist Muscle Groups: </span>
        <span className="font-bold">{synergeticMuscleGroups.join(", ")}</span>
      </div>
      {intensityGraphData[0].length > 1 && (
        <div style={{ marginTop: "-14px" }}>
          <PlannerGraph
            key={intensityKey}
            title="Intensity w/w"
            color="red"
            yAxisLabel="Intensity"
            data={intensityGraphData}
          />
        </div>
      )}
      {volumeGraphData[0].length > 1 && (
        <div style={{ marginTop: "-14px" }}>
          <PlannerGraph key={volumeKey} title="Volume w/w" color="orange" yAxisLabel="Volume" data={volumeGraphData} />
        </div>
      )}
    </div>
  );
}

function getIntensityPerWeeks(
  evaluatedWeeks: IPlannerEvalResult[][],
  dayIndex: number,
  exerciseName: string
): [number[], number[]] {
  const data: [number[], number[]] = [[], []];
  for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex++) {
    const evaluatedWeek = evaluatedWeeks[weekIndex];
    let exercise: IPlannerProgramExercise | undefined;
    const evaluatedDay = evaluatedWeek[dayIndex] as IPlannerEvalResult | undefined;
    if (evaluatedDay?.success) {
      exercise = evaluatedDay.data.find((e) => e.name === exerciseName);
    }
    if (!exercise) {
      continue;
    }
    const weights = exercise.sets.map((s) => {
      const weight = s.percentage
        ? s.percentage * 100
        : Weight.rpeMultiplier(s.repRange?.maxrep ?? 1, s.rpe ?? 10) * 100;
      return Number(weight.toFixed(2));
    });
    data[0].push(weekIndex + 1);
    data[1].push(Math.max(...weights));
  }
  return data;
}

function getVolumePerWeeks(
  evaluatedWeeks: IPlannerEvalResult[][],
  dayIndex: number,
  exerciseName: string
): [number[], number[]] {
  const data: [number[], number[]] = [[], []];
  for (let weekIndex = 0; weekIndex < evaluatedWeeks.length; weekIndex++) {
    const evaluatedWeek = evaluatedWeeks[weekIndex];
    let exercise: IPlannerProgramExercise | undefined;
    const evaluatedDay = evaluatedWeek[dayIndex] as IPlannerEvalResult | undefined;
    if (evaluatedDay?.success) {
      exercise = evaluatedDay.data.find((e) => e.name === exerciseName);
    }
    if (!exercise) {
      continue;
    }
    const volume = Number(
      exercise.sets
        .reduce((acc, s) => {
          if (!s.repRange) {
            return acc;
          }
          const reps = s.repRange.maxrep;
          const weight = s.percentage ? s.percentage * 100 : Weight.rpeMultiplier(reps, s.rpe ?? 10) * 100;
          return acc + s.repRange.numberOfSets * weight * reps;
        }, 0)
        .toFixed(2)
    );
    data[0].push(weekIndex + 1);
    data[1].push(volume);
  }
  return data;
}
