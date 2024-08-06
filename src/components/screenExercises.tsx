import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IProgram, ISettings } from "../types";
import { ILoading } from "../models/state";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { IScreen, Screen } from "../models/screen";
import { HelpPlates } from "./help/helpPlates";
import { ExercisesList } from "./exercisesList";
import { Program } from "../models/program";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  loading: ILoading;
  screenStack: IScreen[];
  program: IProgram;
}

export function ScreenExercises(props: IProps): JSX.Element {
  return (
    <Surface
      navbar={
        <NavbarView
          loading={props.loading}
          dispatch={props.dispatch}
          screenStack={props.screenStack}
          title="Exercises"
          helpContent={<HelpPlates />}
        />
      }
      footer={<Footer2View dispatch={props.dispatch} screen={Screen.current(props.screenStack)} />}
    >
      <section className="px-2">
        <ExercisesList
          dispatch={props.dispatch}
          settings={props.settings}
          program={Program.fullProgram(props.program, props.settings)}
        />
      </section>
    </Surface>
  );
}
