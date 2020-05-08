import { h, JSX } from "preact";
import { ExcerciseView } from "./excercise";
import { IDispatch } from "../ducks/types";
import { IProgress, IProgressMode, Progress } from "../models/progress";
import { Button } from "./button";
import { IPlate } from "../models/weight";

interface ICardsViewProps {
  progress: IProgress;
  availablePlates: IPlate[];
  dispatch: IDispatch;
  onChangeReps: (mode: IProgressMode) => void;
}

export function CardsView(props: ICardsViewProps): JSX.Element {
  return (
    <section className="overflow-y-auto flex-1">
      {props.progress.entries.map((entry) => {
        return (
          <ExcerciseView
            entry={entry}
            availablePlates={props.availablePlates}
            dispatch={props.dispatch}
            onChangeReps={props.onChangeReps}
          />
        );
      })}
      <div className="text-center py-3">
        <Button
          kind="green"
          onClick={() => {
            const isNext = props.progress.historyRecord == null;
            if ((isNext && Progress.isFullyFinishedSet(props.progress)) || confirm("Are you sure?")) {
              props.dispatch({ type: "FinishProgramDayAction" });
            }
          }}
        >
          {props.progress.historyRecord != null ? "Save" : "Finish the workout"}
        </Button>
      </div>
    </section>
  );
}
