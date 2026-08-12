import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { ILiftoEditorContext, ILiftoEditorHandle, ITextEdit } from "./primitives/liftoEditorBrain";
import {
  ILiftoEditorPill,
  ILiftoEditorReuseSelection,
  LiftoEditorActions_renameEdit,
  LiftoEditorActions_reuseTargetText,
  LiftoEditorActions_swapExerciseEdit,
} from "./primitives/liftoEditorActions";
import {
  ILiftoEditorMode,
  ILiftoEditorSurface,
  ILiftoEditorSession,
  ILiftoEditorSessionResult,
  LiftoEditorSession_activeLevelIndex,
  LiftoEditorSession_applyPill,
  LiftoEditorSession_blur,
  LiftoEditorSession_consumePendingCaret,
  LiftoEditorSession_create,
  LiftoEditorSession_deactivate,
  LiftoEditorSession_focusedExerciseFullName,
  LiftoEditorSession_highlight,
  LiftoEditorSession_isInWarmup,
  LiftoEditorSession_keypadInput,
  LiftoEditorSession_pills,
  LiftoEditorSession_removeFocused,
  LiftoEditorSession_selectLevel,
  LiftoEditorSession_setBufferValue,
  LiftoEditorSession_setUnit,
  LiftoEditorSession_step,
  LiftoEditorSession_switchToStructured,
  LiftoEditorSession_tap,
  LiftoEditorSession_textChanged,
  LiftoEditorSession_walkFocus,
} from "./primitives/liftoEditorSession";
import { ILiftoEditorBaseProps } from "./primitives/liftoEditor";
import { PlatesCalculator } from "./inputWeight2";
import { useCloseCustomKeyboard, useOpenCustomKeyboard } from "../navigation/CustomKeyboardContext";
import { useModal } from "../navigation/ModalStateContext";
import { useTrackedState, untrack } from "../navigation/TrackedStateContext";
import { Weight_build, Weight_round } from "../models/weight";
import { Exercise_fullName, Exercise_get, Exercise_onerm } from "../models/exercise";
import { IExercisePickerSelectedExercise, IExerciseType, IPercentageUnit, ISettings, IUnit, IWeight } from "../types";

export type { ILiftoEditorMode, ILiftoEditorSurface };

export interface ILiftoEditorController {
  mode: ILiftoEditorMode;
  text: string;
  context: ILiftoEditorContext | undefined;
  activeLevelIndex: number;
  // Add-actions for the active breadcrumb level; selecting a level swaps the rail.
  pills: ILiftoEditorPill[];
  editorProps: ILiftoEditorBaseProps;
  walkFocus: (direction: 1 | -1) => void;
  selectLevel: (index: number) => void;
  // The single pill entry point: plain pills apply as text edits; action pills route
  // through the host-provided openers in options.actions.
  pressPill: (pill: ILiftoEditorPill) => void;
  removeFocused: () => void;
  switchToStructured: () => void;
  // Drops the focus stack, closing the keypad with it — an explicit dismissal.
  blur: () => void;
  // Hands the screen to another editor: same state change as blur (plus leaving freeform, so
  // the native view resigns the system keyboard) but no effects. The incoming editor has
  // already set the shared keypad for its own token, and closing it here would undo that.
  evict: () => void;
}

// Fallback when the host doesn't provide an exercise (e.g. template exercises without an
// exerciseType): plates math and weight stepping need one for bar/equipment resolution.
const sampleExerciseType: IExerciseType = { id: "squat", equipment: "barbell" };

// The host supplies just the modal/navigation openers; the controller owns what happens
// with their results (name building, label preservation, sanitization, the edit itself),
// so every surface gets identical swap/rename semantics.
// `exerciseFullName` is the planner fullName of the exercise the caret is in — how an
// inline host tells which of the day's exercises an action is about (a sheet edits one, so
// it ignores the argument).
export interface ILiftoEditorControllerActions {
  pickExercise?: (
    current: string,
    exerciseFullName: string | undefined,
    onSelect: (selected: IExercisePickerSelectedExercise) => void
  ) => void;
  promptRename?: (current: string, onSubmit: (value: string) => void) => void;
  editReuse?: (targetName: string) => void;
  pickReuse?: (
    kind: "sets" | "progress" | "update",
    exerciseFullName: string | undefined,
    onSelect: (selection: ILiftoEditorReuseSelection) => void
  ) => void;
}

export interface ILiftoEditorControllerOptions {
  surface?: ILiftoEditorSurface;
  // Drives equipment-aware weight stepping and the plates readout. A sheet edits one
  // exercise, so it can pass a constant; inline the document holds the whole day, so
  // equipment has to be looked up per focused exercise.
  exerciseType?: IExerciseType;
  exerciseTypeFor?: (exerciseFullName: string) => IExerciseType | undefined;
  actions?: ILiftoEditorControllerActions;
}

