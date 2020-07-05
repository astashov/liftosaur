import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { IExcerciseType, Excercise } from "../../models/excercise";
import { Modal } from "../modal";
import { Button } from "../button";
import { IProgramSet } from "../../models/set";
import { OneLineTextEditor } from "./oneLineTextEditor";

interface IProps {
  excercise: IExcerciseType;
  state: Record<string, number>;
  onDone: (result?: IProgramSet) => void;
  set?: IProgramSet;
}

export function ModalEditSet(props: IProps): JSX.Element {
  const excercise = Excercise.get(props.excercise);
  const amrapFieldRef = useRef<HTMLInputElement>();
  const repsExprRef = useRef<string | undefined>(props.set?.repsExpr);
  const weightExprRef = useRef<string | undefined>(props.set?.weightExpr);
  const isAmrapRef = useRef<boolean>(props.set?.isAmrap || false);
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
          onChange={(value) => {
            repsExprRef.current = value;
          }}
        />
        <label for="edit_set_weight" className="block mt-2 text-sm font-bold">
          Weight
        </label>
        <OneLineTextEditor
          state={props.state}
          value={props.set?.weightExpr}
          onChange={(value) => {
            weightExprRef.current = value;
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
