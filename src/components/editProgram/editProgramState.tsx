import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { IEditProgram } from "../../models/program";
import { ObjectUtils } from "../../utils/object";
import { MenuItemEditable } from "../menuItemEditable";
import { lb } from "../../utils/lens";
import { IState } from "../../ducks/reducer";
import { Button } from "../button";

interface IProps {
  editProgram: IEditProgram;
  dispatch: IDispatch;
  onAddStateVariable: () => void;
}

export function EditProgramState(props: IProps): JSX.Element {
  const state = props.editProgram.program.state;
  const internalState = props.editProgram.program.internalState;

  return (
    <section>
      {ObjectUtils.keys(internalState).map((stateKey) => {
        return (
          <MenuItemEditable
            name={stateKey}
            type="number"
            value={internalState[stateKey].toString()}
            hasClear={false}
            onChange={(newValue?: string) => {
              const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
              if (v != null) {
                const newState = { ...internalState };
                newState[stateKey] = v;
                const lensRecording = lb<IState>().pi("editProgram").p("program").p("internalState").record(newState);
                props.dispatch({ type: "UpdateState", lensRecording: [lensRecording] });
              }
            }}
          />
        );
      })}
      {ObjectUtils.keys(state).map((stateKey) => {
        return (
          <MenuItemEditable
            name={stateKey}
            type="number"
            value={state[stateKey].toString()}
            hasClear={true}
            onChange={(newValue?: string) => {
              const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
              const newState = { ...state };
              if (v != null) {
                newState[stateKey] = v;
              } else {
                delete newState[stateKey];
              }
              const lensRecording = lb<IState>().pi("editProgram").p("program").p("state").record(newState);
              props.dispatch({ type: "UpdateState", lensRecording: [lensRecording] });
            }}
          />
        );
      })}
      <div className="p-2 text-center">
        <Button kind="green" onClick={props.onAddStateVariable}>
          Add State Variable
        </Button>
      </div>
    </section>
  );
}
