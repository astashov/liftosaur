import { h, JSX } from "preact";
import { useEffect } from "preact/hooks";
import { Progress } from "../../models/progress";
import { ScriptRunner } from "../../parser";
import { IEquipment, IProgramState, ISettings } from "../../types";
import { IEither } from "../../utils/types";
import { OneLineTextEditor } from "./oneLineTextEditor";

interface IProps {
  onChangeTimer?: (value: string) => void;
  onValid?: (isValid: boolean) => void;
  timerExpr?: string;
  day: number;
  settings: ISettings;
  state: IProgramState;
  equipment?: IEquipment;
}

export function EditProgramExerciseTimer(props: IProps): JSX.Element {
  function validate(script: string | undefined): IEither<number | undefined, string> {
    try {
      if (script) {
        const scriptRunnerResult = new ScriptRunner(
          script,
          props.state,
          Progress.createEmptyScriptBindings(props.day),
          Progress.createScriptFunctions(props.settings),
          props.settings.units,
          { equipment: props.equipment }
        );
        return { success: true, data: scriptRunnerResult.execute("reps") };
      } else {
        return { success: true, data: undefined };
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        return { success: false, error: e.message };
      } else {
        throw e;
      }
    }
  }

  const timerResult = validate((props.timerExpr || "").trim());
  useEffect(() => {
    if (props.onValid) {
      props.onValid(timerResult.success);
    }
  }, [timerResult.success]);

  return (
    <div>
      <OneLineTextEditor
        label="Timer, seconds"
        name="timer"
        state={props.state}
        value={props.timerExpr}
        result={timerResult}
        onChange={(value) => {
          if (props.onChangeTimer) {
            props.onChangeTimer(value);
          }
        }}
      />
    </div>
  );
}
