import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, Modal as RNModal } from "react-native";
import type { IDispatch } from "@shared/ducks/types";
import type { IHistoryEntry, IHistoryRecord, IProgramState, ISettings, IStats, ISubscription } from "@shared/types";
import { updateProgress, updateSettings, updateState } from "@shared/models/state";
import { lb } from "lens-shmens";
import {
  Exercise_get,
  Exercise_getNotes,
  Exercise_onerm,
  Exercise_nameWithEquipment,
  Exercise_fullName,
} from "@shared/models/exercise";
import { IconArrowRight } from "./icons/IconArrowRight";
import { LinkButton } from "./LinkButton";
import { ProgramExercise_doesUse1RM } from "@shared/models/programExercise";
import { Weight_print } from "@shared/models/weight";
import { MarkdownSimple } from "./MarkdownSimple";
import { CollectionUtils_removeAt } from "@shared/utils/collection";
import { IconKebab } from "./icons/IconKebab";
import { Subscriptions_hasSubscription } from "@shared/utils/subscriptions";
import { Thunk_pushExerciseStatsScreen, Thunk_pushToEditProgramExercise } from "@shared/ducks/thunks";
import { WorkoutExerciseAllSets } from "./WorkoutExerciseAllSets";
import {
  WorkoutExerciseUtils_getBgColor50,
  WorkoutExerciseUtils_getBorderColor100,
} from "@shared/utils/workoutExerciseUtils";
import { IconSwap } from "./icons/IconSwap";
import { IconTrash } from "./icons/IconTrash";
import { IconEdit2 } from "./icons/IconEdit2";
import { IconReorder } from "./icons/IconReorder";
import {
  Progress_getNextSupersetEntry,
  Progress_doesUse1RM,
  Progress_editExerciseNotes,
  Progress_isCurrent,
} from "@shared/models/progress";
import { GroupHeader } from "./GroupHeader";
import { Settings_getNextTargetType } from "@shared/models/settings";
import { History_collectLastEntry, History_collectLastNote } from "@shared/models/history";
import { DateUtils_format } from "@shared/utils/date";
import type { IEvaluatedProgram, IEvaluatedProgramDay } from "@shared/models/program";
import { Program_getProgramExerciseForKeyAndDay } from "@shared/models/program";
import {
  Equipment_getEquipmentNameForExerciseType,
  Equipment_getEquipmentDataForExerciseType,
} from "@shared/models/equipment";
import { PlannerProgramExercise_currentDescription } from "@shared/pages/planner/models/plannerProgramExercise";
import { Collector } from "@shared/utils/collector";
import type { IByExercise } from "@shared/pages/planner/plannerEvaluator";
import { ExerciseImage } from "./ExerciseImage";
import { Alert, Platform } from "react-native";

interface IProps {
  entry: IHistoryEntry;
  entryIndex: number;
  program?: IEvaluatedProgram;
  programDay?: IEvaluatedProgramDay;
  day: number;
  history: IHistoryRecord[];
  progress: IHistoryRecord;
  stats: IStats;
  settings: ISettings;
  dispatch: IDispatch;
  subscription: ISubscription;
  otherStates?: IByExercise<IProgramState>;
}

