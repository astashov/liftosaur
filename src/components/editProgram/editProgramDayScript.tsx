import { h, JSX } from "preact";
import { IDispatch } from "../../ducks/types";
import { HeaderView } from "../header";
import { IProgram2 } from "../../models/program";
import { FooterView } from "../footer";
import { MultiLineTextEditor } from "./multiLineTextEditor";
import { useRef, useState } from "preact/hooks";
import { EditProgramState } from "./editProgramState";
import { ModalAddStateVariable } from "./modalAddStateVariable";
import { IState } from "../../ducks/reducer";
import { lb } from "../../utils/lens";
import { GroupHeader } from "../groupHeader";

interface IProps {
  dispatch: IDispatch;
  editProgram: IProgram2;
  programIndex: number;
}

export function EditProgramDayScript(props: IProps): JSX.Element {
  const scriptRef = useRef<string>(props.editProgram.finishDayExpr);
  const [shouldShowAddStateVariable, setShouldShowAddStateVariable] = useState<boolean>(false);
  return (
    <section className="h-full">
      <HeaderView
        title="Edit Program Script"
        subtitle={props.editProgram.name}
        left={<button onClick={() => props.dispatch({ type: "PullScreen" })}>Back</button>}
      />
      <section style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <section className="flex-1 overflow-y-auto">
          <GroupHeader name="State Variables" />
          <EditProgramState
            programIndex={props.programIndex}
            dispatch={props.dispatch}
            editProgram={props.editProgram}
            onAddStateVariable={() => {
              setShouldShowAddStateVariable(true);
            }}
          />
          <GroupHeader name="Finish Day Script" />
          <MultiLineTextEditor
            state={props.editProgram.state}
            onChange={(newValue) => (scriptRef.current = newValue || "")}
            onBlur={(newValue) => {
              const lensRecording = lb<IState>()
                .p("storage")
                .p("programs")
                .i(props.programIndex)
                .p("finishDayExpr")
                .record(newValue);
              props.dispatch({ type: "UpdateState", lensRecording: [lensRecording] });
            }}
            value={props.editProgram.finishDayExpr}
          />
        </section>
      </section>

      {shouldShowAddStateVariable && (
        <ModalAddStateVariable
          onDone={(newValue) => {
            if (newValue != null) {
              const newState = { ...props.editProgram.state };
              newState[newValue] = 0;
              const lensRecording = lb<IState>()
                .p("storage")
                .p("programs")
                .i(props.programIndex)
                .p("state")
                .record(newState);
              props.dispatch({ type: "UpdateState", lensRecording: [lensRecording] });
            }
            setShouldShowAddStateVariable(false);
          }}
        />
      )}

      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
