import { h, JSX } from "preact";
import { useRef } from "preact/hooks";
import { ObjectUtils } from "../../utils/object";
import { excercises } from "../../models/excercise";
import { Modal } from "../modal";
import { Button } from "../button";

interface IProps {
  onSelect: (value?: string) => void;
  isHidden: boolean;
}

export function ModalAddExcercise(props: IProps): JSX.Element {
  const inputRef = useRef<HTMLSelectElement>(null);
  const excerciseOptions = ObjectUtils.keys(excercises).map((e) => [excercises[e].id, excercises[e].name]);
  return (
    <Modal isHidden={props.isHidden} autofocusInputRef={inputRef}>
      <h3 className="pb-2 font-bold">Choose new excercise</h3>
      <form>
        <select ref={inputRef} className="text-right text-gray-700">
          {excerciseOptions.map(([key, value]) => (
            <option value={key}>{value}</option>
          ))}
        </select>
        <div className="mt-4 text-right">
          <Button type="button" kind="gray" className="mr-3" onClick={() => props.onSelect(undefined)}>
            Cancel
          </Button>
          <Button kind="green" type="submit" onClick={() => props.onSelect(inputRef.current!.value)}>
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}
