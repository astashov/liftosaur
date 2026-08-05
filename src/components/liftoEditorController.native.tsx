import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { ILiftoEditorContext, ILiftoEditorHandle } from "./primitives/liftoEditorBrain";
import { ILiftoEditorPill } from "./primitives/liftoEditorActions";
import {
  ILiftoEditorMode,
  ILiftoEditorSession,
  ILiftoEditorSessionResult,
  LiftoEditorSession_activeLevelIndex,
  LiftoEditorSession_applyPill,
  LiftoEditorSession_consumePendingCaret,
  LiftoEditorSession_create,
  LiftoEditorSession_deactivate,
  LiftoEditorSession_highlight,
  LiftoEditorSession_keypadBreadcrumb,
  LiftoEditorSession_keypadInput,
  LiftoEditorSession_pills,
  LiftoEditorSession_removeFocused,
  LiftoEditorSession_selectLevel,
  LiftoEditorSession_setBufferValue,
  LiftoEditorSession_setUnit,
  LiftoEditorSession_step,
  LiftoEditorSession_switchToFreeform,
  LiftoEditorSession_switchToStructured,
  LiftoEditorSession_tap,
  LiftoEditorSession_textChanged,
  LiftoEditorSession_walkFocus,
} from "./primitives/liftoEditorSession";
import { ILiftoEditorBaseProps } from "./primitives/liftoEditor";
import { Text } from "./primitives/text";
import { PlatesCalculator } from "./inputWeight2";
import { useCloseCustomKeyboard, useOpenCustomKeyboard } from "../navigation/CustomKeyboardContext";
import { useModal } from "../navigation/ModalStateContext";
import { useTrackedState, untrack } from "../navigation/TrackedStateContext";
import { Weight_build } from "../models/weight";
import { IExerciseType, IPercentageUnit, IUnit } from "../types";

export type { ILiftoEditorMode };

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
  applyPill: (pill: ILiftoEditorPill) => void;
  removeFocused: () => void;
  switchToFreeform: () => void;
  switchToStructured: () => void;
}

// Fallback when the host doesn't provide an exercise (the playground): plates math and
// weight stepping need one for bar/equipment resolution.
const sampleExerciseType: IExerciseType = { id: "squat", equipment: "barbell" };

export interface ILiftoEditorControllerOptions {
  // The sheet surface hosts breadcrumbs and ‹ › in its own header (always visible), so its
  // keypad drops the whole breadcrumb row. Screen surface keeps it in the keypad.
  showKeypadNav?: boolean;
  // Drives equipment-aware weight stepping and the plates readout.
  exerciseType?: IExerciseType;
}

// The imperative shell around the pure LiftoEditorSession state machine: holds the session,
// adapts RN callbacks into transitions, and executes the returned effects (text edits via
// the editor handle, keypad open/close via the custom-keyboard context).
export function useLiftoEditorController(
  initialText: string,
  options?: ILiftoEditorControllerOptions
): ILiftoEditorController {
  const showKeypadNav = options?.showKeypadNav ?? true;
  const exerciseType = options?.exerciseType ?? sampleExerciseType;
  const [session, setSession] = useState<ILiftoEditorSession>(() => LiftoEditorSession_create(initialText));
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
    const breadcrumb = showKeypadNav ? LiftoEditorSession_keypadBreadcrumb(sess) : "";
    const isWeight = active.numeric.kind === "weight" && (active.suffix === "kg" || active.suffix === "lb");
    const weightValue = parseFloat(active.buffer);
    // Function-arg and script weights are increments, not lifted loads — no plates readout.
    const evaluatedWeight =
      isWeight && !active.numeric.inFunctionArgs && Number.isFinite(weightValue)
        ? Weight_build(weightValue, active.suffix as IUnit)
        : undefined;
    openKeyboard({
      id: "liftoEditorNumber",
      isNegative: active.buffer.startsWith("-"),
      withDot: active.buffer.includes("."),
      allowDot: true,
      keyboardAddon:
        showKeypadNav || evaluatedWeight != null ? (
          <View className="py-1">
            {showKeypadNav ? (
              <View className="flex-row items-center justify-between px-4">
                <Pressable
                  className="px-4 py-1"
                  onPress={() => dispatch(LiftoEditorSession_walkFocus(sessionRef.current, -1))}
                >
                  <Text className="text-lg font-semibold text-text-primary">‹</Text>
                </Pressable>
                <Text className="text-sm text-text-secondary" numberOfLines={1}>
                  {breadcrumb}
                </Text>
                <Pressable
                  className="px-4 py-1"
                  onPress={() => dispatch(LiftoEditorSession_walkFocus(sessionRef.current, 1))}
                >
                  <Text className="text-lg font-semibold text-text-primary">›</Text>
                </Pressable>
              </View>
            ) : null}
            {evaluatedWeight != null ? (
              <View className="px-4 py-1">
                <PlatesCalculator weight={evaluatedWeight} settings={settings} exerciseType={exerciseType} />
              </View>
            ) : undefined}
          </View>
        ) : undefined,
      enableCalculator: isWeight,
      onShowCalculator: isWeight
        ? () => {
            // closeKeyboard (not the config's onBlur) keeps the active session, so the
            // modal result can re-apply into the same token and reopen the keypad.
            closeKeyboard();
            openCalculator({ unit: active.suffix as "kg" | "lb" });
          }
        : undefined,
      enableUnits: active.numeric.kind === "weight" ? (["kg", "lb"] as IUnit[]) : undefined,
      selectedUnit: active.numeric.kind === "weight" ? (active.suffix as IUnit) : undefined,
      onInput: (key) => dispatch(LiftoEditorSession_keypadInput(sessionRef.current, key)),
      onPlus: () => dispatch(LiftoEditorSession_step(sessionRef.current, 1, settings, exerciseType)),
      onMinus: () => dispatch(LiftoEditorSession_step(sessionRef.current, -1, settings, exerciseType)),
      onChangeUnits: (unit: IUnit | IPercentageUnit) => {
        if (unit === "kg" || unit === "lb") {
          dispatch(LiftoEditorSession_setUnit(sessionRef.current, unit));
        }
      },
      onBlur: () => dispatch(LiftoEditorSession_deactivate(sessionRef.current)),
    });
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
    applyPill: (pill) => dispatch(LiftoEditorSession_applyPill(sessionRef.current, pill)),
    removeFocused: () => dispatch(LiftoEditorSession_removeFocused(sessionRef.current)),
    switchToFreeform: () => dispatch(LiftoEditorSession_switchToFreeform(sessionRef.current)),
    switchToStructured: () => dispatch(LiftoEditorSession_switchToStructured(sessionRef.current)),
  };
}
