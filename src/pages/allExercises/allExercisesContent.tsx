import { h, JSX } from "preact";
import { useRef, useState } from "preact/hooks";
import { ExerciseItem } from "../../components/modalExercise";
import { Multiselect } from "../../components/multiselect";
import { equipmentName, Exercise_filterExercisesByNameAndType, Exercise_toKey } from "../../models/exercise";
import { Settings_build } from "../../models/settings";
import { equipments, exerciseKinds } from "../../types";
import { StringUtils_capitalize } from "../../utils/string";
import { buildExerciseUrl } from "../exercise/exerciseContent";
import { Muscle_getAvailableMuscleGroups, Muscle_getMuscleGroupName } from "../../models/muscle";

export interface IAllExercisesContentProps {
  client: Window["fetch"];
}

export function AllExercisesContent(props: IAllExercisesContentProps): JSX.Element {
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const textInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("");
  const settings = Settings_build();
  const exercises = Exercise_filterExercisesByNameAndType(settings, filter, filterTypes, false);
  const filterOptions = [
    ...equipments.map((e) => equipmentName(e)),
    ...exerciseKinds.map(StringUtils_capitalize),
    ...Muscle_getAvailableMuscleGroups(settings).map((mg) => Muscle_getMuscleGroupName(mg, settings)),
  ];

  return (
    <div className="h-full px-4 pb-8 mx-auto" style={{ maxWidth: "30rem" }}>
      <h1 className="pb-2 text-2xl font-bold text-center">All exercises</h1>
      <form data-cy="exercises-list" onSubmit={(e) => e.preventDefault()}>
        <input
          ref={textInput}
          className="block w-full px-4 py-2 mb-2 text-base leading-normal border border-gray-300 rounded-lg appearance-none bg-background-default focus:outline-none focus:shadow-outline"
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

      <div>
        {exercises.map((exercise) => {
          const key = Exercise_toKey(exercise);
          return (
            <a
              href={buildExerciseUrl(exercise, filterTypes)}
              className={`block px-2 rounded-lg hover:bg-background-subtle border border-transparent`}
              key={key}
            >
              <ExerciseItem
                exercise={exercise}
                settings={settings}
                showMuscles={false}
                equipment={exercise.equipment}
              />
            </a>
          );
        })}
      </div>
    </div>
  );
}
