import { h, JSX } from "preact";
import { IEditProgram } from "../../models/program";
import { IDispatch } from "../../ducks/types";
import { HeaderView } from "../header";
import { GroupHeader } from "../groupHeader";
import { MenuItem } from "../menuItem";
import { Button } from "../button";
import { FooterView } from "../footer";

interface IProps {
  editProgram: IEditProgram;
  dispatch: IDispatch;
}

export function EditProgramDaysList(props: IProps): JSX.Element {
  return (
    <section className="h-full">
      <HeaderView
        title="Edit Program"
        subtitle={props.editProgram.program.name}
        left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>}
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <GroupHeader name="Days" />
        {props.editProgram.program.days.map((day, index) => (
          <MenuItem name={day.name} onClick={() => props.dispatch({ type: "EditDayAction", index })} />
        ))}
        <div className="flex p-2">
          <div className="flex-1 mr-auto">
            <Button kind="blue" onClick={() => props.dispatch({ type: "CreateDayAction" })}>
              Create new day
            </Button>
          </div>
          <div>
            <Button kind="green" onClick={() => props.dispatch({ type: "SaveProgram" })}>
              Save Program
            </Button>
          </div>
        </div>
      </section>

      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