function selectionToName(selected: IExercisePickerSelectedExercise, settings: ISettings): string {
  if (selected.type === "template") {
    return selected.label ? `${selected.label}: ${selected.name}` : selected.name;
  }
  const label = "label" in selected ? selected.label : undefined;
  return Exercise_fullName(Exercise_get(selected.exerciseType, settings.exercises), settings, label);
}

// The imperative shell around the pure LiftoEditorSession state machine: holds the session,
// adapts RN callbacks into transitions, and executes the returned effects (text edits via
// the editor handle, keypad open/close via the custom-keyboard context).
export function useLiftoEditorController(
  initialText: string,
  options?: ILiftoEditorControllerOptions
): ILiftoEditorController {
  const actions = options?.actions;
  const [session, setSession] = useState<ILiftoEditorSession>(() =>
    LiftoEditorSession_create(initialText, options?.surface)
  );
  // Resolved from the session it's about, never from the render's — dispatch opens the
  // keypad with the *next* session, and that transition is exactly when focus can cross
  // from one exercise to another.
  function resolveExerciseType(sess: ILiftoEditorSession): IExerciseType {
    const fullName = LiftoEditorSession_focusedExerciseFullName(sess);
    return (
      (fullName != null ? options?.exerciseTypeFor?.(fullName) : undefined) ??
      options?.exerciseType ??
      sampleExerciseType
    );
  }
  const sessionRef = useRef(session);
  const handleRef = useRef<ILiftoEditorHandle | undefined>(undefined);
  const openKeyboard = useOpenCustomKeyboard();
  const closeKeyboard = useCloseCustomKeyboard();
  const state = useTrackedState();
  const settings = untrack(state.storage.settings);
  const openCalculator = useModal("repMaxCalculatorModal", (weightValue) => {
    if (sessionRef.current.active != null && weightValue != null) {
      dispatch(LiftoEditorSession_setBufferValue(sessionRef.current, weightValue));
    }
  });

  function commit(next: ILiftoEditorSession): void {
    sessionRef.current = next;
    setSession(next);
  }

  function dispatch(result: ILiftoEditorSessionResult): void {
    commit(result.session);
    for (const edit of result.effects.edits ?? []) {
      handleRef.current?.replaceRange(edit.start, edit.end, edit.text);
    }
    if (result.effects.keypad === "close") {
      closeKeyboard();
    } else if (result.effects.keypad === "open") {
      openNumberKeyboard(result.session);
    }
  }

  function openNumberKeyboard(sess: ILiftoEditorSession): void {
    const active = sess.active;
    if (active == null) {
      return;
    }
    const exerciseType = resolveExerciseType(sess);
    const suffixUnit = active.suffix.startsWith("%")
      ? "%"
      : active.suffix.startsWith("kg")
        ? "kg"
        : active.suffix.startsWith("lb")
          ? "lb"
          : undefined;
    const isWeight = active.numeric.kind === "weight" && (suffixUnit === "kg" || suffixUnit === "lb");
    const isPercentage = active.numeric.kind === "percentage" && suffixUnit === "%";
    // Function-arg and script weights are increments, not lifted loads.
    const isLoad = !active.numeric.inFunctionArgs;
    // Warmup percentages resolve against the first work set, not the 1RM, so a percentage
    // can't be turned into a weight here — but an absolute warmup weight still is one.
    const canUseRm1 = isLoad && !LiftoEditorSession_isInWarmup(sess);
    const value = parseFloat(active.buffer);
    let evaluatedWeight: IWeight | undefined;
    if (isWeight && isLoad && Number.isFinite(value)) {
      evaluatedWeight = Weight_build(value, suffixUnit as IUnit);
    } else if (isPercentage && canUseRm1 && Number.isFinite(value)) {
      const rm1 = Exercise_onerm(exerciseType, settings);
      if (rm1.value > 0) {
        evaluatedWeight = Weight_round(
          Weight_build((rm1.value * value) / 100, rm1.unit),
          settings,
          rm1.unit,
          exerciseType
        );
      }
    }
    // The grammar takes a percentage anywhere it takes a weight — set weights, warmups,
    // function arguments like lp(5%), state vars, script bodies — so every one of them can
    // switch between the three. What differs is only whether the 1RM can convert the number
    // along with the unit, which setUnit decides.
    const enableUnits: (IUnit | IPercentageUnit)[] | undefined =
      isPercentage || isWeight ? ["kg", "lb", "%"] : undefined;
    openKeyboard({
      id: "liftoEditorNumber",
      isNegative: active.buffer.startsWith("-"),
      withDot: active.buffer.includes("."),
      allowDot: true,
      keyboardAddon:
        evaluatedWeight != null ? (
          <View className="px-4 py-2">
            <PlatesCalculator weight={evaluatedWeight} settings={settings} exerciseType={exerciseType} />
          </View>
        ) : undefined,
      enableCalculator: isWeight,
      onShowCalculator: isWeight
        ? () => {
            // closeKeyboard (not the config's onBlur) keeps the active session, so the
            // modal result can re-apply into the same token and reopen the keypad.
            closeKeyboard();
            openCalculator({ unit: suffixUnit as "kg" | "lb" });
          }
        : undefined,
      enableUnits,
      selectedUnit: enableUnits != null ? suffixUnit : undefined,
      onInput: (key) => dispatch(LiftoEditorSession_keypadInput(sessionRef.current, key)),
      onPlus: () => dispatch(LiftoEditorSession_step(sessionRef.current, 1, settings, exerciseType)),
      onMinus: () => dispatch(LiftoEditorSession_step(sessionRef.current, -1, settings, exerciseType)),
      onChangeUnits: (unit: IUnit | IPercentageUnit) => {
        dispatch(LiftoEditorSession_setUnit(sessionRef.current, unit, settings, exerciseType));
      },
      onBlur: () => dispatch(LiftoEditorSession_deactivate(sessionRef.current)),
    });
  }

  function pressPill(pill: ILiftoEditorPill): void {
    // The pill's range stays valid while the modal is up: structured mode blocks typing,
    // and the modal blocks further pill presses.
    const target: ITextEdit = { start: pill.start, end: pill.end, text: pill.text };
    const exerciseFullName = LiftoEditorSession_focusedExerciseFullName(sessionRef.current);
    if (pill.action === "changeExercise") {
      actions?.pickExercise?.(pill.text, exerciseFullName, (selected) => {
        const edit = LiftoEditorActions_swapExerciseEdit(target, selectionToName(selected, settings));
        dispatch(LiftoEditorSession_applyPill(sessionRef.current, { ...pill, ...edit }));
      });
    } else if (pill.action === "rename") {
      actions?.promptRename?.(pill.text, (value) => {
        const edit = LiftoEditorActions_renameEdit(target, value);
        if (edit != null) {
          dispatch(LiftoEditorSession_applyPill(sessionRef.current, { ...pill, ...edit }));
        }
      });
    } else if (pill.action === "editReuse") {
      actions?.editReuse?.(pill.text);
    } else if (
      (pill.action === "reuseSets" || pill.action === "reuseProgressScript" || pill.action === "reuseUpdateScript") &&
      actions?.pickReuse != null
    ) {
      // Without a pickReuse host (falls to the plain branch) the pill degrades to its
      // static template ("Reuse…") or a no-op self-replace ("Change…").
      const kind = pill.action === "reuseSets" ? "sets" : pill.action === "reuseProgressScript" ? "progress" : "update";
      const isSets = pill.action === "reuseSets";
      actions.pickReuse(kind, exerciseFullName, (selection) => {
        // Script reuse can't carry `[w:d]` — the grammar only allows it on sets reuse.
        const reuseTarget = LiftoEditorActions_reuseTargetText(isSets ? selection : { fullName: selection.fullName });
        const text = (pill.reuseTemplate ?? "{target}").replace("{target}", reuseTarget);
        dispatch(LiftoEditorSession_applyPill(sessionRef.current, { ...pill, text }));
      });
    } else {
      dispatch(LiftoEditorSession_applyPill(sessionRef.current, pill));
    }
  }

  // The editable prop flips on the freeform render commit; the caret can only be placed
  // (and the system keyboard summoned) after the native side has applied it.
  useEffect(() => {
    if (session.mode === "freeform" && session.pendingCaret != null) {
      const consumed = LiftoEditorSession_consumePendingCaret(sessionRef.current);
      commit(consumed.session);
      const caret = consumed.caret;
      if (caret != null) {
        setTimeout(() => handleRef.current?.setSelection(caret, caret), 50);
      }
    }
  }, [session.mode]);

  return {
    mode: session.mode,
    text: session.text,
    context: session.context,
    activeLevelIndex: LiftoEditorSession_activeLevelIndex(session),
    pills: LiftoEditorSession_pills(session),
    editorProps: {
      initialText,
      autoHeight: true,
      parseCache: session.cache,
      editable: session.mode === "freeform",
      extraStyledRanges: LiftoEditorSession_highlight(session),
      handleRef,
      onTextChange: (newText) => commit(LiftoEditorSession_textChanged(sessionRef.current, newText)),
      onTap:
        session.mode === "structured"
          ? (index) => dispatch(LiftoEditorSession_tap(sessionRef.current, index, Date.now()))
          : undefined,
    },
    walkFocus: (direction) => dispatch(LiftoEditorSession_walkFocus(sessionRef.current, direction)),
    selectLevel: (index) => dispatch(LiftoEditorSession_selectLevel(sessionRef.current, index)),
    pressPill,
    removeFocused: () => dispatch(LiftoEditorSession_removeFocused(sessionRef.current)),
    switchToStructured: () => dispatch(LiftoEditorSession_switchToStructured(sessionRef.current)),
    blur: () => dispatch(LiftoEditorSession_blur(sessionRef.current)),
    evict: () =>
      commit(LiftoEditorSession_blur(LiftoEditorSession_switchToStructured(sessionRef.current).session).session),
  };
}
