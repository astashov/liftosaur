import { JSX, memo, useCallback } from "react";
import { buildCardsReducer, ICardsAction } from "../../ducks/reducer";
import { IHistoryRecord, ISettings, IStats } from "../../types";
import { IDispatch } from "../../ducks/types";
import { ProgramPreviewPlaygroundExercise } from "./programPreviewPlaygroundExercise";
import { lb } from "lens-shmens";
import { Button } from "../button";
import { IEvaluatedProgram, Program_getProgramDay, Program_getProgramDayUsedExercises } from "../../models/program";
import { StringUtils_dashcase } from "../../utils/string";
import { Markdown } from "../markdown";
import { Scroller } from "../scroller";
import { WorkoutExerciseThumbnail } from "../workoutExerciseThumbnail";
import { updateProgress } from "../../models/state";
import { Progress_getColorToSupersetGroup } from "../../models/progress";

interface IProgramPreviewPlaygroundDayProps {
  program: IEvaluatedProgram;
  weekName?: string;
  day: number;
  isPlayground: boolean;
  settings: ISettings;
  progress: IHistoryRecord;
  onProgressChange: (newProgress: IHistoryRecord) => void;
  stats: IStats;
  onFinish: () => void;
}

export const ProgramPreviewPlaygroundDay = memo((props: IProgramPreviewPlaygroundDayProps): JSX.Element => {
  const dispatch: IDispatch = useCallback(
    async (action) => {
      const newProgress = buildCardsReducer(
        props.settings,
        props.stats,
        undefined
      )(props.progress, action as ICardsAction);
      props.onProgressChange(newProgress);
    },
    [props.settings, props.progress]
  );

  const programDay = Program_getProgramDay(props.program, props.day)!;
  const index = props.progress.ui?.currentEntryIndex ?? 0;
  const entry = props.progress.entries[index];
  const dayExercises = programDay ? Program_getProgramDayUsedExercises(programDay) : [];
  const programExercises = props.isPlayground
    ? dayExercises.filter((e) => e.key === entry.programExerciseId)
    : dayExercises;

  return (
    <div data-cy={`preview-day-${StringUtils_dashcase(programDay.name)}`}>
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
            key={programExercise.key}
            entry={anEntry}
            dayIndex={props.day}
            progress={props.progress}
            isPlayground={props.isPlayground}
            programExercise={programExercise}
            program={props.program}
            index={props.isPlayground ? index : i}
            settings={props.settings}
            stats={props.stats}
            dispatch={dispatch}
          />
        );
      })}
      {props.isPlayground && (
        <div className="text-center">
          <Button
            name="finish-day-details-playground"
            kind="purple"
            onClick={props.onFinish}
            data-cy="finish-day-details-playground"
          >
            Finish this day
          </Button>
        </div>
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
  const colorToSupersetGroup = Progress_getColorToSupersetGroup(props.progress);
  return (
    <Scroller>
      <div className="flex items-center gap-1 px-4">
        {props.progress.entries.map((entry, entryIndex) => {
          return (
            <WorkoutExerciseThumbnail
              colorToSupersetGroup={colorToSupersetGroup}
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
