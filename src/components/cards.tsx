import { h, JSX } from "preact";
import { ExcerciseView } from "./excercise";
import { IDispatch } from "../ducks/types";
import { IProgressMode, Progress } from "../models/progress";
import { Button } from "./button";
import { IPlate } from "../models/weight";
import { IHistoryRecord } from "../models/history";

interface ICardsViewProps {
  progress: IHistoryRecord;
  availablePlates: IPlate[];
  dispatch: IDispatch;
  onChangeReps: (mode: IProgressMode) => void;
}

export function CardsView(props: ICardsViewProps): JSX.Element {
  return (
    <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
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
