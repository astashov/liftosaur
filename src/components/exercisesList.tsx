import { h, JSX } from "preact";
import { useRef, useState } from "preact/hooks";
import { Thunk_pushExerciseStatsScreen } from "../ducks/thunks";
import { IDispatch } from "../ducks/types";
import { Equipment_getEquipmentNameForExerciseType } from "../models/equipment";
import {
  equipmentName,
  Exercise_get,
  Exercise_fullName,
  Exercise_onerm,
  Exercise_defaultRounding,
  Exercise_toKey,
  Exercise_isCustom,
  Exercise_filterExercises,
  Exercise_filterExercisesByType,
  Exercise_handleCustomExerciseChange,
  Exercise_createCustomExercise,
} from "../models/exercise";
import { equipments, exerciseKinds, IExerciseType, IProgram, ISettings, IWeight } from "../types";
import { CollectionUtils_uniqByExpr, CollectionUtils_compact } from "../utils/collection";
import { StringUtils_capitalize } from "../utils/string";
import { ExerciseImage } from "./exerciseImage";
import { GroupHeader } from "./groupHeader";
import { MenuItemWrapper } from "./menuItem";
import { Multiselect } from "./multiselect";
import { IHistoryRecord } from "../types";
import { Weight_print } from "../models/weight";
import { IconArrowRight } from "./icons/iconArrowRight";
import { LinkButton } from "./linkButton";
import { ObjectUtils_values } from "../utils/object";
import { Settings_activeCustomExercises } from "../models/settings";
import { Program_evaluate, Program_getAllUsedProgramExercises } from "../models/program";
import { BottomSheetCustomExercise } from "./bottomSheetCustomExercise";
import { Muscle_getAvailableMuscleGroups, Muscle_getMuscleGroupName } from "../models/muscle";

interface IExercisesListProps {
  dispatch: IDispatch;
  settings: ISettings;
  isLoggedIn: boolean;
  program: IProgram;
  history: IHistoryRecord[];
}

interface IExercisesListExercise extends IExerciseType {
  name: string;
  rm1: IWeight;
  equipmentName?: string;
  defaultRounding?: number;
}

function buildExercises(exerciseTypes: IExerciseType[], settings: ISettings): IExercisesListExercise[] {
  return exerciseTypes.map((e) => {
    const exercise = Exercise_get(e, settings.exercises);
    return {
      ...e,
      name: Exercise_fullName(exercise, settings),
      rm1: Exercise_onerm(e, settings),
      equipmentName: Equipment_getEquipmentNameForExerciseType(settings, e),
      defaultRounding: Exercise_defaultRounding(e, settings),
    };
  });
}

