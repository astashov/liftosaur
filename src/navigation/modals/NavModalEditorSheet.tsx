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
} from "../../models/program";
import { ILiftoEditorReuseCandidates, LiftoEditorReuse_candidates } from "../../components/liftoEditorReuse";
import { LiftoEditorBrain_exerciseFullName, LiftoEditorParseCache } from "../../components/primitives/liftoEditorBrain";
import {
  IProgramExerciseIdentity,
  IProgramExerciseParsedName,
  IProgramExerciseSwap,
  ProgramExerciseSwap_detect,
  ProgramExerciseSwap_identity,
  ProgramExerciseSwap_workoutRemap,
  IProgramExerciseSwapScope,
} from "../../models/programExerciseSwap";
import {
  Progress_getCurrentProgress,
  Progress_lbProgress,
  Progress_remapProgramExerciseId,
} from "../../models/progress";
import { EditProgramUiHelpers_getChangedKeys } from "../../components/editProgram/editProgramUi/editProgramUiHelpers";
import { ProgramExerciseText_apply, ProgramExerciseText_findDeclaration } from "../../models/programExerciseText";
import type { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { IState, updateState } from "../../models/state";
import { CollectionUtils_setBy } from "../../utils/collection";
import { Dialog_alert, Dialog_choice, Dialog_confirm } from "../../utils/dialog";
import type { IDayData, IProgram } from "../../types";
import type { IRootStackParamList } from "../types";
import { Platform, View } from "react-native";
import { Text } from "../../components/primitives/text";
import { LiftoEditorHints_gestures } from "../../components/primitives/liftoEditorHints";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { TransparentModal } from "../TransparentModal";
import { CustomKeyboardProvider } from "../CustomKeyboardContext";
import { EditorSheetBody } from "./EditorSheetBody";
import type { IEditorSheetInstanceOption, IEditorSheetLiveError } from "./editorSheetTypes";

const sampleText = `# Week 1
## Day 1
Squat / 5x5 / 100kg / progress: lp(5kg)
Bench Press, Barbell / 3x8-10 @8 60s / 80% / warmup: 2x5 45%, 1x3 60%
// A line comment
Deadlift[1-3] / 1x5 / 150kg+ / update: custom() {~ weights += 2.5kg ~}
`;

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

// From the program editor the source of truth is the unsaved draft in editProgramStates,
// not the last saved program — reading storage there would edit stale text and clobber
// the user's other pending edits on save.
function resolveProgram(state: IState, programId: string, isFromWorkout: boolean): IProgram | undefined {
  const draft = !isFromWorkout ? state.editProgramStates[programId]?.current.program : undefined;
  return draft ?? Program_getProgram(state, programId);
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
      initialDayData: ProgramExerciseText_findDeclaration(evaluatedProgram, programExercise).dayData,
    };
  });
  const [selectedDayData, setSelectedDayData] = useState(snapshot?.initialDayData ?? params?.dayData);
  const [editorMode, setEditorMode] = useState<"structured" | "freeform">("structured");
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

  // One cache for the sheet's own parses; the editor below keeps its own.
  const parseCacheRef = useRef<LiftoEditorParseCache | undefined>(undefined);
  const parseName = (text: string): IProgramExerciseParsedName | undefined => {
    const cache = parseCacheRef.current ?? new LiftoEditorParseCache();
    parseCacheRef.current = cache;
    return LiftoEditorBrain_exerciseFullName(cache, text);
  };
  const detectSwap = (text: string, declaration: IPlannerProgramExercise): IProgramExerciseSwap | undefined => {
    const parsed = parseName(text);
    return parsed != null ? ProgramExerciseSwap_detect(parsed, declaration, state.storage.settings) : undefined;
  };

  // A bare full name is parsed too rather than picked apart by hand — it is the same grammar,
  // and the cache makes the extra parse a lookup.
  const exerciseFor = (fullName: string | undefined): IProgramExerciseIdentity | undefined => {
    const parsed = fullName != null ? parseName(fullName) : undefined;
    return parsed != null ? ProgramExerciseSwap_identity(parsed, state.storage.settings) : undefined;
  };

  // Asked when the exercise changes — before the picker, or on Apply — rather than at save,
  // where the user has long moved on. Kept here because the body remounts.
  const swapScopeRef = useRef<IProgramExerciseSwapScope | undefined>(undefined);
  const requestSwapScope = async (isLadder: boolean): Promise<IProgramExerciseSwapScope | undefined> => {
    const declarations = snapshot?.instances.length ?? 1;
    // With a single declaration "this day" and "everywhere" are the same edit, and scoping to
    // a day would break a declaration that repeats into other weeks. A ladder change always
    // reaches every instance too — the rungs are the exercise's identity — so asking there
    // would be asking a question whose answer is then ignored.
    if (isLadder || declarations < 2) {
      return "all";
    }
    if (swapScopeRef.current != null) {
      return swapScopeRef.current;
    }
    const choice = await Dialog_choice(
      "Change exercise",
      `This exercise is set up separately on ${declarations} days of this program.`,
      ["Change only this day", "Change across whole program"]
    );
    if (choice == null) {
      return undefined;
    }
    swapScopeRef.current = choice === 0 ? "one" : "all";
    return swapScopeRef.current;
  };

  // The pill knows a swap is coming before the picker opens; freeform only knows once the
  // text is applied, so there the question is asked on Apply.
  const onBeforeChangeExercise = async (): Promise<boolean> => {
    // The picked exercise isn't known yet, but an exercise that is already a ladder can only
    // be changed as one, so that is enough to know the question doesn't apply.
    const isLadder = (currentExercise?.exerciseVariations?.length ?? 0) > 1;
    return (await requestSwapScope(isLadder)) != null;
  };

  const onBeforeApply = async (text: string): Promise<boolean> => {
    if (currentExercise == null || snapshot == null) {
      return true;
    }
    const declaration = ProgramExerciseText_findDeclaration(snapshot.evaluatedProgram, currentExercise);
    const swap = detectSwap(text.trim(), declaration);
    if (swap == null) {
      return true;
    }
    return (await requestSwapScope(swap.isLadder)) != null;
  };

  const onDone = async (newText: string): Promise<void> => {
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
    const declaration =
      programExercise != null ? ProgramExerciseText_findDeclaration(evaluatedProgram, programExercise) : undefined;
    if (declaration == null) {
      Dialog_alert("Couldn't find this exercise in the program anymore, so the changes weren't saved.");
      onClose();
      return;
    }
    const swap = detectSwap(trimmed, declaration);
    // Reachable when the name was changed on a surface with no Apply step (the web body), or
    // when the sheet was opened again on a text that already carries the change.
    const scope = swap != null ? await requestSwapScope(swap.isLadder) : "all";
    if (scope == null) {
      return;
    }
    const applied = ProgramExerciseText_apply(
      program.planner,
      declaration,
      trimmed,
      swap,
      scope,
      state.storage.settings
    );
    if ("error" in applied) {
      Dialog_alert(applied.error.message);
      return;
    }
    const updatedProgram = { ...program, planner: applied.planner };
    const newKey =
      swap != null
        ? EditProgramUiHelpers_getChangedKeys(program.planner, applied.planner, state.storage.settings)[declaration.key]
        : undefined;
    const updatedExercises =
      swap != null && newKey != null
        ? Program_getAllProgramExercises(Program_evaluate(updatedProgram, state.storage.settings))
        : [];
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
      const remap = ProgramExerciseSwap_workoutRemap(
        Progress_getCurrentProgress(state),
        updatedProgram.id,
        Program_getAllProgramExercises(evaluatedProgram),
        updatedExercises,
        declaration.key,
        newKey
      );
      if (remap != null) {
        // Logged sets are the user's own data, so converting them is theirs to decide.
        const shouldRemap =
          !remap.needsConfirmation ||
          (await Dialog_confirm(
            `You've already logged sets for ${declaration.name} in this workout. Switch them to ${
              swap?.newFullName ?? "the new exercise"
            } too?`
          ));
        if (shouldRemap) {
          lensUpdates.push(
            Progress_lbProgress(0).recordModify((p) => Progress_remapProgramExerciseId(p, remap.oldKey, remap.newKey))
          );
        }
      }
      updateState(dispatch, lensUpdates, "Save program changes");
    }
    // Last, so it doesn't compete with the swap confirmation for the screen: a de-conflicting
    // label appearing out of nowhere is otherwise unexplainable.
    if (swap != null && newKey != null && newKey !== swap.newKey) {
      const label = updatedExercises.find((e) => e.key === newKey)?.label;
      if (label != null) {
        Dialog_alert(
          `This program already has a ${swap.newFullName} somewhere else, so this one is labelled "${label}" to keep the two apart.`
        );
      }
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
    const declaration = ProgramExerciseText_findDeclaration(snapshot.evaluatedProgram, currentExercise);
    // Validated the same way it will be saved, including the swap — otherwise a changed
    // exercise name reports every `...reuse` aimed at the old one as broken, which the save
    // then goes on to rewrite.
    const swap = detectSwap(trimmed, declaration);
    const applied = ProgramExerciseText_apply(
      program.planner,
      declaration,
      trimmed,
      swap,
      swapScopeRef.current ?? "all",
      state.storage.settings
    );
    if (!("error" in applied) || applied.notFound) {
      return undefined;
    }
    const error = applied.error;
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
  const reuseCandidates: ILiftoEditorReuseCandidates | undefined =
    snapshot != null && params != null && currentExercise != null && dayData != null
      ? LiftoEditorReuse_candidates(params.key, !!currentExercise.notused, snapshot.evaluatedProgram, dayData)
      : undefined;
  const pickerData: IEditorSheetExercisePickerModalData | undefined =
    snapshot != null && params != null && currentExercise != null && dayData != null
      ? {
          exerciseType: currentExercise.exerciseType,
          label: currentExercise.label,
          templateName: currentExercise.exerciseType == null ? currentExercise.name : undefined,
          evaluatedProgram: snapshot.evaluatedProgram,
          dayData,
          // This declaration's own slot doesn't conflict with itself, and the program still
          // holds whatever it had when the sheet opened — so without this, swapping away from
          // an exercise makes it impossible to swap back to.
          excludeUsedExerciseTypes: currentExercise.exerciseType != null ? [currentExercise.exerciseType] : undefined,
        }
      : undefined;

  return (
    <SheetScreenContainer onClose={onClose} shouldClose={shouldClose} shouldShowClose={true}>
      <TransparentModal
        onClose={onClose}
        shouldClose={shouldClose}
        fitContent={true}
        safeAreaContent={
          // In freeform mode swipes are off and the user is already typing, so the hint
          // would be wrong there.
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
            onModeChange={setEditorMode}
            exerciseFullNames={exerciseFullNames}
            pickerData={pickerData}
            exerciseFor={exerciseFor}
            onEditReuse={onEditReuse}
            reuseCandidates={reuseCandidates}
            validateText={validateText}
            onBeforeChangeExercise={onBeforeChangeExercise}
            onBeforeApply={onBeforeApply}
            onDone={onDone}
          />
        </CustomKeyboardProvider>
      </TransparentModal>
    </SheetScreenContainer>
  );
}
