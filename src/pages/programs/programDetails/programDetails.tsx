import { h, JSX } from "preact";
import { IProgram, ISettings } from "../../../types";
import { ProgramDetailsExercise } from "./programDetailsExercise";
import { IProgramDetailsDispatch } from "./types";

export interface IProgramDetailsProps {
  settings: ISettings;
  program: IProgram;
  shouldShowAllScripts: boolean;
  shouldShowAllFormulas: boolean;
  dispatch: IProgramDetailsDispatch;
}

export function ProgramDetails(props: IProgramDetailsProps): JSX.Element {
  return (
    <div>
      <h1 className="px-4 text-3xl font-bold leading-tight">
        <a className="text-blue-700 underline" target="_blank" href={props.program.url}>
          {props.program.name}
        </a>
      </h1>
      <h3 className="px-4 text-sm font-bold text-gray-700 uppercase">By {props.program.author}</h3>
      <div className="px-4 pt-3" dangerouslySetInnerHTML={{ __html: props.program.description }} />
      {props.program.days.map((day, dayIndex) => {
        return (
          <section className={`py-2 px-4 ${dayIndex % 2 === 0 ? "bg-white" : "bg-white"}`}>
            <h2 className="pt-4 pb-4 text-xl text-gray-600">{day.name}</h2>
            <ul>
              {day.exercises.map((dayEntry, index) => {
                const programExercise = props.program.exercises.filter((e) => e.id === dayEntry.id)[0];
                return (
                  <ProgramDetailsExercise
                    programId={props.program.id}
                    programExercise={programExercise}
                    programExerciseIndex={index}
                    dayIndex={dayIndex}
                    settings={props.settings}
                    shouldShowAllFormulas={props.shouldShowAllFormulas}
                    shouldShowAllScripts={props.shouldShowAllScripts}
                    dispatch={props.dispatch}
                  />
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
