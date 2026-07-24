import { JSX } from "react";
import { IUnit } from "../types";

interface IInputWeightUnitProps {
  value: IUnit | "%";
  units: readonly (IUnit | "%")[];
  onChange: (unit: IUnit | "%") => void;
}

export function InputWeightUnit(props: IInputWeightUnitProps): JSX.Element {
  return (
    <select
      data-testid="edit-weight-unit"
      className="px-1 py-1 border rounded border-border-neutral bg-background-default"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value as IUnit | "%")}
    >
      {props.units.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}
