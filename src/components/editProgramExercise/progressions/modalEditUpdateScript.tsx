import { h, JSX, Fragment } from "preact";
import { Modal } from "../../modal";
import { Button } from "../../button";
import { IPlannerProgramExercise } from "../../../pages/planner/models/types";
import { ScriptEditorView } from "./scriptEditorView";
import { useState } from "preact/hooks";
import { StringUtils } from "../../../utils/string";
import { ScriptRunner } from "../../../parser";
import { ISettings } from "../../../types";
import { PlannerProgramExercise } from "../../../pages/planner/models/plannerProgramExercise";

interface IModalEditUpdateScriptProps {
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

export function ModalEditUpdateScript(props: IModalEditUpdateScriptProps): JSX.Element {
  const update = props.plannerExercise.update;
  if (!update) {
    return <></>;
  }
  const ownState = PlannerProgramExercise.getState(props.plannerExercise);
  let initialScript = cleanScript(update.script);
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
      <h2 className="mb-1 text-lg font-bold text-center">Update Script</h2>
      <p className="mb-2 text-xs text-grayv3-main">
        It's executed after each set completion. Use <strong>setIndex</strong> variable to distinguish between sets.
      </p>
      <ScriptEditorView
        name="modal-edit-update-script-editor"
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
          name="modal-update-script-submit"
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
