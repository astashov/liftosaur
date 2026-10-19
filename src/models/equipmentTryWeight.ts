import { IEquipmentSetup, IWeight } from "../types";
import {
  EquipmentLoadSolver_next,
  EquipmentLoadSolver_previous,
  EquipmentLoadSolver_sampleWeight,
  EquipmentLoadSolver_select,
  IEquipmentLoadQuery,
} from "./equipmentLoadSolver";
import {
  EquipmentLoadText_picture,
  EquipmentLoadText_tryResult,
  IEquipmentLoadPicture,
  IEquipmentTryResult,
} from "./equipmentLoadText";

export type IEquipmentTryWeightView =
  | { kind: "error"; error: string }
  | { kind: "load"; result: IEquipmentTryResult; picture?: IEquipmentLoadPicture; isExact: boolean };

export interface IEquipmentTryWeightExact {
  wasExact: boolean;
  shouldPlayHaptic: boolean;
}

export function EquipmentTryWeight_initialValue(
  setup: IEquipmentSetup,
  errors: string[],
  query: IEquipmentLoadQuery
): number {
  return errors.length > 0 ? 0 : EquipmentLoadSolver_sampleWeight(setup, query).value;
}

export function EquipmentTryWeight_view(
  setup: IEquipmentSetup,
  errors: string[],
  value: number,
  query: IEquipmentLoadQuery
): IEquipmentTryWeightView {
  if (errors.length > 0) {
    return { kind: "error", error: errors[0] };
  }
  const target: IWeight = { value, unit: setup.unit };
  const load = EquipmentLoadSolver_select(setup, target, query);
  return {
    kind: "load",
    result: EquipmentLoadText_tryResult(setup, load, target),
    picture: EquipmentLoadText_picture(load, setup),
    isExact: load.exact,
  };
}

export function EquipmentTryWeight_step(
  setup: IEquipmentSetup,
  value: number | undefined,
  direction: 1 | -1,
  query: IEquipmentLoadQuery
): number {
  const weight: IWeight = { value: value ?? 0, unit: setup.unit };
  return direction === 1
    ? EquipmentLoadSolver_next(setup, weight, query).value
    : EquipmentLoadSolver_previous(setup, weight, query).value;
}

export function EquipmentTryWeight_exactChanged(
  wasExact: boolean | undefined,
  isExact: boolean
): IEquipmentTryWeightExact {
  return { wasExact: isExact, shouldPlayHaptic: wasExact === false && isExact };
}
