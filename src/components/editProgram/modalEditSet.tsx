import { h, JSX } from "preact";
import { useRef, useState } from "preact/hooks";
import { IExcerciseType, Excercise } from "../../models/excercise";
import { Modal } from "../modal";
import { Button } from "../button";
import { IProgramSet } from "../../models/set";
import { OneLineTextEditor } from "./oneLineTextEditor";
import { ScriptRunner } from "../../parser";
import { Progress } from "../../models/progress";
import { ISettings } from "../../models/settings";
import { IEither } from "../../utils/types";
import { IProgramState } from "../../models/program";

interface IProps {
  excercise: IExcerciseType;
  state: IProgramState;
  onDone: (result?: IProgramSet) => void;
  day: number;
  settings: ISettings;
  set?: IProgramSet;
}

export function ModalEditSet(props: IProps): JSX.Element {
  const excercise = Excercise.get(props.excercise);
  const amrapFieldRef = useRef<HTMLInputElement>();
  const repsExprRef = useRef<string | undefined>(props.set?.repsExpr.trim());
  const weightExprRef = useRef<string | undefined>(props.set?.weightExpr.trim());
  const isAmrapRef = useRef<boolean>(props.set?.isAmrap || false);

  const [repsResult, setRepsResult] = useState<IEither<number | undefined, string>>(validate(props.set?.repsExpr));
  const [weightResult, setWeightResult] = useState<IEither<number | undefined, string>>(
    validate(props.set?.weightExpr)
  );

  function validate(script?: string): IEither<number | undefined, string> {
    try {
      if (script) {
        const scriptRunnerReps = new ScriptRunner(
          script,
          props.state,
          Progress.createEmptyScriptBindings(props.day),
          Progress.createScriptFunctions(props.settings)
        );
        const value = scriptRunnerReps.execute(true);
        if (value >= 0) {
          return { success: true, data: value };
        } else {
          return { success: false, error: "Result should be > 0" };
        }
      } else {
        return { success: false, error: "Empty expression" };
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        return { success: false, error: e.message };
      } else {
        throw e;
      }
    }
  }

  function runValidations(): void {
    setRepsResult(validate(repsExprRef.current?.trim()));
    setWeightResult(validate(weightExprRef.current?.trim()));
  }

  return (
    <Modal style={{ width: "85%" }}>
      <h3 className="pb-2 font-bold text-center">{`${props.set ? "Edit Set" : "Add Set"} for ${excercise.name}`}</h3>
      <form onSubmit={(e) => e.preventDefault()}>
        <label for="edit_set_reps" className="block text-sm font-bold">
          Reps
        </label>
        <OneLineTextEditor
          state={props.state}
          value={props.set?.repsExpr}
          result={repsResult}
          onChange={(value) => {
            repsExprRef.current = value;
            runValidations();
          }}
        />
        <label for="edit_set_weight" className="block mt-2 text-sm font-bold">
          Weight
        </label>
        <OneLineTextEditor
          state={props.state}
          value={props.set?.weightExpr}
          result={weightResult}
          onChange={(value) => {
            weightExprRef.current = value;
            runValidations();
          }}
        />
        <div className="mt-2">
          <label for="edit_set_amrap" className="mr-2 text-sm font-bold align-middle">
            Is AMRAP?
          </label>
          <input type="checkbox" ref={amrapFieldRef} checked={isAmrapRef.current} className="w-4 h-4 align-middle" />
        </div>
        <div className="mt-4 text-right">
          <Button type="button" kind="gray" className="mr-3" onClick={() => props.onDone()}>
            Cancel
          </Button>
          <Button
            kind="green"
            type="submit"
            disabled={(repsResult && !repsResult.success) || (weightResult && !weightResult.success)}
            onClick={() => {
              const result: IProgramSet = {
                repsExpr: repsExprRef.current || "",
                weightExpr: weightExprRef.current || "",
                isAmrap: amrapFieldRef.current?.checked || false,
              };
              props.onDone(result);
            }}
          >
            {props.set ? "Update" : "Add"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
