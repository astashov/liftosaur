import { lb } from "lens-shmens";
import { h, JSX } from "preact";
import { IProgram, ISettings, ISubscription } from "../../../types";
import { ProgramDetailsExercise } from "./programDetailsExercise";
import { IProgramDetailsDispatch, IProgramDetailsState } from "./types";

export interface IProgramDetailsProps {
  settings: ISettings;
  program: IProgram;
  subscription: ISubscription;
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
      <div className="px-4">
        <button
          onClick={() => {
            props.dispatch(lb<IProgramDetailsState>().p("muscles").record({ type: "program" }));
          }}
          className="text-sm text-blue-700 underline"
        >
          Show Muscles
        </button>
      </div>
      <div className="px-4 pt-3" dangerouslySetInnerHTML={{ __html: props.program.description }} />
      {props.program.days.map((day, dayIndex) => {
        return (
          <section
            className={`pt-2 pb-16 px-4 ${dayIndex > 0 ? "border-grayv2-400 border-t" : ""} ${
              dayIndex % 2 === 0 ? "bg-white" : "bg-white"
            }`}
          >
            <div className="flex items-center">
              <h2 className="flex-1 pt-4 pb-4 text-2xl text-gray-600">{day.name}</h2>
              <div className="pl-2">
                <button
                  onClick={() => {
                    props.dispatch(lb<IProgramDetailsState>().p("muscles").record({ type: "day", dayIndex }));
                  }}
                  className="text-sm text-blue-700 underline"
                >
                  Muscles
                </button>
              </div>
            </div>
            <ul>
              {day.exercises.map((dayEntry, index) => {
                const programExercise = props.program.exercises.filter((e) => e.id === dayEntry.id)[0];
                return (
                  <ProgramDetailsExercise
                    programId={props.program.id}
                    programExercise={programExercise}
                    subscription={props.subscription}
                    allProgramExercises={props.program.exercises}
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
