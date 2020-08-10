import { h, JSX } from "preact";
import { useRef, useState } from "preact/hooks";
import { ObjectUtils } from "../../utils/object";
import { excercises, IExcerciseId, Excercise } from "../../models/excercise";
import { Modal } from "../modal";
import { Button } from "../button";
import { ISettings, Settings } from "../../models/settings";
import { IBarKey } from "../../models/weight";

interface IProps {
  onSelect: (excerciseId?: IExcerciseId, bar?: IBarKey) => void;
  isHidden: boolean;
  settings: ISettings;
}

export function ModalAddExcercise(props: IProps): JSX.Element {
  const excerciseSelectRef = useRef<HTMLSelectElement>(null);
  const [selectedExcercise, setSelectedExcercise] = useState<IExcerciseId | undefined>(undefined);
  const excercise = selectedExcercise != null ? Excercise.get({ id: selectedExcercise }) : undefined;
  const barSelectRef = useRef<HTMLSelectElement>(null);
  const excerciseOptions = ObjectUtils.keys(excercises).map((e) => [excercises[e].id, excercises[e].name]);
  const bars = Settings.bars(props.settings);
  const barOptions = [["", "No Bar"], ...ObjectUtils.keys(bars).map((b) => [b, b])];
  return (
    <Modal isHidden={props.isHidden} autofocusInputRef={excerciseSelectRef}>
      <form onSubmit={(e) => e.preventDefault()}>
        <label className="block pb-2 font-bold" for="add-excercise-select">
          Choose new excercise
        </label>
        <select
          ref={excerciseSelectRef}
          className="text-right text-gray-700"
          id="add-excercise-select"
          onChange={(e) => {
            setSelectedExcercise(excerciseSelectRef.current.value as IExcerciseId);
          }}
        >
          {excerciseOptions.map(([key, value]) => (
            <option value={key}>{value}</option>
          ))}
        </select>
        <label className="block pb-2 mt-4 font-bold" for="add-excercise-bar">
          Choose bar
        </label>
        <select ref={barSelectRef} className="text-right text-gray-700" id="add-excercise-bar">
          {barOptions.map(([key, value]) => (
            <option selected={key === excercise?.defaultBar} value={key}>
              {value}
            </option>
          ))}
        </select>
        <div className="mt-4 text-right">
          <Button type="button" kind="gray" className="mr-3" onClick={() => props.onSelect(undefined, undefined)}>
            Cancel
          </Button>
          <Button
            kind="green"
            type="submit"
            onClick={() => {
              const id = excerciseSelectRef.current!.value as IExcerciseId;
              const bar = barSelectRef.current?.value ? (barSelectRef.current?.value as IBarKey) : undefined;
              props.onSelect(id, bar);
            }}
          >
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}
