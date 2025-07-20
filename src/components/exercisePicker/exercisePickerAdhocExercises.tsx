import { h, JSX } from "preact";
import { IExercisePickerState, IExerciseType, ISettings } from "../../types";
import { IconMagnifyingGlass } from "../icons/iconMagnifyingGlass";
import { Tailwind } from "../../utils/tailwindConfig";
import { IconFilter2 } from "../icons/iconFilter2";
import { equipmentName, Exercise, IExercise } from "../../models/exercise";
import { StringUtils } from "../../utils/string";
import { ExerciseImage } from "../exerciseImage";
import { IconStar } from "../icons/iconStar";
import { ObjectUtils } from "../../utils/object";
import { GroupHeader } from "../groupHeader";
import { CollectionUtils } from "../../utils/collection";
import { LinkButton } from "../linkButton";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";

interface IProps {
  settings: ISettings;
  dispatch: ILensDispatch<IExercisePickerState>;
}

export function ExercisePickerAdhocExercises(props: IProps): JSX.Element {
  return (
    <div className="relative">
      <SearchAndFilter dispatch={props.dispatch} />
      <CustomExercises settings={props.settings} showMuscles={true} />
      <BuiltinExercises shouldAddExternalLinks={true} showMuscles={true} settings={props.settings} />
    </div>
  );
}

interface ISearchAndFilterProps {
  dispatch: ILensDispatch<IExercisePickerState>;
}

function SearchAndFilter(props: ISearchAndFilterProps): JSX.Element {
  return (
    <div className="flex items-center gap-2 mx-4">
      <label className="flex items-center flex-1 gap-2 p-2 rounded-lg bg-grayv3-50">
        <div>
          <IconMagnifyingGlass size={18} color={Tailwind.colors().grayv3.main} />
        </div>
        <input
          type="text"
          placeholder="Search by name"
          className="flex-1 block text-sm bg-transparent border-none outline-none bg-none text-grayv3-main placeholder-grayv3-500"
        />
      </label>
      <div className="flex items-center justify-center">
        <button
          className="px-4 py-1 text-center border rounded-lg border-grayv3-300"
          onClick={() =>
            props.dispatch(
              lb<IExercisePickerState>()
                .p("screenStack")
                .recordModify((stack) => [...stack, "filter"]),
              "Navigate to filter picker screen"
            )
          }
        >
          <IconFilter2 color={Tailwind.colors().blackv2} />
        </button>
      </div>
    </div>
  );
}

interface ICustomExercisesProps {
  settings: ISettings;
  exerciseType?: IExerciseType;
  showMuscles?: boolean;
}

function CustomExercises(props: ICustomExercisesProps): JSX.Element {
  let exercises = CollectionUtils.compact(ObjectUtils.values(props.settings.exercises));
  return (
    <div className="py-2">
      <GroupHeader
        isExpanded={true}
        expandOnIconClick={true}
        leftExpandIcon={true}
        name="Custom Exercises"
        headerClassName="mx-4"
        rightAddOn={
          <LinkButton className="text-xs" name="create-custom-exercise">
            Create
          </LinkButton>
        }
      >
        {exercises.map((e) => {
          const ex = Exercise.get({ id: e.id }, props.settings.exercises);
          return (
            <section
              key={Exercise.toKey(e)}
              data-cy={`menu-item-${e.id}`}
              className="w-full py-1 pl-4 pr-2 text-left border-b border-grayv3-200"
              onClick={() => {}}
            >
              <ExerciseItem
                isMultiselect={false}
                showMuscles={props.showMuscles}
                settings={props.settings}
                currentExerciseType={props.exerciseType}
                exercise={ex}
                equipment={ex.equipment}
              />
            </section>
          );
        })}
      </GroupHeader>
    </div>
  );
}

interface IBuiltinExercisesProps {
  shouldAddExternalLinks?: boolean;
  showMuscles?: boolean;
  settings: ISettings;
  exerciseType?: IExerciseType;
}

function BuiltinExercises(props: IBuiltinExercisesProps): JSX.Element {
  let exercises = Exercise.allExpanded({});
  return (
    <div className="py-2">
      <GroupHeader isExpanded={true} leftExpandIcon={true} name="Built-in Exercises" headerClassName="mx-4">
        {exercises.map((e) => {
          return (
            <section
              key={Exercise.toKey(e)}
              data-cy={`menu-item-${StringUtils.dashcase(e.name)}${
                e.equipment ? `-${StringUtils.dashcase(e.equipment)}` : ""
              }`}
              className="w-full py-1 pl-4 pr-2 text-left border-b border-grayv3-200"
              onClick={() => {}}
            >
              <ExerciseItem
                isMultiselect={false}
                showMuscles={props.showMuscles}
                settings={props.settings}
                currentExerciseType={props.exerciseType}
                exercise={e}
                equipment={e.equipment}
              />
            </section>
          );
        })}
      </GroupHeader>
    </div>
  );
}

interface IExerciseItemProps {
  exercise: IExercise;
  equipment?: string;
  settings: ISettings;
  currentExerciseType?: { id: string; equipment?: string };
  showMuscles?: boolean;
  isMultiselect?: boolean;
}

export function ExerciseItem(props: IExerciseItemProps): JSX.Element {
  const { exercise: e } = props;
  const exerciseType = { id: e.id, equipment: props.equipment || e.defaultEquipment };

  return (
    <section className="flex gap-2">
      <div className="self-center w-12" style={{ minHeight: "2.5rem" }}>
        <ExerciseImage settings={props.settings} className="w-full" exerciseType={exerciseType} size="small" />
      </div>
      <div className="flex-1 py-2 text-sm text-left">
        <div className="flex items-center">
          <button className="px-1" style={{ marginLeft: "-0.25rem" }}>
            <IconStar size={20} color={Tailwind.colors().grayv3.main} />
          </button>
          <div>
            <span className="font-semibold">{e.name}</span>,{" "}
            <span className="text-grayv2-main">{equipmentName(exerciseType.equipment)}</span>
          </div>
        </div>
        {props.showMuscles ? (
          <MuscleView currentExerciseType={props.currentExerciseType} exercise={e} settings={props.settings} />
        ) : (
          <MuscleGroupsView exercise={e} settings={props.settings} />
        )}
      </div>
      <div>
        {props.isMultiselect ? (
          <span className="px-2 pb-2 radio">
            <input type="radio" name="picker-exercise" value={Exercise.toKey(e)} />
          </span>
        ) : (
          <label className="block p-2">
            <input checked={false} className="checkbox checkbox-purple text-purplev3-main" type="checkbox" />
          </label>
        )}
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
