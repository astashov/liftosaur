import { h, JSX } from "preact";
import { ExcerciseSetView } from "./excerciseSet";
import { ISet } from "../models/types";
import { IExcercise } from "../models/excercise";

interface Props {
  excercise: IExcercise;
  weight: number;
  setup: ISet[];
  progress: number[];
}

export function ExcerciseView(props: Props): JSX.Element {
  return (
    <section className="p-4 bg-gray-100 border border-gray-300 mb-2 rounded-lg">
      <header className="pb-2">
        {props.excercise.name}, <strong>{props.weight}</strong>
      </header>
      <section className="flex">
        {props.setup.map((reps, i) => {
          const completedReps = props.progress[i] as number | undefined;
          return <ExcerciseSetView reps={reps} completedReps={completedReps} />;
        })}
      </section>
    </section>
  );
}
