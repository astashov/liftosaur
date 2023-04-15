import { h, JSX, Fragment } from "preact";
import { buildCardsReducer, ICardsAction } from "../ducks/reducer";
import { IDispatch } from "../ducks/types";
import { Program } from "../models/program";
import { History } from "../models/history";
import { IEquipment, IHistoryRecord, IProgramDay, IProgramExercise, ISettings, ISubscription } from "../types";
import { ExerciseView } from "./exercise";
import { GroupHeader } from "./groupHeader";
import { MenuItemEditable } from "./menuItemEditable";
import { ModalAmrap } from "./modalAmrap";
import { ModalWeight } from "./modalWeight";
import { useRef } from "preact/hooks";
import { ProgramExercise } from "../models/programExercise";
import { ModalStateVarsUserPrompt } from "./modalStateVarsUserPrompt";
import { ModalEditSet } from "./modalEditSet";
import { EditProgressEntry } from "../models/editProgressEntry";
import { LinkButton } from "./linkButton";

export interface IPlaygroundProps {
  progress: IHistoryRecord;
  programExercise: IProgramExercise;
  subscription: ISubscription;
  allProgramExercises: IProgramExercise[];
  settings: ISettings;
  day: number;
  days: IProgramDay[];
  onProgressChange: (p: IHistoryRecord) => void;
}

export function Playground(props: IPlaygroundProps): JSX.Element {
  const { programExercise, days, settings, progress, allProgramExercises } = props;
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
        values={[...days.map<[string, string]>((d, i) => [(i + 1).toString(), `${i + 1} - ${d.name}`])]}
        onChange={(newValue) => {
          const newDay = parseInt(newValue || "1", 10);
          const state = ProgramExercise.getState(programExercise, allProgramExercises);
          const nextVariationIndex = Program.nextVariationIndex(
            programExercise,
            allProgramExercises,
            state,
            newDay,
            settings
          );
          const newEntry = Program.nextHistoryEntry(
            programExercise.id,
            programExercise.exerciseType,
            newDay,
            ProgramExercise.getVariations(programExercise, allProgramExercises)[nextVariationIndex].sets,
            state,
            settings,
            !!programExercise.enableRpe,
            ProgramExercise.getWarmupSets(programExercise, allProgramExercises)
          );
          props.onProgressChange(History.buildFromEntry(newEntry, newDay));
        }}
      />
      <ExerciseView
        showEditButtons={false}
        history={[]}
        helps={[]}
        showHelp={false}
        entry={entry}
        day={props.day}
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
          onClick={() => {
            const state = ProgramExercise.getState(programExercise, allProgramExercises);
            const nextVariationIndex = Program.nextVariationIndex(
              programExercise,
              allProgramExercises,
              state,
              props.day,
              settings
            );
            const newEntry = Program.nextHistoryEntry(
              programExercise.id,
              programExercise.exerciseType,
              props.day,
              ProgramExercise.getVariations(programExercise, allProgramExercises)[nextVariationIndex].sets,
              state,
              settings,
              !!programExercise.enableRpe,
              ProgramExercise.getWarmupSets(programExercise, allProgramExercises)
            );
            props.onProgressChange(History.buildFromEntry(newEntry, props.day));
          }}
        >
          Reset Playground
        </LinkButton>
      </div>
      <ModalAmrap
        isHidden={progress.ui?.amrapModal == null}
        dispatch={dispatch}
        initialReps={
          progress.entries[progress.ui?.amrapModal?.entryIndex || 0]?.sets[progress.ui?.amrapModal?.setIndex || 0]
            ?.completedReps
        }
        initialRpe={
          progress.entries[progress.ui?.amrapModal?.entryIndex || 0]?.sets[progress.ui?.amrapModal?.setIndex || 0]
            ?.completedRpe
        }
        isAmrap={progress.ui?.amrapModal?.isAmrap || false}
        logRpe={progress.ui?.amrapModal?.logRpe || false}
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
        subscription={props.subscription}
        progressId={progress.id}
        dispatch={dispatch}
        settings={props.settings}
        equipment={progress.ui?.editSetModal?.equipment}
        programExercise={progress.ui?.editSetModal?.programExercise}
        allProgramExercises={props.allProgramExercises}
        isTimerDisabled={true}
        set={EditProgressEntry.getEditSetData(props.progress)}
        isWarmup={progress.ui?.editSetModal?.isWarmup || false}
        entryIndex={progress.ui?.editSetModal?.entryIndex || 0}
        setIndex={progress.ui?.editSetModal?.setIndex}
      />
    </Fragment>
  );
}