export function ExercisesList(props: IExercisesListProps): JSX.Element {
  const evaluatedProgram = Program_evaluate(props.program, props.settings);
  const textInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("");
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [showCustomExerciseModal, setShowCustomExerciseModal] = useState<boolean>(false);

  let programExercises = buildExercises(
    CollectionUtils_uniqByExpr(Program_getAllUsedProgramExercises(evaluatedProgram), (e) =>
      Exercise_toKey(e.exerciseType)
    ).map((e) => e.exerciseType),
    props.settings
  );
  const programExercisesKeys = new Set(programExercises.map((e) => Exercise_toKey(e)));
  let historyExercises = buildExercises(
    CollectionUtils_uniqByExpr(
      props.history
        .flatMap((hr) => hr.entries.map((e) => e.exercise))
        .filter(
          (e) => !programExercisesKeys.has(Exercise_toKey(e)) && !Exercise_isCustom(e.id, props.settings.exercises)
        ),
      (e) => Exercise_toKey(e)
    ),
    props.settings
  );
  let customExercises = buildExercises(
    CollectionUtils_compact(ObjectUtils_values(Settings_activeCustomExercises(props.settings))),
    props.settings
  );

  const filterOptions = [
    ...equipments.map((e) => equipmentName(e)),
    ...exerciseKinds.map(StringUtils_capitalize),
    ...Muscle_getAvailableMuscleGroups(props.settings).map((mg) => Muscle_getMuscleGroupName(mg, props.settings)),
  ];

  if (filter) {
    programExercises = Exercise_filterExercises(programExercises, filter);
    historyExercises = Exercise_filterExercises(historyExercises, filter);
    customExercises = Exercise_filterExercises(customExercises, filter);
  }
  if (filterTypes && filterTypes.length > 0) {
    programExercises = Exercise_filterExercisesByType(programExercises, filterTypes, props.settings);
    historyExercises = Exercise_filterExercisesByType(historyExercises, filterTypes, props.settings);
    customExercises = Exercise_filterExercisesByType(customExercises, filterTypes, props.settings);
  }

  programExercises.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });
  historyExercises.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });
  customExercises.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="pb-8">
      <form data-cy="exercises-list" onSubmit={(e) => e.preventDefault()}>
        <input
          ref={textInput}
          className="block w-full px-4 py-2 mb-2 text-base leading-normal border rounded-lg appearance-none bg-background-default border-border-neutral focus:outline-none focus:shadow-outline"
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
      <div className="text-sm text-right">
        <LinkButton name="create-custom-exercise" onClick={() => setShowCustomExerciseModal(true)}>
          Create custom exercise
        </LinkButton>
      </div>

      {customExercises.length > 0 && <GroupHeader name="Custom Exercises" topPadding={true} />}
      {customExercises.map((exercise) => {
        return (
          <ExerciseItem
            key={Exercise_toKey(exercise)}
            dispatch={props.dispatch}
            settings={props.settings}
            exercise={exercise}
          />
        );
      })}

      {programExercises.length > 0 && <GroupHeader name="Current program exercises" topPadding={true} />}
      {programExercises.map((exercise) => {
        return (
          <ExerciseItem
            key={Exercise_toKey(exercise)}
            dispatch={props.dispatch}
            settings={props.settings}
            exercise={exercise}
          />
        );
      })}
      {historyExercises.length > 0 && <GroupHeader name="Exercises from history" topPadding={true} />}
      {historyExercises.map((exercise) => {
        return (
          <ExerciseItem
            key={Exercise_toKey(exercise)}
            dispatch={props.dispatch}
            settings={props.settings}
            exercise={exercise}
          />
        );
      })}
      {showCustomExerciseModal && (
        <BottomSheetCustomExercise
          settings={props.settings}
          onClose={() => setShowCustomExerciseModal(false)}
          onChange={(action, exercise, notes) => {
            Exercise_handleCustomExerciseChange(props.dispatch, action, exercise, notes, props.settings, props.program);
          }}
          dispatch={props.dispatch}
          isHidden={!showCustomExerciseModal}
          isLoggedIn={props.isLoggedIn}
          exercise={Exercise_createCustomExercise("", [], [], [])}
        />
      )}
    </div>
  );
}

interface IExerciseItemProps {
  dispatch: IDispatch;
  settings: ISettings;
  exercise: IExercisesListExercise;
}

function ExerciseItem(props: IExerciseItemProps): JSX.Element {
  return (
    <MenuItemWrapper
      name={props.exercise.name}
      onClick={() => {
        props.dispatch(Thunk_pushExerciseStatsScreen(props.exercise));
      }}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center">
          <div style={{ marginTop: "-1px" }}>
            <div className="p-1 my-1 rounded-lg bg-background-image">
              <ExerciseImage
                useTextForCustomExercise={true}
                settings={props.settings}
                className="w-8"
                exerciseType={props.exercise}
                size="small"
              />
            </div>
          </div>
        </div>
        <div className="flex-1 pt-3 pb-1 text-left">
          <div>{props.exercise.name}</div>
          <div className="flex text-xs text-text-secondary">
            <div className="mr-2">
              <strong>1RM:</strong> {Weight_print(props.exercise.rm1)},
            </div>
            {props.exercise.equipmentName ? (
              <div>
                <strong>Equipment:</strong> {props.exercise.equipmentName}
              </div>
            ) : (
              <div>
                <strong>Default rounding:</strong> {props.exercise.defaultRounding}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center py-2 pl-2">
          <IconArrowRight style={{ color: "#a0aec0" }} />
        </div>
      </div>
    </MenuItemWrapper>
  );
}
