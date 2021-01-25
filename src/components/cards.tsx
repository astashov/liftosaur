import { h, JSX } from "preact";
import { ExerciseView } from "./exercise";
import { IDispatch } from "../ducks/types";
import { IProgressMode, Progress } from "../models/progress";
import { Button } from "./button";
import { IHistoryRecord } from "../models/history";
import { ISettings } from "../models/settings";
import { IProgram, IProgramExercise } from "../models/program";
import { Timer } from "./timer";
import { memo } from "preact/compat";

interface ICardsViewProps {
  progress: IHistoryRecord;
  program?: IProgram;
  isTimerShown: boolean;
  settings: ISettings;
  dispatch: IDispatch;
  onChangeReps: (mode: IProgressMode) => void;
  onStartSetChanging?: (isWarmup: boolean, entryIndex: number, setIndex?: number) => void;
}

export const CardsView = memo(
  (props: ICardsViewProps): JSX.Element => {
    return (
      <section style={{ paddingTop: "3.5rem", paddingBottom: props.isTimerShown ? "7.5rem" : "4rem" }}>
        <Timer startTime={props.progress.startTime} />
        {props.progress.entries.map((entry, index) => {
          let programExercise: IProgramExercise | undefined;
          if (props.program) {
            const exerciseId = props.program.days[props.progress.day - 1].exercises[index].id;
            programExercise = props.program.exercises.find((e) => e.id === exerciseId);
          }

          return (
            <ExerciseView
              showHelp={true}
              isCurrent={Progress.isCurrent(props.progress)}
              settings={props.settings}
              index={index}
              entry={entry}
              programExercise={programExercise}
              day={props.progress.day}
              dispatch={props.dispatch}
              onChangeReps={props.onChangeReps}
              onStartSetChanging={props.onStartSetChanging}
            />
          );
        })}
        <div className="py-3 text-center">
          <Button
            kind="green"
            onClick={() => {
              if (
                (Progress.isCurrent(props.progress) && Progress.isFullyFinishedSet(props.progress)) ||
                confirm("Are you sure?")
              ) {
                props.dispatch({ type: "FinishProgramDayAction" });
              }
            }}
          >
            {Progress.isCurrent(props.progress) ? "Finish the workout" : "Save"}
          </Button>
        </div>
      </section>
    );
  }
);
