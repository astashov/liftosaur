import { h, JSX } from "preact";
import { ExerciseView } from "./exercise";
import { IDispatch } from "../ducks/types";
import { IProgressMode, Progress } from "../models/progress";
import { Button } from "./button";
import { IHistoryRecord } from "../models/history";
import { ISettings } from "../models/settings";

interface ICardsViewProps {
  progress: IHistoryRecord;
  isTimerShown: boolean;
  settings: ISettings;
  dispatch: IDispatch;
  onChangeReps: (mode: IProgressMode) => void;
}

export function CardsView(props: ICardsViewProps): JSX.Element {
  return (
    <section style={{ paddingTop: "3.5rem", paddingBottom: props.isTimerShown ? "7.5rem" : "4rem" }}>
      {props.progress.entries.map((entry) => {
        return (
          <ExerciseView
            isCurrent={Progress.isCurrent(props.progress)}
            settings={props.settings}
            entry={entry}
            dispatch={props.dispatch}
            onChangeReps={props.onChangeReps}
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
