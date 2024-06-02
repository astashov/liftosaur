/* eslint-disable @typescript-eslint/ban-types */
import { h, JSX } from "preact";
import { IDayData, IExerciseType, IHistoryRecord, IProgram, IProgramExercise, ISettings } from "../../../types";
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
import { Markdown } from "../../../components/markdown";
import { LinkButton } from "../../../components/linkButton";
import { ModalEditSet } from "../../../components/modalEditSet";
import { EditProgressEntry } from "../../../models/editProgressEntry";
import { WeightLinesUnsubscribed } from "../../../components/weightLinesUnsubscribed";
import { CollectionUtils } from "../../../utils/collection";
import { Weight } from "../../../models/weight";

export interface IPlaygroundProps {
  progress: IHistoryRecord;
  hideDay?: boolean;
  programExercise: IProgramExercise;
  program: IProgram;
  settings: ISettings;
  dayData: IDayData;
  onProgressChange: (p: IHistoryRecord) => void;
  lbe: LensBuilder<IProgramEditorState, IProgramExercise, {}>;
  dispatch: ILensDispatch<IProgramEditorState>;
}

export function ProgramContentPlayground(props: IPlaygroundProps): JSX.Element {
  const { programExercise, settings, progress } = props;
  const { exercises: allProgramExercises } = props.program;
  const entry = progress.entries[0];
  const progressRef = useRef(props.progress);
  progressRef.current = props.progress;

  const dispatch: IDispatch = async (action) => {
    const newProgress = buildCardsReducer(settings)(progressRef.current, action as ICardsAction);
    props.onProgressChange(newProgress);
  };
  const description = ProgramExercise.getDescription(
    programExercise,
    allProgramExercises,
    props.dayData,
    props.settings
  );

  const workoutWeights = CollectionUtils.compatBy(
    entry.sets.map((s) => ({
      original: s.weight,
      rounded: Weight.roundConvertTo(s.weight, props.settings, entry.exercise),
    })),
    (w) => w.rounded.value.toString()
  );

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
              const newDayData = Program.getDayData(props.program, newDay);
              const state = ProgramExercise.getState(programExercise, allProgramExercises);
              const nextVariationIndex = Program.nextVariationIndex(
                programExercise,
                allProgramExercises,
                state,
                newDayData,
                settings
              );
              const newEntry = Program.nextHistoryEntry(
                programExercise,
                allProgramExercises,
                newDayData,
                ProgramExercise.getVariations(programExercise, allProgramExercises)[nextVariationIndex].sets,
                state,
                settings,
                ProgramExercise.getEnableRpe(programExercise, allProgramExercises),
                ProgramExercise.getEnableRepRanges(programExercise, allProgramExercises),
                ProgramExercise.getWarmupSets(programExercise, allProgramExercises)
              );
              props.onProgressChange(History.buildFromEntry(newEntry, newDayData));
            }}
          >
            {Program.getListOfDays(props.program).map(([value, name]) => {
              return (
                <option value={value} selected={Number(value) === progressRef.current.day}>
                  {name}
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
      <div className="mt-1">
        <WeightLinesUnsubscribed weights={workoutWeights} />
      </div>
      <section className="flex flex-wrap pb-2">
        <ExerciseSets
          isEditMode={false}
          dayData={props.dayData}
          progress={progress}
          warmupSets={entry.warmupSets}
          index={0}
          showHelp={false}
          settings={props.settings}
          programExercise={programExercise}
          allProgramExercises={allProgramExercises}
          entry={entry}
          dispatch={dispatch}
          onStartSetChanging={(
            isWarmup: boolean,
            entryIndex: number,
            setIndex?: number,
            pe?: IProgramExercise,
            exerciseType?: IExerciseType
          ) => {
            EditProgressEntry.showEditSetModal(dispatch, isWarmup, entryIndex, setIndex, pe, exerciseType);
          }}
          onChangeReps={() => undefined}
        />
      </section>
      <ProgressStateChanges
        entry={entry}
        settings={props.settings}
        mode={Program.programMode(props.program)}
        dayData={props.dayData}
        programExercise={programExercise}
        program={props.program}
      />
      <div className="text-xs">
        <LinkButton
          name="program-content-playground-reset"
          onClick={() => {
            const state = ProgramExercise.getState(programExercise, allProgramExercises);
            const nextVariationIndex = Program.nextVariationIndex(
              programExercise,
              allProgramExercises,
              state,
              props.dayData,
              settings
            );
            const newEntry = Program.nextHistoryEntry(
              programExercise,
              allProgramExercises,
              props.dayData,
              ProgramExercise.getVariations(programExercise, allProgramExercises)[nextVariationIndex].sets,
              state,
              settings,
              ProgramExercise.getEnableRpe(programExercise, allProgramExercises),
              ProgramExercise.getEnableRepRanges(programExercise, allProgramExercises),
              ProgramExercise.getWarmupSets(programExercise, allProgramExercises)
            );
            props.onProgressChange(History.buildFromEntry(newEntry, props.dayData));
          }}
        >
          Reset
        </LinkButton>
      </div>
      {progress?.ui?.amrapModal && (
        <ModalAmrap
          dispatch={dispatch}
          settings={props.settings}
          programExercise={programExercise}
          allProgramExercises={props.program.exercises}
          progress={progress}
        />
      )}
      {progress.ui?.weightModal && (
        <ModalWeight
          programExercise={progress.ui?.weightModal?.programExercise}
          isHidden={progress.ui?.weightModal == null}
          settings={props.settings}
          dispatch={dispatch}
          weight={progress.ui?.weightModal?.weight ?? 0}
        />
      )}
      {progress.ui?.editSetModal && (
        <ModalEditSet
          isHidden={progress.ui?.editSetModal == null}
          key={progress.ui?.editSetModal?.setIndex}
          setsLength={progress.entries[progress.ui?.editSetModal?.entryIndex || 0]?.sets.length || 0}
          subscription={{ google: { fake: null }, apple: {} }}
          progressId={progress.id}
          dispatch={dispatch}
          settings={props.settings}
          exerciseType={progress.ui?.editSetModal?.exerciseType}
          programExercise={progress.ui?.editSetModal?.programExercise}
          allProgramExercises={allProgramExercises}
          isTimerDisabled={true}
          set={EditProgressEntry.getEditSetData(props.progress)}
          isWarmup={progress.ui?.editSetModal?.isWarmup || false}
          entryIndex={progress.ui?.editSetModal?.entryIndex || 0}
          setIndex={progress.ui?.editSetModal?.setIndex}
        />
      )}
    </section>
  );
}
