import { JSX, memo, useCallback, useMemo, useState } from "react";
import { View, Pressable, Platform, ActionSheetIOS } from "react-native";
import { Text } from "./primitives/text";
import { IHistoryEntry, IHistoryRecord, IProgramState, ISettings, IStats, ISubscription } from "../types";
import { IState, updateProgress, updateSettings, updateState } from "../models/state";
import { lb } from "lens-shmens";
import { ExerciseImage } from "./exerciseImage";
import {
  Exercise_get,
  Exercise_getNotes,
  Exercise_onerm,
  Exercise_nameWithEquipment,
  Exercise_fullName,
} from "../models/exercise";
import { IconArrowRight } from "./icons/iconArrowRight";
import { LinkButton } from "./linkButton";
import { ProgramExercise_doesUse1RM } from "../models/programExercise";
import { Weight_print, Weight_build } from "../models/weight";
import { WorkoutPlatesCalculator } from "./workoutPlatesCalculator";
import { Markdown } from "./markdown";
import { CollectionUtils_removeAt } from "../utils/collection";
import { IconKebab } from "./icons/iconKebab";
import { Subscriptions_hasSubscription } from "../utils/subscriptions";
import { Thunk_pushExerciseStatsScreen, Thunk_pushToEditProgramExercise } from "../ducks/thunks";
import { WorkoutExerciseAllSets } from "./workoutExerciseAllSets";
import {
  WorkoutExerciseUtils_getBgColor50,
  WorkoutExerciseUtils_getBorderColor100,
} from "../utils/workoutExerciseUtils";
import { DropdownMenu, DropdownMenuItem } from "./dropdownMenu";
import { IconSwap } from "./icons/iconSwap";
import { IconTrash } from "./icons/iconTrash";
import { IconEdit2 } from "./icons/iconEdit2";
import { TextareaAutogrow } from "./textareaAutogrow";
import { Progress_getNextSupersetEntry, Progress_doesUse1RM, Progress_editExerciseNotes } from "../models/progress";
import { StringUtils_dashcase } from "../utils/string";
import { GroupHeader } from "./groupHeader";
import { Settings_getNextTargetType } from "../models/settings";
import { History_collectLastEntry, History_collectLastNote } from "../models/history";
import { DateUtils_format } from "../utils/date";
import { IDispatch } from "../ducks/types";
import { IEvaluatedProgram, IEvaluatedProgramDay, Program_getProgramExerciseForKeyAndDay } from "../models/program";
import {
  Equipment_getEquipmentNameForExerciseType,
  Equipment_getEquipmentDataForExerciseType,
} from "../models/equipment";
import { PlannerProgramExercise_currentDescription } from "../pages/planner/models/plannerProgramExercise";
import { Collector } from "../utils/collector";
import { IByExercise } from "../pages/planner/plannerEvaluator";
import { IconReorder } from "./icons/iconReorder";
import { navigationRef } from "../navigation/navigationRef";
import { Dialog_confirm } from "../utils/dialog";

interface IWorkoutExerciseCardProps {
  entry: IHistoryEntry;
  entryIndex: number;
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  day: number;
  history: IHistoryRecord[];
  progressId: number;
  progressStartTime: number;
  progressEntries: IHistoryEntry[];
  progressUserPromptedStateVars?: Partial<Record<string, IProgramState>>;
  isCurrentProgress: boolean;
  stats: IStats;
  settings: ISettings;
  dispatch: IDispatch;
  subscription: ISubscription;
  hidePlatesCalculator?: boolean;
  showHelp?: boolean;
  helps: string[];
  otherStates?: IByExercise<IProgramState>;
}

type IKebabAction = "edit" | "swap" | "superset" | "remove";

