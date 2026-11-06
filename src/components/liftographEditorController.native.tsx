import { useEffect, useRef, useState } from "react";
import type { ILiftoEditorHandle } from "./primitives/liftoEditorBrain";
import type { ILiftoEditorPill } from "./primitives/liftoEditorActions";
import type { ILiftoEditorHint } from "./primitives/liftoEditorHints";
import type { ILiftoEditorBaseProps } from "./primitives/liftoEditor";
import {
  ILiftoEditorMode,
  ILiftoEditorSession,
  ILiftoEditorSessionResult,
  LiftoEditorSession_activeLevelIndex,
  LiftoEditorSession_applyPill,
  LiftoEditorSession_blur,
  LiftoEditorSession_canRemove,
  LiftoEditorSession_consumePendingCaret,
  LiftoEditorSession_create,
  LiftoEditorSession_highlight,
  LiftoEditorSession_pills,
  LiftoEditorSession_removeFocused,
  LiftoEditorSession_selectLevel,
  LiftoEditorSession_switchToStructured,
  LiftoEditorSession_tap,
  LiftoEditorSession_textChanged,
  LiftoEditorSession_walkFocus,
} from "./primitives/liftoEditorSession";
import type { ILiftoEditorChromeModel } from "./liftoEditorChrome";
import { useModal } from "../navigation/ModalStateContext";
import { LiftographEditorAnalysis } from "../liftograph/liftographEditorAnalysis";
import { LiftographEditorAdapter } from "../liftograph/liftographEditorAdapter";
import {
  ILiftographCompletion,
  ILiftographCompletionOption,
  ILiftographEditorSnapshot,
  LiftographCompletions_tap,
} from "../liftograph/liftographCompletions";
import {
  LiftographEditorEdits_canComplete,
  LiftographEditorEdits_selected,
  LiftographEditorEdits_typed,
} from "../liftograph/liftographEditorEdits";
import {
  ILiftographActionResult,
  ILiftographPendingAction,
  LiftographEditorActions_picked,
  LiftographEditorActions_press,
  LiftographEditorActions_renamed,
} from "../liftograph/liftographEditorActions";
import { LiftographHints_forLevel } from "../liftograph/liftographHints";

export interface ILiftographEditorController extends ILiftoEditorChromeModel {
  mode: ILiftoEditorMode;
  text: string;
  caret: number | undefined;
  hint: ILiftoEditorHint | undefined;
  completion: ILiftographCompletion | undefined;
  applyCompletion: (option: ILiftographCompletionOption) => void;
  walkFocus: (direction: 1 | -1) => void;
  switchToStructured: () => void;
  blur: () => void;
  hideKeyboard: () => void;
  getText: () => string;
  editorProps: ILiftoEditorBaseProps;
}

export interface ILiftographEditorControllerOptions {
  onTextChange: (text: string) => void;
  onSelectionChange?: (start: number, end: number) => void;
  initialCaret?: number;
}

