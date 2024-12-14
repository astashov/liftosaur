import { h, JSX } from "preact";
import { useMemo } from "preact/hooks";
import { Service } from "../../api/service";
import { ScrollableTabs } from "../../components/scrollableTabs";
import { ILensDispatch } from "../../utils/useLensReducer";
import { PlannerProgram } from "./models/plannerProgram";
import { IPlannerState, IPlannerUi } from "./models/types";
import { IPlannerProgram, IPlannerProgramDay, IPlannerProgramWeek, ISettings } from "../../types";
import { PlannerWeek } from "./components/plannerWeek";

export interface IPlannerContentPerDayProps {
  program: IPlannerProgram;
  settings: ISettings;
  ui: IPlannerUi;
  service: Service;
  initialWeek: IPlannerProgramWeek;
  initialDay: IPlannerProgramDay;
  dispatch: ILensDispatch<IPlannerState>;
}

export function PlannerContentPerDay(props: IPlannerContentPerDayProps): JSX.Element {
  const { program, settings, ui, initialWeek, initialDay, service, dispatch } = props;
  const { evaluatedWeeks, exerciseFullNames } = useMemo(() => {
    return PlannerProgram.evaluate(program, settings);
  }, [program, settings]);

  return (
    <ScrollableTabs
      tabs={program.weeks.map((week, weekIndex) => {
        return {
          label: week.name,
          isInvalid: evaluatedWeeks[weekIndex].some((day) => !day.success),
          children: (
            <PlannerWeek
              key={weekIndex}
              initialWeek={initialWeek}
              initialDay={initialDay}
              week={week}
              weekIndex={weekIndex}
              program={program}
              settings={settings}
              ui={ui}
              exerciseFullNames={exerciseFullNames}
              evaluatedWeeks={evaluatedWeeks}
              service={service}
              dispatch={dispatch}
            />
          ),
        };
      })}
    />
  );
}
