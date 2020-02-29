import { h, JSX } from "preact";
import { ExcerciseView } from "./excercise";
import { IProgramDay } from "../models/program";
import { IProgress } from "../ducks/reducer";

interface ICardsViewProps {
  programDay: IProgramDay;
  progress: IProgress;
}

export function CardsView(props: ICardsViewProps): JSX.Element {
  return (
    <section className="overflow-y-auto">
      {props.programDay.excercises.map(excercise => {
        const progress = props.progress.entries.find(
          e => e.excercise.name === excercise.excercise.name
        );
        return (
          <ExcerciseView
            excercise={excercise.excercise}
            weight={excercise.excercise.startWeight}
            setup={excercise.sets}
            progress={progress?.reps || []}
          />
        );
      })}
    </section>
  );
}
