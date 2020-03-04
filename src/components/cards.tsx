import { h, JSX } from "preact";
import { ExcerciseView } from "./excercise";
import { IProgramDay } from "../models/program";
import { IDispatch } from "../ducks/types";
import { IProgress } from "../models/progress";

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
    </section>
  );
}
