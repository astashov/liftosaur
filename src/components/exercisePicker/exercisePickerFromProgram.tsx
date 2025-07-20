import { h, JSX } from "preact";
import { IEvaluatedProgram } from "../../models/program";
import { ScrollableTabs } from "../scrollableTabs";
import { ExercisePickerAllProgramExercises } from "./exercisePickerAllProgramExercises";
import { ISettings } from "../../types";

interface IProps {
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
                  settings={props.settings}
                  evaluatedProgram={props.evaluatedProgram}
                  weekIndex={weekIndex}
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
        settings={props.settings}
        evaluatedProgram={props.evaluatedProgram}
        weekIndex={0}
        week={props.evaluatedProgram.weeks[0]}
      />
    );
  } else {
    return <div>No weeks available in the program.</div>;
  }
}
