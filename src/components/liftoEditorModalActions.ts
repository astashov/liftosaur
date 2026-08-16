import { useRef } from "react";
import { ILiftoEditorExercisePickerModalData, useModal } from "../navigation/ModalStateContext";
import { Dialog_alert } from "../utils/dialog";
import type { IExercisePickerSelectedExercise, IExerciseType } from "../types";
import type { ILiftoEditorReuseCandidates } from "./liftoEditorReuse";
import type { ILiftoEditorControllerActions } from "./liftoEditorController";
import {
  ILiftoEditorReuseSelection,
  ILiftoEditorStateVarsTarget,
  LiftoEditorActions_renamePrompt,
} from "./primitives/liftoEditorActions";
import type { ILiftoEditorStateVarsContext } from "./primitives/liftoEditorStateVars";

export interface ILiftoEditorModalActionsOptions {
  // Tells the two hosts' select modals apart.
  reuseSelectName: string;
  // Answered per press rather than precomputed: the focused exercise comes from the live text,
  // so it can name something the document didn't hold when the host last rendered.
  pickerDataFor: (exerciseFullName: string | undefined) => ILiftoEditorExercisePickerModalData;
  // undefined means the host couldn't tell which exercise the caret is in — a different answer
  // from "this exercise has nothing to reuse", and a different thing to say about it.
  reuseCandidatesFor: (exerciseFullName: string | undefined) => ILiftoEditorReuseCandidates | undefined;
  stateVarsContextFor: (
    target: ILiftoEditorStateVarsTarget,
    exerciseFullName: string | undefined
  ) => ILiftoEditorStateVarsContext;
  stateVarsExerciseTypeFor: (exerciseFullName: string | undefined) => IExerciseType | undefined;
  onBeforeChangeExercise?: () => Promise<boolean>;
  onEditReuse?: (targetName: string) => void;
}

// The controller's actions, wired to the app's modals. Every host that drives a LiftoEditor
// needs the same four modals routed the same way; what differs is only how each answers
// "which exercise is this about", which arrives through the callbacks above.
export function useLiftoEditorModalActions(options: ILiftoEditorModalActionsOptions): ILiftoEditorControllerActions {
  // useModal registers its result callback once, but the controller hands a fresh callback per
  // invocation — these refs bridge the two. Several editors can be mounted at once; useModal
  // only delivers a result to the instance that opened the modal.
  const pickerSelectRef = useRef<((selected: IExercisePickerSelectedExercise) => void) | undefined>(undefined);
  const renameSubmitRef = useRef<((value: string) => void) | undefined>(undefined);
  const reuseSelectRef = useRef<
    { items: ILiftoEditorReuseSelection[]; onSelect: (selection: ILiftoEditorReuseSelection) => void } | undefined
  >(undefined);
  const stateVarsApplyRef = useRef<((args: string) => void) | undefined>(undefined);

  const openExercisePicker = useModal("liftoEditorExercisePickerModal", (selected) => {
    const onSelect = pickerSelectRef.current;
    pickerSelectRef.current = undefined;
    if (selected != null && onSelect != null) {
      onSelect(selected);
    }
  });
  const openRename = useModal("textInputModal", (value) => {
    const onSubmit = renameSubmitRef.current;
    renameSubmitRef.current = undefined;
    if (value != null && onSubmit != null) {
      onSubmit(value);
    }
  });
  const openReuseSelect = useModal("inputSelectModal", (value) => {
    const pending = reuseSelectRef.current;
    reuseSelectRef.current = undefined;
    const selection = value != null ? pending?.items.find((item) => item.fullName === value) : undefined;
    if (pending != null && selection != null) {
      pending.onSelect(selection);
    }
  });
  const openStateVars = useModal("stateVarsModal", (args) => {
    const onApply = stateVarsApplyRef.current;
    stateVarsApplyRef.current = undefined;
    if (args != null && onApply != null) {
      onApply(args);
    }
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  return {
    pickExercise: (_current, exerciseFullName, onSelect) => {
      pickerSelectRef.current = onSelect;
      const openPicker = (): void => openExercisePicker(optionsRef.current.pickerDataFor(exerciseFullName));
      // Asked before the picker, while the user is still thinking about the exercise — by the
      // time they've picked one, "and where should this apply?" reads as a detour.
      const beforeChange = optionsRef.current.onBeforeChangeExercise;
      if (beforeChange == null) {
        openPicker();
        return;
      }
      beforeChange().then((proceed) => {
        if (proceed) {
          openPicker();
        } else {
          pickerSelectRef.current = undefined;
        }
      });
    },
    promptRename: (current, kind, onSubmit) => {
      renameSubmitRef.current = onSubmit;
      openRename(LiftoEditorActions_renamePrompt(current, kind));
    },
    editReuse: (targetName) => optionsRef.current.onEditReuse?.(targetName),
    pickReuse: (kind, exerciseFullName, onSelect) => {
      const candidates = optionsRef.current.reuseCandidatesFor(exerciseFullName);
      if (candidates == null) {
        Dialog_alert("Couldn't tell which exercise this is — try again once the program re-evaluates.");
        return;
      }
      const items: ILiftoEditorReuseSelection[] =
        kind === "sets"
          ? candidates.sets
          : (kind === "progress" ? candidates.progress : candidates.update).map((fullName) => ({ fullName }));
      if (items.length === 0) {
        Dialog_alert(
          kind === "sets"
            ? "There are no other exercises in this program to reuse sets from."
            : "There are no other exercises with their own custom() script to reuse."
        );
        return;
      }
      reuseSelectRef.current = { items, onSelect };
      openReuseSelect({
        name: optionsRef.current.reuseSelectName,
        values: items.map((item) => [item.fullName, item.fullName]),
        hint:
          kind === "sets"
            ? "You can only reuse sets of exercises that don't reuse other exercises"
            : "You can only reuse scripts that don't reuse other scripts",
      });
    },
    editStateVars: (target, exerciseFullName, onApply) => {
      stateVarsApplyRef.current = onApply;
      openStateVars({
        ...optionsRef.current.stateVarsContextFor(target, exerciseFullName),
        entries: target.entries,
        hasUnparsed: target.hasUnparsed,
        exerciseType: optionsRef.current.stateVarsExerciseTypeFor(exerciseFullName),
      });
    },
  };
}
