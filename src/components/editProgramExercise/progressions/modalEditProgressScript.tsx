import { JSX, useState } from "react";
import { View } from "react-native";
import { Text } from "../../primitives/text";
import { Modal } from "../../modal";
import { Button } from "../../button";
import { IPlannerProgramExercise } from "../../../pages/planner/models/types";
import { ScriptEditorView } from "./scriptEditorView";
import { StringUtils_unindent, StringUtils_indent } from "../../../utils/string";
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
  return StringUtils_unindent(script.replace(/{~/, "").replace(/~}/, ""));
}

export function ModalEditProgressScriptContent(props: IModalEditProgressScriptProps): JSX.Element {
  const progress = props.plannerExercise.progress;
  if (!progress) {
    return <></>;
  }
  const ownState = progress.state;
  let initialScript = cleanScript(progress.script);
  initialScript = initialScript ? StringUtils_unindent(initialScript) : initialScript;
  const [script, setScript] = useState(initialScript);

  const error = ScriptRunner.isValid(
    script,
    ownState,
    props.plannerExercise.dayData,
    props.settings,
    props.plannerExercise.exerciseType
  );

  return (
    <>
      <Text className="mb-1 text-lg font-bold text-center">Progress Script</Text>
      <Text className="mb-2 text-xs text-text-secondary">
        It's executed when you finish a workout, and it can modify the program text.
      </Text>
      <ScriptEditorView
        name="modal-edit-progress-script-editor"
        state={ownState}
        lineNumbers={true}
        error={error}
        value={script}
        onChange={(e) => {
          setScript(e);
        }}
        onBlur={() => {}}
        onLineChange={() => {}}
      />
      <View className="items-center mt-4">
        <Button
          kind="purple"
          name="modal-create-state-variable-submit"
          disabled={error != null}
          onClick={() => {
            props.onClose();
            const wrappedScript = script ? `{~\n${StringUtils_indent(cleanScript(script), 2)}\n~}` : `{~~}`;
            props.onChange(wrappedScript);
          }}
        >
          Save
        </Button>
      </View>
    </>
  );
}

export function ModalEditProgressScript(props: IModalEditProgressScriptProps): JSX.Element {
  return (
    <Modal name="modal-edit-progress-script" isFullWidth isFullHeight onClose={props.onClose} shouldShowClose={true}>
      <ModalEditProgressScriptContent {...props} />
    </Modal>
  );
}
