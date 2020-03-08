import { h, JSX } from "preact";
import { ExcerciseView } from "./excercise";
import { IProgramDay } from "../models/program";
import { IDispatch } from "../ducks/types";
import { IProgress } from "../models/progress";
import { Button } from "./button";

interface ICardsViewProps {
  programDay: IProgramDay;
  progress: IProgress;
  dispatch: IDispatch;
}

export function CardsView(props: ICardsViewProps): JSX.Element {
  return (
    <section className="overflow-y-auto">
      {props.programDay.excercises.map(excercise => {
        const progress = props.progress.entries.find(e => e.excercise.name === excercise.excercise.name);
        return (
          <ExcerciseView
            excercise={excercise.excercise}
            weight={excercise.excercise.startWeight}
            setup={excercise.sets}
            progress={progress?.reps || []}
            dispatch={props.dispatch}
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
