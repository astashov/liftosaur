import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { Muscle } from "../../models/muscle";
import { ScreenMuscles } from "./screenMuscles";
import { ISettings, IProgram } from "../../types";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  program: IProgram;
}

export function ScreenMusclesProgram(props: IProps): JSX.Element {
  const points = Muscle.normalizePoints(Muscle.getPointsForProgram(props.program, props.settings));
  return (
    <ScreenMuscles
      dispatch={props.dispatch}
      points={points}
      title={props.program.name}
      headerTitle="Muscles used in the program"
      headerHelp={
        <span>
          Shows how much specific muscles used in the current program. You may use it to find inbalances in your
          program. We calculate usage for <strong>strength</strong> and <strong>hypertrophy</strong> separately. For{" "}
          <strong>strength</strong> we consider sets with reps &lt; 8, for <strong>hypertrophy</strong> - sets with reps
          &gt;= 8. For calculating percentages, we assume each target muscle is 3x of each synergist muscle, we combine
          all sets and reps, and then normalize by the most used muscle - it will be 100%.
        </span>
      }
    />
  );
}
