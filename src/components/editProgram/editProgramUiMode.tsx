import { JSX, h } from "preact";
import { IPlannerState } from "../../pages/planner/models/types";
import { ILensDispatch } from "../../utils/useLensReducer";

interface IEditProgramViewProps {
  state: IPlannerState;
  plannerDispatch: ILensDispatch<IPlannerState>;
}

export function EditProgramUiModeView(props: IEditProgramViewProps): JSX.Element {
  const program = props.state.current.program;

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto flex-nowrap">
        {program.weeks.map((week, weekIndex) => {
          return <button className="

        }}
      </div>
      <EditProgramNavbar state={props.state} plannerDispatch={props.plannerDispatch} />

    </div>
  );
}
