import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { Muscle } from "../../models/muscle";
import { ScreenMuscles } from "./screenMuscles";
import { ISettings, IProgram, IProgramDay } from "../../types";

interface IProps {
  dispatch: IDispatch;
  settings: ISettings;
  program: IProgram;
  programDay: IProgramDay;
}

export function ScreenMusclesDay(props: IProps): JSX.Element {
  const points = Muscle.normalizePoints(Muscle.getPointsForDay(props.program, props.programDay, props.settings));
  return (
    <ScreenMuscles
      dispatch={props.dispatch}
      settings={props.settings}
      points={points}
      title={props.programDay.name}
      headerTitle="Muscles used in the day"
      headerHelp={
        <span>
          Shows how much specific muscles used in the current day. You may use it to find inbalances in your program. We
          calculate usage for <strong>strength</strong> and <strong>hypertrophy</strong> separately. For{" "}
          <strong>strength</strong> we consider sets with reps &lt; 8, for <strong>hypertrophy</strong> - sets with reps
          &gt;= 8. For calculating percentages, we assume each target muscle is 3x of each synergist muscle, we combine
          all sets and reps, and then normalize by the most used muscle - it will be 100%.
        </span>
      }
    />
  );
}
