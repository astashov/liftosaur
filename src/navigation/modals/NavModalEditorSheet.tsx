import { JSX, useEffect, useRef, useState } from "react";
import { StackActions, useNavigation, useRoute } from "@react-navigation/native";
import { lb } from "lens-shmens";
import { useAppState } from "../StateContext";
import { IEditorSheetExercisePickerModalData } from "../ModalStateContext";
import {
  IEvaluatedProgram,
  Program_evaluate,
  Program_getAllProgramExercises,
  Program_getProgram,
  Program_getProgramExercise,
  Program_getReuseSetsCandidates,
  Program_getScriptReuseCandidates,
} from "../../models/program";
import { ObjectUtils_keys, ObjectUtils_values } from "../../utils/object";
import type { ILiftoEditorReuseSelection } from "../../components/primitives/liftoEditorActions";
import { PlannerProgram_evaluate } from "../../pages/planner/models/plannerProgram";
import type { IPlannerEvalResult } from "../../pages/planner/plannerExerciseEvaluator";
import type { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IState, updateState } from "../../models/state";
import { CollectionUtils_setBy } from "../../utils/collection";
import { Dialog_alert, Dialog_confirm } from "../../utils/dialog";
import type { IDayData, IPlannerProgram, IProgram, ISettings } from "../../types";
import type { IRootStackParamList } from "../types";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { TransparentModal } from "../TransparentModal";
import { CustomKeyboardProvider } from "../CustomKeyboardContext";
import { EditorSheetBody } from "./EditorSheetBody";
import type {
  IEditorSheetInstanceOption,
  IEditorSheetLiveError,
  IEditorSheetReuseCandidates,
} from "./editorSheetTypes";

const sampleText = `# Week 1
## Day 1
Squat / 5x5 / 100kg / progress: lp(5kg)
Bench Press, Barbell / 3x8-10 @8 60s / 80% / warmup: 2x5 45%, 1x3 60%
// A line comment
Deadlift[1-3] / 1x5 / 150kg+ / update: custom() {~ weights += 2.5kg ~}
`;

// Where the exercise's source text physically lives: repeat instances carry the
// declaration's text/line but their own dayData, so anchor edits to the non-repeat
// declaration that repeats into the opened week.
function findDeclaration(
  evaluatedProgram: IEvaluatedProgram,
  programExercise: IPlannerProgramExercise
): IPlannerProgramExercise {
  if (!programExercise.isRepeat) {
    return programExercise;
  }
  return (
    Program_getAllProgramExercises(evaluatedProgram).find(
      (e) => e.key === programExercise.key && !e.isRepeat && e.repeating.includes(programExercise.dayData.week)
    ) ?? programExercise
  );
}

// Identical exercise lines commonly appear in several weeks (repeated weeks written out),
// so the replacement must target the declaration's exact day and line, not the first
// occurrence anywhere in the planner.
function replaceExerciseTextInPlanner(
  planner: IPlannerProgram,
  declaration: IPlannerProgramExercise,
  oldText: string,
  newText: string
): { planner: IPlannerProgram; dayTextOffset: number } | undefined {
  const weekIndex = declaration.dayData.week - 1;
  const dayIndex = declaration.dayData.dayInWeek - 1;
  const day = planner.weeks[weekIndex]?.days[dayIndex];
  if (day == null) {
    return undefined;
  }
  const lineStart = day.exerciseText
    .split("\n")
    .slice(0, declaration.line - 1)
    .reduce((sum, l) => sum + l.length + 1, 0);
  const at = day.exerciseText.indexOf(oldText, lineStart);
  if (at === -1) {
    return undefined;
  }
  const newExerciseText = day.exerciseText.slice(0, at) + newText + day.exerciseText.slice(at + oldText.length);
  const newWeeks = planner.weeks.map((w, wi) =>
    wi === weekIndex
      ? { ...w, days: w.days.map((d, di) => (di === dayIndex ? { ...d, exerciseText: newExerciseText } : d)) }
      : w
  );
  return { planner: { ...planner, weeks: newWeeks }, dayTextOffset: at };
}

function cleanErrorMessage(message: string): string {
  return message.replace(/\s*\(\d+:\d+\)$/, "");
}

// In a single-week program the week name is the same on every chip, so only day names carry
// information there.
function instanceLabel(evaluatedProgram: IEvaluatedProgram | undefined, dayData: IDayData): string {
  const week = dayData.week != null ? evaluatedProgram?.weeks[dayData.week - 1] : undefined;
  const day = dayData.dayInWeek != null ? week?.days[dayData.dayInWeek - 1] : undefined;
  if (week == null || day == null) {
    return `Week ${dayData.week ?? 1} · Day ${dayData.dayInWeek ?? 1}`;
  }
  return evaluatedProgram != null && evaluatedProgram.weeks.length === 1 ? day.name : `${week.name} · ${day.name}`;
}

