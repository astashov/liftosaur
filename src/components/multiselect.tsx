import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import { inputClassName } from "./input";

interface IMultiselectProps {
  readonly values: Readonly<string[]>;
  readonly label: string;
  readonly id: string;
  readonly initialSelectedValues?: Set<string>;
  onChange: (values: Set<string>) => void;
}

export function Multiselect(props: IMultiselectProps): JSX.Element {
  const [selectedValues, setSelectedValues] = useState(props.initialSelectedValues || new Set<string>());
  const valuesSet = new Set(props.values);

  return (
    <div>
      <div>
        <label for={props.id} className="block text-sm font-bold">
          {props.label}
        </label>
      </div>
      <input
        className={inputClassName}
        data-cy={`multiselect-${props.id}`}
        list={props.id}
        name={props.id}
        onInput={(e) => {
          const value = e.currentTarget.value;
          if (valuesSet.has(value)) {
            const newSet = new Set(selectedValues).add(value);
            setSelectedValues(newSet);
            e.currentTarget.value = "";
            props.onChange(newSet);
          }
        }}
      />
      <datalist id={props.id}>
        {props.values.map((muscle) => (
          <option value={muscle}>{muscle}</option>
        ))}
      </datalist>
      <div className="mt-1">
        {Array.from(selectedValues).map((sm) => (
          <div className=" inline-block px-2 mb-1 mr-1 text-xs bg-gray-300 rounded-full">
            <span className="py-1 pl-1">{sm} </span>
            <button
              className="p-1"
              onClick={(e) => {
                e.preventDefault();
                const set = new Set(selectedValues);
                set.delete(sm);
                setSelectedValues(set);
              }}
            >
              <span className="inline-block" style="transform: rotate(45deg)">
                +
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
