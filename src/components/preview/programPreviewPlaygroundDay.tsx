import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { useCallback } from "preact/hooks";
import { buildCardsReducer, ICardsAction } from "../../ducks/reducer";
import { IHistoryRecord, ISettings } from "../../types";
import { IDispatch } from "../../ducks/types";
import { ProgramPreviewPlaygroundExercise } from "./programPreviewPlaygroundExercise";
import { ModalAmrap } from "../modalAmrap";
import { ModalWeight } from "../modalWeight";
import { ProgramPreviewPlaygroundExerciseEditModal } from "./programPreviewPlaygroundExerciseEditModal";
import { lb } from "lens-shmens";
import { EditProgramLenses } from "../../models/editProgramLenses";
import { Button } from "../button";
import { ModalEditSet } from "../modalEditSet";
import { EditProgressEntry } from "../../models/editProgressEntry";
import { IEvaluatedProgram, IEvaluatedProgramDay, Program } from "../../models/program";
import { StringUtils } from "../../utils/string";
import { Exercise } from "../../models/exercise";
import { Weight } from "../../models/weight";
import { Markdown } from "../markdown";

interface IProgramPreviewPlaygroundDayProps {
  program: IEvaluatedProgram;
  programDay: IEvaluatedProgramDay;
  weekName?: string;
  day: number;
  isPlayground: boolean;
  settings: ISettings;
  progress: IHistoryRecord;
  onProgressChange: (newProgress: IHistoryRecord) => void;
  onProgramChange: (newProgram: IEvaluatedProgram) => void;
  onSettingsChange: (newSettings: ISettings) => void;
  onFinish: () => void;
}

export const ProgramPreviewPlaygroundDay = memo(
  (props: IProgramPreviewPlaygroundDayProps): JSX.Element => {
    const dispatch: IDispatch = useCallback(
      async (action) => {
        const newProgress = buildCardsReducer(props.settings)(props.progress, action as ICardsAction);
        props.onProgressChange(newProgress);
      },
      [props.settings, props.progress]
    );

    const editModalProgramExerciseId = props.progress.ui?.editModal?.programExerciseId;
    const editModalProgramExercise = editModalProgramExerciseId
      ? Program.getProgramExercise(props.day, props.program, editModalProgramExerciseId)
      : undefined;
    const programDay = Program.getProgramDay(props.program, props.day)!;

    return (
      <div data-cy={`preview-day-${StringUtils.dashcase(programDay.name)}`}>
        <h3 className="mb-1 text-lg font-bold" data-cy="preview-day-name">
          {props.weekName ? `${props.weekName} - ` : ""}
          {programDay.name}
        </h3>
        {programDay.description && <Markdown value={programDay.description} />}
        {props.progress.entries.map((entry, index) => {
          const programExercise = props.programDay.exercises.find((e) => e.key === entry.programExerciseId);
          if (!programExercise) {
            return null;
          }
          return (
            <ProgramPreviewPlaygroundExercise
              entry={entry}
              dayIndex={props.day}
              progress={props.progress}
              isPlayground={props.isPlayground}
              programExercise={programExercise}
              program={props.program}
              index={index}
              settings={props.settings}
              dispatch={dispatch}
            />
          );
        })}
        {props.isPlayground && (
          <div className="text-center">
            <Button
              name="finish-day-details-playground"
              kind="orange"
              onClick={props.onFinish}
              data-cy="finish-day-details-playground"
            >
              Finish this day
            </Button>
          </div>
        )}
        {props.progress.ui?.amrapModal && (
          <ModalAmrap
            progress={props.progress}
            dispatch={dispatch}
            settings={props.settings}
            programExercise={Program.getProgramExercise(
              props.day,
              props.program,
              props.progress.entries[props.progress.ui?.amrapModal?.entryIndex || 0]?.programExerciseId
            )}
            otherStates={props.program.states}
          />
        )}
        {props.progress.ui?.weightModal && (
          <ModalWeight
            isHidden={props.progress.ui?.weightModal == null}
            programExercise={Program.getProgramExercise(
              props.day,
              props.program,
              props.progress.ui?.weightModal?.programExerciseId
            )}
            settings={props.settings}
            dispatch={dispatch}
            weight={props.progress.ui?.weightModal?.weight ?? 0}
          />
        )}
        {props.progress.ui?.editSetModal && (
          <ModalEditSet
            isHidden={props.progress.ui?.editSetModal == null}
            setsLength={props.progress.entries[props.progress.ui?.editSetModal?.entryIndex || 0]?.sets.length || 0}
            key={props.progress.ui?.editSetModal?.setIndex}
            subscription={{ google: { fake: null }, apple: {} }}
            progressId={props.progress.id}
            dispatch={dispatch}
            settings={props.settings}
            exerciseType={props.progress.ui?.editSetModal?.exerciseType}
            programExercise={Program.getProgramExercise(
              props.day,
              props.program,
              props.progress.ui?.editSetModal?.programExerciseId
            )}
            isTimerDisabled={true}
            set={EditProgressEntry.getEditSetData(props.progress)}
            isWarmup={props.progress.ui?.editSetModal?.isWarmup || false}
            entryIndex={props.progress.ui?.editSetModal?.entryIndex || 0}
            setIndex={props.progress.ui?.editSetModal?.setIndex}
          />
        )}
        {editModalProgramExercise && (
          <ProgramPreviewPlaygroundExerciseEditModal
            onClose={() =>
              dispatch({
                type: "UpdateProgress",
                lensRecordings: [lb<IHistoryRecord>().pi("ui").p("editModal").record(undefined)],
              })
            }
            onEditStateVariable={(stateKey, newValue) => {
              console.log("Edit State Variable", editModalProgramExerciseId, stateKey, newValue);
              const dayData = Program.getDayData(props.program, props.day);
              const lensRecording = EditProgramLenses.properlyUpdateStateVariable(
                lb<IEvaluatedProgram>()
                  .p("weeks")
                  .i(dayData.week - 1)
                  .p("days")
                  .i(dayData.dayInWeek - 1)
                  .p("exercises")
                  .find((e) => e.key === editModalProgramExerciseId),
                { [stateKey]: Program.stateValue(editModalProgramExercise.state, stateKey, newValue) }
              );
              const newProgram = lensRecording.reduce((acc, lens) => lens.fn(acc), props.program);
              console.log("New Program", newProgram);
              props.onProgramChange(newProgram);
            }}
            onEditVariable={(variableKey, newValue) => {
              const exerciseType = Exercise.toKey(editModalProgramExercise.exerciseType);
              const newSettings = {
                ...props.settings,
                exerciseData: {
                  ...props.settings.exerciseData,
                  [exerciseType]: {
                    ...props.settings.exerciseData[exerciseType],
                    [variableKey]: Weight.build(newValue, props.settings.units),
                  },
                },
              };
              props.onSettingsChange(newSettings);
            }}
            programExercise={editModalProgramExercise}
            settings={props.settings}
          />
        )}
      </div>
    );
  }
);
