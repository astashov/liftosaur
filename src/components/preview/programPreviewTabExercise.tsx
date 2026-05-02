import { JSX, memo, useMemo } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../primitives/text";
import {
  Exercise_get,
  Exercise_getNotes,
  Exercise_onerm,
  Exercise_nameWithEquipment,
  Exercise_fullName,
} from "../../models/exercise";
import { PlannerProgramExercise_currentDescription } from "../../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise, IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { IHistoryEntry, ISettings, IStats } from "../../types";
import { StringUtils_dashcase } from "../../utils/string";
import { ExerciseImage } from "../exerciseImage";
import { HistoryRecordSetsView } from "../historyRecordSets";
import { Markdown } from "../markdown";
import { IconEditSquare } from "../icons/iconEditSquare";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { IEvaluatedProgram } from "../../models/program";
import { IDispatch } from "../../ducks/types";
import { navigationRef } from "../../navigation/navigationRef";
import { Thunk_pushExerciseStatsScreen } from "../../ducks/thunks";
import { ProgramExercise_doesUse1RM } from "../../models/programExercise";
import { Weight_print } from "../../models/weight";
import { LinkButton } from "../linkButton";
import {
  Equipment_getEquipmentNameForExerciseType,
  Equipment_getEquipmentDataForExerciseType,
} from "../../models/equipment";
import { IconArrowRight } from "../icons/iconArrowRight";
import { GroupHeader } from "../groupHeader";
import { Progress_getNextSupersetEntry } from "../../models/progress";