// Mirrors the reuse-sets select of the edit-exercise screen: plain `...Name` resolves in
// the current week, so week/day are attached only when that would be wrong or ambiguous —
// target absent from this week, present on several of its days, or the same exercise.
function reuseSetsSelections(
  key: string,
  evaluatedProgram: IEvaluatedProgram,
  dayData: Required<IDayData>
): ILiftoEditorReuseSelection[] {
  const candidates = Program_getReuseSetsCandidates(key, evaluatedProgram, dayData);
  return ObjectUtils_values(candidates).map((candidate) => {
    const currentWeekDays = candidate.weekAndDays[dayData.week];
    const week = currentWeekDays == null ? Number(ObjectUtils_keys(candidate.weekAndDays)[0]) : undefined;
    const needsDay =
      week != null || candidate.exercise.key === key || (currentWeekDays != null && currentWeekDays.size > 1);
    const day = needsDay ? Array.from(candidate.weekAndDays[week ?? dayData.week] ?? [])[0] : undefined;
    return { fullName: candidate.exercise.fullName, week, day };
  });
}

// From the program editor the source of truth is the unsaved draft in editProgramStates,
// not the last saved program — reading storage there would edit stale text and clobber
// the user's other pending edits on save.
function resolveProgram(state: IState, programId: string, isFromWorkout: boolean): IProgram | undefined {
  const draft = !isFromWorkout ? state.editProgramStates[programId]?.current.program : undefined;
  return draft ?? Program_getProgram(state, programId);
}

// The evaluator can throw outright on drafts it never sees from saved programs (e.g. a
// reuse pointing at a week that doesn't exist) — and live validation feeds it every
// keystroke, so a throw must become an error result, not a crash.
function evaluateSplicedPlanner(
  replaced: { planner: IPlannerProgram; dayTextOffset: number },
  declaration: IPlannerProgramExercise,
  trimmed: string,
  settings: ISettings
): IEditorSheetLiveError | undefined {
  try {
    const { evaluatedWeeks } = PlannerProgram_evaluate(replaced.planner, settings);
    return findEvalError(evaluatedWeeks, {
      weekIndex: declaration.dayData.week - 1,
      dayIndex: declaration.dayData.dayInWeek - 1,
      from: replaced.dayTextOffset,
      to: replaced.dayTextOffset + trimmed.length,
    });
  } catch (e) {
    return { message: e instanceof Error ? e.message : String(e) };
  }
}

// Errors inside the edited exercise come back with blurb-local from/to (so the sheet can
// tint the line); errors elsewhere (e.g. the edit broke a `...reuse` on another day) are
// message-only, prefixed with where they are.
function findEvalError(
  evaluatedWeeks: IPlannerEvalResult[][],
  edited: { weekIndex: number; dayIndex: number; from: number; to: number }
): IEditorSheetLiveError | undefined {
  let firstOutside: IEditorSheetLiveError | undefined;
  for (let wi = 0; wi < evaluatedWeeks.length; wi += 1) {
    for (let di = 0; di < evaluatedWeeks[wi].length; di += 1) {
      const result = evaluatedWeeks[wi][di];
      if (!result.success) {
        const error = result.error;
        const isInEdited =
          wi === edited.weekIndex && di === edited.dayIndex && error.from >= edited.from && error.to <= edited.to;
        if (isInEdited) {
          return {
            message: cleanErrorMessage(error.message),
            from: error.from - edited.from,
            to: error.to - edited.from,
          };
        }
        firstOutside = firstOutside ?? {
          message: `Week ${wi + 1}, Day ${di + 1}: ${cleanErrorMessage(error.message)}`,
        };
      }
    }
  }
  return firstOutside;
}

