import { JSX, useState } from "react";
import { View, TextInput } from "react-native";
import { Text } from "./primitives/text";
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
import { Muscle_getAvailableMuscleGroups, Muscle_getMuscleGroupName } from "../models/muscle";
import { navigationRef } from "../navigation/navigationRef";

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
  const [filter, setFilter] = useState<string>("");
  const [filterTypes, setFilterTypes] = useState<string[]>([]);

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

  programExercises.sort((a, b) => a.name.localeCompare(b.name));
  historyExercises.sort((a, b) => a.name.localeCompare(b.name));
  customExercises.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View className="pb-8">
      <View data-cy="exercises-list" data-testid="exercises-list">
        <TextInput
          data-cy="exercises-list-filter" data-testid="exercises-list-filter"
          testID="exercises-list-filter"
          className="px-4 py-2 mb-2 text-base border rounded-lg bg-background-default border-border-neutral"
          value={filter}
          placeholder="Filter by name"
          onChangeText={(t) => setFilter(t.toLowerCase())}
        />
        <Multiselect
          id="filtertypes"
          label=""
          placeholder="Filter by type"
          values={filterOptions}
          initialSelectedValues={new Set()}
          onChange={(ft) => setFilterTypes(Array.from(ft))}
        />
      </View>
      <View className="items-end">
        <LinkButton name="create-custom-exercise" onClick={() => navigationRef.navigate("customExerciseModal", {})}>
          Create custom exercise
        </LinkButton>
      </View>

      {customExercises.length > 0 && <GroupHeader name="Custom Exercises" topPadding={true} />}
      {customExercises.map((exercise) => (
        <ExerciseItem
          key={Exercise_toKey(exercise)}
          dispatch={props.dispatch}
          settings={props.settings}
          exercise={exercise}
        />
      ))}

      {programExercises.length > 0 && <GroupHeader name="Current program exercises" topPadding={true} />}
      {programExercises.map((exercise) => (
        <ExerciseItem
          key={Exercise_toKey(exercise)}
          dispatch={props.dispatch}
          settings={props.settings}
          exercise={exercise}
        />
      ))}
      {historyExercises.length > 0 && <GroupHeader name="Exercises from history" topPadding={true} />}
      {historyExercises.map((exercise) => (
        <ExerciseItem
          key={Exercise_toKey(exercise)}
          dispatch={props.dispatch}
          settings={props.settings}
          exercise={exercise}
        />
      ))}
    </View>
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
      <View className="flex-row items-center gap-2">
        <View className="items-center justify-center">
          <View className="p-1 my-1 rounded-lg bg-background-image">
            <ExerciseImage
              useTextForCustomExercise={true}
              settings={props.settings}
              className="w-8"
              exerciseType={props.exercise}
              size="small"
            />
          </View>
        </View>
        <View className="flex-1 py-2">
          <Text className="text-base text-text-primary">{props.exercise.name}</Text>
          <View className="flex-row text-xs text-text-secondary">
            <Text className="mr-2 text-xs text-text-secondary">
              <Text className="text-xs font-bold text-text-secondary">1RM:</Text> {Weight_print(props.exercise.rm1)},
            </Text>
            {props.exercise.equipmentName ? (
              <Text className="text-xs text-text-secondary">
                <Text className="text-xs font-bold text-text-secondary">Equipment:</Text> {props.exercise.equipmentName}
              </Text>
            ) : (
              <Text className="text-xs text-text-secondary">
                <Text className="text-xs font-bold text-text-secondary">Default rounding:</Text>{" "}
                {props.exercise.defaultRounding}
              </Text>
            )}
          </View>
        </View>
        <View className="items-center py-2 pl-2">
          <IconArrowRight style={{ color: "#a0aec0" }} />
        </View>
      </View>
    </MenuItemWrapper>
  );
}
