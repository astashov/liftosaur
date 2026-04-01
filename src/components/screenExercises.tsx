import type { JSX } from "react";
import { IDispatch } from "../ducks/types";
import { IHistoryRecord, IProgram, ISettings } from "../types";
import { ExercisesList } from "./exercisesList";
import { Program_fullProgram } from "../models/program";
import { HelpExercises } from "./help/helpExercises";
import { INavCommon } from "../models/state";
import { useNavOptions } from "../navigation/useNavOptions";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  program: IProgram;
  history: IHistoryRecord[];
  navCommon: INavCommon;
}

export function ScreenExercises(props: IProps): JSX.Element {
  useNavOptions({ navTitle: "Exercises", navHelpContent: <HelpExercises /> });

  return (
    <>
      <section className="px-4">
        <ExercisesList
          isLoggedIn={!!props.navCommon.userId}
          dispatch={props.dispatch}
          settings={props.settings}
          program={Program_fullProgram(props.program, props.settings)}
          history={props.history}
        />
      </section>
    </>
  );
}