function WorkoutExerciseCardInner(props: IWorkoutExerciseCardProps): JSX.Element {
  const programExercise =
    props.program && props.entry.programExerciseId
      ? Program_getProgramExerciseForKeyAndDay(props.program, props.day, props.entry.programExerciseId)
      : undefined;
  const exerciseType = props.entry.exercise;
  const exercise = Exercise_get(exerciseType, props.settings.exercises);
  const currentEquipmentName = Equipment_getEquipmentNameForExerciseType(props.settings, exercise);
  const currentEquipmentNotes = Equipment_getEquipmentDataForExerciseType(props.settings, exercise)?.notes;
  const exerciseNotes = Exercise_getNotes(exerciseType, props.settings);
  const description = programExercise ? PlannerProgramExercise_currentDescription(programExercise) : undefined;
  const onerm = Exercise_onerm(exercise, props.settings);
  const nextSet = useMemo(
    () => [...props.entry.warmupSets, ...props.entry.sets].filter((s) => !s.isCompleted)[0],
    [props.entry.warmupSets, props.entry.sets]
  );
  const lbSets = useMemo(() => lb<IHistoryRecord>().p("entries").i(props.entryIndex).p("sets"), [props.entryIndex]);
  const lbWarmupSets = useMemo(
    () => lb<IHistoryRecord>().p("entries").i(props.entryIndex).p("warmupSets"),
    [props.entryIndex]
  );
  const programExerciseId = props.entry.programExerciseId;

  const historyCollector = Collector.build(props.history)
    .addFn(History_collectLastEntry(props.progressStartTime, exerciseType))
    .addFn(History_collectLastNote(props.progressStartTime, exerciseType));

  const [{ lastHistoryEntry }, { lastNote, timestamp }] = useMemo(
    () => historyCollector.run(),
    [props.history, exerciseType, props.settings]
  );

  const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);
  const supersetEntry = Progress_getNextSupersetEntry(props.progressEntries, props.entry);
  const supersetExercise = supersetEntry ? Exercise_get(supersetEntry.exercise, props.settings.exercises) : undefined;

  const { dispatch, entry, entryIndex, progressId, settings } = props;
  const entryExercise = entry.exercise;
  const entryId = entry.id;
  const pickerSort = settings.workoutSettings.pickerSort;

  const openEquipmentModal = useCallback((): void => {
    updateProgress(
      dispatch,
      [lb<IHistoryRecord>().pi("ui", {}).p("equipmentModal").record({ exerciseType: entryExercise })],
      "change-equipment"
    );
    navigationRef.navigate("equipmentModal", { context: "workout", progressId });
  }, [dispatch, entryExercise, progressId]);

  const openSupersetPicker = useCallback((): void => {
    updateProgress(
      dispatch,
      [lb<IHistoryRecord>().pi("ui", {}).p("showSupersetPicker").record(entry)],
      "change-superset"
    );
    navigationRef.navigate("supersetPickerModal", { progressId });
  }, [dispatch, entry, progressId]);

  const openRm1Modal = useCallback((): void => {
    updateProgress(
      dispatch,
      [lb<IHistoryRecord>().pi("ui", {}).p("rm1Modal").record({ exerciseType: entryExercise })],
      "change-rm1"
    );
    navigationRef.navigate("rm1Modal", { context: "workout", progressId });
  }, [dispatch, entryExercise, progressId]);

  const swapExercise = useCallback((): void => {
    updateProgress(
      dispatch,
      [
        lb<IHistoryRecord>()
          .pi("ui", {})
          .p("exercisePicker")
          .record({
            state: {
              mode: "workout",
              screenStack: ["exercisePicker"],
              sort: pickerSort ?? "name_asc",
              filters: {},
              selectedExercises: [],
              entryIndex,
              exerciseType: entryExercise,
            },
          }),
      ],
      "kebab-swap-exercise"
    );
  }, [dispatch, entryExercise, entryIndex, pickerSort]);

  const editSuperset = useCallback((): void => {
    updateProgress(
      dispatch,
      [lb<IHistoryRecord>().pi("ui", {}).p("showSupersetPicker").record(entry)],
      "kebab-edit-superset"
    );
    navigationRef.navigate("supersetPickerModal", { progressId });
  }, [dispatch, entry, progressId]);

  const removeExercise = useCallback(async (): Promise<void> => {
    if (!(await Dialog_confirm("Do you want to remove this exercise in this workout only?"))) {
      return;
    }
    updateProgress(
      dispatch,
      [
        lb<IHistoryRecord>()
          .p("entries")
          .recordModify((entries) => {
            const newEntries = CollectionUtils_removeAt(entries, entryIndex);
            for (const e of newEntries) {
              if (e.superset && e.superset === entryId) {
                e.superset = undefined;
              }
            }
            return newEntries;
          }),
        lb<IHistoryRecord>()
          .pi("ui", {})
          .p("currentEntryIndex")
          .recordModify((index) => Math.max(0, (index ?? 0) - 1)),
      ],
      "kebab-delete-exercise"
    );
  }, [dispatch, entryIndex, entryId]);

  const editProgramExercise = useCallback((): void => {
    if (programExercise) {
      dispatch(Thunk_pushToEditProgramExercise(programExercise.key, programExercise.dayData, true));
    }
  }, [dispatch, programExercise]);

  const runKebabAction = useCallback(
    (action: IKebabAction): void => {
      setIsKebabMenuOpen(false);
      if (action === "edit") {
        editProgramExercise();
      } else if (action === "swap") {
        swapExercise();
      } else if (action === "superset") {
        editSuperset();
      } else if (action === "remove") {
        removeExercise().catch(() => undefined);
      }
    },
    [editProgramExercise, swapExercise, editSuperset, removeExercise]
  );

  const kebabActions = useMemo<Array<{ action: IKebabAction; label: string }>>(() => {
    const actions: Array<{ action: IKebabAction; label: string }> = [];
    if (programExercise && programExerciseId) {
      actions.push({ action: "edit", label: "Edit Program Exercise" });
    }
    actions.push({ action: "swap", label: "Swap Exercise" });
    actions.push({ action: "superset", label: "Edit Superset" });
    actions.push({ action: "remove", label: "Remove Exercise" });
    return actions;
  }, [programExercise, programExerciseId]);

  const helps = props.helps;
  const onStopShowingHint = useCallback((): void => {
    if (!helps.includes("swipeable-set")) {
      updateState(
        dispatch,
        [
          lb<IState>()
            .p("storage")
            .p("helps")
            .recordModify((hs) => Array.from(new Set([...hs, "swipeable-set"]))),
        ],
        "Stop showing swipe hint"
      );
    }
  }, [dispatch, helps]);

  const subscription = props.subscription;
  const onTargetClick = useCallback((): void => {
    updateSettings(
      dispatch,
      lb<ISettings>()
        .p("workoutSettings")
        .p("targetType")
        .recordModify((type) =>
          Settings_getNextTargetType(type, !Subscriptions_hasSubscription(subscription) || !currentEquipmentName)
        ),
      "Change target type"
    );
  }, [dispatch, subscription, currentEquipmentName]);

  const onKebabPress = useCallback((): void => {
    if (Platform.OS === "web") {
      setIsKebabMenuOpen(true);
      return;
    }
    const labels = kebabActions.map((a) => a.label).concat("Cancel");
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: labels,
        cancelButtonIndex: labels.length - 1,
        destructiveButtonIndex: kebabActions.findIndex((a) => a.action === "remove"),
      },
      (buttonIndex) => {
        if (buttonIndex != null && buttonIndex < kebabActions.length) {
          runKebabAction(kebabActions[buttonIndex].action);
        }
      }
    );
  }, [kebabActions, runKebabAction]);

  return (
    <View
      data-cy={`entry-${StringUtils_dashcase(exercise.name)}`}
      className={`py-1 border rounded-xl ${WorkoutExerciseUtils_getBgColor50(
        props.entry.sets,
        false
      )} ${WorkoutExerciseUtils_getBorderColor100(props.entry.sets, false)}`}
    >
      <View className="px-4">
        <View className="flex-row">
          <Pressable
            onPress={() => props.dispatch(Thunk_pushExerciseStatsScreen(props.entry.exercise))}
            className="px-2 rounded-lg bg-background-image"
            style={{ width: 64, marginLeft: -8 }}
            data-cy="workout-exercise-image"
            testID="workout-exercise-image"
          >
            <ExerciseImage settings={props.settings} className="w-full" exerciseType={exerciseType} size="small" />
          </Pressable>
          <View className="flex-1 min-w-0 mt-2 ml-2">
            <Pressable
              className="flex-row items-center"
              data-cy="exercise-name"
              testID="exercise-name"
              onPress={() => props.dispatch(Thunk_pushExerciseStatsScreen(props.entry.exercise))}
            >
              <Text className="pr-1 text-lg font-bold">{Exercise_nameWithEquipment(exercise, props.settings)}</Text>
              <IconArrowRight />
            </Pressable>
            <View data-cy="exercise-equipment" className="flex-row flex-wrap">
              <Text className="text-sm text-text-secondary">Equipment: </Text>
              <LinkButton
                name="exercise-equipment-picker"
                data-cy="exercise-equipment-picker"
                onClick={openEquipmentModal}
              >
                {currentEquipmentName || "None"}
              </LinkButton>
            </View>
            {supersetExercise && (
              <View data-cy="exercise-superset" className="flex-row flex-wrap">
                <Text className="text-sm text-text-secondary">Supersets with: </Text>
                <LinkButton
                  name="exercise-superset-picker"
                  data-cy="exercise-superset-picker"
                  onClick={openSupersetPicker}
                >
                  {Exercise_fullName(supersetExercise, props.settings)}
                </LinkButton>
              </View>
            )}
            {currentEquipmentNotes && (
              <View className="mt-1">
                <Markdown value={currentEquipmentNotes} />
              </View>
            )}
            {((programExercise && ProgramExercise_doesUse1RM(programExercise)) || Progress_doesUse1RM(props.entry)) && (
              <View data-cy="exercise-rm1" className="flex-row flex-wrap">
                <Text className="text-sm text-text-secondary">1RM: </Text>
                <LinkButton name="exercise-rm1-picker" data-cy="exercise-rm1-picker" onClick={openRm1Modal}>
                  {Weight_print(onerm)}
                </LinkButton>
              </View>
            )}
          </View>
          <View className="relative">
            <Pressable
              data-cy="exercise-options"
              testID="exercise-options"
              className="px-4 py-2"
              style={{ marginRight: -12 }}
              onPress={onKebabPress}
            >
              <IconKebab />
            </Pressable>
            {Platform.OS === "web" && isKebabMenuOpen && (
              <DropdownMenu rightOffset="2rem" onClose={() => setIsKebabMenuOpen(false)} maxWidth="20rem">
                {programExercise && programExerciseId && (
                  <DropdownMenuItem isTop={true} data-cy="exercise-edit-mode" onClick={() => runKebabAction("edit")}>
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <IconEdit2 size={22} />
                      <Text>Edit Program Exercise</Text>
                    </View>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  data-cy="exercise-swap"
                  isTop={!programExercise || !programExerciseId}
                  onClick={() => runKebabAction("swap")}
                >
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <IconSwap size={18} />
                    <Text>Swap Exercise</Text>
                  </View>
                </DropdownMenuItem>
                <DropdownMenuItem data-cy="exercise-superset" onClick={() => runKebabAction("superset")}>
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <IconReorder size={18} />
                    <Text>Edit Superset</Text>
                  </View>
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-cy="edit-exercise-kebab-remove-exercise"
                  onClick={() => runKebabAction("remove")}
                >
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <IconTrash width={15} height={18} />
                    <Text>Remove Exercise</Text>
                  </View>
                </DropdownMenuItem>
              </DropdownMenu>
            )}
          </View>
        </View>
        {exerciseNotes && (
          <View className="mt-1">
            {exerciseNotes && description && <GroupHeader name="Exercise Notes" />}
            <Markdown value={exerciseNotes} />
          </View>
        )}
        {description && (
          <View className="mt-1">
            {exerciseNotes && description && <GroupHeader name="Program Exercise Description" />}
            <Markdown value={description} />
          </View>
        )}
        {lastNote && timestamp && (
          <View>
            <GroupHeader name={`Previous Note (from ${DateUtils_format(timestamp)})`} />
            <View className="pl-1 mb-1 border-purplev3-300" style={{ borderLeftWidth: 4 }}>
              <Text className="text-sm">{lastNote}</Text>
            </View>
          </View>
        )}
        <View>
          <TextareaAutogrow
            debounceMs={1000}
            data-cy="exercise-notes-input"
            id="exercise-notes"
            maxLength={4095}
            name="exercise-notes"
            placeholder="Add workout notes for this exercise here..."
            value={props.entry.notes}
            onChangeText={(text) => {
              Progress_editExerciseNotes(props.dispatch, props.entryIndex, text);
            }}
            className="mt-1"
          />
        </View>
      </View>
      {!props.hidePlatesCalculator &&
        nextSet &&
        currentEquipmentName &&
        (nextSet.completedWeight || nextSet.weight) && (
          <View className="mx-4">
            <WorkoutPlatesCalculator
              entry={props.entry}
              weight={nextSet.completedWeight ?? nextSet.weight ?? Weight_build(0, props.settings.units)}
              subscription={props.subscription}
              settings={props.settings}
              dispatch={props.dispatch}
            />
          </View>
        )}
      <View className="mt-1">
        <WorkoutExerciseAllSets
          stats={props.stats}
          isPlayground={false}
          helps={props.helps}
          onStopShowingHint={onStopShowingHint}
          isCurrentProgress={props.isCurrentProgress}
          day={props.day}
          program={props.program}
          userPromptedStateVars={
            programExercise ? props.progressUserPromptedStateVars?.[programExercise.key] : undefined
          }
          programExercise={programExercise}
          entryIndex={props.entryIndex}
          onTargetClick={onTargetClick}
          otherStates={props.otherStates}
          lastSets={lastHistoryEntry?.sets}
          lbSets={lbSets}
          lbWarmupSets={lbWarmupSets}
          exerciseType={exerciseType}
          entry={props.entry}
          settings={props.settings}
          dispatch={props.dispatch}
          subscription={props.subscription}
        />
      </View>
    </View>
  );
}

export const WorkoutExerciseCard = memo(WorkoutExerciseCardInner);
