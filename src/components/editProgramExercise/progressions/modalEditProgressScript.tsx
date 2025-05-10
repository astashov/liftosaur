import { h, JSX, Fragment } from "preact";
import { Modal } from "../../modal";
import { Button } from "../../button";
import { IPlannerProgramExercise } from "../../../pages/planner/models/types";
import { ScriptEditorView } from "./scriptEditorView";
import { useState } from "preact/hooks";
import { StringUtils } from "../../../utils/string";
import { ScriptRunner } from "../../../parser";
import { ISettings } from "../../../types";

interface IModalEditProgressScriptProps {
  onClose: () => void;
  plannerExercise: IPlannerProgramExercise;
  settings: ISettings;
  onChange: (script?: string) => void;
}

function cleanScript(script?: string): string {
  if (!script) {
    return "";
  }
  return script.replace(/{~/, "").replace(/~}/, "");
}

export function ModalEditProgressScript(props: IModalEditProgressScriptProps): JSX.Element {
  const progress = props.plannerExercise.progress;
  if (!progress) {
    return <></>;
  }
  const ownState = progress.state;
  let initialScript = cleanScript(progress.script);
  initialScript = initialScript ? StringUtils.unindent(initialScript) : initialScript;
  const [script, setScript] = useState(initialScript);

  const error = ScriptRunner.isValid(
    script,
    ownState,
    props.plannerExercise.dayData,
    props.settings,
    props.plannerExercise.exerciseType
  );

  return (
    <Modal name="modal-edit-progress-script" isFullWidth isFullHeight onClose={props.onClose} shouldShowClose={true}>
      <h2 className="mb-1 text-lg font-bold text-center">Progress Script</h2>
      <p className="mb-2 text-xs text-grayv3-main">
        It's executed when you finish a workout, and it can modify the program text.
      </p>
      <ScriptEditorView
        name="modal-edit-progress-script-editor"
        state={ownState}
        lineNumbers={true}
        error={error}
        value={script}
        onChange={(e) => {
          setScript(e);
        }}
        onBlur={(e, text) => {}}
        onLineChange={(line) => {}}
      />
      <div className="mt-4 text-center">
        <Button
          kind="orange"
          name="modal-create-state-variable-submit"
          disabled={error != null}
          onClick={() => {
            props.onClose();
            const wrappedScript = script ? `{~\n${StringUtils.indent(cleanScript(script), 2)}\n~}` : script;
            props.onChange(wrappedScript);
          }}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}