export function WorkoutExerciseCard(props: IProps): React.ReactElement {
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
  const lbSets = lb<IHistoryRecord>().p("entries").i(props.entryIndex).p("sets");
  const lbWarmupSets = lb<IHistoryRecord>().p("entries").i(props.entryIndex).p("warmupSets");
  const programExerciseId = props.entry.programExerciseId;

  const historyCollector = Collector.build(props.history)
    .addFn(History_collectLastEntry(props.progress.startTime, exerciseType))
    .addFn(History_collectLastNote(props.progress.startTime, exerciseType));

  const [{ lastHistoryEntry }, { lastNote, timestamp }] = useMemo(
    () => historyCollector.run(),
    [props.history, exerciseType, props.settings]
  );

  const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);
  const supersetEntry = Progress_getNextSupersetEntry(props.progress.entries, props.entry);
  const supersetExercise = supersetEntry ? Exercise_get(supersetEntry.exercise, props.settings.exercises) : undefined;

  return (
    <View
      className={`py-1 border rounded-xl ${WorkoutExerciseUtils_getBgColor50(props.entry.sets, false)} ${WorkoutExerciseUtils_getBorderColor100(props.entry.sets, false)}`}
    >
      <View className="px-4">
        <View className="flex-row">
          <Pressable
            className="rounded-lg bg-background-image"
            style={{ width: 64 }}
            onPress={() => props.dispatch(Thunk_pushExerciseStatsScreen(props.entry.exercise))}
          >
            <ExerciseImage settings={props.settings} exerciseType={exerciseType} size="small" width={60} />
          </Pressable>
          <View className="flex-1 ml-2 mt-2">
            <Pressable
              className="flex-row items-center"
              onPress={() => props.dispatch(Thunk_pushExerciseStatsScreen(props.entry.exercise))}
            >
              <Text className="text-lg font-bold" numberOfLines={1}>
                {Exercise_nameWithEquipment(exercise, props.settings)}
              </Text>
              <IconArrowRight style={{ marginBottom: 2, marginLeft: 4 }} />
            </Pressable>
            <View className="flex-row items-center">
              <Text className="text-sm text-text-secondary">Equipment: </Text>
              <LinkButton
                name="exercise-equipment-picker"
                data-cy="exercise-equipment-picker"
                onPress={() => {
                  updateProgress(
                    props.dispatch,
                    [lb<IHistoryRecord>().pi("ui").p("equipmentModal").record({ exerciseType: props.entry.exercise })],
                    "change-equipment"
                  );
                }}
              >
                {currentEquipmentName || "None"}
              </LinkButton>
            </View>
            {supersetExercise && (
              <View className="flex-row items-center">
                <Text className="text-sm text-text-secondary">Supersets with: </Text>
                <LinkButton
                  name="exercise-superset-picker"
                  onPress={() => {
                    updateProgress(
                      props.dispatch,
                      [lb<IHistoryRecord>().pi("ui").p("showSupersetPicker").record(props.entry)],
                      "change-superset"
                    );
                  }}
                >
                  {Exercise_fullName(supersetExercise, props.settings)}
                </LinkButton>
              </View>
            )}
            {currentEquipmentNotes && (
              <View className="text-xs">
                <MarkdownSimple value={currentEquipmentNotes} />
              </View>
            )}
            {((programExercise && ProgramExercise_doesUse1RM(programExercise)) || Progress_doesUse1RM(props.entry)) && (
              <View className="flex-row items-center">
                <Text className="text-sm text-text-secondary">1RM: </Text>
                <LinkButton
                  name="exercise-rm1-picker"
                  onPress={() => {
                    updateProgress(
                      props.dispatch,
                      [lb<IHistoryRecord>().pi("ui").p("rm1Modal").record({ exerciseType: props.entry.exercise })],
                      "change-rm1"
                    );
                  }}
                >
                  {Weight_print(onerm)}
                </LinkButton>
              </View>
            )}
          </View>
          <View>
            <Pressable data-cy="exercise-options" className="px-4 py-2" onPress={() => setIsKebabMenuOpen(true)}>
              <IconKebab />
            </Pressable>
          </View>
        </View>
        {exerciseNotes && (
          <View className="mt-1">
            {exerciseNotes && description && <GroupHeader name="Exercise Notes" />}
            <MarkdownSimple value={exerciseNotes} />
          </View>
        )}
        {description && (
          <View className="mt-1">
            {exerciseNotes && description && <GroupHeader name="Program Exercise Description" />}
            <MarkdownSimple value={description} />
          </View>
        )}
        {lastNote && timestamp && (
          <View>
            <GroupHeader name={`Previous Note (from ${DateUtils_format(timestamp)})`} />
            <View className="pl-1 mb-1 border-l-4 border-purplev3-300">
              <Text className="text-sm">{lastNote}</Text>
            </View>
          </View>
        )}
        <TextInput
          data-cy="exercise-notes-input"
          multiline={true}
          maxLength={4095}
          placeholder="Add workout notes for this exercise here..."
          value={props.entry.notes}
          onChangeText={(text) => {
            Progress_editExerciseNotes(props.dispatch, props.entryIndex, text);
          }}
          className="mt-1 text-sm"
        />
      </View>
      <View className="mt-1">
        <WorkoutExerciseAllSets
          stats={props.stats}
          isPlayground={false}
          progress={props.progress}
          isCurrentProgress={Progress_isCurrent(props.progress)}
          day={props.day}
          program={props.program}
          userPromptedStateVars={
            programExercise ? props.progress.userPromptedStateVars?.[programExercise.key] : undefined
          }
          programExercise={programExercise}
          entryIndex={props.entryIndex}
          onTargetClick={() => {
            updateSettings(
              props.dispatch,
              lb<ISettings>()
                .p("workoutSettings")
                .p("targetType")
                .recordModify((type) => {
                  return Settings_getNextTargetType(
                    type,
                    !Subscriptions_hasSubscription(props.subscription) || !currentEquipmentName
                  );
                }),
              "Change target type"
            );
          }}
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
      {isKebabMenuOpen && (
        <KebabMenu
          onClose={() => setIsKebabMenuOpen(false)}
          programExercise={programExercise}
          programExerciseId={programExerciseId}
          entry={props.entry}
          entryIndex={props.entryIndex}
          settings={props.settings}
          dispatch={props.dispatch}
        />
      )}
    </View>
  );
}

