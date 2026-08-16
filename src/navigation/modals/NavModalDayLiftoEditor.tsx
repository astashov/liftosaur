import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { lb } from "lens-shmens";
import { useAppState } from "../StateContext";
import {
  Program_evaluate,
  Program_getAllProgramExercises,
  Program_getDayData,
  Program_getDayName,
  Program_getProgramDay,
} from "../../models/program";
import {
  ProgramDayText_apply,
  ProgramDayText_identityChange,
  ProgramDayText_replace,
} from "../../models/programDayText";
import { ProgramExerciseSwap_workoutRemap, type IProgramExerciseSwapScope } from "../../models/programExerciseSwap";
import {
  Progress_getCurrentProgress,
  Progress_lbProgress,
  Progress_remapProgramExerciseId,
} from "../../models/progress";
import { IState, updateState } from "../../models/state";
import { PlannerKey_fromFullName } from "../../pages/planner/plannerKey";
import { CollectionUtils_setBy } from "../../utils/collection";
import { Dialog_alert, Dialog_choice, Dialog_confirm } from "../../utils/dialog";
import type { IDayData, IPlannerProgram, IProgram } from "../../types";
import type { IRootStackParamList } from "../types";
import { Text } from "../../components/primitives/text";
import { LiftoEditorHints_gestures } from "../../components/primitives/liftoEditorHints";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { TransparentModal } from "../TransparentModal";
import { CustomKeyboardProvider } from "../CustomKeyboardContext";
import { LiftoEditorSheetProgram_resolve } from "./liftoEditorSheetProgram";
import { DayLiftoEditorSheet } from "./DayLiftoEditorSheet";

// The day's position, resolved from its absolute day number against the current program —
// re-resolved rather than remembered, since another surface can add or remove days while this
// sheet is up and the indices it opened on would then point at a different day.
//
// The range check is the point of the guard, not a formality: Program_getWeekFromDay and
// Program_getDayInWeek both fall back to 1 for a day past the end of the program, so a day that
// no longer exists resolves to a perfectly valid-looking Week 1 / Day 1 — and the save would
// land on Day 1's text.
function dayDataFor(
  program: IProgram & { planner: IPlannerProgram },
  day: number,
  settings: IState["storage"]["settings"]
): Required<IDayData> | undefined {
  const totalDays = program.planner.weeks.reduce((memo, week) => memo + week.days.length, 0);
  if (day < 1 || day > totalDays) {
    return undefined;
  }
  return Program_getDayData(Program_evaluate(program, settings), day);
}

