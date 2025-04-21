import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { useCallback } from "preact/hooks";
import { buildCardsReducer, ICardsAction } from "../../ducks/reducer";
import { IHistoryRecord, ISettings } from "../../types";
import { IDispatch } from "../../ducks/types";
import { ProgramPreviewPlaygroundExercise } from "./programPreviewPlaygroundExercise";
import { ModalAmrap } from "../modalAmrap";
import { ProgramPreviewPlaygroundExerciseEditModal } from "./programPreviewPlaygroundExerciseEditModal";
import { lb } from "lens-shmens";
import { EditProgramLenses } from "../../models/editProgramLenses";
import { Button } from "../button";
import { IEvaluatedProgram, Program } from "../../models/program";
import { StringUtils } from "../../utils/string";
import { Exercise } from "../../models/exercise";
import { Weight } from "../../models/weight";
import { Markdown } from "../markdown";
import { PlannerProgramExercise } from "../../pages/planner/models/plannerProgramExercise";
import { Scroller } from "../scroller";
import { WorkoutExerciseThumbnail } from "../workoutExerciseThumbnail";
import { BottomSheetEditTarget } from "../bottomSheetEditTarget";
import { updateProgress } from "../../models/state";

interface IProgramPreviewPlaygroundDayProps {
  program: IEvaluatedProgram;
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

export const ProgramPreviewPlaygroundDay = memo((props: IProgramPreviewPlaygroundDayProps): JSX.Element => {
  const dispatch: IDispatch = useCallback(
    async (action) => {
      const newProgress = buildCardsReducer(props.settings, undefined)(props.progress, action as ICardsAction);
      props.onProgressChange(newProgress);
    },
    [props.settings, props.progress]
  );

  const editModalProgramExerciseId = props.progress.ui?.editModal?.programExerciseId;
  const editModalProgramExercise = editModalProgramExerciseId
    ? Program.getProgramExercise(props.day, props.program, editModalProgramExerciseId)
    : undefined;
  const programDay = Program.getProgramDay(props.program, props.day)!;
  const index = props.progress.ui?.currentEntryIndex ?? 0;
  const entry = props.progress.entries[index];
  const dayExercises = programDay ? Program.getProgramDayExercises(programDay) : [];
  const programExercises = props.isPlayground
    ? dayExercises.filter((e) => e.key === entry.programExerciseId)
    : dayExercises;

  return (
    <div data-cy={`preview-day-${StringUtils.dashcase(programDay.name)}`}>
      <h3 className="mx-4 mb-1 text-lg font-bold" data-cy="preview-day-name">
        {props.weekName ? `${props.weekName} - ` : ""}
        {programDay.name}
      </h3>
      {programDay.description && (
        <div className="mx-4 text-sm">
          <Markdown value={programDay.description} />
        </div>
      )}
      {props.isPlayground && (
        <div className="mb-2">
          <PreviewListOfExercises
            isPlayground={props.isPlayground}
            progress={props.progress}
            settings={props.settings}
            dispatch={dispatch}
          />
        </div>
      )}
      {(programExercises ?? []).map((programExercise, i) => {
        const anEntry = props.progress.entries.find((e) => e.programExerciseId === programExercise.key);
        if (!anEntry) {
          return null;
        }
        return (
          <ProgramPreviewPlaygroundExercise
            entry={anEntry}
            dayIndex={props.day}
            progress={props.progress}
            isPlayground={props.isPlayground}
            programExercise={programExercise}
            program={props.program}
            index={props.isPlayground ? index : i}
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
      <BottomSheetEditTarget
        settings={props.settings}
        progress={props.progress}
        dispatch={dispatch}
        editSetModal={props.progress.ui?.editSetModal}
        isHidden={props.progress.ui?.editSetModal == null}
        onClose={() => {
          dispatch({
            type: "UpdateProgress",
            lensRecordings: [lb<IHistoryRecord>().pi("ui").p("editSetModal").record(undefined)],
            desc: "close-bottomsheet-target",
          });
        }}
      />
      {editModalProgramExercise && (
        <ProgramPreviewPlaygroundExerciseEditModal
          onClose={() =>
            dispatch({
              type: "UpdateProgress",
              lensRecordings: [lb<IHistoryRecord>().pi("ui").p("editModal").record(undefined)],
              desc: "close-playground-exercise-edit-modal",
            })
          }
          onEditStateVariable={(stateKey, newValue) => {
            const dayData = Program.getDayData(props.program, props.day);
            const lensRecording = EditProgramLenses.properlyUpdateStateVariable(
              lb<IEvaluatedProgram>()
                .p("weeks")
                .i(dayData.week - 1)
                .p("days")
                .i(dayData.dayInWeek - 1)
                .p("exercises")
                .find((e) => e.key === editModalProgramExerciseId),
              {
                [stateKey]: Program.stateValue(
                  PlannerProgramExercise.getState(editModalProgramExercise),
                  stateKey,
                  newValue
                ),
              }
            );
            const newProgram = lensRecording.reduce((acc, lens) => lens.fn(acc), props.program);
            props.onProgramChange(newProgram);
          }}
          onEditVariable={(variableKey, newValue) => {
            if (!editModalProgramExercise.exerciseType) {
              return;
            }
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
});

interface IPreviewListOfExercisesProps {
  isPlayground: boolean;
  progress: IHistoryRecord;
  settings: ISettings;
  dispatch: IDispatch;
}

function PreviewListOfExercises(props: IPreviewListOfExercisesProps): JSX.Element {
  return (
    <Scroller>
      <div className="flex items-center gap-1 px-4">
        {props.progress.entries.map((entry, entryIndex) => {
          return (
            <WorkoutExerciseThumbnail
              onClick={() => {
                updateProgress(
                  props.dispatch,
                  [lb<IHistoryRecord>().pi("ui").p("currentEntryIndex").record(entryIndex)],
                  "click-exercise-tab"
                );
              }}
              shouldShowProgress={props.isPlayground}
              selectedIndex={props.progress.ui?.currentEntryIndex ?? 0}
              key={entryIndex}
              progress={props.progress}
              settings={props.settings}
              entry={entry}
              entryIndex={entryIndex}
            />
          );
        })}
      </div>
    </Scroller>
  );
}