interface IKebabMenuProps {
  onClose: () => void;
  programExercise?: ReturnType<typeof Program_getProgramExerciseForKeyAndDay>;
  programExerciseId?: string;
  entry: IHistoryEntry;
  entryIndex: number;
  settings: ISettings;
  dispatch: IDispatch;
}

function KebabMenu(props: IKebabMenuProps): React.ReactElement {
  const { programExercise, programExerciseId, dispatch, entry, entryIndex } = props;
  return (
    <RNModal transparent={true} visible={true} onRequestClose={props.onClose} animationType="fade">
      <Pressable className="items-end justify-start flex-1 pt-16 pr-4 bg-black/30" onPress={props.onClose}>
        <View className="py-2 bg-background-default rounded-lg shadow-lg" style={{ minWidth: 200 }}>
          {programExercise && programExerciseId && (
            <Pressable
              className="flex-row items-center gap-2 px-4 py-3"
              onPress={() => {
                props.onClose();
                dispatch(Thunk_pushToEditProgramExercise(programExercise.key, programExercise.dayData));
              }}
            >
              <IconEdit2 size={22} />
              <Text>Edit Program Exercise</Text>
            </Pressable>
          )}
          <Pressable
            className="flex-row items-center gap-2 px-4 py-3"
            data-cy="exercise-swap"
            onPress={() => {
              props.onClose();
              updateProgress(
                dispatch,
                [
                  lb<IHistoryRecord>()
                    .pi("ui")
                    .p("exercisePicker")
                    .record({
                      state: {
                        mode: "workout" as const,
                        screenStack: ["exercisePicker"],
                        sort: props.settings.workoutSettings.pickerSort ?? ("name_asc" as const),
                        filters: {},
                        selectedExercises: [],
                        entryIndex,
                        exerciseType: entry.exercise,
                      },
                    }),
                ],
                "kebab-swap-exercise"
              );
            }}
          >
            <IconSwap size={18} />
            <Text>Swap Exercise</Text>
          </Pressable>
          <Pressable
            className="flex-row items-center gap-2 px-4 py-3"
            onPress={() => {
              props.onClose();
              updateProgress(
                dispatch,
                [lb<IHistoryRecord>().pi("ui").p("showSupersetPicker").record(entry)],
                "kebab-edit-superset"
              );
            }}
          >
            <IconReorder size={18} />
            <Text>Edit Superset</Text>
          </Pressable>
          <Pressable
            className="flex-row items-center gap-2 px-4 py-3"
            data-cy="edit-exercise-kebab-remove-exercise"
            onPress={() => {
              props.onClose();
              const doRemove = (): void => {
                updateProgress(
                  dispatch,
                  [
                    lb<IHistoryRecord>()
                      .p("entries")
                      .recordModify((entries) => {
                        const entryIdToDelete = entry.id;
                        const newEntries = CollectionUtils_removeAt(entries, entryIndex);
                        for (const e of newEntries) {
                          if (e.superset && e.superset === entryIdToDelete) {
                            e.superset = undefined;
                          }
                        }
                        return newEntries;
                      }),
                    lb<IHistoryRecord>()
                      .pi("ui")
                      .p("currentEntryIndex")
                      .recordModify((index) => Math.max(0, (index ?? 0) - 1)),
                  ],
                  "kebab-delete-exercise"
                );
              };
              if (Platform.OS === "web") {
                if (confirm("Do you want to remove this exercise in this workout only?")) {
                  doRemove();
                }
              } else {
                Alert.alert("Remove Exercise", "Do you want to remove this exercise in this workout only?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Remove", style: "destructive", onPress: doRemove },
                ]);
              }
            }}
          >
            <IconTrash width={15} height={18} />
            <Text>Remove Exercise</Text>
          </Pressable>
        </View>
      </Pressable>
    </RNModal>
  );
}
