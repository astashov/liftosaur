import { h, JSX, Fragment } from "preact";
import { ExerciseImage } from "../../../components/exerciseImage";
import { Exercise, IExercise } from "../../../models/exercise";
import { Weight } from "../../../models/weight";
import { ISettings } from "../../../types";
import { StringUtils } from "../../../utils/string";
import { PlannerProgramExercise } from "../models/plannerProgramExercise";
import { IPlannerProgramExercise, IPlannerState } from "../models/types";
import { IPlannerEvalResult } from "../plannerExerciseEvaluator";
import { PlannerGraph } from "../plannerGraph";
import { LinkButton } from "../../../components/linkButton";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { PlannerKey } from "../plannerKey";
import { IconExternalLink } from "../../../components/icons/iconExternalLink";

interface IPlannerExerciseStatsProps {
  settings: ISettings;
  evaluatedWeeks: IPlannerEvalResult[][];
  weekIndex: number;
  dispatch: ILensDispatch<IPlannerState>;
  dayIndex: number;
  exerciseLine: number;
}

export function getExerciseForStats(
  weekIndex: number,
  dayIndex: number,
  exerciseLine: number,
  evaluatedWeeks: IPlannerEvalResult[][],
  settings: ISettings
): { exercise: IExercise; evaluatedExercise: IPlannerProgramExercise } | undefined {
  const evaluatedWeek = evaluatedWeeks[weekIndex];
  const evaluatedDay = evaluatedWeek[dayIndex];

  if (!evaluatedDay.success) {
    return undefined;
  }

  const evaluatedExercise = evaluatedDay.data.find((e) => e.line === exerciseLine);
  if (!evaluatedExercise) {
    return undefined;
  }

  const customExercises = settings.exercises;
  let exercise = Exercise.findByName(evaluatedExercise.name, customExercises);
  if (!exercise) {
    return undefined;
  }
  exercise = Exercise.find({ id: exercise.id, equipment: evaluatedExercise.equipment }, customExercises);
  if (!exercise) {
    return undefined;
  }
  return { exercise, evaluatedExercise };
}

export function PlannerExerciseStats(props: IPlannerExerciseStatsProps): JSX.Element {
  const result = getExerciseForStats(
    props.weekIndex,
    props.dayIndex,
    props.exerciseLine,
    props.evaluatedWeeks,
    props.settings
  );
  if (!result) {
    return <></>;
  }
  const evaluatedWeek = props.evaluatedWeeks[props.weekIndex];
  const { exercise, evaluatedExercise } = result;
  const customExercises = props.settings.exercises;

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
    <div>
      <div className="flex mb-2">
        <div className="w-12 mr-4">
          <ExerciseImage exerciseType={exercise} size="small" />
        </div>
        <div className="flex-1">
          <h3 className="mb-2 text-lg font-bold">
            <a href={Exercise.toExternalUrl(exercise)} target="_blank">
              <span className="font-bold underline text-bluev2">{evaluatedExercise.name}</span>{" "}
              <IconExternalLink className="inline-block mb-1 ml-1" size={16} color="#607284" />
            </a>
          </h3>
          <div>
            <LinkButton
              name="planner-swap-exercise"
              data-cy="planner-swap-exercise"
              onClick={() => {
                const exerciseKey = PlannerKey.fromPlannerExercise(evaluatedExercise, props.settings);
                props.dispatch([
                  lb<IPlannerState>()
                    .pi("ui")
                    .p("modalExercise")
                    .record({
                      focusedExercise: {
                        weekIndex: 0,
                        dayIndex: 0,
                        exerciseLine: 0,
                      },
                      types: [],
                      muscleGroups: [],
                      exerciseType: exercise,
                      exerciseKey,
                    }),
                  lb<IPlannerState>().pi("ui").p("showExerciseStats").record(false),
                ]);
              }}
            >
              Swap Exercise
            </LinkButton>
          </div>
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
    const weights = PlannerProgramExercise.sets(exercise).map((s) => {
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
      PlannerProgramExercise.sets(exercise)
        .reduce((acc, s) => {
          if (!s.repRange) {
            return acc;
          }
          const reps = s.repRange.maxrep ?? 0;
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
