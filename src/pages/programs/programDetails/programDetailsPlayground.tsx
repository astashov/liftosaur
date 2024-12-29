import React, { JSX } from "react";
import { memo } from "react";
import { useState, useRef, useCallback } from "react";
import { Progress } from "../../../models/progress";
import { History } from "../../../models/history";
import { buildCardsReducer } from "../../../ducks/reducer";
import { IDayData, IHistoryRecord, IProgram, IProgramExercise, ISettings, ISubscription } from "../../../types";
import { IProgramMode, Program } from "../../../models/program";
import { IDispatch } from "../../../ducks/types";
import { ICardsAction } from "../../../ducks/reducer";
import { ExerciseView } from "../../../components/exercise";
import { StateVars } from "./programDetailsStateVars";
import { ModalAmrap } from "../../../components/modalAmrap";
import { ModalWeight } from "../../../components/modalWeight";
import { ProgramExercise } from "../../../models/programExercise";

interface IPlaygroundProps {
  programId: string;
  programExercise: IProgramExercise;
  program: IProgram;
  subscription: ISubscription;
  variationIndex: number;
  settings: ISettings;
  dayData: IDayData;
  programMode: IProgramMode;
  hidePlatesCalculator?: boolean;
  onProgramExerciseUpdate: (programExercise: IProgramExercise) => void;
}

export const Playground = memo(
  (props: IPlaygroundProps): JSX.Element => {
    const { settings, dayData, variationIndex, programExercise } = props;
    const allProgramExercises = props.program.exercises;
    const updateProgress = (args: { programExercise?: IProgramExercise; progress?: IHistoryRecord }): void => {
      let newProgress;
      if (args.programExercise != null) {
        const entry = progress.entries[0];
        const newEntry = Progress.applyProgramExercise(
          entry,
          args.programExercise,
          allProgramExercises,
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

    const programExerciseState = ProgramExercise.getState(props.programExercise, allProgramExercises);
    const programExerciseVariations = ProgramExercise.getVariations(props.programExercise, allProgramExercises);
    const programExerciseWarmupSets = ProgramExercise.getWarmupSets(props.programExercise, allProgramExercises);
    const programExerciseEnableRepRanges = ProgramExercise.getEnableRepRanges(
      props.programExercise,
      allProgramExercises
    );
    const programExerciseEnableRpe = ProgramExercise.getEnableRpe(props.programExercise, allProgramExercises);

    const [progress, setProgress] = useState(() => {
      const entry = Program.nextHistoryEntry(
        programExercise,
        allProgramExercises,
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

    const entry = progressRef.current!.entries[0];

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
          programMode={props.programMode}
          history={historyRef.current}
          showHelp={false}
          helps={[]}
          entry={entry}
          dayData={props.dayData}
          subscription={props.subscription}
          showEditButtons={false}
          progress={progress}
          programExercise={programExercise}
          program={props.program}
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
        {progressRef.current!.ui?.amrapModal && (
          <ModalAmrap
            progress={progressRef.current}
            settings={props.settings}
            dispatch={dispatch}
            programExercise={programExercise}
            allProgramExercises={allProgramExercises}
          />
        )}
        {progressRef.current!.ui?.weightModal && (
          <ModalWeight
            isHidden={progressRef.current!.ui?.weightModal == null}
            programExercise={progressRef.current!.ui?.weightModal?.programExercise}
            settings={props.settings}
            dispatch={dispatch}
            weight={progressRef.current!.ui?.weightModal?.weight ?? 0}
          />
        )}
      </>
    );
  }
);
