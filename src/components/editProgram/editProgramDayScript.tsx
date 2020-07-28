import { h, JSX, Fragment } from "preact";
import { IDispatch } from "../../ducks/types";
import { HeaderView } from "../header";
import { IProgram, Program } from "../../models/program";
import { FooterView } from "../footer";
import { MultiLineTextEditor } from "./multiLineTextEditor";
import { useState } from "preact/hooks";
import { EditProgramState } from "./editProgramState";
import { ModalAddStateVariable } from "./modalAddStateVariable";
import { IState } from "../../ducks/reducer";
import { lb } from "../../utils/lens";
import { GroupHeader } from "../groupHeader";
import { ISettings } from "../../models/settings";
import { ScriptRunner } from "../../parser";
import { Progress } from "../../models/progress";
import { MenuItemEditable } from "../menuItemEditable";
import { CardsPlayground } from "./cardsPlayground";
import { IHistoryRecord } from "../../models/history";
import { FinishScriptStateChangesView } from "./finishScriptStateChanges";

interface IProps {
  dispatch: IDispatch;
  editProgram: IProgram;
  programIndex: number;
  dayIndex: number;
  settings: ISettings;
}

export function EditProgramDayScript(props: IProps): JSX.Element {
  function validateFinishScript(value: string): boolean {
    const scriptRunner = new ScriptRunner(
      value,
      props.editProgram.state,
      Progress.createEmptyScriptBindings(props.dayIndex),
      Progress.createScriptFunctions(props.settings)
    );

    let error: string | undefined = undefined;

    try {
      scriptRunner.parse();
    } catch (e) {
      if (e instanceof SyntaxError) {
        error = e.message;
        setFinishDayError(e.message);
      } else {
        throw e;
      }
    }
    if (error == null) {
      setFinishDayError(undefined);
    }

    return !error;
  }

  const [shouldShowAddStateVariable, setShouldShowAddStateVariable] = useState<boolean>(false);
  const [finishDayError, setFinishDayError] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState<IHistoryRecord | undefined>(undefined);

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
              setProgress(isNaN(v) ? undefined : Program.nextProgramRecord(props.editProgram, props.settings, v + 1));
            }}
          />
          {progress && (
            <CardsPlayground
              key={progress.day}
              program={props.editProgram}
              settings={props.settings}
              progress={progress}
              setProgress={setProgress}
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
              validateFinishScript(newValue);
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
            onBlur={(newValue) => {}}
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
