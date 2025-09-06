import { JSX, h } from "preact";
import { Exercise } from "../../models/exercise";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { IPlannerProgramExercise, IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { IHistoryEntry, ISettings, IStats } from "../../types";
import { StringUtils } from "../../utils/string";
import { ExerciseImage } from "../exerciseImage";
import { HistoryRecordSetsView } from "../historyRecordSets";
import { Markdown } from "../markdown";
import { IconEditSquare } from "../icons/iconEditSquare";
import { Tailwind } from "../../utils/tailwindConfig";
import { ILensDispatch } from "../../utils/useLensReducer";
import { lb } from "lens-shmens";
import { ProgramPreviewPlaygroundExerciseEditModal } from "./programPreviewPlaygroundExerciseEditModal";
import { IEvaluatedProgram, Program } from "../../models/program";
import { EditProgramLenses } from "../../models/editProgramLenses";
import { ProgramToPlanner } from "../../models/programToPlanner";
import { IDispatch } from "../../ducks/types";
import { Thunk } from "../../ducks/thunks";
import { ProgramExercise } from "../../models/programExercise";
import { Weight } from "../../models/weight";
import { LinkButton } from "../linkButton";
import { Equipment } from "../../models/equipment";
import { Modal1RM } from "../modal1RM";
import { ModalEquipment } from "../modalEquipment";
import { IconArrowRight } from "../icons/iconArrowRight";

interface IProgramPreviewTabExerciseProps {
  entry: IHistoryEntry;
  programExercise: IPlannerProgramExercise;
  entries: IHistoryEntry[];
  program: IEvaluatedProgram;
  day: number;
  settings: ISettings;
  index: number;
  stats: IStats;
  ui: IPlannerUi;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function ProgramPreviewTabExercise(props: IProgramPreviewTabExerciseProps): JSX.Element {
  const exercise = Exercise.get(props.entry.exercise, props.settings.exercises);
  const programExercise = props.programExercise;
  const description = PlannerProgramExercise.currentDescription(programExercise);
  const currentEquipmentName = Equipment.getEquipmentNameForExerciseType(props.settings, exercise);
  const onerm = Exercise.onerm(exercise, props.settings);

  return (
    <div
      className={`py-2 px-2 mx-4 mb-3 rounded-lg bg-background-cardpurple relative`}
      data-cy={StringUtils.dashcase(exercise.name)}
    >
      <div className="flex items-center gap-2">
        <ProgramPreviewTabExerciseTopBar
          plannerDispatch={props.plannerDispatch}
          index={props.index}
          entry={props.entry}
          programExercise={props.programExercise}
          isPlayground={false}
        />
        <div style={{ width: "40px" }}>
          <div
            className="p-1 rounded-lg bg-background-image"
            onClick={() => props.dispatch(Thunk.pushExerciseStatsScreen(props.entry.exercise))}
          >
            <ExerciseImage settings={props.settings} className="w-full" exerciseType={exercise} size="small" />
          </div>
        </div>
        <div className="flex-1 ml-auto text-sm" style={{ minWidth: "4rem" }}>
          <div>
            <button
              className="flex items-center"
              onClick={() => props.dispatch(Thunk.pushExerciseStatsScreen(props.entry.exercise))}
            >
              <span className="pr-1 font-bold">{Exercise.nameWithEquipment(exercise, props.settings)}</span>{" "}
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
              }}
            >
              {currentEquipmentName || "None"}
            </LinkButton>
          </div>
          {programExercise && ProgramExercise.doesUse1RM(programExercise) && (
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
                }}
              >
                {Weight.print(onerm)}
              </LinkButton>
            </div>
          )}
        </div>
        <section className="mt-1 ml-1">
          <HistoryRecordSetsView sets={props.entry.sets} settings={props.settings} isNext={true} />
        </section>
      </div>
      {description && (
        <div className="mt-1 text-sm">
          <Markdown value={description} />
        </div>
      )}
      {props.ui.previewExerciseModal?.plannerExercise.key === programExercise.key && (
        <ProgramPreviewPlaygroundExerciseEditModal
          hideVariables={true}
          programExercise={programExercise}
          onClose={() => {
            props.plannerDispatch(
              lb<IPlannerState>().pi("ui").p("previewExerciseModal").record(undefined),
              "Close preview exercise modal"
            );
          }}
          settings={props.settings}
          onEditStateVariable={(stateKey, newValue) => {
            const dayData = Program.getDayData(props.program, props.day);
            const lensRecording = EditProgramLenses.properlyUpdateStateVariable(
              lb<IEvaluatedProgram>()
                .p("weeks")
                .i(dayData.week - 1)
                .p("days")
                .i(dayData.dayInWeek - 1)
                .p("exercises")
                .find((e) => e.key === programExercise.key),
              {
                [stateKey]: Program.stateValue(PlannerProgramExercise.getState(programExercise), stateKey, newValue),
              }
            );
            const newEvaluatedProgram = lensRecording.reduce((acc, lens) => lens.fn(acc), props.program);
            const newPlanner = new ProgramToPlanner(newEvaluatedProgram, props.settings).convertToPlanner();
            props.plannerDispatch(
              lb<IPlannerState>().p("current").p("program").p("planner").record(newPlanner),
              "Update state variables from preview exercise modal"
            );
          }}
          onEditVariable={(varKey, newValue) => {}}
        />
      )}
      {props.ui.previewEquipmentModal?.plannerExercise.key === programExercise.key && (
        <ModalEquipment
          stats={props.stats}
          settings={props.settings}
          exercise={exercise}
          entries={props.entries}
          onClose={() => {
            props.plannerDispatch(
              lb<IPlannerState>().p("ui").p("previewEquipmentModal").record(undefined),
              "Close equipment modal"
            );
          }}
          dispatch={props.dispatch}
        />
      )}
      {props.ui.previewOneRepMaxModal?.plannerExercise.key === programExercise.key && (
        <Modal1RM
          onClose={() => {
            props.plannerDispatch(
              lb<IPlannerState>().p("ui").p("previewOneRepMaxModal").record(undefined),
              "Close 1RM modal"
            );
          }}
          settings={props.settings}
          exercise={exercise}
          dispatch={props.dispatch}
        />
      )}
    </div>
  );
}

interface IProgramPreviewTabExerciseTopBarProps {
  plannerDispatch: ILensDispatch<IPlannerState>;
  index: number;
  entry: IHistoryEntry;
  programExercise: IPlannerProgramExercise;
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
              lb<IPlannerState>().pi("ui").p("previewExerciseModal").record({ plannerExercise: props.programExercise }),
              "Open preview exercise modal"
            );
          }}
        >
          <IconEditSquare color={Tailwind.semantic().icon.neutralsubtle} />
        </button>
      </div>
    </div>
  );
}
