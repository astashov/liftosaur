import { h, JSX, Fragment } from "preact";
import { IExercisePickerState, IExerciseType, ISettings } from "../../types";
import { IconMagnifyingGlass } from "../icons/iconMagnifyingGlass";
import { Tailwind } from "../../utils/tailwindConfig";
import { IconFilter2 } from "../icons/iconFilter2";
import { Exercise } from "../../models/exercise";
import { StringUtils } from "../../utils/string";
import { ObjectUtils } from "../../utils/object";
import { GroupHeader } from "../groupHeader";
import { CollectionUtils } from "../../utils/collection";
import { LinkButton } from "../linkButton";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { exercisePickerSortNames } from "./exercisePickerFilter";
import { ExercisePickerUtils } from "./exercisePickerUtils";
import { ExercisePickerExerciseItem } from "./exercisePickerExerciseItem";

interface IProps {
  settings: ISettings;
  onStar: (key: string) => void;
  state: IExercisePickerState;
  usedExerciseTypes: IExerciseType[];
  dispatch: ILensDispatch<IExercisePickerState>;
}

export function ExercisePickerAdhocExercises(props: IProps): JSX.Element {
  return (
    <div className="relative">
      <SearchAndFilter dispatch={props.dispatch} state={props.state} settings={props.settings} />
      <CustomExercises
        usedExerciseTypes={props.usedExerciseTypes}
        dispatch={props.dispatch}
        onStar={props.onStar}
        settings={props.settings}
        state={props.state}
      />
      <BuiltinExercises
        dispatch={props.dispatch}
        usedExerciseTypes={props.usedExerciseTypes}
        onStar={props.onStar}
        shouldAddExternalLinks={true}
        state={props.state}
        settings={props.settings}
      />
    </div>
  );
}

interface ISearchAndFilterProps {
  dispatch: ILensDispatch<IExercisePickerState>;
  settings: ISettings;
  state: IExercisePickerState;
}

function SearchAndFilter(props: ISearchAndFilterProps): JSX.Element {
  const filterNames = ExercisePickerUtils.getAllFilterNames(props.state.filters, props.settings);
  const isFiltered = filterNames.length > 0;
  return (
    <div className="my-1">
      <div className="flex items-center gap-2 mx-4">
        <label className="flex items-center flex-1 gap-2 p-2 rounded-lg bg-background-neutral">
          <div>
            <IconMagnifyingGlass size={18} color={Tailwind.colors().lightgray[600]} />
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name"
              className="block w-full text-sm bg-transparent border-none outline-none bg-none text-text-secondary placeholder-text-secondarysubtle"
              data-cy="exercise-filter-by-name"
              value={props.state.search}
              onInput={(event) => {
                const target = event.target as HTMLInputElement;
                const value = target.value;
                props.dispatch(lb<IExercisePickerState>().p("search").record(value), "Update search input");
              }}
            />
          </div>
        </label>
        <div className="flex items-center justify-center">
          <button
            className={`flex items-center gap-1 py-1 text-center border rounded-lg ${isFiltered ? "border-button-secondarystroke px-2" : "px-4 border-border-neutral"}`}
            onClick={() =>
              props.dispatch(
                lb<IExercisePickerState>()
                  .p("screenStack")
                  .recordModify((stack) => [...stack, "filter"]),
                "Navigate to filter picker screen"
              )
            }
          >
            {isFiltered && (
              <span className="flex items-center justify-center w-5 h-5 text-xs font-semibold leading-none rounded-full text-text-alwayswhite bg-button-primarybackground">
                {filterNames.length}
              </span>
            )}
            <IconFilter2 color={isFiltered ? Tailwind.semantic().icon.purple : Tailwind.semantic().icon.neutral} />
          </button>
        </div>
      </div>
      <div className="mx-4 text-xs text-text-secondary">
        <span>
          Sorted by: <strong>{exercisePickerSortNames[props.state.sort]}</strong>
        </span>
        {filterNames.length > 0 && (
          <>
            <span>
              , Filters:{" "}
              {filterNames.map((f, i) => (
                <>
                  {i > 0 ? ", " : ""}
                  <strong>{f}</strong>
                </>
              ))}
            </span>
            <LinkButton
              name="clear-filters"
              className="ml-1 text-xs"
              onClick={() => props.dispatch(lb<IExercisePickerState>().p("filters").record({}), "Clear filters")}
            >
              Clear
            </LinkButton>
          </>
        )}
      </div>
    </div>
  );
}

interface ICustomExercisesProps {
  settings: ISettings;
  dispatch: ILensDispatch<IExercisePickerState>;
  state: IExercisePickerState;
  usedExerciseTypes: IExerciseType[];
  onStar: (key: string) => void;
}

