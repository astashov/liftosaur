import type { ILiftoEditorPill } from "../components/primitives/liftoEditorActions";
import type { IExercisePickerSelectedExercise, ISettings } from "../types";
import {
  LiftographRail_exerciseEdit,
  LiftographRail_pickedExercise,
  LiftographRail_renameEdit,
} from "./liftographRail";

export type ILiftographPendingAction = { kind: "rename" | "exercise"; pill: ILiftoEditorPill } | undefined;

export type ILiftographPressEffect =
  | { type: "apply"; pill: ILiftoEditorPill }
  | { type: "openPicker" }
  | { type: "openRename"; placeholder: string };

export interface ILiftographActionResult {
  pending: ILiftographPendingAction;
  apply?: ILiftoEditorPill;
}

export function LiftographEditorActions_press(pill: ILiftoEditorPill): {
  pending: ILiftographPendingAction;
  effect: ILiftographPressEffect;
} {
  if (pill.action === "changeExercise") {
    return { pending: { kind: "exercise", pill }, effect: { type: "openPicker" } };
  } else if (pill.action === "rename") {
    return { pending: { kind: "rename", pill }, effect: { type: "openRename", placeholder: pill.text } };
  }
  return { pending: undefined, effect: { type: "apply", pill } };
}

export function LiftographEditorActions_renamed(
  pending: ILiftographPendingAction,
  value: string | undefined
): ILiftographActionResult {
  if (pending?.kind !== "rename" || value == null) {
    return { pending: undefined };
  }
  const pill = pending.pill;
  return { pending: undefined, apply: { ...pill, ...LiftographRail_renameEdit(pill, value), action: undefined } };
}

export function LiftographEditorActions_picked(
  pending: ILiftographPendingAction,
  selected: IExercisePickerSelectedExercise | undefined,
  settings: ISettings
): ILiftographActionResult {
  const picked = selected != null ? LiftographRail_pickedExercise(selected, settings) : undefined;
  if (pending?.kind !== "exercise" || picked == null) {
    return { pending: undefined };
  }
  const pill = pending.pill;
  const edit = LiftographRail_exerciseEdit(pill, picked.name, picked.equipment);
  return { pending: undefined, apply: { ...pill, ...edit, action: undefined } };
}