interface IProgramPreviewTabExerciseProps {
  entry: IHistoryEntry;
  programExercise: IPlannerProgramExercise;
  entries: IHistoryEntry[];
  program: IEvaluatedProgram;
  programId: string;
  day: number;
  settings: ISettings;
  index: number;
  stats: IStats;
  ui: IPlannerUi;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export const ProgramPreviewTabExercise = memo(function ProgramPreviewTabExercise(
  props: IProgramPreviewTabExerciseProps
): JSX.Element {
  const exercise = useMemo(
    () => Exercise_get(props.entry.exercise, props.settings.exercises),
    [props.entry.exercise, props.settings.exercises]
  );
  const programExercise = props.programExercise;
  const description = useMemo(() => PlannerProgramExercise_currentDescription(programExercise), [programExercise]);
  const currentEquipmentName = useMemo(
    () => Equipment_getEquipmentNameForExerciseType(props.settings, exercise),
    [props.settings, exercise]
  );
  const currentEquipmentNotes = useMemo(
    () => Equipment_getEquipmentDataForExerciseType(props.settings, exercise)?.notes,
    [props.settings, exercise]
  );
  const exerciseNotes = useMemo(
    () => Exercise_getNotes(props.entry.exercise, props.settings),
    [props.entry.exercise, props.settings]
  );
  const onerm = useMemo(() => Exercise_onerm(exercise, props.settings), [exercise, props.settings]);
  const supersetEntry = useMemo(
    () => Progress_getNextSupersetEntry(props.entries, props.entry),
    [props.entries, props.entry]
  );
  const supersetExercise = useMemo(
    () => (supersetEntry ? Exercise_get(supersetEntry.exercise, props.settings.exercises) : undefined),
    [supersetEntry, props.settings.exercises]
  );

  return (
    <View
      className="relative px-2 py-2 mx-4 mb-3 rounded-lg bg-background-cardpurple"
      data-testid={StringUtils_dashcase(exercise.name)}
      testID={StringUtils_dashcase(exercise.name)}
    >
      <View className="flex-row items-center gap-2">
        <ProgramPreviewTabExerciseTopBar
          plannerDispatch={props.plannerDispatch}
          index={props.index}
          entry={props.entry}
          programExercise={props.programExercise}
          programId={props.programId}
          day={props.day}
          isPlayground={false}
        />
        <View style={{ width: 40 }}>
          <Pressable
            className="p-1 rounded-lg bg-background-image"
            onPress={() => props.dispatch(Thunk_pushExerciseStatsScreen(props.entry.exercise))}
          >
            <ExerciseImage settings={props.settings} className="w-full" exerciseType={exercise} size="small" />
          </Pressable>
        </View>
        <View className="flex-1 ml-auto" style={{ minWidth: 64 }}>
          <View>
            <Pressable
              className="flex-row items-center"
              onPress={() => props.dispatch(Thunk_pushExerciseStatsScreen(props.entry.exercise))}
            >
              <Text className="pr-1 text-sm font-bold text-left">
                {Exercise_nameWithEquipment(exercise, props.settings)}
              </Text>
              <IconArrowRight width={5} height={10} />
            </Pressable>
          </View>
          <View
            data-testid="exercise-equipment"
            testID="exercise-equipment"
            className="flex-row flex-wrap items-center"
          >
            <Text className="text-xs text-text-secondary">Equipment: </Text>
            <LinkButton
              name="exercise-equipment-picker"
              data-testid="exercise-equipment-picker"
              testID="exercise-equipment-picker"
              className="text-xs font-semibold"
              onClick={() => {
                props.plannerDispatch(
                  lb<IPlannerState>()
                    .pi("ui")
                    .p("previewEquipmentModal")
                    .record({ plannerExercise: props.programExercise }),
                  "Open preview equipment modal"
                );
                navigationRef.navigate("equipmentModal", { context: "preview", programId: props.programId });
              }}
            >
              {currentEquipmentName || "None"}
            </LinkButton>
          </View>
          {!!currentEquipmentNotes && (
            <View>
              <Markdown className="text-xs" value={currentEquipmentNotes} />
            </View>
          )}
          {programExercise && ProgramExercise_doesUse1RM(programExercise) && (
            <View data-testid="exercise-rm1" testID="exercise-rm1" className="flex-row flex-wrap items-center">
              <Text className="text-xs text-text-secondary">1RM: </Text>
              <LinkButton
                name="exercise-rm1-picker"
                data-testid="exercise-rm1-picker"
                testID="exercise-rm1-picker"
                className="text-xs font-semibold"
                onClick={() => {
                  props.plannerDispatch(
                    lb<IPlannerState>()
                      .pi("ui")
                      .p("previewOneRepMaxModal")
                      .record({ plannerExercise: props.programExercise }),
                    "Open preview 1RM modal"
                  );
                  navigationRef.navigate("rm1Modal", { context: "preview", programId: props.programId });
                }}
              >
                {Weight_print(onerm)}
              </LinkButton>
            </View>
          )}
          {supersetExercise && (
            <View data-testid="exercise-superset" testID="exercise-superset">
              <Text className="text-xs text-text-secondary">
                Supersets with:{" "}
                <Text className="text-xs font-bold text-text-secondary">
                  {Exercise_fullName(supersetExercise, props.settings)}
                </Text>
              </Text>
            </View>
          )}
        </View>
        <View className="mt-1 ml-1">
          <HistoryRecordSetsView sets={props.entry.sets} settings={props.settings} isNext={true} />
        </View>
      </View>
      {!!exerciseNotes && (
        <View className="mt-1">
          {!!exerciseNotes && !!description && <GroupHeader name="Exercise Notes" />}
          <Markdown className="text-sm" value={exerciseNotes} />
        </View>
      )}
      {!!description && (
        <View className="mt-1">
          {!!exerciseNotes && !!description && <GroupHeader name="Program Exercise Description" />}
          <Markdown className="text-sm" value={description} />
        </View>
      )}
    </View>
  );
});

interface IProgramPreviewTabExerciseTopBarProps {
  plannerDispatch: ILensDispatch<IPlannerState>;
  index: number;
  entry: IHistoryEntry;
  programExercise: IPlannerProgramExercise;
  programId: string;
  day: number;
  isPlayground: boolean;
  xOffset?: number;
}

function ProgramPreviewTabExerciseTopBar(props: IProgramPreviewTabExerciseTopBarProps): JSX.Element {
  return (
    <View
      className="absolute z-0 px-2 py-1 rounded-full bg-background-neutral border-border-neutral"
      style={{ right: -12 + (props.xOffset ?? 0), top: -18 }}
    >
      <View className="flex-row items-center gap-2">
        <Pressable
          className="nm-program-details-playground-edit"
          data-testid="program-preview-edit-exercise"
          testID="program-preview-edit-exercise"
          onPress={() => {
            props.plannerDispatch(
              lb<IPlannerState>()
                .pi("ui")
                .p("previewExerciseModal")
                .record({ plannerExercise: props.programExercise, day: props.day }),
              "Open preview exercise modal"
            );
            navigationRef.navigate("playgroundEditModal", { context: "preview", programId: props.programId });
          }}
        >
          <IconEditSquare color={Tailwind_semantic().icon.neutralsubtle} />
        </Pressable>
      </View>
    </View>
  );
}
