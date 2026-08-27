import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { StackActions, useNavigation, useRoute } from "@react-navigation/native";
import { lb } from "lens-shmens";
import { useAppState } from "../StateContext";
import { ILiftoEditorExercisePickerModalData, useModal } from "../ModalStateContext";
import {
  IEvaluatedProgram,
  Program_evaluate,
  Program_findPlannerExercise,
  Program_getAllProgramExercises,
  Program_getProgramExercise,
} from "../../models/program";
import { ILiftoEditorReuseCandidates, LiftoEditorReuse_candidates } from "../../components/liftoEditorReuse";
import {
  ILiftoEditorStateVarsContext,
  LiftoEditorStateVars_contextFor,
} from "../../components/primitives/liftoEditorStateVars";
import type {
  ILiftoEditorAcrossField,
  ILiftoEditorStateVarsTarget,
} from "../../components/primitives/liftoEditorActions";
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
import {
  ExerciseLiftoEditorDraft_create,
  ExerciseLiftoEditorDraft_fromEditor,
  ExerciseLiftoEditorDraft_isDirty,
  ExerciseLiftoEditorDraft_mountText,
  ExerciseLiftoEditorDraft_pendingChange,
} from "../../models/exerciseLiftoEditorDraft";
import {
  IProgramExerciseSharedSection,
  ProgramExerciseText_apply,
  ProgramExerciseText_findDeclaration,
  ProgramExerciseText_sharedSections,
  ProgramExerciseText_split,
} from "../../models/programExerciseText";
import type { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { ProgramExercisePreview_materialize } from "../../models/programExercisePreview";
import { IState, updateState } from "../../models/state";
import { CollectionUtils_setBy } from "../../utils/collection";
import { Dialog_alert, Dialog_choice, Dialog_confirm } from "../../utils/dialog";
import type { IDayData, IPlannerProgram, IProgram } from "../../types";
import type { IRootStackParamList } from "../types";
import { Platform, View } from "react-native";
import { Text } from "../../components/primitives/text";
import { LiftoEditorHints_gestures } from "../../components/primitives/liftoEditorHints";
import { SheetScreenContainer } from "../SheetScreenContainer";
import { TransparentModal } from "../TransparentModal";
import { CustomKeyboardProvider } from "../CustomKeyboardContext";
import { LiftoEditorSheetProgram_resolve } from "./liftoEditorSheetProgram";
import { ExerciseLiftoEditorSheet } from "./ExerciseLiftoEditorSheet";
import type {
  IExerciseLiftoEditorSheetAnalysis,
  IExerciseLiftoEditorSheetInstanceOption,
  IExerciseLiftoEditorSheetLiveError,
  IExerciseLiftoEditorSheetSharedProperty,
} from "./exerciseLiftoEditorSheetTypes";

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

// The sheet shows these sections, but they're written on another day's line and govern every
// week — without saying so, editing one looks like a change to just this day. Abbreviated
// rather than instanceLabel's form: the caption is a one-line aside and the instance chips
// already spell out custom week/day names.
function sharedProperties(shared: IProgramExerciseSharedSection[]): IExerciseLiftoEditorSheetSharedProperty[] {
  return shared.map((s) => ({
    property: s.property,
    text: s.text,
    ownerLabel: `W${s.owners[0].dayData.week} · D${s.owners[0].dayData.dayInWeek}`,
    ownerDayData: s.owners[0].dayData,
  }));
}

export function NavModalExerciseLiftoEditor(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "exerciseLiftoEditorModal";
    params: IRootStackParamList["exerciseLiftoEditorModal"];
  }>();
  const params = route.params;
  const { state, dispatch } = useAppState();
  const isFromWorkout = params?.fromWorkout ?? true;
  const settings = state.storage.settings;
  // The program this sheet edits against, read live rather than snapshotted. Everything below
  // derives from this one value, so the declaration a splice targets and the planner it splices
  // into are always the same version — and a program that moves underneath, whether a stacked
  // sheet saving it or a sync landing, is seen straight away instead of at the next save.
  //
  // The sheet holds no copy of it because it has nothing to hold: the only pending edit here is
  // the editor's text, which lives in textDraftRef and is spliced in at save. Re-evaluating is
  // kept off unrelated re-renders by the memo below, which is what the snapshot this replaced
  // was really for.
  const resolved = params != null ? LiftoEditorSheetProgram_resolve(state, params.programId, isFromWorkout) : undefined;
  // A whole-program rewrite that hasn't been saved yet. It can't wait in the editor's text the
  // way an ordinary edit does — it reaches lines this sheet isn't showing — so it waits here,
  // and Done writes it while closing without saving drops it. Set only by the across-program
  // sheet; undefined the rest of the time, which is what keeps the program read live.
  const [pendingPlanner, setPendingPlanner] = useState<IPlannerProgram | undefined>(undefined);
  // Memoized rather than rebuilt per render: the narrowing spread would otherwise be a new
  // object every time and re-evaluate the whole program on every unrelated re-render.
  const program = useMemo((): (IProgram & { planner: IPlannerProgram }) | undefined => {
    if (resolved?.planner == null) {
      return undefined;
    }
    return { ...resolved, planner: pendingPlanner ?? resolved.planner };
  }, [resolved, pendingPlanner]);
  // Which exercise this sheet is on. Not `params.key` — that is the key it opened with, and a
  // rename folded into a whole-program edit moves it. Everything below resolves through this, so
  // when the key moves the sheet follows instead of losing track of its own exercise.
  const [exerciseKey, setExerciseKey] = useState(params?.key);
  const [selectedDayData, setSelectedDayData] = useState<Required<IDayData> | undefined>(undefined);
  const [editorMode, setEditorMode] = useState<"structured" | "freeform">("structured");
  const [isSharedVisible, setIsSharedVisible] = useState(false);
  // Set by the shared-sections toggle; the body remounts on it and takes it as its initialText.
  const [bodyText, setBodyText] = useState<string | undefined>(undefined);
  // Only the explicit toggle remounts. Freeform hides the sections in place, and remounting
  // there would drop the user back into structured mode mid-edit.
  const [remountKey, setRemountKey] = useState(0);

  const evaluatedProgram = useMemo(
    () => (program != null ? Program_evaluate(program, settings) : undefined),
    [program, settings]
  );
  const programExercise =
    evaluatedProgram != null && params != null
      ? Program_getProgramExercise(params.dayData.day, evaluatedProgram, exerciseKey)
      : undefined;
  // One entry per declaration: repeat instances share the declaration's text, so a chip per
  // repeated week would be several ways to edit the same source line.
  const instances = useMemo(
    () =>
      evaluatedProgram != null && exerciseKey != null
        ? Program_getAllProgramExercises(evaluatedProgram).filter((e) => e.key === exerciseKey && !e.isRepeat)
        : [],
    [evaluatedProgram, exerciseKey]
  );
  // Until an instance chip is pressed, the sheet is on the declaration — which is not
  // necessarily the day that was tapped, since a repeat instance carries another week's text.
  const declarationDayData =
    evaluatedProgram != null && programExercise != null
      ? ProgramExerciseText_findDeclaration(evaluatedProgram, programExercise).dayData
      : undefined;
  const activeDayData = selectedDayData ?? declarationDayData;
  // No falling back to another declaration when this one can't be found. The body still shows
  // the text of the instance that was picked, and writing it onto a different declaration of the
  // same exercise would be a silent edit to a day the user isn't looking at.
  const currentExercise =
    activeDayData != null
      ? instances.find((e) => e.dayData.week === activeDayData.week && e.dayData.dayInWeek === activeDayData.dayInWeek)
      : undefined;
  const currentDeclaration =
    evaluatedProgram != null && currentExercise != null
      ? ProgramExerciseText_findDeclaration(evaluatedProgram, currentExercise)
      : undefined;
  // Parses every sibling declaration of this exercise, so it's kept off re-renders that don't
  // change which instance is selected.
  const sharedSections = useMemo(
    () =>
      evaluatedProgram != null && currentDeclaration != null
        ? ProgramExerciseText_sharedSections(evaluatedProgram, currentDeclaration)
        : [],
    [evaluatedProgram, currentDeclaration]
  );

  // What the editor holds, against the baselines it opened on. Distinct from the program draft
  // above: this one is the text of a single declaration and is folded into the program only at
  // save. In a ref rather than state because it changes on every keystroke and nothing in this
  // render depends on it.
  const textDraftRef = useRef(ExerciseLiftoEditorDraft_create(currentDeclaration?.text ?? "", sharedSections));
  const onDraftText = (text: string): void => {
    textDraftRef.current = ExerciseLiftoEditorDraft_fromEditor(textDraftRef.current, text);
  };
  // Set once a close is approved (or changes are saved), so the beforeRemove guard doesn't
  // re-prompt on the navigation pop that follows.
  const allowCloseRef = useRef(false);

  // Remount rather than edit-in-place: the body's editor asserts inside Runestone when a
  // multi-section suffix is spliced into a live document. Only the mounting text is recomputed —
  // the draft is the record of what changed and is left alone, so toggling can neither lose an
  // edit nor reset the dirty state.
  const onToggleShared = (): void => {
    const isVisible = !isSharedVisible;
    setIsSharedVisible(isVisible);
    setBodyText(ExerciseLiftoEditorDraft_mountText(textDraftRef.current, isVisible));
    setRemountKey((key) => key + 1);
  };

  // Freeform drops the sections out of the text itself; what the user did to them is already in
  // the draft, so only visibility changes here.
  const onSharedHidden = (localText: string): void => {
    setIsSharedVisible(false);
    setBodyText(localText);
  };

  // The body asks; the sheet answers, because only the sheet knows what is pending — the body's
  // mounted text is recomposed by the shared-sections toggle and stops tracking "changed".
  const onSelectInstance = async (instance: IExerciseLiftoEditorSheetInstanceOption): Promise<void> => {
    if (isDirty() && !(await Dialog_confirm("Discard unsaved changes to this exercise?"))) {
      return;
    }
    const next = instances.find(
      (e) => e.dayData.week === instance.dayData.week && e.dayData.dayInWeek === instance.dayData.dayInWeek
    );
    // Resolved here rather than read from the memo: that still describes the instance being
    // left, and the draft's baseline has to be the one it will be compared against.
    const nextShared =
      evaluatedProgram != null && next != null ? ProgramExerciseText_sharedSections(evaluatedProgram, next) : [];
    textDraftRef.current = ExerciseLiftoEditorDraft_create(next?.text ?? "", nextShared);
    setBodyText(undefined);
    setIsSharedVisible(false);
    setRemountKey((key) => key + 1);
    setSelectedDayData(instance.dayData);
  };

  // A whole-program rewrite normally rewrites the line on screen too — that is the point of
  // invoking it from this exercise's weight — so the editor is left showing text the program no
  // longer has, and its baselines describe a line that no longer exists. Re-projected on the
  // render after the rewrite lands, because the new line can only be read off the new program.
  //
  // Same four steps as switching instance: rebuild the record, drop the shared-section override,
  // remount so the editor picks the text up.
  const needsReprojectRef = useRef(false);
  useEffect(() => {
    if (!needsReprojectRef.current || currentDeclaration == null) {
      return;
    }
    needsReprojectRef.current = false;
    textDraftRef.current = ExerciseLiftoEditorDraft_create(currentDeclaration.text, sharedSections);
    setBodyText(undefined);
    setIsSharedVisible(false);
    setRemountKey((key) => key + 1);
  }, [currentDeclaration, sharedSections]);

  // The key the fold resolved to, held until the sheet actually comes back with a result: cancel
  // the modal and nothing was folded, so the sheet is still on the key it had.
  const foldedKeyRef = useRef<string | undefined>(undefined);
  const openAcrossProgram = useModal("acrossProgramModal", (planner) => {
    setPendingPlanner(planner);
    if (foldedKeyRef.current != null) {
      setExerciseKey(foldedKeyRef.current);
    }
    needsReprojectRef.current = true;
  });

  // Fold, then apply. The across-program sheet groups by value, so it has to be looking at what
  // is on screen — including edits not yet folded into the program. A line that doesn't parse
  // has nothing to fold, and applying on top of the last good version would silently drop the
  // typing, so it is refused with the error the banner is already showing.
  const onEditAcrossProgram = async (
    field: ILiftoEditorAcrossField,
    exerciseFullName: string | undefined
  ): Promise<void> => {
    if (params == null || currentExercise == null || currentDeclaration == null) {
      return;
    }
    // A pending rename is folded in along with everything else, and folding it means choosing how
    // far it reaches. `applyDraft` defaults that to "all" — harmless where its planner is thrown
    // away, but here it is kept, so an unsaved one-day rename would quietly become a program-wide
    // one. Same question the save asks, asked before the fold rather than after it.
    const swap = detectSwap(textDraftRef.current.localText.trim(), currentDeclaration);
    if (swap != null && (await requestSwapScope(swap.isLadder)) == null) {
      return;
    }
    const folded = applyDraft(textDraftRef.current.localText);
    if (folded == null || "error" in folded.applied) {
      Dialog_alert("Fix the error in this exercise first, then you can change it across the program.");
      return;
    }
    // Resolved from the folded planner, not from `params.key`: that is the key the sheet opened
    // on, and a rename folded in just now has already moved it. Looking the old one up would find
    // nothing, or — worse — a leftover declaration of the exercise that used to be here.
    const target = Program_findPlannerExercise(
      folded.applied.planner,
      settings,
      exerciseFullName ?? currentExercise.fullName
    );
    if (target == null) {
      Dialog_alert("Couldn't tell which exercise this is. Fix any errors on this line and try again.");
      return;
    }
    foldedKeyRef.current = target.key;
    openAcrossProgram({
      planner: folded.applied.planner,
      exerciseKey: target.key,
      exerciseFullName: target.fullName,
      field,
    });
  };

  // The sheet's own derived answers follow `program` on their own. The body does not: it holds
  // the editor session, and its last analysis was of a text that hasn't changed, so nothing
  // tells it to ask again when the program moves underneath — a stacked sheet saving this
  // exercise's reuse target, or a sync landing. This revision is that signal.
  const [analysisRevision, setAnalysisRevision] = useState(0);
  useEffect(() => {
    setAnalysisRevision((revision) => revision + 1);
  }, [program]);

  const onClose = (): void => {
    allowCloseRef.current = true;
    navigation.goBack();
  };

  // Pushes a second editor sheet for the reuse target on top of this one, so Done/close
  // pops back to the referring exercise.
  const onEditReuse = (targetName: string): void => {
    if (evaluatedProgram == null || params == null) {
      return;
    }
    const target = Program_getAllProgramExercises(evaluatedProgram).find(
      (e) => e.fullName === targetName || e.name === targetName || e.key === targetName
    );
    if (target == null) {
      Dialog_alert(`Couldn't find "${targetName}" in this program.`);
      return;
    }
    navigation.dispatch(
      StackActions.push("exerciseLiftoEditorModal", {
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
    const declarations = Math.max(instances.length, 1);
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
    if (currentDeclaration == null) {
      return true;
    }
    const { localText } = ProgramExerciseText_split(text.trim(), sharedSections);
    const swap = detectSwap(localText.trim(), currentDeclaration);
    if (swap == null) {
      return true;
    }
    return (await requestSwapScope(swap.isLadder)) != null;
  };

  const onDone = async (newText: string): Promise<void> => {
    onDraftText(newText);
    if (params == null || !isDirty()) {
      onClose();
      return;
    }
    // Guarded here rather than trusted from the render above: the program can be deleted, or
    // removed by a sync, between the sheet opening and Save, and writing this copy back would
    // recreate it. Checked before the exercise so a deleted program says so, rather than
    // reporting the exercise inside it as having moved.
    if (program == null) {
      Dialog_alert("Couldn't find this program anymore, so the changes weren't saved.");
      onClose();
      return;
    }
    // The declaration this sheet is on is no longer in the program — renamed, swapped or deleted
    // from somewhere else while the sheet was open. The sheet stays up rather than closing: there
    // is unsaved text on screen, and dismissing it is the one outcome that loses it for good.
    if (currentExercise == null) {
      Dialog_alert(
        "This exercise was changed somewhere else while you were editing it, so your changes weren't saved. Copy anything you want to keep, then close and reopen it."
      );
      return;
    }
    // Re-evaluated rather than reusing the render's memo: `currentExercise` may name a day the
    // program no longer has, and the save has to answer against what it is about to write.
    const saveEvaluatedProgram = Program_evaluate(program, settings);
    const saveExercise = Program_getProgramExercise(currentExercise.dayData.day, saveEvaluatedProgram, exerciseKey);
    const declaration =
      saveExercise != null ? ProgramExerciseText_findDeclaration(saveEvaluatedProgram, saveExercise) : undefined;
    if (declaration == null) {
      Dialog_alert("Couldn't find this exercise in the program anymore, so the changes weren't saved.");
      onClose();
      return;
    }
    // Shared sections are re-resolved against this evaluation too — a stacked sheet may have
    // moved which day declares one, and writing to the owner this sheet opened on would miss it.
    const freshShared = ProgramExerciseText_sharedSections(saveEvaluatedProgram, declaration);
    const pending = ExerciseLiftoEditorDraft_pendingChange(textDraftRef.current, freshShared);
    const localText = pending.localText.trim();
    if (localText === "") {
      Dialog_alert("The exercise text is empty. Delete the exercise from the program screen instead.");
      return;
    }
    const swap = detectSwap(localText, declaration);
    // Reachable when the name was changed on a surface with no Apply step (the web body), or
    // when the sheet was opened again on a text that already carries the change.
    const scope = swap != null ? await requestSwapScope(swap.isLadder) : "all";
    if (scope == null) {
      return;
    }
    const applied = ProgramExerciseText_apply(
      program.planner,
      declaration,
      localText,
      pending.sharedEdits,
      swap,
      scope,
      settings
    );
    if ("error" in applied) {
      Dialog_alert(applied.error.message);
      return;
    }
    const updatedProgram = { ...program, planner: applied.planner };
    const newKey =
      swap != null
        ? EditProgramUiHelpers_getChangedKeys(program.planner, applied.planner, settings)[declaration.key]
        : undefined;
    const updatedExercises =
      swap != null && newKey != null ? Program_getAllProgramExercises(Program_evaluate(updatedProgram, settings)) : [];
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
        Program_getAllProgramExercises(saveEvaluatedProgram),
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

  // Splices the editor's text into the program and evaluates. Both the planner and the
  // declaration it targets come from the same `program`, so the splice can't miss the way it did
  // when a declaration resolved on open was looked up in a planner re-read from state.
  //
  // The banner and the resolved preview are both questions about the program the save would
  // write, so neither builds its own version of it.
  const applyDraft = (
    newText: string
  ):
    | {
        program: IProgram & { planner: IPlannerProgram };
        swap: IProgramExerciseSwap | undefined;
        applied: ReturnType<typeof ProgramExerciseText_apply>;
      }
    | undefined => {
    const trimmed = newText.trim();
    if (program == null || currentDeclaration == null || trimmed === "") {
      return undefined;
    }
    // Through the same call the save uses, on a draft folded up to the live text: a shared
    // property edited and then hidden is still going to be written, so validation has to see it
    // even though it is no longer in the text on screen.
    const pending = ExerciseLiftoEditorDraft_pendingChange(
      ExerciseLiftoEditorDraft_fromEditor(textDraftRef.current, trimmed),
      sharedSections
    );
    const localText = pending.localText.trim();
    if (localText === "") {
      return undefined;
    }
    // Applied the same way it will be saved, including the swap — otherwise a changed
    // exercise name reports every `...reuse` aimed at the old one as broken, which the save
    // then goes on to rewrite.
    const swap = detectSwap(localText, currentDeclaration);
    return {
      program,
      swap,
      applied: ProgramExerciseText_apply(
        program.planner,
        currentDeclaration,
        localText,
        pending.sharedEdits,
        swap,
        swapScopeRef.current ?? "all",
        settings
      ),
    };
  };

  // The splice uses the trimmed text while the editor shows the untrimmed draft.
  const rebaseError = (
    error: IExerciseLiftoEditorSheetLiveError,
    newText: string
  ): IExerciseLiftoEditorSheetLiveError => {
    if (error.from == null || error.to == null) {
      return error;
    }
    const leading = newText.length - newText.trimStart().length;
    return { ...error, from: error.from + leading, to: error.to + leading };
  };

  // Everything a body asks about the draft, from one splice: the banner's error, and — when the
  // resolved panel is open — what the line actually fills in to, the reuse target's sets and the
  // progression declared three weeks away that the reader would otherwise have to combine by hand.
  const analyzeText = (newText: string, options: { withPreview: boolean }): IExerciseLiftoEditorSheetAnalysis => {
    const result = applyDraft(newText);
    if (result == null || currentDeclaration == null) {
      return { preview: options.withPreview ? { error: "There's nothing to resolve here yet." } : undefined };
    }
    const applied = result.applied;
    if ("error" in applied) {
      return {
        // notFound means the sheet lost track of the exercise, not that the user typed something
        // wrong — the banner stays quiet and the save re-resolves from scratch.
        error: applied.notFound ? undefined : rebaseError(applied.error, newText),
        preview: options.withPreview ? { error: applied.error.message } : undefined,
      };
    }
    if (!options.withPreview) {
      return {};
    }
    // A swap rewrites the exercise's key, so the preview has to look for what the exercise
    // became — same lookup the save does before it remaps logged sets.
    const newKey =
      result.swap != null
        ? EditProgramUiHelpers_getChangedKeys(result.program.planner, applied.planner, settings)[currentDeclaration.key]
        : undefined;
    const text = ProgramExercisePreview_materialize(
      result.program,
      applied.planner,
      currentDeclaration.dayData,
      newKey ?? currentDeclaration.key,
      settings
    );
    return { preview: text != null ? { text } : { error: "Couldn't resolve this exercise." } };
  };

  // The local line only: shared sections are noise most of the time, so the body splices them
  // in on request rather than the sheet opening with them.
  // bodyText is whatever the shared-sections toggle last composed; without it, the plain local
  // line. Either way it is exactly what the body is mounted with, so it doubles as the baseline
  // the close guard compares the draft against.
  // Never a stand-in for a declaration that couldn't be found — that case doesn't reach the editor
  // at all now (see the guard below the hooks). The `?? ""` only keeps the expression total.
  const initialText = bodyText ?? currentDeclaration?.text ?? "";
  // A pending whole-program rewrite counts: it is unsaved work even when the line on screen is
  // back to matching the program, which is exactly what re-projecting leaves behind. Without it
  // Done would take the "nothing changed" exit and drop the rewrite on the floor.
  const isDirty = (): boolean =>
    ExerciseLiftoEditorDraft_isDirty(textDraftRef.current) || pendingPlannerRef.current != null;
  const pendingPlannerRef = useRef(pendingPlanner);
  pendingPlannerRef.current = pendingPlanner;
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

  const dayData = activeDayData ?? params?.dayData;
  const headerLabel = dayData != null ? instanceLabel(evaluatedProgram, dayData) : "Week 1 · Day 1";
  const instanceOptions: IExerciseLiftoEditorSheetInstanceOption[] = instances.map((e) => ({
    dayData: e.dayData,
    label: instanceLabel(evaluatedProgram, e.dayData),
    isSelected: dayData != null && e.dayData.week === dayData.week && e.dayData.dayInWeek === dayData.dayInWeek,
  }));
  const exerciseFullNames =
    evaluatedProgram != null
      ? Array.from(new Set(Program_getAllProgramExercises(evaluatedProgram).map((e) => e.fullName)))
      : [];
  const reuseCandidates: ILiftoEditorReuseCandidates | undefined =
    evaluatedProgram != null && exerciseKey != null && currentExercise != null && dayData != null
      ? LiftoEditorReuse_candidates(exerciseKey, !!currentExercise.notused, evaluatedProgram, dayData)
      : undefined;
  // Resolved per press against the draft's program: the reuse target comes from the live text,
  // so it can name an exercise this declaration didn't reuse when the sheet opened.
  const stateVarsFor = (target: ILiftoEditorStateVarsTarget): ILiftoEditorStateVarsContext =>
    LiftoEditorStateVars_contextFor(
      target,
      currentExercise,
      evaluatedProgram != null ? Program_getAllProgramExercises(evaluatedProgram) : [],
      settings
    );
  const pickerData: ILiftoEditorExercisePickerModalData | undefined =
    evaluatedProgram != null && params != null && currentExercise != null && dayData != null
      ? {
          exerciseType: currentExercise.exerciseType,
          label: currentExercise.label,
          templateName: currentExercise.exerciseType == null ? currentExercise.name : undefined,
          evaluatedProgram,
          dayData,
          // This declaration's own slot doesn't conflict with itself, and the program still
          // holds whatever it had when the sheet opened — so without this, swapping away from
          // an exercise makes it impossible to swap back to.
          excludeUsedExerciseTypes: currentExercise.exerciseType != null ? [currentExercise.exerciseType] : undefined,
        }
      : undefined;

  // Nothing to edit, so nothing that looks like an editor. A lookup that fails here is always a bug
  // or a stale navigation — the key was renamed, the program moved underneath, the caller resolved
  // against the wrong copy — and the failure mode that matters is the plausible one: a sheet that
  // opens on *something* reads as the user's program until they notice it isn't. Both save paths
  // already refuse when this is null, so an editor here could only ever take input and drop it.
  if (currentDeclaration == null) {
    return (
      <SheetScreenContainer onClose={onClose} shouldShowClose={true}>
        <TransparentModal onClose={onClose} fitContent={true}>
          <View className="items-center px-6 py-8">
            <Text className="text-base font-bold text-center text-text-primary">
              Couldn't find this exercise in the program
            </Text>
            <Text className="mt-2 text-sm text-center text-text-secondary">
              It may have been renamed or removed since this screen was opened.
            </Text>
          </View>
        </TransparentModal>
      </SheetScreenContainer>
    );
  }

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
          <ExerciseLiftoEditorSheet
            // The controller reads initialText only once, so switching instance or revealing the
            // shared sections has to remount it. Keyed on nothing but the counter those two bump:
            // the day is derived from the program now, and a program rebased underneath must
            // never be able to remount the editor out from under what the user has typed.
            key={remountKey}
            initialText={initialText}
            headerLabel={headerLabel}
            instances={instanceOptions}
            sharedProperties={sharedProperties(sharedSections)}
            isSharedVisible={isSharedVisible}
            onToggleShared={onToggleShared}
            onSharedHidden={onSharedHidden}
            onSelectInstance={onSelectInstance}
            onTextChange={(text) => {
              onDraftText(text);
            }}
            onModeChange={setEditorMode}
            exerciseFullNames={exerciseFullNames}
            pickerData={pickerData}
            exerciseFor={exerciseFor}
            onEditReuse={onEditReuse}
            onEditAcrossProgram={onEditAcrossProgram}
            reuseCandidates={reuseCandidates}
            stateVarsFor={stateVarsFor}
            analyzeText={analyzeText}
            analysisRevision={analysisRevision}
            onBeforeChangeExercise={onBeforeChangeExercise}
            onBeforeApply={onBeforeApply}
            onDone={onDone}
          />
        </CustomKeyboardProvider>
      </TransparentModal>
    </SheetScreenContainer>
  );
}
