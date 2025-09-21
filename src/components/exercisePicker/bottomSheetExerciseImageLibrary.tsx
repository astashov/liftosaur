import { h, JSX } from "preact";
import { BottomSheet } from "../bottomSheet";
import { IExerciseType, ISettings } from "../../types";
import { Exercise } from "../../models/exercise";
import { MenuItemWrapper } from "../menuItem";
import { ExerciseImage } from "../exerciseImage";
import { Tailwind } from "../../utils/tailwindConfig";
import { IconMagnifyingGlass } from "../icons/iconMagnifyingGlass";
import { useState } from "preact/hooks";
import { StringUtils } from "../../utils/string";

interface IProps {
  isHidden: boolean;
  settings: ISettings;
  onClose: () => void;
  onSelect: (exerciseType: IExerciseType) => void;
}

export function BottomSheetExerciseImageLibrary(props: IProps): JSX.Element {
  const [search, setSearch] = useState<string>("");
  const trimmedSearch = search.trim().toLowerCase();
  const exercises = !trimmedSearch
    ? Exercise.allExpanded({})
    : Exercise.allExpanded({}).filter((e) => {
        return StringUtils.fuzzySearch(trimmedSearch, e.name.toLowerCase());
      });

  return (
    <BottomSheet isHidden={props.isHidden} onClose={props.onClose} shouldShowClose={true}>
      <div className="flex flex-col h-full px-4">
        <div className="pb-2">
          <h3 className="pt-1 pb-3 text-base font-semibold text-center">Pick Exercise Image</h3>
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
            {exercises.map((exercise) => (
              <MenuItemWrapper
                key={exercise.id}
                name={exercise.name}
                onClick={() => {
                  props.onSelect(exercise);
                }}
              >
                <div className="flex items-center h-20 gap-4">
                  <div className="w-10">
                    <ExerciseImage settings={props.settings} exerciseType={exercise} size="small" className="w-full" />
                  </div>
                  <div className="flex-1">{Exercise.fullName(exercise, props.settings)}</div>
                </div>
              </MenuItemWrapper>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