export function NavModalEditorSheet(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<{ key: string; name: "editorSheetModal"; params: IRootStackParamList["editorSheetModal"] }>();
  const params = route.params;
  const { state, dispatch } = useAppState();
  const isFromWorkout = params?.fromWorkout ?? true;
  // Snapshot the exercise on open: the controller only reads initialText once, and
  // re-evaluating the program on every state change would waste work while the sheet is up.
  // Saving must NOT use this — onDone re-resolves from the current state at commit time.
  const [snapshot] = useState(() => {
    if (params == null) {
      return undefined;
    }
    const program = resolveProgram(state, params.programId, isFromWorkout);
    if (program == null) {
      return undefined;
    }
    const evaluatedProgram = Program_evaluate(program, state.storage.settings);
    const programExercise = Program_getProgramExercise(params.dayData.day, evaluatedProgram, params.key);
    if (programExercise == null) {
      return undefined;
    }
    // One entry per declaration: repeat instances share the declaration's text, so a chip
    // per repeated week would be several ways to edit the same source line.
    const instances = Program_getAllProgramExercises(evaluatedProgram).filter(
      (e) => e.key === params.key && !e.isRepeat
    );
    return {
      evaluatedProgram,
      programExercise,
      instances,
      initialDayData: findDeclaration(evaluatedProgram, programExercise).dayData,
    };
  });
  const [selectedDayData, setSelectedDayData] = useState(snapshot?.initialDayData ?? params?.dayData);
  const currentExercise =
    snapshot != null && selectedDayData != null
      ? (snapshot.instances.find(
          (e) => e.dayData.week === selectedDayData.week && e.dayData.dayInWeek === selectedDayData.dayInWeek
        ) ?? snapshot.programExercise)
      : undefined;

  // Draft state for the close guard: undefined until the body reports an edit, reset on
  // instance switch (the body runs its own discard confirmation there).
  const draftTextRef = useRef<string | undefined>(undefined);
  // Set once a close is approved (or changes are saved), so the beforeRemove guard doesn't
  // re-prompt on the navigation pop that follows.
  const allowCloseRef = useRef(false);

  const onClose = (): void => {
    allowCloseRef.current = true;
    navigation.goBack();
  };

  // Pushes a second editor sheet for the reuse target on top of this one, so Done/close
  // pops back to the referring exercise.
  const onEditReuse = (targetName: string): void => {
    if (snapshot == null || params == null) {
      return;
    }
    const target = Program_getAllProgramExercises(snapshot.evaluatedProgram).find(
      (e) => e.fullName === targetName || e.name === targetName || e.key === targetName
    );
    if (target == null) {
      Dialog_alert(`Couldn't find "${targetName}" in this program.`);
      return;
    }
    navigation.dispatch(
      StackActions.push("editorSheetModal", {
        programId: params.programId,
        key: target.key,
        dayData: target.dayData,
        fromWorkout: params.fromWorkout,
      })
    );
  };

  const onDone = (newText: string): void => {
    const trimmed = newText.trim();
    if (params == null || snapshot == null || currentExercise == null || trimmed === currentExercise.text) {
      onClose();
      return;
    }
    if (trimmed === "") {
      Dialog_alert("The exercise text is empty. Delete the exercise from the program screen instead.");
      return;
    }
    // Re-resolve from the current state, not the open-time snapshot: a stacked reuse sheet
    // can save this same program while this sheet is up, and writing the snapshot's program
    // back would silently revert that save.
    const program = resolveProgram(state, params.programId, isFromWorkout);
    if (program?.planner == null) {
      Dialog_alert("Couldn't find this program anymore, so the changes weren't saved.");
      onClose();
      return;
    }
    const evaluatedProgram = Program_evaluate(program, state.storage.settings);
    const programExercise = Program_getProgramExercise(currentExercise.dayData.day, evaluatedProgram, params.key);
    const declaration = programExercise != null ? findDeclaration(evaluatedProgram, programExercise) : undefined;
    const replaced =
      declaration != null
        ? replaceExerciseTextInPlanner(program.planner, declaration, declaration.text, trimmed)
        : undefined;
    if (declaration == null || replaced == null) {
      Dialog_alert("Couldn't find this exercise in the program anymore, so the changes weren't saved.");
      onClose();
      return;
    }
    const evalError = evaluateSplicedPlanner(replaced, declaration, trimmed, state.storage.settings);
    if (evalError != null) {
      Dialog_alert(evalError.message);
      return;
    }
    const updatedProgram = { ...program, planner: replaced.planner };
    const hasEditorDraft = state.editProgramStates[updatedProgram.id] != null;
    if (!isFromWorkout && hasEditorDraft) {
      // From the program editor the edit stays a draft — the editor's own Save commits
      // it to storage, same as the full edit-exercise screen.
      updateState(
        dispatch,
        [lb<IState>().p("editProgramStates").p(updatedProgram.id).p("current").p("program").record(updatedProgram)],
        "Update program from edit exercise"
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
      updateState(dispatch, lensUpdates, "Save program changes");
    }
    onClose();
  };

  // Live validation for the banner/line-tint: splices the draft text into the *current*
  // program and evaluates. The declaration is resolved from the open-time snapshot (one
  // full evaluation per call instead of two); if a stacked reuse sheet changed this very
  // exercise the splice lookup misses and validation just goes quiet — save still
  // re-resolves and re-validates from scratch.
  const validateText = (newText: string): IEditorSheetLiveError | undefined => {
    const trimmed = newText.trim();
    if (params == null || snapshot == null || currentExercise == null || trimmed === "") {
      return undefined;
    }
    const program = resolveProgram(state, params.programId, isFromWorkout);
    if (program?.planner == null) {
      return undefined;
    }
    const declaration = findDeclaration(snapshot.evaluatedProgram, currentExercise);
    const replaced = replaceExerciseTextInPlanner(program.planner, declaration, declaration.text, trimmed);
    if (replaced == null) {
      return undefined;
    }
    const error = evaluateSplicedPlanner(replaced, declaration, trimmed, state.storage.settings);
    if (error?.from != null && error.to != null) {
      // The splice uses the trimmed text while the editor shows the untrimmed draft.
      const leading = newText.length - newText.trimStart().length;
      return { ...error, from: error.from + leading, to: error.to + leading };
    }
    return error;
  };

  const initialText = currentExercise?.text ?? sampleText;
  const isDirty = (): boolean => draftTextRef.current != null && draftTextRef.current.trim() !== initialText.trim();
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const shouldClose = async (): Promise<boolean> => {
    if (isDirty() && !(await Dialog_confirm("Discard unsaved changes to this exercise?"))) {
      return false;
    }
    allowCloseRef.current = true;
    return true;
  };

  // The sheet containers guard their own close affordances via shouldClose; this covers
  // the paths that pop the route directly, like the Android hardware back button.
  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      if (allowCloseRef.current || !isDirtyRef.current()) {
        return;
      }
      e.preventDefault();
      Dialog_confirm("Discard unsaved changes to this exercise?").then((confirmed) => {
        if (confirmed) {
          allowCloseRef.current = true;
          navigation.dispatch(e.data.action);
        }
      });
    });
  }, [navigation]);

  const dayData = selectedDayData ?? params?.dayData;
  const headerLabel = dayData != null ? instanceLabel(snapshot?.evaluatedProgram, dayData) : "Week 1 · Day 1";
  const instances: IEditorSheetInstanceOption[] = (snapshot?.instances ?? []).map((e) => ({
    dayData: e.dayData,
    label: instanceLabel(snapshot?.evaluatedProgram, e.dayData),
    isSelected:
      selectedDayData != null &&
      e.dayData.week === selectedDayData.week &&
      e.dayData.dayInWeek === selectedDayData.dayInWeek,
  }));
  const exerciseFullNames =
    snapshot != null
      ? Array.from(new Set(Program_getAllProgramExercises(snapshot.evaluatedProgram).map((e) => e.fullName)))
      : [];
  const reuseCandidates: IEditorSheetReuseCandidates | undefined =
    snapshot != null && params != null && currentExercise != null && dayData != null
      ? {
          sets: reuseSetsSelections(params.key, snapshot.evaluatedProgram, dayData),
          progress: Program_getScriptReuseCandidates(
            params.key,
            !!currentExercise.notused,
            snapshot.evaluatedProgram,
            "progress"
          ),
          update: Program_getScriptReuseCandidates(
            params.key,
            !!currentExercise.notused,
            snapshot.evaluatedProgram,
            "update"
          ),
        }
      : undefined;
  const pickerData: IEditorSheetExercisePickerModalData | undefined =
    snapshot != null && params != null && currentExercise != null && dayData != null
      ? {
          exerciseType: currentExercise.exerciseType,
          label: currentExercise.label,
          templateName: currentExercise.exerciseType == null ? currentExercise.name : undefined,
          programId: params.programId,
          dayData,
        }
      : undefined;

  return (
    <SheetScreenContainer onClose={onClose} shouldClose={shouldClose} shouldShowClose={true}>
      <TransparentModal onClose={onClose} shouldClose={shouldClose} fitContent={true}>
        <CustomKeyboardProvider applySafeAreaBottom={false} fitContent={true} noShadow={true}>
          <EditorSheetBody
            // Remount on instance switch: the controller reads initialText only once.
            key={dayData != null ? `${dayData.week}-${dayData.dayInWeek}` : "default"}
            initialText={initialText}
            headerLabel={headerLabel}
            instances={instances}
            onSelectInstance={(instance) => {
              draftTextRef.current = undefined;
              setSelectedDayData(instance.dayData);
            }}
            onTextChange={(text) => {
              draftTextRef.current = text;
            }}
            exerciseFullNames={exerciseFullNames}
            pickerData={pickerData}
            onEditReuse={onEditReuse}
            reuseCandidates={reuseCandidates}
            validateText={validateText}
            onDone={onDone}
          />
        </CustomKeyboardProvider>
      </TransparentModal>
    </SheetScreenContainer>
  );
}
