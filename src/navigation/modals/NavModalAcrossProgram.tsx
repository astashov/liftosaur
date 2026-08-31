import { JSX, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { KeyboardSheet } from "../KeyboardSheet";
import { Modal_clear, Modal_setResult, useModalData, useModalDispatch } from "../ModalStateContext";
import { Program_evaluatePlannerWeeks } from "../../models/program";
import { FocusedInputFlush_flush } from "../../utils/focusedInputFlush";
import { EditProgramExerciseAcrossAllWeeks } from "../../components/editProgramExercise/editProgramExerciseAcrossAllWeeks";
import { Text } from "../../components/primitives/text";
import { Button } from "../../components/button";
import type { ILiftoEditorAcrossField } from "../../components/primitives/liftoEditorActions";
import type { IPlannerProgram } from "../../types";

// The tab a field lands on, in the order the tabs are built.
const tabForField: Record<ILiftoEditorAcrossField, number> = { reps: 0, weight: 1, rpe: 2, timer: 3 };

export function NavModalAcrossProgram(): JSX.Element {
  const navigation = useNavigation();
  const modalDispatch = useModalDispatch();
  const { state } = useAppState();
  const settings = state.storage.settings;
  const data = useModalData("acrossProgramModal");

  // The working copy. Every edit rewrites the whole program, so it stays local and is handed back
  // once — the opener decides where it goes, and this sheet never writes to app state itself.
  //
  // Mirrored into a ref because Save has to read it in the same tick it flushes the focused input
  // into it, and a setState hasn't run its updater by then. The ref is what has been applied; the
  // state is only what has been rendered.
  const [planner, setPlanner] = useState<IPlannerProgram | undefined>(data?.planner);
  const plannerRef = useRef<IPlannerProgram | undefined>(data?.planner);
  const applyChange = (apply: (current: IPlannerProgram) => IPlannerProgram): void => {
    if (plannerRef.current == null) {
      return;
    }
    plannerRef.current = apply(plannerRef.current);
    setPlanner(plannerRef.current);
  };
  const [tabIndex, setTabIndex] = useState(data != null ? tabForField[data.field] : 0);

  // Re-evaluated only when an edit lands, not per render: the grouping has to reflect what the
  // user has just changed, and each change rewrites the whole planner.
  const weeks = useMemo(
    () => (planner != null ? Program_evaluatePlannerWeeks(planner, settings) : undefined),
    [planner, settings]
  );
  const plannerExercise = useMemo(() => {
    for (const week of weeks ?? []) {
      for (const day of week.days) {
        const exercise = day.exercises.find((e) => e.key === data?.exerciseKey);
        if (exercise != null) {
          return exercise;
        }
      }
    }
    return undefined;
  }, [weeks, data]);

  // Editing here rewrites lines the opener isn't showing, so the two exits have to mean different
  // things: Save hands the rewritten program back, closing throws it away. Without the button,
  // dismissing would silently apply — the affordance says "cancel" and the behaviour wouldn't.
  const onSave = (): void => {
    // The number fields commit on blur, and tapping Save doesn't blur them — the keypad is still
    // up and the press lands on a button, not on another input. Without this, the value being
    // typed at the moment of saving is the one value that doesn't make it.
    FocusedInputFlush_flush();
    const edited = plannerRef.current;
    if (data != null && edited != null && edited !== data.planner) {
      Modal_setResult(modalDispatch, "acrossProgramModal", edited);
    }
    Modal_clear(modalDispatch, "acrossProgramModal");
    navigation.goBack();
  };

  const onClose = (): void => {
    Modal_clear(modalDispatch, "acrossProgramModal");
    navigation.goBack();
  };

  if (data == null) {
    return <></>;
  }

  return (
    <KeyboardSheet header={data.exerciseFullName} onClose={onClose}>
      {weeks == null || plannerExercise == null ? (
        <View className="px-gutter py-6">
          <Text className="text-sm text-center text-text-secondary">Couldn't find this exercise in the program.</Text>
        </View>
      ) : (
        <EditProgramExerciseAcrossAllWeeks
          weeks={weeks}
          plannerExercise={plannerExercise}
          settings={settings}
          tabIndex={tabIndex}
          onChangeTabIndex={setTabIndex}
          onChange={applyChange}
        />
      )}
      <View className="items-center pt-4 pb-2">
        <Button kind="purple" name="across-program-save" onClick={onSave}>
          Save
        </Button>
      </View>
    </KeyboardSheet>
  );
}
