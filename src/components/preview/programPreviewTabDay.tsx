import { h, JSX } from "preact";
import { memo } from "preact/compat";
import { IHistoryRecord, ISettings, IStats } from "../../types";
import { IEvaluatedProgram, Program_getProgramDay, Program_getProgramDayUsedExercises } from "../../models/program";
import { StringUtils_dashcase } from "../../utils/string";
import { Markdown } from "../markdown";
import { ProgramPreviewTabExercise } from "./programPreviewTabExercise";
import { IPlannerState, IPlannerUi } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";
import { IDispatch } from "../../ducks/types";

interface IProgramPreviewTabDayProps {
  program: IEvaluatedProgram;
  stats: IStats;
  weekName?: string;
  day: number;
  settings: ISettings;
  progress: IHistoryRecord;
  ui: IPlannerUi;
  dispatch: IDispatch;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export const ProgramPreviewTabDay = memo((props: IProgramPreviewTabDayProps): JSX.Element => {
  const programDay = Program_getProgramDay(props.program, props.day)!;
  const index = props.progress.ui?.currentEntryIndex ?? 0;
  const programExercises = programDay ? Program_getProgramDayUsedExercises(programDay) : [];

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
      {(programExercises ?? []).map((programExercise, i) => {
        const anEntry = props.progress.entries.find((e) => e.programExerciseId === programExercise.key);
        if (!anEntry) {
          return null;
        }
        return (
          <ProgramPreviewTabExercise
            stats={props.stats}
            ui={props.ui}
            entries={props.progress.entries}
            program={props.program}
            day={props.day}
            entry={anEntry}
            programExercise={programExercise}
            settings={props.settings}
            index={index}
            dispatch={props.dispatch}
            plannerDispatch={props.plannerDispatch}
          />
        );
      })}
    </div>
  );
});
