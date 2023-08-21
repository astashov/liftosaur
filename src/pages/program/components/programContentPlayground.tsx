/* eslint-disable @typescript-eslint/ban-types */
import { h, JSX } from "preact";
import { IDayData, IEquipment, IHistoryRecord, IProgram, IProgramExercise, ISettings } from "../../../types";
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
      rounded: Weight.roundConvertTo(s.weight, props.settings, entry.exercise.equipment),
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
                programExercise.id,
                programExercise.exerciseType,
                newDayData,
                ProgramExercise.getVariations(programExercise, allProgramExercises)[nextVariationIndex].sets,
                state,
                settings,
                ProgramExercise.getEnableRpe(programExercise, allProgramExercises),
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
            equipment?: IEquipment
          ) => {
            EditProgressEntry.showEditSetModal(dispatch, isWarmup, entryIndex, setIndex, pe, equipment);
          }}
          onChangeReps={() => undefined}
        />
      </section>
      <ProgressStateChanges
        entry={entry}
        settings={props.settings}
        dayData={props.dayData}
        state={ProgramExercise.getState(props.programExercise, allProgramExercises)}
        script={ProgramExercise.getFinishDayScript(props.programExercise, allProgramExercises)}
      />
      <div className="text-xs">
        <LinkButton
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
              programExercise.id,
              programExercise.exerciseType,
              props.dayData,
              ProgramExercise.getVariations(programExercise, allProgramExercises)[nextVariationIndex].sets,
              state,
              settings,
              ProgramExercise.getEnableRpe(programExercise, allProgramExercises),
              ProgramExercise.getWarmupSets(programExercise, allProgramExercises)
            );
            props.onProgressChange(History.buildFromEntry(newEntry, props.dayData));
          }}
        >
          Reset
        </LinkButton>
      </div>
      <ModalAmrap
        isHidden={progress.ui?.amrapModal == null}
        dispatch={dispatch}
        isAmrap={progress.ui?.amrapModal?.isAmrap || false}
        logRpe={progress.ui?.amrapModal?.logRpe || false}
        initialReps={
          progress.entries[progress.ui?.amrapModal?.entryIndex || 0]?.sets[progress.ui?.amrapModal?.setIndex || 0]
            ?.completedReps
        }
        initialRpe={
          progress.entries[progress.ui?.amrapModal?.entryIndex || 0]?.sets[progress.ui?.amrapModal?.setIndex || 0]
            ?.completedRpe
        }
      />
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
      <ModalEditSet
        isHidden={progress.ui?.editSetModal == null}
        key={progress.ui?.editSetModal?.setIndex}
        setsLength={progress.entries[progress.ui?.editSetModal?.entryIndex || 0]?.sets.length || 0}
        subscription={{ google: { fake: null }, apple: {} }}
        progressId={progress.id}
        dispatch={dispatch}
        settings={props.settings}
        equipment={progress.ui?.editSetModal?.equipment}
        programExercise={progress.ui?.editSetModal?.programExercise}
        allProgramExercises={allProgramExercises}
        isTimerDisabled={true}
        set={EditProgressEntry.getEditSetData(props.progress)}
        isWarmup={progress.ui?.editSetModal?.isWarmup || false}
        entryIndex={progress.ui?.editSetModal?.entryIndex || 0}
        setIndex={progress.ui?.editSetModal?.setIndex}
      />
    </section>
  );
}
