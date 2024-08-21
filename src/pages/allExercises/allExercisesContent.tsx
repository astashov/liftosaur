import { h, JSX } from "preact";
import { useRef, useState } from "preact/hooks";
import { ExerciseItem } from "../../components/modalExercise";
import { Multiselect } from "../../components/multiselect";
import { equipmentName, Exercise } from "../../models/exercise";
import { Settings } from "../../models/settings";
import { equipments, exerciseKinds, screenMuscles } from "../../types";
import { StringUtils } from "../../utils/string";
import { buildExerciseUrl } from "../exercise/exerciseContent";

export interface IAllExercisesContentProps {
  client: Window["fetch"];
}

export function AllExercisesContent(props: IAllExercisesContentProps): JSX.Element {
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const textInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("");
  const settings = Settings.build();
  const exercises = Exercise.filterExercisesByNameAndType(settings, filter, filterTypes, false);
  const filterOptions = [
    ...equipments.map((e) => equipmentName(e)),
    ...exerciseKinds.map(StringUtils.capitalize),
    ...screenMuscles.map(StringUtils.capitalize),
  ];

  return (
    <div className="h-full px-4 pb-8 mx-auto" style={{ maxWidth: "30rem" }}>
      <h1 className="pb-2 text-2xl font-bold text-center">All exercises</h1>
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

      <div>
        {exercises.map((exercise) => {
          const key = Exercise.toKey(exercise);
          return (
            <a
              href={buildExerciseUrl(exercise, filterTypes)}
              className={`block px-2 rounded-lg hover:bg-grayv2-100 border border-transparent`}
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