export function NavModalDayLiftoEditor(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "dayLiftoEditorModal";
    params: IRootStackParamList["dayLiftoEditorModal"];
  }>();
  const params = route.params;
  const { state, dispatch } = useAppState();
  const settings = state.storage.settings;
  const isFromWorkout = params?.fromWorkout ?? true;

  // Snapshot on open: the editor reads its initial text once, and re-evaluating the program on
  // every state change would waste work while the sheet is up. Saving must NOT use this — onDone
  // re-resolves from the current state at commit time.
  const [snapshot] = useState(() => {
    if (params == null) {
      return undefined;
    }
    const program = LiftoEditorSheetProgram_resolve(state, params.programId, isFromWorkout);
    if (program?.planner == null) {
      return undefined;
    }
    const withPlanner = { ...program, planner: program.planner };
    const dayData = dayDataFor(withPlanner, params.day, settings);
    const day = dayData != null ? withPlanner.planner.weeks[dayData.week - 1]?.days[dayData.dayInWeek - 1] : undefined;
    if (dayData == null || day == null) {
      return undefined;
    }
    return {
      program: withPlanner,
      dayData,
      headerLabel: Program_getDayName(Program_evaluate(withPlanner, settings), params.day),
      initialText: day.exerciseText,
    };
  });

  const [editorMode, setEditorMode] = useState<"structured" | "freeform">("structured");
  // What the editor holds right now, in a ref rather than state: it changes on every keystroke
  // and nothing in this render depends on it — only the close guard reads it, and only when
  // asked. As state it would re-render the whole sheet per character.
  const liveTextRef = useRef(snapshot?.initialText ?? "");
  // The same text on a debounce, which is what the analysis below keys on. Splicing and
  // evaluating the program is far too heavy to do per keystroke.
  const [analyzedText, setAnalyzedText] = useState(snapshot?.initialText ?? "");
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onTextChange = (newText: string): void => {
    liveTextRef.current = newText;
    if (analyzeTimerRef.current != null) {
      clearTimeout(analyzeTimerRef.current);
    }
    analyzeTimerRef.current = setTimeout(() => setAnalyzedText(newText), 300);
  };
  useEffect(() => {
    return () => {
      if (analyzeTimerRef.current != null) {
        clearTimeout(analyzeTimerRef.current);
      }
    };
  }, []);

  // The draft spliced into the program the sheet opened on and evaluated: one pass answers the
  // error banner, what the pills resolve against, and which exercises this day now holds.
  const analysis = useMemo(() => {
    if (snapshot == null || params == null) {
      return undefined;
    }
    const planner = ProgramDayText_replace(snapshot.program.planner, snapshot.dayData, analyzedText);
    const evaluatedProgram = Program_evaluate({ ...snapshot.program, planner }, settings);
    const error = evaluatedProgram.errors.find(
      (e) => e.dayData.week === snapshot.dayData.week && e.dayData.dayInWeek === snapshot.dayData.dayInWeek
    )?.error;
    return {
      evaluatedProgram,
      error,
      exercises: Program_getProgramDay(evaluatedProgram, params.day)?.exercises ?? [],
    };
  }, [snapshot, params, analyzedText, settings]);

  const isDirty = (): boolean => snapshot != null && liveTextRef.current.trim() !== snapshot.initialText.trim();
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  // Set once a close is approved (or changes are saved), so the beforeRemove guard doesn't
  // re-prompt on the navigation pop that follows.
  const allowCloseRef = useRef(false);

  const onClose = (): void => {
    allowCloseRef.current = true;
    navigation.goBack();
  };

  const shouldClose = async (): Promise<boolean> => {
    if (isDirty() && !(await Dialog_confirm("Discard unsaved changes to this day?"))) {
      return false;
    }
    allowCloseRef.current = true;
    return true;
  };

  // The sheet containers guard their own close affordances via shouldClose; this covers the
  // paths that pop the route directly, like the Android hardware back button.
  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      if (allowCloseRef.current || !isDirtyRef.current()) {
        return;
      }
      e.preventDefault();
      Dialog_confirm("Discard unsaved changes to this day?").then((confirmed) => {
        if (confirmed) {
          allowCloseRef.current = true;
          navigation.dispatch(e.data.action);
        }
      });
    });
  }, [navigation]);

  // Saves the editor's live text, not the debounced copy: Save can land inside the debounce
  // window, and the last thing typed has to be part of what's written.
  const onDone = async (newText: string): Promise<void> => {
    liveTextRef.current = newText;
    if (params == null || snapshot == null || newText.trim() === snapshot.initialText.trim()) {
      onClose();
      return;
    }
    // Re-resolved from the current state rather than the open-time snapshot: another surface
    // can save this same program while the sheet is up, and writing the snapshot's program back
    // would silently revert that save.
    const program = LiftoEditorSheetProgram_resolve(state, params.programId, isFromWorkout);
    if (program?.planner == null) {
      Dialog_alert("Couldn't find this program anymore, so the changes weren't saved.");
      onClose();
      return;
    }
    const withPlanner = { ...program, planner: program.planner };
    const dayData = dayDataFor(withPlanner, params.day, settings);
    if (dayData == null) {
      Dialog_alert("Couldn't find this day in the program anymore, so the changes weren't saved.");
      onClose();
      return;
    }
    // Asked only when the answer differs — one declaration and the two scopes are the same
    // edit. Same question the per-exercise sheet asks, because it's the same edit reached from
    // a different surface, and answering it wrong silently rewrites weeks the user can't see.
    const identityChange = ProgramDayText_identityChange(withPlanner.planner, dayData, newText, settings);
    let scope: IProgramExerciseSwapScope = "all";
    if (identityChange != null && identityChange.declarations > 1 && !identityChange.isLadder) {
      const choice = await Dialog_choice(
        "Change exercise",
        `${identityChange.oldName} is set up separately on ${identityChange.declarations} days of this program.`,
        ["Change only this day", "Change across whole program"]
      );
      if (choice == null) {
        return;
      }
      scope = choice === 0 ? "one" : "all";
    }
    // Everything the save has to get right about the program lives in here: the splice, the
    // rewrite of every `...reuse` aimed at an exercise changed on this day, the labelling apart
    // of a name that collides with another exercise, and the refusal of an edit that breaks a
    // day it doesn't touch.
    const applied = ProgramDayText_apply(withPlanner.planner, dayData, newText, settings, scope);
    if ("error" in applied) {
      Dialog_alert(applied.error.message);
      return;
    }
    const updatedProgram = { ...withPlanner, planner: applied.planner };
    const hasEditorDraft = state.editProgramStates[updatedProgram.id] != null;
    if (!isFromWorkout && hasEditorDraft) {
      // From the program editor the edit stays a draft — the editor's own Save commits it to
      // storage, same as the per-exercise sheet.
      updateState(
        dispatch,
        [lb<IState>().p("editProgramStates").p(updatedProgram.id).p("current").p("program").record(updatedProgram)],
        "Update program from day editor"
      );
    } else {
      const lensUpdates = [
        lb<IState>()
          .p("storage")
          .p("programs")
          .recordModify((programs) => CollectionUtils_setBy(programs, "id", updatedProgram.id, updatedProgram)),
      ];
      // Mirror into an open program editor so it doesn't overwrite this edit on its own save.
      if (hasEditorDraft) {
        lensUpdates.push(
          lb<IState>().p("editProgramStates").p(updatedProgram.id).p("current").p("program").record(updatedProgram)
        );
      }
      // An exercise renamed on this day carries its logged sets over rather than leaving the
      // workout holding both the old entry and a fresh one. Silently, unlike the per-exercise
      // sheet's prompt: there the user asked to change an exercise and the question is about
      // what that should do to their log, here they retyped a line, and being asked about an
      // exercise swap they never requested is the more confusing of the two.
      const oldExercises = Program_getAllProgramExercises(Program_evaluate(withPlanner, settings));
      const newExercises = Program_getAllProgramExercises(Program_evaluate(updatedProgram, settings));
      for (const rename of applied.renames) {
        const remap = ProgramExerciseSwap_workoutRemap(
          Progress_getCurrentProgress(state),
          updatedProgram.id,
          oldExercises,
          newExercises,
          rename.oldKey,
          rename.newKey
        );
        if (remap != null) {
          lensUpdates.push(
            Progress_lbProgress(0).recordModify((p) => Progress_remapProgramExerciseId(p, remap.oldKey, remap.newKey))
          );
        }
      }
      // Exercises added, removed or reordered here reach an in-progress workout through the
      // ApplyProgramChangesToProgress listener, which fires off this very program change — the
      // same path a Program screen edit or a sync takes.
      updateState(dispatch, lensUpdates, "Save program day changes");
    }
    onClose();
    // Last, and after the sheet is gone: a label the user never typed turning up in their
    // program is otherwise unexplainable, and this is the only chance to say why.
    const labelled = applied.renames.find((rename) => rename.label != null);
    if (labelled != null && identityChange != null) {
      Dialog_alert(
        `This program already has a ${identityChange.newName} somewhere else, so this one is labelled "${labelled.label}" to keep the two apart.`
      );
    }
  };

  const exerciseFullNames = useMemo(
    () =>
      analysis != null
        ? Array.from(new Set(Program_getAllProgramExercises(analysis.evaluatedProgram).map((e) => e.fullName)))
        : [],
    [analysis]
  );

  return (
    <SheetScreenContainer onClose={onClose} shouldClose={shouldClose} shouldShowClose={true}>
      <TransparentModal
        onClose={onClose}
        shouldClose={shouldClose}
        fitContent={true}
        safeAreaContent={
          // In freeform mode swipes are off and the user is already typing, so the hint would
          // be wrong there.
          Platform.OS !== "web" && editorMode === "structured" ? (
            // Solid rounded chip: the keypad slides in underneath the hint, and without a
            // background it would show through the letters mid-animation.
            <View className="self-center rounded-lg bg-background-default p-1 px-2">
              <Text className="text-xs text-center text-text-secondary">{LiftoEditorHints_gestures}</Text>
            </View>
          ) : undefined
        }
      >
        <CustomKeyboardProvider applySafeAreaBottom={false} fitContent={true} noShadow={true}>
          {snapshot == null || analysis == null ? (
            // The program or the day went missing between the tap and this render. Nothing to
            // edit, and no fabricated program to fall back on that wouldn't save over something.
            <View className="px-gutter py-6">
              <Text className="text-sm text-center text-text-secondary">Couldn't find this day in the program.</Text>
            </View>
          ) : (
            <DayLiftoEditorSheet
              initialText={snapshot.initialText}
              headerLabel={snapshot.headerLabel}
              settings={settings}
              evaluatedProgram={analysis.evaluatedProgram}
              dayData={snapshot.dayData}
              exercises={analysis.exercises}
              error={analysis.error}
              exerciseFullNames={exerciseFullNames}
              exerciseTypeFor={(fullName) => {
                const key = PlannerKey_fromFullName(fullName, settings.exercises);
                return analysis.exercises.find((e) => e.key === key)?.exerciseType;
              }}
              onTextChange={onTextChange}
              onModeChange={setEditorMode}
              onDone={onDone}
            />
          )}
        </CustomKeyboardProvider>
      </TransparentModal>
    </SheetScreenContainer>
  );
}
