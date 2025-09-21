import { h, JSX } from "preact";
import { BottomSheet } from "../bottomSheet";
import { ISettings } from "../../types";
import { Exercise, IExercise } from "../../models/exercise";
import { Tailwind } from "../../utils/tailwindConfig";
import { IconMagnifyingGlass } from "../icons/iconMagnifyingGlass";
import { useState } from "preact/hooks";
import { StringUtils } from "../../utils/string";
import { ExercisePickerExerciseItem } from "./exercisePickerExerciseItem";

interface IProps {
  isHidden: boolean;
  showMuscles: boolean;
  settings: ISettings;
  onSelect: (exercise: IExercise) => void;
  onClose: () => void;
}

export function BottomSheetExerciseCloneLibrary(props: IProps): JSX.Element {
  const [search, setSearch] = useState<string>("");
  const trimmedSearch = search.trim().toLowerCase();
  let exercises = !trimmedSearch
    ? Exercise.allExpanded(props.settings.exercises)
    : Exercise.allExpanded(props.settings.exercises).filter((e) => {
        return StringUtils.fuzzySearch(trimmedSearch, e.name.toLowerCase());
      });
  exercises = exercises.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <BottomSheet isHidden={props.isHidden} onClose={props.onClose} shouldShowClose={true}>
      <div className="flex flex-col h-full px-4">
        <div className="pb-2">
          <h3 className="pt-1 pb-3 text-base font-semibold text-center">Pick Exercise To Clone From</h3>
          <div className="flex items-center flex-1 gap-2 p-2 rounded-lg bg-background-neutral">
            <div>
              <IconMagnifyingGlass size={18} color={Tailwind.colors().lightgray[600]} />
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name"
                className="block w-full text-sm bg-transparent border-none outline-none bg-none text-text-secondary placeholder-text-secondarysubtle"
                data-cy="exercise-filter-by-name"
                value={search}
                onInput={(event) => {
                  const target = event.target as HTMLInputElement;
                  const value = target.value;
                  setSearch(value);
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="pb-4">
            {exercises.map((ex) => {
              return (
                <button
                  onClick={() => {
                    props.onSelect(ex);
                  }}
                >
                  <ExercisePickerExerciseItem
                    isEnabled={true}
                    showMuscles={true}
                    settings={props.settings}
                    exercise={ex}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