export function useLiftographEditorController(
  initialText: string,
  analysis: LiftographEditorAnalysis,
  options: ILiftographEditorControllerOptions
): ILiftographEditorController {
  const [session, setSession] = useState<ILiftoEditorSession>(() => {
    const created = LiftoEditorSession_create(initialText, new LiftographEditorAdapter(analysis));
    return options.initialCaret != null ? LiftoEditorSession_tap(created, options.initialCaret, 0).session : created;
  });
  const sessionRef = useRef(session);
  const [snapshot, setSnapshot] = useState<ILiftographEditorSnapshot>(() =>
    LiftographEditorEdits_typed(initialText, initialText.length)
  );
  const snapshotRef = useRef(snapshot);
  const handleRef = useRef<ILiftoEditorHandle | undefined>(undefined);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const pendingRef = useRef<ILiftographPendingAction>(undefined);

  function commit(next: ILiftoEditorSession): void {
    sessionRef.current = next;
    setSession(next);
  }

  function updateSnapshot(next: ILiftographEditorSnapshot): void {
    snapshotRef.current = next;
    setSnapshot(next);
  }

  function dispatch(result: ILiftoEditorSessionResult): void {
    commit(result.session);
    for (const edit of result.effects.edits ?? []) {
      handleRef.current?.replaceRange(edit.start, edit.end, edit.text);
    }
  }

  function finishAction(result: ILiftographActionResult): void {
    pendingRef.current = result.pending;
    if (result.apply != null) {
      dispatch(LiftoEditorSession_applyPill(sessionRef.current, result.apply));
    }
  }

  const openExercisePicker = useModal("liftoEditorExercisePickerModal", (selected) =>
    finishAction(LiftographEditorActions_picked(pendingRef.current, selected, analysis.railArgs().settings))
  );
  const openRename = useModal("textInputModal", (value) =>
    finishAction(LiftographEditorActions_renamed(pendingRef.current, value))
  );

  function pressPill(pill: ILiftoEditorPill): void {
    const { pending, effect } = LiftographEditorActions_press(pill);
    pendingRef.current = pending;
    if (effect.type === "openPicker") {
      openExercisePicker({});
    } else if (effect.type === "openRename") {
      openRename({
        title: "Rename series",
        inputLabel: "Name",
        placeholder: effect.placeholder,
        submitLabel: "Rename",
        dataCyPrefix: "rename-series",
      });
    } else {
      dispatch(LiftoEditorSession_applyPill(sessionRef.current, effect.pill));
    }
  }

  useEffect(() => {
    if (session.mode === "freeform" && session.pendingCaret != null) {
      const consumed = LiftoEditorSession_consumePendingCaret(sessionRef.current);
      commit(consumed.session);
      const caret = consumed.caret;
      if (caret != null) {
        updateSnapshot(LiftographEditorEdits_typed(sessionRef.current.text, caret));
        setTimeout(() => handleRef.current?.setSelection(caret, caret), 50);
      }
    }
  }, [session.mode]);

  const levels = session.context?.levels ?? [];
  const activeLevelIndex = LiftoEditorSession_activeLevelIndex(session);
  const isFreeform = session.mode === "freeform";

  return {
    mode: session.mode,
    text: session.text,
    caret: isFreeform && session.pendingCaret == null ? snapshot.start : undefined,
    context: session.context,
    activeLevelIndex,
    canRemove: LiftoEditorSession_canRemove(session),
    pills: LiftoEditorSession_pills(session),
    hint: LiftographHints_forLevel(levels[activeLevelIndex]),
    completion:
      isFreeform && LiftographEditorEdits_canComplete(snapshot)
        ? analysis.completions(snapshot.text, snapshot.start, "strip")
        : undefined,
    applyCompletion: (option) => {
      const current = snapshotRef.current;
      const tap = LiftographCompletions_tap(
        current,
        analysis.completions(current.text, current.start, "strip"),
        option
      );
      if (tap == null) {
        return;
      }
      updateSnapshot(tap.next);
      handleRef.current?.replaceRange(tap.edit.from, tap.edit.to, tap.edit.insert);
      handleRef.current?.setSelection(tap.edit.caret, tap.edit.caret);
    },
    walkFocus: (direction) => dispatch(LiftoEditorSession_walkFocus(sessionRef.current, direction)),
    selectLevel: (index) => dispatch(LiftoEditorSession_selectLevel(sessionRef.current, index)),
    pressPill,
    removeFocused: () => dispatch(LiftoEditorSession_removeFocused(sessionRef.current)),
    switchToStructured: () => dispatch(LiftoEditorSession_switchToStructured(sessionRef.current)),
    blur: () => dispatch(LiftoEditorSession_blur(sessionRef.current)),
    hideKeyboard: () => handleRef.current?.blurEditor(),
    getText: () => handleRef.current?.getText() ?? sessionRef.current.text,
    editorProps: {
      initialText,
      autoHeight: true,
      editable: isFreeform,
      computeStyledRanges: (value) => analysis.styledRanges(value),
      extraStyledRanges: LiftoEditorSession_highlight(session),
      handleRef,
      onTextChange: (value, caret) => {
        updateSnapshot(LiftographEditorEdits_typed(value, caret));
        commit(LiftoEditorSession_textChanged(sessionRef.current, value));
        optionsRef.current.onTextChange(value);
      },
      onSelectionChange: (start, end) => {
        updateSnapshot(LiftographEditorEdits_selected(snapshotRef.current, start, end));
        optionsRef.current.onSelectionChange?.(start, end);
      },
      onTap: isFreeform
        ? undefined
        : (index) => dispatch(LiftoEditorSession_tap(sessionRef.current, index, Date.now())),
    },
  };
}
