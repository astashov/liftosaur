import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../../ducks/types";
import { HeaderView } from "../header";
import { IProgram, Program } from "../../models/program";
import { FooterView } from "../footer";
import { MultiLineTextEditor } from "./multiLineTextEditor";
import { useState, useRef } from "preact/hooks";
import { EditProgramState } from "./editProgramState";
import { ModalAddStateVariable } from "./modalAddStateVariable";
import { IState } from "../../ducks/reducer";
import { lb } from "../../utils/lens";
import { GroupHeader } from "../groupHeader";
import { ISettings } from "../../models/settings";
import { MenuItemEditable } from "../menuItemEditable";
import { CardsPlayground } from "./cardsPlayground";
import { IHistoryRecord } from "../../models/history";
import { FinishScriptStateChangesView } from "./finishScriptStateChanges";
import { Weight, IWeight } from "../../models/weight";

interface IProps {
  dispatch: IDispatch;
  editProgram: IProgram;
  programIndex: number;
  dayIndex: number;
  settings: ISettings;
}

export function EditProgramDayScript(props: IProps): JSX.Element {
  function validateFinishScript(value?: string): boolean {
    const result =
      progressRef.current != null
        ? Program.runFinishDayScript(props.editProgram, progressRef.current, props.settings, value)
        : Program.parseFinishDayScript(props.editProgram, props.dayIndex, props.settings, value);
    if (result.success) {
      setFinishDayError(undefined);
    } else {
      setFinishDayError(result.error);
    }
    return result.success;
  }

  const [shouldShowAddStateVariable, setShouldShowAddStateVariable] = useState<boolean>(false);
  const [finishDayError, setFinishDayError] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState<IHistoryRecord | undefined>(undefined);
  const progressRef = useRef<IHistoryRecord | undefined>(undefined);

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
          <GroupHeader name="Playground" />
          <MenuItemEditable
            name="Try with Day:"
            type="select"
            value=""
            values={[
              ["", ""],
              ...props.editProgram.days.map<[string, string]>((d, i) => [i.toString(), `${i + 1} - ${d.name}`]),
            ]}
            onChange={(newValue) => {
              const v = parseInt(newValue || "", 10);
              const p = isNaN(v) ? undefined : Program.nextProgramRecord(props.editProgram, props.settings, v + 1);
              setProgress(p);
              progressRef.current = p;
              validateFinishScript();
            }}
          />
          {progress && (
            <CardsPlayground
              key={progress.day}
              program={props.editProgram}
              settings={props.settings}
              progress={progress}
              setProgress={(p) => {
                setProgress(p);
                progressRef.current = p;
              }}
            />
          )}
          {progress && (
            <Fragment>
              <GroupHeader name="State changes" />
              <FinishScriptStateChangesView program={props.editProgram} progress={progress} settings={props.settings} />
            </Fragment>
          )}
          <GroupHeader name="Finish Day Script" />
          <MultiLineTextEditor
            state={props.editProgram.state}
            onChange={(newValue) => {
              const isValid = validateFinishScript(newValue);
              if (isValid) {
                const lensRecording = lb<IState>()
                  .p("storage")
                  .p("programs")
                  .i(props.programIndex)
                  .p("finishDayExpr")
                  .record(newValue);
                props.dispatch({ type: "UpdateState", lensRecording: [lensRecording] });
              }
            }}
            result={finishDayError != null ? { success: false, error: finishDayError } : undefined}
            value={props.editProgram.finishDayExpr}
          />
        </section>
      </section>

      <ModalAddStateVariable
        isHidden={!shouldShowAddStateVariable}
        onDone={(newName, newType) => {
          if (newName != null && newType != null) {
            const newState = { ...props.editProgram.state };
            let newValue: IWeight | number;
            if (newType === "lb" || newType === "kg") {
              newValue = Weight.build(0, newType);
            } else {
              newValue = 0;
            }
            newState[newName] = newValue;
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

      <FooterView dispatch={props.dispatch} />
    </section>
  );
}
