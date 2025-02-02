import { h, JSX } from "preact";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, IProgram, ISettings } from "../types";
import { Surface } from "./surface";
import { NavbarView } from "./navbar";
import { Footer2View } from "./footer2";
import { ExercisesList } from "./exercisesList";
import { Program } from "../models/program";
import { HelpExercises } from "./help/helpExercises";
import { INavCommon } from "../models/state";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  program: IProgram;
  history: IHistoryRecord[];
  navCommon: INavCommon;
}

export function ScreenExercises(props: IProps): JSX.Element {
  return (
    <Surface
      navbar={
        <NavbarView
          navCommon={props.navCommon}
          dispatch={props.dispatch}
          title="Exercises"
          helpContent={<HelpExercises />}
        />
      }
      footer={<Footer2View navCommon={props.navCommon} dispatch={props.dispatch} />}
    >
      <section className="px-4">
        <ExercisesList
          dispatch={props.dispatch}
          settings={props.settings}
          program={Program.fullProgram(props.program, props.settings)}
          history={props.history}
        />
      </section>
    </Surface>
  );
}
