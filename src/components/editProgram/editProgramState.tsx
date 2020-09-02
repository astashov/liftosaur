import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { IProgram } from "../../models/program";
import { ObjectUtils } from "../../utils/object";
import { MenuItemEditable } from "../menuItemEditable";
import { lb } from "../../utils/lens";
import { IState } from "../../ducks/reducer";
import { Button } from "../button";
import { Weight } from "../../models/weight";

interface IProps {
  editProgram: IProgram;
  programIndex: number;
  dispatch: IDispatch;
  onAddStateVariable: () => void;
}

export function EditProgramState(props: IProps): JSX.Element {
  const state = props.editProgram.state;
  const internalState = props.editProgram.internalState;

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
                const lensRecording = lb<IState>()
                  .p("storage")
                  .p("programs")
                  .i(props.programIndex)
                  .p("internalState")
                  .record(newState);
                props.dispatch({ type: "UpdateState", lensRecording: [lensRecording] });
              }
            }}
          />
        );
      })}
      {ObjectUtils.keys(state).map((stateKey) => {
        const value = state[stateKey];
        const displayValue = Weight.is(value) ? value.value : value;

        return (
          <MenuItemEditable
            name={stateKey}
            type="number"
            value={displayValue.toString()}
            valueUnits={Weight.is(value) ? value.unit : undefined}
            hasClear={true}
            onChange={(newValue?: string) => {
              const v = newValue != null && newValue !== "" ? parseInt(newValue, 10) : null;
              const newState = { ...state };
              if (v != null) {
                newState[stateKey] = Weight.is(v) ? Weight.build(v, value.unit) : v;
              } else {
                delete newState[stateKey];
              }
              const lensRecording = lb<IState>()
                .p("storage")
                .p("programs")
                .i(props.programIndex)
                .p("state")
                .record(newState);
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
