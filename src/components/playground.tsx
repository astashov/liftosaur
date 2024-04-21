import { h, JSX, Fragment } from "preact";
import { buildCardsReducer, ICardsAction } from "../ducks/reducer";
import { IDispatch } from "../ducks/types";
import { Program } from "../models/program";
import { History } from "../models/history";
import { IDayData, IEquipment, IHistoryRecord, IProgram, IProgramExercise, ISettings, ISubscription } from "../types";
import { ExerciseView } from "./exercise";
import { GroupHeader } from "./groupHeader";
import { MenuItemEditable } from "./menuItemEditable";
import { ModalAmrap } from "./modalAmrap";
import { ModalWeight } from "./modalWeight";
import { useRef } from "preact/hooks";
import { ProgramExercise } from "../models/programExercise";
import { ModalEditSet } from "./modalEditSet";
import { EditProgressEntry } from "../models/editProgressEntry";
import { LinkButton } from "./linkButton";

export interface IPlaygroundProps {
  progress: IHistoryRecord;
  programExercise: IProgramExercise;
  subscription: ISubscription;
  program: IProgram;
  settings: ISettings;
  dayData: IDayData;
  onProgressChange: (p: IHistoryRecord) => void;
}

export function Playground(props: IPlaygroundProps): JSX.Element {
  const { programExercise, settings, progress } = props;
  const { exercises: allProgramExercises } = props.program;
  const entry = progress.entries[0];
  const progressRef = useRef(props.progress);
  progressRef.current = props.progress;

  const dispatch: IDispatch = async (action) => {
    const newProgress = buildCardsReducer(settings)(progressRef.current, action as ICardsAction);
    props.onProgressChange(newProgress);
  };

  return (
    <Fragment>
      <GroupHeader
        topPadding={true}
        name="Playground"
        help={
          <span>
            Allows to try out the logic added to this exercise. Choose a day, simulate workout, and verify that the{" "}
            <strong>State Variables</strong> changes are what you expect.
          </span>
        }
      />
      <MenuItemEditable
        name="Choose Day"
        type="select"
        value={`${props.progress.day}`}
        values={Program.getListOfDays(props.program)}
        onChange={(newValue) => {
          const newDay = parseInt(newValue || "1", 10);
          const dayData = Program.getDayData(props.program, newDay);
          const state = ProgramExercise.getState(programExercise, allProgramExercises);
          const nextVariationIndex = Program.nextVariationIndex(
            programExercise,
            allProgramExercises,
            state,
            dayData,
            settings
          );
          const newEntry = Program.nextHistoryEntry(
            programExercise,
            allProgramExercises,
            dayData,
            ProgramExercise.getVariations(programExercise, allProgramExercises)[nextVariationIndex].sets,
            state,
            settings,
            ProgramExercise.getEnableRpe(programExercise, allProgramExercises),
            ProgramExercise.getEnableRepRanges(programExercise, allProgramExercises),
            ProgramExercise.getWarmupSets(programExercise, allProgramExercises)
          );
          props.onProgressChange(History.buildFromEntry(newEntry, dayData));
        }}
      />
      <ExerciseView
        programMode={Program.programMode(props.program)}
        showEditButtons={false}
        history={[]}
        helps={[]}
        showHelp={false}
        entry={entry}
        dayData={props.dayData}
        subscription={props.subscription}
        programExercise={programExercise}
        allProgramExercises={allProgramExercises}
        index={0}
        hidePlatesCalculator={true}
        forceShowStateChanges={true}
        settings={props.settings}
        dispatch={dispatch}
        onChangeReps={() => undefined}
        onStartSetChanging={(
          isWarmup: boolean,
          entryIndex: number,
          setIndex?: number,
          pe?: IProgramExercise,
          equipment?: IEquipment
        ) => {
          EditProgressEntry.showEditSetModal(dispatch, isWarmup, entryIndex, setIndex, pe, equipment);
        }}
        progress={props.progress}
      />
      <div className="text-xs" style={{ marginTop: "-0.5rem" }}>
        <LinkButton
          name="playground-reset"
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
          Reset Playground
        </LinkButton>
      </div>
      {progress?.ui?.amrapModal && (
        <ModalAmrap
          progress={progress}
          dispatch={dispatch}
          settings={props.settings}
          programExercise={programExercise}
          allProgramExercises={props.program.exercises}
        />
      )}
      {progress.ui?.weightModal && (
        <ModalWeight
          programExercise={progress.ui?.weightModal?.programExercise}
          isHidden={progress.ui?.weightModal == null}
          dispatch={dispatch}
          weight={progress.ui?.weightModal?.weight ?? 0}
          settings={props.settings}
        />
      )}
      {progress.ui?.editSetModal && (
        <ModalEditSet
          isHidden={progress.ui?.editSetModal == null}
          key={progress.ui?.editSetModal?.setIndex}
          setsLength={progress.entries[progress.ui?.editSetModal?.entryIndex || 0]?.sets.length || 0}
          subscription={props.subscription}
          progressId={progress.id}
          dispatch={dispatch}
          settings={props.settings}
          equipment={progress.ui?.editSetModal?.equipment}
          programExercise={progress.ui?.editSetModal?.programExercise}
          allProgramExercises={props.program.exercises}
          isTimerDisabled={true}
          set={EditProgressEntry.getEditSetData(props.progress)}
          isWarmup={progress.ui?.editSetModal?.isWarmup || false}
          entryIndex={progress.ui?.editSetModal?.entryIndex || 0}
          setIndex={progress.ui?.editSetModal?.setIndex}
        />
      )}
    </Fragment>
  );
}
