/* eslint-disable @typescript-eslint/ban-types */
import { h, JSX } from "preact";
import { IHistoryRecord, IProgramDay, IProgramExercise, ISettings } from "../../../types";
import { useRef } from "preact/hooks";
import { IDispatch } from "../../../ducks/types";
import { buildCardsReducer, ICardsAction } from "../../../ducks/reducer";
import { ILensDispatch } from "../../../utils/useLensReducer";
import { IProgramEditorState } from "../models/types";
import { History } from "../../../models/history";
import { LensBuilder } from "lens-shmens";
import { Program } from "../../../models/program";
import { ProgramExercise } from "../../../models/programExercise";
import { ModalAmrap } from "../../../components/modalAmrap";
import { ModalWeight } from "../../../components/modalWeight";
import { ExerciseSets } from "../../../components/exerciseSets";
import { GroupHeader } from "../../../components/groupHeader";
import { ProgressStateChanges } from "../../../components/progressStateChanges";
import { ModalStateVarsUserPrompt } from "../../../components/modalStateVarsUserPrompt";
import { Markdown } from "../../../components/markdown";

export interface IPlaygroundProps {
  progress: IHistoryRecord;
  hideDay?: boolean;
  programExercise: IProgramExercise;
  allProgramExercises: IProgramExercise[];
  settings: ISettings;
  day: number;
  days: IProgramDay[];
  onProgressChange: (p: IHistoryRecord) => void;
  lbe: LensBuilder<IProgramEditorState, IProgramExercise, {}>;
  dispatch: ILensDispatch<IProgramEditorState>;
}

export function ProgramContentPlayground(props: IPlaygroundProps): JSX.Element {
  const { programExercise, days, settings, progress, allProgramExercises } = props;
  const entry = progress.entries[0];
  const progressRef = useRef(props.progress);
  progressRef.current = props.progress;

  const dispatch: IDispatch = async (action) => {
    const newProgress = buildCardsReducer(settings)(progressRef.current, action as ICardsAction);
    props.onProgressChange(newProgress);
  };
  const description = props.programExercise.description;

  return (
    <section className="px-4 py-2 bg-purple-100 rounded-2xl">
      <GroupHeader topPadding={false} name="Playground" />
      {!props.hideDay && (
        <div>
          <span className="mr-2">Day:</span>
          <select
            className="border rounded border-grayv2-main"
            value={progressRef.current.day}
            onChange={(e) => {
              const newValue = (e.target as HTMLSelectElement).value;
              const newDay = parseInt(newValue || "1", 10);
              const nextVariationIndex = Program.nextVariationIndex(
                programExercise,
                allProgramExercises,
                newDay,
                settings
              );
              const newEntry = Program.nextHistoryEntry(
                programExercise.exerciseType,
                newDay,
                ProgramExercise.getVariations(programExercise, allProgramExercises)[nextVariationIndex].sets,
                ProgramExercise.getState(programExercise, allProgramExercises),
                settings,
                ProgramExercise.getWarmupSets(programExercise, allProgramExercises)
              );
              props.onProgressChange(History.buildFromEntry(newEntry, newDay));
            }}
          >
            {days.map((d, i) => {
              return (
                <option value={i + 1} selected={i + 1 === progressRef.current.day}>
                  {i + 1} - {d.name}
                </option>
              );
            })}
          </select>
        </div>
      )}
      {description && (
        <div className="mt-2">
          <Markdown value={description} />
        </div>
      )}
      <section className="flex flex-wrap items-end py-2 pt-4">
        <ExerciseSets
          isEditMode={false}
          progress={progress}
          warmupSets={entry.warmupSets}
          index={0}
          showHelp={false}
          settings={props.settings}
          entry={entry}
          dispatch={dispatch}
          onChangeReps={() => undefined}
        />
      </section>
      <ProgressStateChanges
        entry={entry}
        settings={props.settings}
        day={props.day}
        state={ProgramExercise.getState(props.programExercise, props.allProgramExercises)}
        script={ProgramExercise.getFinishDayScript(props.programExercise, props.allProgramExercises)}
      />
      <ModalAmrap isHidden={progress.ui?.amrapModal == null} dispatch={dispatch} />
      <ModalWeight
        programExercise={progress.ui?.weightModal?.programExercise}
        isHidden={progress.ui?.weightModal == null}
        units={props.settings.units}
        dispatch={dispatch}
        weight={progress.ui?.weightModal?.weight ?? 0}
      />
      <ModalStateVarsUserPrompt
        programExercise={progress.ui?.stateVarsUserPromptModal?.programExercise}
        allProgramExercises={allProgramExercises}
        isHidden={progress.ui?.stateVarsUserPromptModal?.programExercise == null}
        dispatch={dispatch}
      />
    </section>
  );
}
