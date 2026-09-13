import { JSX, useEffect, useMemo, useRef, useState } from "react";
import { StackActions, useNavigation, useRoute } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { ILiftoEditorExercisePickerModalData, useModal } from "../ModalStateContext";
import {
  IEvaluatedProgram,
  Program_evaluate,
  Program_findPlannerExercise,
  Program_getAllProgramExercises,
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
  ProgramExerciseSwap_scope,
  IProgramExerciseSwapScope,
} from "../../models/programExerciseSwap";
import { Progress_getCurrentProgress } from "../../models/progress";
import {
  ExerciseLiftoEditorDraft_create,
  ExerciseLiftoEditorDraft_fromEditor,
  ExerciseLiftoEditorDraft_isDirty,
  ExerciseLiftoEditorDraft_mountText,
  IExerciseLiftoEditorDraft,
} from "../../models/exerciseLiftoEditorDraft";
import {
  ExerciseDraftToProgram_analyze,
  ExerciseDraftToProgram_apply,
  ExerciseDraftToProgram_snapshot,
  ExerciseDraftToProgram_writePreview,
  IExerciseDraftToProgramOptions,
} from "../../models/exerciseDraftToProgram";
import {
  ExerciseLiftoEditorSave_decide,
  ExerciseLiftoEditorSave_lenses,
  ExerciseLiftoEditorSave_withScope,
} from "../../models/exerciseLiftoEditorSave";
import {
  IProgramExerciseSharedSection,
  ProgramExerciseText_blurb,
  ProgramExerciseText_sharedSections,
  ProgramExerciseText_split,
} from "../../models/programExerciseText";
import type { IPlannerProgramExercise } from "../../pages/planner/models/types";
import { LiftoEditorFocusProvider } from "../../components/liftoEditorFocus";
import { updateState } from "../../models/state";
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
  // the editor's text, which lives in editRef and is spliced in at save. Re-evaluating is
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
  const editTarget = useMemo(
    () =>
      exerciseKey != null && params != null ? { exerciseKey, day: params.dayData.day, selectedDayData } : undefined,
    [exerciseKey, params, selectedDayData]
  );
  const snapshot = useMemo(
    () =>
      program != null && editTarget != null
        ? ExerciseDraftToProgram_snapshot(program, editTarget, settings)
        : undefined,
    [program, editTarget, settings]
  );
  const instances = snapshot?.instances ?? [];
  const activeDayData = selectedDayData ?? snapshot?.declarationDayData;
  const currentExercise = snapshot?.currentExercise;
  const currentDeclaration = snapshot?.declaration;
  const sharedSections = snapshot?.sharedSections ?? [];
  const currentBlurbText = snapshot?.blurb ?? "";
  const blurbTextFor = (declaration: IPlannerProgramExercise | undefined): string =>
    program != null && declaration != null ? ProgramExerciseText_blurb(program.planner, declaration) : "";

  // A ref written synchronously by every edit, so Save reads what a flushed panel write produced
  // in the same call, without waiting for the render that carries it into `program`.
  const editRef = useRef<{ draft: IExerciseLiftoEditorDraft; pendingPlanner: IPlannerProgram | undefined }>({
    draft: ExerciseLiftoEditorDraft_create(currentBlurbText, sharedSections),
    pendingPlanner: undefined,
  });
  const setPending = (planner: IPlannerProgram | undefined): void => {
    editRef.current.pendingPlanner = planner;
    setPendingPlanner(planner);
  };
  const onDraftText = (text: string): void => {
    editRef.current.draft = ExerciseLiftoEditorDraft_fromEditor(editRef.current.draft, text);
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
    setBodyText(ExerciseLiftoEditorDraft_mountText(editRef.current.draft, isVisible));
    setRemountKey((key) => key + 1);
  };

  // Freeform drops the sections out of the text itself; what the user did to them is already in
  // the draft, so only visibility changes here.
  const onSharedHidden = (localBlurb: string): void => {
    setIsSharedVisible(false);
    setBodyText(localBlurb);
  };

  // The body asks; the sheet answers, because only the sheet knows what is pending — the body's
  // mounted text is recomposed by the shared-sections toggle and stops tracking "changed".
  const onSelectInstance = async (instance: IExerciseLiftoEditorSheetInstanceOption): Promise<void> => {
    if (isDirty() && !(await Dialog_confirm("Discard unsaved changes to this exercise?"))) {
      return;
    }
    setPending(undefined);
    const next = instances.find(
      (e) => e.dayData.week === instance.dayData.week && e.dayData.dayInWeek === instance.dayData.dayInWeek
    );
    // Resolved here rather than read from the memo: that still describes the instance being
    // left, and the draft's baseline has to be the one it will be compared against.
    const nextShared =
      evaluatedProgram != null && next != null ? ProgramExerciseText_sharedSections(evaluatedProgram, next) : [];
    editRef.current.draft = ExerciseLiftoEditorDraft_create(blurbTextFor(next), nextShared);
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
    editRef.current.draft = ExerciseLiftoEditorDraft_create(currentBlurbText, sharedSections);
    setBodyText(undefined);
    setIsSharedVisible(false);
    setRemountKey((key) => key + 1);
  }, [currentDeclaration, sharedSections]);

  // The key the fold resolved to, held until the sheet actually comes back with a result: cancel
  // the modal and nothing was folded, so the sheet is still on the key it had.
  const foldedKeyRef = useRef<string | undefined>(undefined);
  const openAcrossProgram = useModal("acrossProgramModal", (planner) => {
    setPending(planner);
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
    if (params == null || snapshot == null) {
      return;
    }
    // A pending rename is folded in along with everything else, and folding it means choosing how
    // far it reaches. The fold defaults that to "all" — harmless where its planner is thrown
    // away, but here it is kept, so an unsaved one-day rename would quietly become a program-wide
    // one. Same question the save asks, asked before the fold rather than after it.
    const swap = detectSwap(editRef.current.draft.localBlurb.trim(), snapshot.declaration);
    if (swap != null && (await requestSwapScope(swap.isLadder)) == null) {
      return;
    }
    const folded = ExerciseDraftToProgram_apply(
      snapshot,
      editRef.current.draft,
      editRef.current.draft.localBlurb,
      foldOptions()
    );
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
      exerciseFullName ?? snapshot.currentExercise.fullName
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
  const askSwapScope = async (declarations: number): Promise<IProgramExerciseSwapScope | undefined> => {
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
  const requestSwapScope = async (isLadder: boolean): Promise<IProgramExerciseSwapScope | undefined> => {
    const declarations = Math.max(instances.length, 1);
    const scope = ProgramExerciseSwap_scope(isLadder, declarations, swapScopeRef.current);
    return scope === "ask" ? askSwapScope(declarations) : scope;
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
    const { localBlurb } = ProgramExerciseText_split(text.trim(), sharedSections);
    const swap = detectSwap(localBlurb.trim(), currentDeclaration);
    if (swap == null) {
      return true;
    }
    return (await requestSwapScope(swap.isLadder)) != null;
  };

  // The label notice comes last so it does not compete with the remap confirmation for the screen.
  const onDone = async (newText: string): Promise<void> => {
    onDraftText(newText);
    if (params == null) {
      onClose();
      return;
    }
    // From the edit ref, not the render's memo: a panel write flushed by this same Save is in the
    // ref already and reaches `program` only on the next render.
    const liveProgram =
      resolved?.planner != null
        ? { ...resolved, planner: editRef.current.pendingPlanner ?? resolved.planner }
        : undefined;
    let decision = ExerciseLiftoEditorSave_decide({
      program: liveProgram,
      target: editTarget,
      draft: editRef.current.draft,
      hasPendingPlanner: editRef.current.pendingPlanner != null,
      isFromWorkout,
      hasEditorDraft: liveProgram != null && state.editProgramStates[liveProgram.id] != null,
      progress: Progress_getCurrentProgress(state),
      cachedScope: swapScopeRef.current,
      settings,
      detectSwap,
    });
    if (decision.kind === "askScope") {
      const scope = await askSwapScope(decision.declarations);
      if (scope == null) {
        return;
      }
      decision = ExerciseLiftoEditorSave_withScope(decision.prepared, scope);
    }
    if (decision.kind === "close") {
      onClose();
      return;
    }
    if (decision.kind === "alert") {
      Dialog_alert(decision.message);
      if (decision.closes) {
        onClose();
      }
      return;
    }
    const plan = decision.plan;
    const remapAccepted =
      plan.remap != null && (!plan.remap.needsConfirmation || (await Dialog_confirm(plan.remap.question)));
    updateState(dispatch, ExerciseLiftoEditorSave_lenses(plan, remapAccepted), plan.description);
    if (plan.labelNotice != null) {
      Dialog_alert(plan.labelNotice);
    }
    onClose();
  };

  const foldOptions = (): IExerciseDraftToProgramOptions => ({
    swapScope: swapScopeRef.current ?? "all",
    detectSwap,
  });

  const analyzeText = (newText: string, options: { withPreview: boolean }): IExerciseLiftoEditorSheetAnalysis =>
    ExerciseDraftToProgram_analyze(snapshot, editRef.current.draft, newText, foldOptions(), options.withPreview);

  const applyPreview = (panelText: string): { blurb: string } | { error: IExerciseLiftoEditorSheetLiveError } => {
    if (snapshot == null) {
      return { error: { message: "There's nothing to write here yet." } };
    }
    const written = ExerciseDraftToProgram_writePreview(snapshot, editRef.current.draft, panelText, foldOptions());
    if ("error" in written) {
      return written;
    }
    // Removing an inherited value writes a program equal to the current one, and that is not
    // unsaved work.
    if (!written.unchanged) {
      editRef.current.draft = written.draft;
      setPending(written.planner);
      setIsSharedVisible(false);
      setBodyText(written.blurb);
    }
    return { blurb: written.blurb };
  };

  // The local line only: shared sections are noise most of the time, so the body splices them
  // in on request rather than the sheet opening with them.
  // bodyText is whatever the shared-sections toggle last composed; without it, the plain local
  // line. Either way it is exactly what the body is mounted with, so it doubles as the baseline
  // the close guard compares the draft against.
  // Never a stand-in for a declaration that couldn't be found — that case doesn't reach the editor
  // at all now (see the guard below the hooks); blurbTextFor's "" only keeps it total.
  const initialText = bodyText ?? currentBlurbText;
  // A pending whole-program rewrite counts: it is unsaved work even when the line on screen is
  // back to matching the program, which is exactly what re-projecting leaves behind. Without it
  // Done would take the "nothing changed" exit and drop the rewrite on the floor.
  const panelPendingRef = useRef(false);
  const isDirty = (): boolean =>
    ExerciseLiftoEditorDraft_isDirty(editRef.current.draft) ||
    editRef.current.pendingPlanner != null ||
    panelPendingRef.current;
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
          <LiftoEditorFocusProvider>
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
              applyPreview={applyPreview}
              onPanelPendingChange={(isPending) => {
                panelPendingRef.current = isPending;
              }}
              onBeforeChangeExercise={onBeforeChangeExercise}
              onBeforeApply={onBeforeApply}
              onDone={onDone}
            />
          </LiftoEditorFocusProvider>
        </CustomKeyboardProvider>
      </TransparentModal>
    </SheetScreenContainer>
  );
}
