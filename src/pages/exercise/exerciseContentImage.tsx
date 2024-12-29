import React, { JSX } from "react";
import { ExerciseImage } from "../../components/exerciseImage";
import { Exercise, equipmentName } from "../../models/exercise";
import { Settings } from "../../models/settings";
import { IExerciseType } from "../../types";
import { StringUtils } from "../../utils/string";

interface IExerciseContentImageProps {
  exerciseType: IExerciseType;
}

export function ExerciseContentImage(props: IExerciseContentImageProps): JSX.Element {
  const settings = Settings.build();
  const exerciseType = props.exerciseType;
  const exercise = Exercise.get(exerciseType, {});
  const targetMuscleGroups = Exercise.targetMusclesGroups(exercise, settings.exercises).map((m) =>
    StringUtils.capitalize(m)
  );
  const synergistMuscleGroups = Exercise.synergistMusclesGroups(exercise, settings.exercises)
    .map((m) => StringUtils.capitalize(m))
    .filter((m) => targetMuscleGroups.indexOf(m) === -1);

  const types = exercise.types.map((t) => StringUtils.capitalize(t));
  const key = Exercise.toUrlSlug(exercise);

  return (
    <div id={key} className="bg-orange-100" style={{ width: 400, height: 210 }}>
      <section className="flex items-center text-base">
        <div className="box-content px-8 py-10" style={{ width: 80, minHeight: "2.5rem" }}>
          <ExerciseImage settings={settings} className="w-full" exerciseType={exerciseType} size="small" />
        </div>
        <div className="flex-1 py-2 text-left">
          <div>
            <span className="font-bold">{exercise.name}</span>,{" "}
            <span className="text-grayv2-main">{equipmentName(exerciseType.equipment)}</span>
          </div>
          <div>
            {types.length > 0 && (
              <div>
                <span className="text-grayv2-main">Type: </span>
                <span className="font-bold">{types.join(", ")}</span>
              </div>
            )}
            {targetMuscleGroups.length > 0 && (
              <div>
                <span className="text-grayv2-main">Target: </span>
                <span className="font-bold">{targetMuscleGroups.join(", ")}</span>
              </div>
            )}
            {synergistMuscleGroups.length > 0 && (
              <div>
                <span className="text-grayv2-main">Synergist: </span>
                <span className="font-bold">{synergistMuscleGroups.join(", ")}</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
