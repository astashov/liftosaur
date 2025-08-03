import { h, JSX } from "preact";
import { IEvaluatedProgram } from "../../models/program";
import { ScrollableTabs } from "../scrollableTabs";
import { ExercisePickerAllProgramExercises } from "./exercisePickerAllProgramExercises";
import { IExercisePickerState, IExerciseType, ISettings } from "../../types";
import { ILensDispatch } from "../../utils/useLensReducer";

interface IProps {
  state: IExercisePickerState;
  dispatch: ILensDispatch<IExercisePickerState>;
  usedExerciseTypes: IExerciseType[];
  evaluatedProgram: IEvaluatedProgram;
  settings: ISettings;
}

export function ExercisePickerFromProgram(props: IProps): JSX.Element {
  const weeks = props.evaluatedProgram.weeks;
  if (weeks.length > 1) {
    return (
      <ScrollableTabs
        topPadding="0.5rem"
        className="gap-2 px-4"
        nonSticky={true}
        shouldNotExpand={true}
        type="squares"
        tabs={weeks.map((week, weekIndex) => {
          return {
            label: week.name,
            children: () => {
              return (
                <ExercisePickerAllProgramExercises
                  dispatch={props.dispatch}
                  state={props.state}
                  usedExerciseTypes={props.usedExerciseTypes}
                  settings={props.settings}
                  evaluatedProgram={props.evaluatedProgram}
                  week={week}
                />
              );
            },
          };
        })}
      />
    );
  } else if (weeks.length === 1) {
    return (
      <ExercisePickerAllProgramExercises
        dispatch={props.dispatch}
        state={props.state}
        usedExerciseTypes={props.usedExerciseTypes}
        settings={props.settings}
        evaluatedProgram={props.evaluatedProgram}
        week={props.evaluatedProgram.weeks[0]}
      />
    );
  } else {
    return <div>No weeks available in the program.</div>;
  }
}
