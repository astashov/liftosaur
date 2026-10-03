import { JSX } from "react";
import { StringUtils_capitalize } from "../utils/string";
import { IEquipment, IExerciseType, ISettings } from "../types";
import {
  equipmentName,
  IExercise,
  Exercise_targetMusclesGroups,
  Exercise_synergistMusclesGroups,
  Exercise_targetMuscles,
  Exercise_synergistMuscles,
} from "../models/exercise";
import { ExerciseImage } from "./exerciseImage";
import { Muscle_getMuscleGroupName } from "../models/muscle";

interface IExerciseItemProps {
  settings: ISettings;
  currentExerciseType?: IExerciseType;
  exercise: IExercise;
  showMuscles: boolean;
  equipment?: IEquipment;
}

export function ExerciseItem(props: IExerciseItemProps): JSX.Element {
  const { exercise: e } = props;
  const exerciseType = { id: e.id, equipment: props.equipment || e.defaultEquipment };

  return (
    <section className="flex items-center">
      <div className="w-scaled-12 pr-2" style={{ minHeight: "2.5rem" }}>
        <ExerciseImage settings={props.settings} className="w-full" exerciseType={exerciseType} size="small" />
      </div>
      <div className="flex-1 py-2 text-sm text-left">
        <div>
          <span className="font-bold">{e.name}</span>,{" "}
          <span className="text-text-secondary">{equipmentName(exerciseType.equipment)}</span>
        </div>
        {props.showMuscles ? (
          <MuscleView currentExerciseType={props.currentExerciseType} exercise={e} settings={props.settings} />
        ) : (
          <MuscleGroupsView exercise={e} settings={props.settings} />
        )}
      </div>
    </section>
  );
}

function MuscleGroupsView(props: { exercise: IExercise; settings: ISettings }): JSX.Element {
  const { exercise, settings } = props;
  const targetMuscleGroups = Exercise_targetMusclesGroups(exercise, settings).map((m) =>
    Muscle_getMuscleGroupName(m, settings)
  );
  const synergistMuscleGroups = Exercise_synergistMusclesGroups(exercise, settings)
    .map((m) => Muscle_getMuscleGroupName(m, settings))
    .filter((m) => targetMuscleGroups.indexOf(m) === -1);

  const types = exercise.types.map((t) => StringUtils_capitalize(t));

  return (
    <div className="text-xs">
      {types.length > 0 && (
        <div>
          <span className="text-text-secondary">Type: </span>
          <span className="font-bold">{types.join(", ")}</span>
        </div>
      )}
      {targetMuscleGroups.length > 0 && (
        <div>
          <span className="text-text-secondary">Target: </span>
          <span className="font-bold">{targetMuscleGroups.join(", ")}</span>
        </div>
      )}
      {synergistMuscleGroups.length > 0 && (
        <div>
          <span className="text-text-secondary">Synergist: </span>
          <span className="font-bold">{synergistMuscleGroups.join(", ")}</span>
        </div>
      )}
    </div>
  );
}

function MuscleView(props: {
  currentExerciseType?: IExerciseType;
  exercise: IExercise;
  settings: ISettings;
}): JSX.Element {
  const { exercise, settings } = props;
  const tms = props.currentExerciseType ? Exercise_targetMuscles(props.currentExerciseType, settings) : [];
  const sms = props.currentExerciseType ? Exercise_synergistMuscles(props.currentExerciseType, settings) : [];
  const targetMuscles = Exercise_targetMuscles(exercise, settings);
  const synergistMuscles = Exercise_synergistMuscles(exercise, settings).filter((m) => targetMuscles.indexOf(m) === -1);

  const types = exercise.types.map((t) => StringUtils_capitalize(t));

  return (
    <div className="text-xs">
      {types.length > 0 && (
        <div>
          <span className="text-text-secondary">Type: </span>
          <span className="font-bold">{types.join(", ")}</span>
        </div>
      )}
      {targetMuscles.length > 0 && (
        <div>
          <span className="text-text-secondary">Target: </span>
          <span className="font-bold">
            {targetMuscles.map((m, i) => {
              return (
                <span key={m}>
                  <span
                    className={tms.length === 0 ? "" : tms.indexOf(m) !== -1 ? "text-text-success" : "text-text-error"}
                  >
                    {m}
                  </span>
                  {i !== targetMuscles.length - 1 ? ", " : ""}
                </span>
              );
            })}
          </span>
        </div>
      )}
      {synergistMuscles.length > 0 && (
        <div>
          <span className="text-text-secondary">Synergist: </span>
          <span className="font-bold">
            {synergistMuscles.map((m, i) => {
              return (
                <span key={m}>
                  <span
                    className={sms.length === 0 ? "" : sms.indexOf(m) !== -1 ? "text-text-success" : "text-text-error"}
                  >
                    {m}
                  </span>
                  {i !== synergistMuscles.length - 1 ? ", " : ""}
                </span>
              );
            })}
          </span>
        </div>
      )}
    </div>
  );
}
