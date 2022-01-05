import { h, JSX, Fragment } from "preact";
import { memo } from "preact/compat";
import { useState, useRef, useCallback } from "preact/hooks";
import { Progress } from "../../../models/progress";
import { History } from "../../../models/history";
import { buildCardsReducer } from "../../../ducks/reducer";
import { IHistoryRecord, IProgramExercise, ISettings } from "../../../types";
import { IProgramDetailsDispatch, IProgramDetailsState } from "./types";
import { Program } from "../../../models/program";
import { IDispatch } from "../../../ducks/types";
import { ICardsAction } from "../../../ducks/reducer";
import { ExerciseView } from "../../../components/exercise";
import { StateVars } from "./programDetailsStateVars";
import { lb } from "lens-shmens";
import { ModalAmrap } from "../../../components/modalAmrap";
import { ModalWeight } from "../../../components/modalWeight";

interface IPlaygroundProps {
  programId: string;
  programExercise: IProgramExercise;
  variationIndex: number;
  settings: ISettings;
  day: number;
  dispatch: IProgramDetailsDispatch;
}

export const Playground = memo(
  (props: IPlaygroundProps): JSX.Element => {
    const updateProgress = (args: { programExercise?: IProgramExercise; progress?: IHistoryRecord }): void => {
      let newProgress;
      if (args.programExercise != null) {
        const entry = progress.entries[0];
        const newEntry = Progress.applyProgramExercise(entry, args.programExercise, day, settings, true);
        newProgress = History.buildFromEntry(newEntry, day);
      } else if (args.progress != null) {
        newProgress = args.progress;
      }
      if (newProgress != null) {
        progressRef.current = newProgress;
        setProgress(newProgress);
      }
    };

    const { settings, day, variationIndex, programExercise } = props;
    const [progress, setProgress] = useState(() => {
      const entry = Program.nextHistoryEntry(
        programExercise.exerciseType,
        day,
        programExercise.variations[variationIndex].sets,
        programExercise.state,
        settings,
        programExercise.warmupSets
      );
      return History.buildFromEntry(entry, day);
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
          entry={entry}
          day={props.day}
          programExercise={programExercise}
          index={0}
          forceShowStateChanges={true}
          settings={props.settings}
          dispatch={dispatch}
          onChangeReps={() => undefined}
          isCurrent={true}
        />
        <StateVars
          stateVars={programExercise.state}
          id={programExercise.id}
          settings={settings}
          onChange={(key, value) => {
            const newProgramExercise = {
              ...programExercise,
              state: { ...programExercise.state, [key]: value },
            };
            props.dispatch(
              lb<IProgramDetailsState>()
                .p("programs")
                .findBy("id", props.programId)
                .p("exercises")
                .findBy("id", newProgramExercise.id)
                .record(newProgramExercise)
            );
            updateProgress({ programExercise: newProgramExercise });
          }}
        />
        <ModalAmrap isHidden={progressRef.current.ui?.amrapModal == null} dispatch={dispatch} />
        <ModalWeight
          isHidden={progressRef.current.ui?.weightModal == null}
          programExercise={progressRef.current.ui?.weightModal?.programExercise}
          units={props.settings.units}
          dispatch={dispatch}
          weight={progressRef.current.ui?.weightModal?.weight ?? 0}
        />
      </>
    );
  }
);