function CustomExercises(props: ICustomExercisesProps): JSX.Element {
  let exercises = props.settings.exercises;

  if (props.state.search) {
    exercises = Exercise.filterCustomExercises(exercises, props.state.search);
  }
  exercises = ExercisePickerUtils.filterCustomExercises(exercises, props.state.filters);
  let exercisesList = CollectionUtils.compact(ObjectUtils.values(exercises));
  if (props.state.filters.isStarred) {
    exercisesList = exercisesList.filter((e) => props.settings.starredExercises?.[Exercise.toKey(e)]);
  }
  exercisesList = exercisesList.filter((e) => !e.isDeleted);
  exercisesList = ExercisePickerUtils.sortCustomExercises(exercisesList, props.settings, props.state);

  return (
    <div className="py-2">
      <GroupHeader
        isExpanded={true}
        expandOnIconClick={true}
        leftExpandIcon={true}
        name="Custom Exercises"
        headerClassName="mx-4"
        rightAddOn={
          <LinkButton
            className="text-xs"
            data-cy="custom-exercise-create"
            name="create-custom-exercise"
            onClick={() => {
              props.dispatch(
                [
                  lb<IExercisePickerState>()
                    .p("editCustomExercise")
                    .record(Exercise.createCustomExercise("", [], [], [])),
                  lb<IExercisePickerState>()
                    .p("screenStack")
                    .recordModify((stack) => [...stack, "customExercise"]),
                ],
                "Navigate to create custom exercise screen"
              );
            }}
          >
            Create
          </LinkButton>
        }
      >
        {exercisesList.map((e) => {
          const ex = Exercise.get({ id: e.id }, props.settings.exercises);
          const isSelectedAlready = props.state.selectedExercises.some(
            (exrcs) => "exerciseType" in exrcs && Exercise.eq(exrcs.exerciseType, e)
          );
          const isUsedForDay = props.usedExerciseTypes.some((et) => Exercise.eq(et, e));
          const isMultiselect = ExercisePickerUtils.getIsMultiselect(props.state);
          const isSelected = props.state.selectedExercises.some(
            (exrcs) => exrcs.type === "adhoc" && Exercise.eq(exrcs.exerciseType, e)
          );
          return (
            <section
              key={Exercise.toKey(e)}
              data-cy={`menu-item-${e.id}`}
              className={`w-full py-1 pl-4 pr-2 text-left border-b border-border-neutral ${isSelected ? "bg-background-purpledark" : ""}`}
              onClick={() => {}}
            >
              <ExercisePickerExerciseItem
                onStar={props.onStar}
                isMultiselect={isMultiselect}
                isEnabled={!isUsedForDay && (!isMultiselect || !isSelectedAlready)}
                showMuscles={props.state.showMuscles}
                settings={props.settings}
                currentExerciseType={props.state.exerciseType}
                exercise={ex}
                isSelected={isSelected}
                onChoose={(key) => {
                  ExercisePickerUtils.chooseAdhocExercise(props.dispatch, key, props.state);
                }}
                onEdit={() => {
                  props.dispatch(
                    [
                      lb<IExercisePickerState>()
                        .p("screenStack")
                        .recordModify((stack) => [...stack, "customExercise"]),
                      lb<IExercisePickerState>().p("editCustomExercise").record(ObjectUtils.clone(e)),
                    ],
                    `Navigate to edit custom exercise screen for ${e.name}`
                  );
                }}
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
  state: IExercisePickerState;
  settings: ISettings;
  usedExerciseTypes: IExerciseType[];
  onStar: (key: string) => void;
  dispatch: ILensDispatch<IExercisePickerState>;
}

function BuiltinExercises(props: IBuiltinExercisesProps): JSX.Element {
  let exercises = Exercise.allExpanded({});
  if (props.state.search) {
    exercises = Exercise.filterExercises(exercises, props.state.search);
  }
  exercises = ExercisePickerUtils.filterExercises(exercises, props.state.filters, props.settings);
  if (props.state.filters.isStarred) {
    exercises = exercises.filter((e) => props.settings.starredExercises?.[Exercise.toKey(e)]);
  }
  exercises = ExercisePickerUtils.sortExercises(exercises, props.settings, props.state);
  return (
    <div className="py-2">
      <GroupHeader isExpanded={true} leftExpandIcon={true} name="Built-in Exercises" headerClassName="mx-4">
        {exercises.map((e) => {
          const isMultiselect = ExercisePickerUtils.getIsMultiselect(props.state);
          const isUsedForDay = props.usedExerciseTypes.some((et) => Exercise.eq(et, e));
          const isSelectedAlready = props.state.selectedExercises.some(
            (ex) => "exerciseType" in ex && Exercise.eq(ex.exerciseType, e)
          );
          const isSelected = props.state.selectedExercises.some(
            (ex) => ex.type === "adhoc" && Exercise.eq(ex.exerciseType, e)
          );
          return (
            <section
              key={Exercise.toKey(e)}
              data-cy={`menu-item-${StringUtils.dashcase(e.name)}${
                e.equipment ? `-${StringUtils.dashcase(e.equipment)}` : ""
              }`}
              className={`w-full py-1 pl-4 pr-2 text-left border-b border-border-neutral ${isSelected ? "bg-background-purpledark" : ""}`}
              onClick={() => {}}
            >
              <ExercisePickerExerciseItem
                onStar={props.onStar}
                isMultiselect={isMultiselect}
                isEnabled={!isUsedForDay && (!isMultiselect || !isSelectedAlready)}
                isSelected={isSelected}
                onChoose={(key) => {
                  ExercisePickerUtils.chooseAdhocExercise(props.dispatch, key, props.state);
                }}
                showMuscles={props.state.showMuscles}
                settings={props.settings}
                currentExerciseType={props.state.exerciseType}
                exercise={e}
              />
            </section>
          );
        })}
      </GroupHeader>
    </div>
  );
}
