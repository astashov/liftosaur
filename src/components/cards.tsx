import { h, JSX } from "preact";
import { ExcerciseView } from "./excercise";
import { IProgramDay } from "../models/program";
import { IDispatch } from "../ducks/types";
import { IProgress, IProgressMode } from "../models/progress";
import { Button } from "./button";
import { IProgramRecord } from "../models/history";
import { IPlate } from "../models/weight";

interface ICardsViewProps {
  programDay: IProgramDay;
  nextHistoryRecord: IProgramRecord;
  progress: IProgress;
  availablePlates: IPlate[];
  dispatch: IDispatch;
  onChangeReps: (mode: IProgressMode) => void;
}

export function CardsView(props: ICardsViewProps): JSX.Element {
  return (
    <section className="overflow-y-auto flex-1">
      {props.nextHistoryRecord.entries.map(entry => {
        const progress = props.progress.entries.find(e => e.excercise === entry.excercise)!;
        return (
          <ExcerciseView
            entry={entry}
            progress={progress}
            availablePlates={props.availablePlates}
            dispatch={props.dispatch}
            onChangeReps={props.onChangeReps}
          />
        );
      })}
      <div className="text-center py-3">
        <Button kind="green" onClick={() => props.dispatch({ type: "FinishProgramDayAction" })}>
          Finish the workout
        </Button>
      </div>
    </section>
  );
}
