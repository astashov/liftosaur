import { h, JSX } from "preact";
import { useRef, useState } from "preact/hooks";
import { Thunk } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { equipmentName, Exercise } from "../models/exercise";
import { equipments, exerciseKinds, IProgram, ISettings, screenMuscles } from "../types";
import { StringUtils } from "../utils/string";
import { ExerciseImage } from "./exerciseImage";
import { GroupHeader } from "./groupHeader";
import { MenuItem } from "./menuItem";
import { Multiselect } from "./multiselect";

interface IExercisesListProps {
  dispatch: IDispatch;
  settings: ISettings;
  program: IProgram;
}

export function ExercisesList(props: IExercisesListProps): JSX.Element {
  const textInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("");
  const [filterTypes, setFilterTypes] = useState<string[]>([]);

  const programExercises = props.program.exercises.map((e) => e.exerciseType);
  let currentProgramExercises = Exercise.allExpanded({}).filter((e) =>
    programExercises.some((pe) => Exercise.eq(e, pe))
  );
  let customExercises = props.settings.exercises;

  const filterOptions = [
    ...equipments.map((e) => equipmentName(e)),
    ...exerciseKinds.map(StringUtils.capitalize),
    ...screenMuscles.map(StringUtils.capitalize),
  ];

  if (filter) {
    exercises = Exercise.filterExercises(exercises, filter);
    customExercises = Exercise.filterCustomExercises(customExercises, filter);
  }
  if (filterTypes && filterTypes.length > 0) {
    exercises = Exercise.filterExercisesByType(exercises, filterTypes);
    customExercises = Exercise.filterCustomExercisesByType(customExercises, filterTypes);
  }

  exercises.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <form data-cy="exercises-list" onSubmit={(e) => e.preventDefault()}>
        <input
          ref={textInput}
          className="block w-full px-4 py-2 mb-2 text-base leading-normal bg-white border border-gray-300 rounded-lg appearance-none focus:outline-none focus:shadow-outline"
          type="text"
          value={filter}
          placeholder="Filter by name"
          onInput={() => {
            setFilter(textInput.current.value.toLowerCase());
          }}
        />
        <Multiselect
          id="filtertypes"
          label=""
          placeholder="Filter by type"
          values={filterOptions}
          initialSelectedValues={new Set()}
          onChange={(ft) => setFilterTypes(Array.from(ft))}
        />
      </form>

      <GroupHeader name="Current program exercises" />
      {exercises.map((exercise) => {
        return (
          <MenuItem
            name={Exercise.fullName(exercise, props.settings)}
            key={exercise.id}
            prefix={
              <div style={{ marginTop: "-1px" }}>
                <ExerciseImage settings={props.settings} className="w-6 mr-3" exerciseType={exercise} size="small" />
              </div>
            }
            shouldShowRightArrow={true}
            onClick={() => {
              props.dispatch(Thunk.pushExerciseStatsScreen(exercise));
            }}
          />
        );
      })}
    </div>
  );
}
