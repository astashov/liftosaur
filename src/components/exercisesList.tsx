import { JSX, memo, useMemo, useState } from "react";
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
import { Weight_eqeq, Weight_print } from "../models/weight";
import { IconArrowRight } from "./icons/iconArrowRight";
import { LinkButton } from "./linkButton";
import { ObjectUtils_values } from "../utils/object";
import { Settings_activeCustomExercises } from "../models/settings";
import { Program_evaluate, Program_getAllUsedProgramExercises } from "../models/program";
import { Muscle_getAvailableMuscleGroups, Muscle_getMuscleGroupName } from "../models/muscle";
import { navigationRef } from "../navigation/navigationRef";
import { useProgressiveItems } from "../utils/useProgressiveItems";

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
  const { settings, program, history, dispatch } = props;
  const [filter, setFilter] = useState<string>("");
  const [filterTypes, setFilterTypes] = useState<string[]>([]);

  const evaluatedProgram = useMemo(() => Program_evaluate(program, settings), [program, settings]);

  const allBuilt = useMemo(() => {
    const programExs = buildExercises(
      CollectionUtils_uniqByExpr(Program_getAllUsedProgramExercises(evaluatedProgram), (e) =>
        Exercise_toKey(e.exerciseType)
      ).map((e) => e.exerciseType),
      settings
    );
    const programKeys = new Set(programExs.map((e) => Exercise_toKey(e)));
    const historyExs = buildExercises(
      CollectionUtils_uniqByExpr(
        history
          .flatMap((hr) => hr.entries.map((e) => e.exercise))
          .filter((e) => !programKeys.has(Exercise_toKey(e)) && !Exercise_isCustom(e.id, settings.exercises)),
        (e) => Exercise_toKey(e)
      ),
      settings
    );
    const customExs = buildExercises(
      CollectionUtils_compact(ObjectUtils_values(Settings_activeCustomExercises(settings))),
      settings
    );
    programExs.sort((a, b) => a.name.localeCompare(b.name));
    historyExs.sort((a, b) => a.name.localeCompare(b.name));
    customExs.sort((a, b) => a.name.localeCompare(b.name));
    return { programExs, historyExs, customExs };
  }, [
    evaluatedProgram,
    history,
    settings.exercises,
    settings.exerciseData,
    settings.gyms,
    settings.currentGymId,
    settings.units,
  ]);

  const filterOptions = useMemo(
    () => [
      ...equipments.map((e) => equipmentName(e)),
      ...exerciseKinds.map(StringUtils_capitalize),
      ...Muscle_getAvailableMuscleGroups(settings).map((mg) => Muscle_getMuscleGroupName(mg, settings)),
    ],
    [settings]
  );

  const { programExercises, historyExercises, customExercises } = useMemo(() => {
    let p = allBuilt.programExs;
    let h = allBuilt.historyExs;
    let c = allBuilt.customExs;
    if (filter) {
      p = Exercise_filterExercises(p, filter);
      h = Exercise_filterExercises(h, filter);
      c = Exercise_filterExercises(c, filter);
    }
    if (filterTypes && filterTypes.length > 0) {
      p = Exercise_filterExercisesByType(p, filterTypes, settings);
      h = Exercise_filterExercisesByType(h, filterTypes, settings);
      c = Exercise_filterExercisesByType(c, filterTypes, settings);
    }
    return { programExercises: p, historyExercises: h, customExercises: c };
  }, [allBuilt, filter, filterTypes, settings]);

  type ISection = "custom" | "program" | "history";
  const allExercises = useMemo<{ section: ISection; exercise: IExercisesListExercise }[]>(
    () => [
      ...customExercises.map((e) => ({ section: "custom" as const, exercise: e })),
      ...programExercises.map((e) => ({ section: "program" as const, exercise: e })),
      ...historyExercises.map((e) => ({ section: "history" as const, exercise: e })),
    ],
    [customExercises, programExercises, historyExercises]
  );
  const visibleExercises = useProgressiveItems(allExercises, {
    initialBatch: 10,
    batchSize: 20,
    debugLabel: "ExercisesList",
    resetKey: `${filter}|${filterTypes.join(",")}`,
  });
  const visibleCustom = useMemo(
    () => visibleExercises.filter((x) => x.section === "custom").map((x) => x.exercise),
    [visibleExercises]
  );
  const visibleProgram = useMemo(
    () => visibleExercises.filter((x) => x.section === "program").map((x) => x.exercise),
    [visibleExercises]
  );
  const visibleHistoryEx = useMemo(
    () => visibleExercises.filter((x) => x.section === "history").map((x) => x.exercise),
    [visibleExercises]
  );

  return (
    <View className="pb-8">
      <View data-testid="exercises-list">
        <TextInput
          data-testid="exercises-list-filter"
          testID="exercises-list-filter"
          className="px-4 py-2 mb-2 text-base border rounded-lg bg-background-default border-border-neutral text-text-primary"
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

      {visibleCustom.length > 0 && <GroupHeader name="Custom Exercises" topPadding={true} />}
      {visibleCustom.map((exercise) => (
        <ExerciseItem key={Exercise_toKey(exercise)} dispatch={dispatch} settings={settings} exercise={exercise} />
      ))}

      {visibleProgram.length > 0 && <GroupHeader name="Current program exercises" topPadding={true} />}
      {visibleProgram.map((exercise) => (
        <ExerciseItem key={Exercise_toKey(exercise)} dispatch={dispatch} settings={settings} exercise={exercise} />
      ))}
      {visibleHistoryEx.length > 0 && <GroupHeader name="Exercises from history" topPadding={true} />}
      {visibleHistoryEx.map((exercise) => (
        <ExerciseItem key={Exercise_toKey(exercise)} dispatch={dispatch} settings={settings} exercise={exercise} />
      ))}
    </View>
  );
}

interface IExerciseItemProps {
  dispatch: IDispatch;
  settings: ISettings;
  exercise: IExercisesListExercise;
}

function areExerciseItemPropsEqual(prev: IExerciseItemProps, next: IExerciseItemProps): boolean {
  if (prev.dispatch !== next.dispatch) {
    return false;
  }
  if (prev.settings.exercises !== next.settings.exercises) {
    return false;
  }
  const a = prev.exercise;
  const b = next.exercise;
  return (
    a.id === b.id &&
    a.equipment === b.equipment &&
    a.name === b.name &&
    a.equipmentName === b.equipmentName &&
    a.defaultRounding === b.defaultRounding &&
    Weight_eqeq(a.rm1, b.rm1)
  );
}

const ExerciseItem = memo(function ExerciseItem(props: IExerciseItemProps): JSX.Element {
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
          <IconArrowRight />
        </View>
      </View>
    </MenuItemWrapper>
  );
}, areExerciseItemPropsEqual);
