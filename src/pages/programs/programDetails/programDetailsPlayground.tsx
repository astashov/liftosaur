import { h, JSX, Fragment } from "preact";
import { memo } from "preact/compat";
import { useState, useRef, useCallback } from "preact/hooks";
import { Progress } from "../../../models/progress";
import { History } from "../../../models/history";
import { buildCardsReducer } from "../../../ducks/reducer";
import { IDayData, IHistoryRecord, IProgramExercise, ISettings, ISubscription } from "../../../types";
import { Program } from "../../../models/program";
import { IDispatch } from "../../../ducks/types";
import { ICardsAction } from "../../../ducks/reducer";
import { ExerciseView } from "../../../components/exercise";
import { StateVars } from "./programDetailsStateVars";
import { ModalAmrap } from "../../../components/modalAmrap";
import { ModalWeight } from "../../../components/modalWeight";
import { ProgramExercise } from "../../../models/programExercise";
import { ModalStateVarsUserPrompt } from "../../../components/modalStateVarsUserPrompt";

interface IPlaygroundProps {
  programId: string;
  programExercise: IProgramExercise;
  allProgramExercises: IProgramExercise[];
  subscription: ISubscription;
  variationIndex: number;
  settings: ISettings;
  dayData: IDayData;
  hidePlatesCalculator?: boolean;
  onProgramExerciseUpdate: (programExercise: IProgramExercise) => void;
}

export const Playground = memo(
  (props: IPlaygroundProps): JSX.Element => {
    const { settings, dayData, variationIndex, programExercise } = props;
    const updateProgress = (args: { programExercise?: IProgramExercise; progress?: IHistoryRecord }): void => {
      let newProgress;
      if (args.programExercise != null) {
        const entry = progress.entries[0];
        const newEntry = Progress.applyProgramExercise(
          entry,
          args.programExercise,
          props.allProgramExercises,
          dayData,
          settings,
          true
        );
        newProgress = History.buildFromEntry(newEntry, dayData);
      } else if (args.progress != null) {
        newProgress = args.progress;
      }
      if (newProgress != null) {
        progressRef.current = newProgress;
        setProgress(newProgress);
      }
    };

    const programExerciseState = ProgramExercise.getState(props.programExercise, props.allProgramExercises);
    const programExerciseVariations = ProgramExercise.getVariations(props.programExercise, props.allProgramExercises);
    const programExerciseWarmupSets = ProgramExercise.getWarmupSets(props.programExercise, props.allProgramExercises);
    const programExerciseEnableRepRanges = ProgramExercise.getEnableRepRanges(
      props.programExercise,
      props.allProgramExercises
    );
    const programExerciseEnableRpe = ProgramExercise.getEnableRpe(props.programExercise, props.allProgramExercises);

    const [progress, setProgress] = useState(() => {
      const entry = Program.nextHistoryEntry(
        programExercise.id,
        programExercise.exerciseType,
        dayData,
        programExerciseVariations[variationIndex].sets,
        programExerciseState,
        settings,
        programExerciseEnableRpe,
        programExerciseEnableRepRanges,
        programExerciseWarmupSets
      );
      return History.buildFromEntry(entry, dayData);
    });
    const progressRef = useRef(progress);
    const historyRef = useRef([]);

    const entry = progressRef.current.entries[0];

    const dispatch: IDispatch = useCallback(
      async (action) => {
        const newProgress = buildCardsReducer(settings)(progressRef.current, action as ICardsAction);
        updateProgress({ progress: newProgress });
      },
      [settings, progress]
    );

    return (
      <>
        <ExerciseView
          history={historyRef.current}
          showHelp={false}
          helps={[]}
          entry={entry}
          dayData={props.dayData}
          subscription={props.subscription}
          showEditButtons={false}
          progress={progress}
          programExercise={programExercise}
          allProgramExercises={props.allProgramExercises}
          hidePlatesCalculator={props.hidePlatesCalculator}
          index={0}
          forceShowStateChanges={true}
          settings={props.settings}
          dispatch={dispatch}
          onChangeReps={() => undefined}
        />
        <StateVars
          stateVars={programExerciseState}
          id={programExercise.id}
          settings={settings}
          onChange={(key, value) => {
            const newProgramExercise = {
              ...programExercise,
              state: { ...programExerciseState, [key]: value },
            };
            props.onProgramExerciseUpdate(newProgramExercise);
            updateProgress({ programExercise: newProgramExercise });
          }}
        />
        <ModalAmrap
          isHidden={progressRef.current.ui?.amrapModal == null}
          initialReps={
            progressRef.current.entries[progressRef.current.ui?.amrapModal?.entryIndex || 0]?.sets[
              progressRef.current.ui?.amrapModal?.setIndex || 0
            ]?.completedReps
          }
          initialRpe={
            progressRef.current.entries[progressRef.current.ui?.amrapModal?.entryIndex || 0]?.sets[
              progressRef.current.ui?.amrapModal?.setIndex || 0
            ]?.completedRpe
          }
          dispatch={dispatch}
          isAmrap={progressRef.current.ui?.amrapModal?.isAmrap || false}
          logRpe={progressRef.current.ui?.amrapModal?.logRpe || false}
        />
        <ModalWeight
          isHidden={progressRef.current.ui?.weightModal == null}
          programExercise={progressRef.current.ui?.weightModal?.programExercise}
          units={props.settings.units}
          dispatch={dispatch}
          weight={progressRef.current.ui?.weightModal?.weight ?? 0}
        />
        <ModalStateVarsUserPrompt
          programExercise={progress.ui?.stateVarsUserPromptModal?.programExercise}
          allProgramExercises={props.allProgramExercises}
          isHidden={progress.ui?.stateVarsUserPromptModal?.programExercise == null}
          dispatch={dispatch}
        />
      </>
    );
  }
);
