import { JSX, h } from "preact";
import { IExercise, Exercise, equipmentName } from "../../models/exercise";
import { ISettings, IExerciseType } from "../../types";
import { StringUtils } from "../../utils/string";
import { Tailwind } from "../../utils/tailwindConfig";
import { ExerciseImage } from "../exerciseImage";
import { IconEdit2 } from "../icons/iconEdit2";
import { IconStar } from "../icons/iconStar";

interface IExerciseItemProps {
  exercise: IExercise;
  equipment?: string;
  settings: ISettings;
  onStar?: (key: string) => void;
  onEdit?: () => void;
  currentExerciseType?: { id: string; equipment?: string };
  showMuscles?: boolean;
  isEnabled: boolean;
  isSelected?: boolean;
  onChoose?: (key: string) => void;
  isMultiselect?: boolean;
}

export function ExercisePickerExerciseItem(props: IExerciseItemProps): JSX.Element {
  const { exercise: e } = props;
  const exerciseType = { id: e.id, equipment: props.equipment || e.defaultEquipment };
  const key = Exercise.toKey(e);
  const isStarred = !!props.settings.starredExercises?.[key];
  const onEdit = props.onEdit;
  const onChoose = props.onChoose;

  return (
    <section className="flex gap-2">
      <div className="self-center w-12" style={{ minHeight: "2.5rem" }}>
        <ExerciseImage
          useTextForCustomExercise={true}
          customClassName="border border-grayv3-200 rounded-lg overflow-hidden"
          settings={props.settings}
          className="w-full"
          exerciseType={exerciseType}
          size="small"
        />
      </div>
      <div className="flex-1 py-2 text-sm text-left">
        <button
          className="flex items-center gap-1"
          onClick={() => {
            if (props.onStar) {
              props.onStar(key);
            }
          }}
        >
          {props.onStar && (
            <div>
              <IconStar
                size={20}
                isSelected={isStarred}
                color={isStarred ? Tailwind.colors().purplev3.main : Tailwind.colors().grayv3.main}
              />
            </div>
          )}
          <div>
            <span className="font-semibold">{e.name}</span>,{" "}
            <span className="text-grayv2-main">{equipmentName(exerciseType.equipment)}</span>
          </div>
        </button>
        {props.showMuscles ? (
          <MuscleView currentExerciseType={props.currentExerciseType} exercise={e} settings={props.settings} />
        ) : (
          <MuscleGroupsView exercise={e} settings={props.settings} />
        )}
      </div>
      <div className="flex items-center">
        {onEdit && (
          <div>
            <button onClick={onEdit} className="px-2 pb-2">
              <IconEdit2 />
            </button>
          </div>
        )}
        {onChoose &&
          (!props.isMultiselect ? (
            <span className="px-2 pb-2 radio">
              <input
                type="radio"
                disabled={!props.isEnabled && !props.isSelected}
                name="picker-exercise"
                value={Exercise.toKey(e)}
                onChange={() => onChoose(Exercise.toKey(e))}
                checked={props.isSelected}
              />
            </span>
          ) : (
            <label className="block p-2">
              <input
                checked={props.isSelected}
                disabled={!props.isEnabled && !props.isSelected}
                className="checkbox checkbox-purple text-purplev3-main"
                type="checkbox"
                onChange={() => onChoose(Exercise.toKey(e))}
              />
            </label>
          ))}
      </div>
    </section>
  );
}

function MuscleView(props: {
  currentExerciseType?: IExerciseType;
  exercise: IExercise;
  settings: ISettings;
}): JSX.Element {
  const { exercise, settings } = props;
  const tms = props.currentExerciseType ? Exercise.targetMuscles(props.currentExerciseType, settings.exercises) : [];
  const sms = props.currentExerciseType ? Exercise.synergistMuscles(props.currentExerciseType, settings.exercises) : [];
  const targetMuscles = Exercise.targetMuscles(exercise, settings.exercises);
  const synergistMuscles = Exercise.synergistMuscles(exercise, settings.exercises).filter(
    (m) => targetMuscles.indexOf(m) === -1
  );

  const types = exercise.types.map((t) => StringUtils.capitalize(t));

  return (
    <div className="text-xs" style={{ lineHeight: "1.5" }}>
      {types.length > 0 && (
        <div>
          <span className="text-grayv2-main">Type: </span>
          <span className="font-semibold">{types.join(", ")}</span>
        </div>
      )}
      {targetMuscles.length > 0 && (
        <div>
          <span className="text-grayv2-main">Target: </span>
          <span className="font-semibold">
            {targetMuscles.map((m, i) => {
              return (
                <span>
                  <span
                    className={tms.length === 0 ? "" : tms.indexOf(m) !== -1 ? "text-greenv2-main" : "text-redv2-main"}
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
          <span className="text-grayv2-main">Synergist: </span>
          <span className="font-semibold">
            {synergistMuscles.map((m, i) => {
              return (
                <span>
                  <span
                    className={sms.length === 0 ? "" : sms.indexOf(m) !== -1 ? "text-greenv2-main" : "text-redv2-main"}
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

export function MuscleGroupsView(props: { exercise: IExercise; settings: ISettings }): JSX.Element {
  const { exercise, settings } = props;
  const targetMuscleGroups = Exercise.targetMusclesGroups(exercise, settings.exercises).map((m) =>
    StringUtils.capitalize(m)
  );
  const synergistMuscleGroups = Exercise.synergistMusclesGroups(exercise, settings.exercises)
    .map((m) => StringUtils.capitalize(m))
    .filter((m) => targetMuscleGroups.indexOf(m) === -1);

  const types = exercise.types.map((t) => StringUtils.capitalize(t));

  return (
    <div className="text-xs">
      {types.length > 0 && (
        <div>
          <span className="text-grayv2-main">Type: </span>
          <span className="font-semibold">{types.join(", ")}</span>
        </div>
      )}
      {targetMuscleGroups.length > 0 && (
        <div>
          <span className="text-grayv2-main">Target: </span>
          <span className="font-semibold">{targetMuscleGroups.join(", ")}</span>
        </div>
      )}
      {synergistMuscleGroups.length > 0 && (
        <div>
          <span className="text-grayv2-main">Synergist: </span>
          <span className="font-semibold">{synergistMuscleGroups.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
