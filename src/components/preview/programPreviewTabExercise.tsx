import type { JSX } from "react";
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

export function ProgramPreviewTabExercise(props: IProgramPreviewTabExerciseProps): JSX.Element {
  const exercise = Exercise_get(props.entry.exercise, props.settings.exercises);
  const programExercise = props.programExercise;
  const description = PlannerProgramExercise_currentDescription(programExercise);
  const currentEquipmentName = Equipment_getEquipmentNameForExerciseType(props.settings, exercise);
  const currentEquipmentNotes = Equipment_getEquipmentDataForExerciseType(props.settings, exercise)?.notes;
  const exerciseNotes = Exercise_getNotes(props.entry.exercise, props.settings);
  const onerm = Exercise_onerm(exercise, props.settings);
  const supersetEntry = Progress_getNextSupersetEntry(props.entries, props.entry);
  const supersetExercise = supersetEntry ? Exercise_get(supersetEntry.exercise, props.settings.exercises) : undefined;

  return (
    <div
      className={`py-2 px-2 mx-4 mb-3 rounded-lg bg-background-cardpurple relative`}
      data-cy={StringUtils_dashcase(exercise.name)}
    >
      <div className="flex items-center gap-2">
        <ProgramPreviewTabExerciseTopBar
          plannerDispatch={props.plannerDispatch}
          index={props.index}
          entry={props.entry}
          programExercise={props.programExercise}
          programId={props.programId}
          day={props.day}
          isPlayground={false}
        />
        <div style={{ width: "40px" }}>
          <div
            className="p-1 rounded-lg bg-background-image"
            onClick={() => props.dispatch(Thunk_pushExerciseStatsScreen(props.entry.exercise))}
          >
            <ExerciseImage settings={props.settings} className="w-full" exerciseType={exercise} size="small" />
          </div>
        </div>
        <div className="flex-1 ml-auto text-sm" style={{ minWidth: "4rem" }}>
          <div>
            <button
              className="flex items-center"
              onClick={() => props.dispatch(Thunk_pushExerciseStatsScreen(props.entry.exercise))}
            >
              <span className="pr-1 font-bold text-left">{Exercise_nameWithEquipment(exercise, props.settings)}</span>{" "}
              <IconArrowRight width={5} height={10} style={{ marginBottom: "1px" }} className="inline-block" />
            </button>
          </div>
          <div data-cy="exercise-equipment" className="text-xs text-text-secondary">
            Equipment:{" "}
            <LinkButton
              name="exercise-equipment-picker"
              data-cy="exercise-equipment-picker"
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
          </div>
          {currentEquipmentNotes && (
            <div className="text-xs">
              <Markdown value={currentEquipmentNotes} />
            </div>
          )}
          {programExercise && ProgramExercise_doesUse1RM(programExercise) && (
            <div data-cy="exercise-rm1" className="text-xs text-text-secondary">
              1RM:{" "}
              <LinkButton
                name="exercise-rm1-picker"
                data-cy="exercise-rm1-picker"
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
            </div>
          )}
          {supersetExercise && (
            <div data-cy="exercise-superset" className="text-xs text-text-secondary">
              Supersets with: <strong>{Exercise_fullName(supersetExercise, props.settings)}</strong>
            </div>
          )}
        </div>
        <section className="mt-1 ml-1">
          <HistoryRecordSetsView sets={props.entry.sets} settings={props.settings} isNext={true} />
        </section>
      </div>
      {exerciseNotes && (
        <div className="mt-1 text-sm">
          {exerciseNotes && description && <GroupHeader name="Exercise Notes" />}
          <Markdown value={exerciseNotes} />
        </div>
      )}
      {description && (
        <div className="mt-1 text-sm">
          {exerciseNotes && description && <GroupHeader name="Program Exercise Description" />}
          <Markdown value={description} />
        </div>
      )}
    </div>
  );
}

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
    <div
      className="absolute z-0 px-2 py-1 leading-none rounded-full bg-background-neutral border-border-neutral"
      style={{ right: -12 + (props.xOffset ?? 0), top: -18 }}
    >
      <div className="flex items-center gap-2">
        <button
          className="inline-block nm-program-details-playground-edit"
          data-cy="program-preview-edit-exercise"
          onClick={() => {
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
        </button>
      </div>
    </div>
  );
}
