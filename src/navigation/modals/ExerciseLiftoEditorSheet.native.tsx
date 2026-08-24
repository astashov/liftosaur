import { JSX, useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { Directions, Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CollectionUtils_compact } from "../../utils/collection";
import type { IDayData } from "../../types";
import { useLiftoEditorModalActions } from "../../components/liftoEditorModalActions";
import { useCloseCustomKeyboard, useCustomKeyboardHeight } from "../CustomKeyboardContext";
import { LiftoEditor } from "../../components/primitives/liftoEditor";
import {
  ILiftoEditorStyledRange,
  LiftoEditorBrain_fadedRanges,
  LiftoEditorBrain_hasReuse,
} from "../../components/primitives/liftoEditorBrain";
import { useLiftoEditorController } from "../../components/liftoEditorController";
import { LiftoEditorHints_forContext } from "../../components/primitives/liftoEditorHints";
import {
  LiftoEditorCrumbs,
  LiftoEditorHintBar,
  LiftoEditorPillRail,
  useLiftoEditorHintDismissed,
} from "../../components/liftoEditorChrome";
import { Button } from "../../components/button";
import { Text } from "../../components/primitives/text";
import { FadeScrollView } from "../../components/fadeScrollView";
import { IconHelp } from "../../components/icons/iconHelp";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { useRem } from "../../utils/useRem";
import { useSystemKeyboardHeight } from "../../utils/useSystemKeyboardHeight";
import { ProgramExerciseText_sharedRanges } from "../../models/programExerciseText";
import { PlannerCodeBlock } from "../../pages/planner/components/plannerCodeBlock";
import {
  ExerciseLiftoEditorSheetTypes_sharedLabels,
  IExerciseLiftoEditorSheetProps,
  IExerciseLiftoEditorSheetInstanceOption,
  IExerciseLiftoEditorSheetLiveError,
  IExerciseLiftoEditorSheetPreview,
} from "./exerciseLiftoEditorSheetTypes";

// Legible as a secondary layer without dropping out of the line.
const SHARED_SECTION_ALPHA = "73";

export function ExerciseLiftoEditorSheet(props: IExerciseLiftoEditorSheetProps): JSX.Element {
  const propsRef = useRef(props);
  propsRef.current = props;
  const actions = useLiftoEditorModalActions({
    reuseSelectName: "exercise-liftoeditor-reuse",
    // The sheet edits one exercise, so its picker data and reuse candidates are precomputed
    // by the host. Which exercise is preselected still comes from the text, not from
    // props.pickerData: reopening the picker after a swap must show what the blurb says now,
    // and neither that nor the exercise the program still has here counts as "already used" —
    // both are this one slot.
    pickerDataFor: (exerciseFullName) => {
      const base = propsRef.current.pickerData ?? {};
      const identity = propsRef.current.exerciseFor?.(exerciseFullName);
      return {
        ...base,
        ...(identity ?? {}),
        excludeUsedExerciseTypes: CollectionUtils_compact([
          ...(base.excludeUsedExerciseTypes ?? []),
          identity?.exerciseType,
        ]),
      };
    },
    reuseCandidatesFor: () => propsRef.current.reuseCandidates ?? { sets: [], progress: [], update: [] },
    stateVarsContextFor: (target) => propsRef.current.stateVarsFor?.(target) ?? {},
    stateVarsExerciseTypeFor: (exerciseFullName) =>
      propsRef.current.exerciseFor?.(exerciseFullName)?.exerciseType ?? propsRef.current.pickerData?.exerciseType,
    onBeforeChangeExercise: props.onBeforeChangeExercise,
    onEditReuse: props.onEditReuse,
    onEditAcrossProgram: props.onEditAcrossProgram,
  });
  const sharedPropertyNames = (props.sharedProperties ?? []).map((s) => s.property);
  const controller = useLiftoEditorController(props.initialText, {
    exerciseType: props.pickerData?.exerciseType,
    // Adding a property another day already declares would either duplicate the declaration or,
    // once saved, silently rewrite that other day. `progress: none` survives because the
    // evaluator never registers it as shared — it's a genuine per-day override.
    mapPills: (pills) =>
      CollectionUtils_compact(
        pills.map((pill) => {
          // Add-pills carry their whole section including the separator (" / progress: lp(5lb)").
          const section = pill.text.trim().replace(/^\/\s*/, "");
          const property = sharedPropertyNames.find((name) => section.startsWith(`${name}:`));
          if (property == null) {
            return pill;
          }
          return property === "progress"
            ? { ...pill, label: "Add progress: none", text: " / progress: none" }
            : undefined;
        })
      ),
    // Follows the text, so plates and units track an exercise swapped mid-session instead of
    // the one the sheet opened on; falls back to the snapshot when the name doesn't resolve.
    exerciseTypeFor: (fullName) => props.exerciseFor?.(fullName)?.exerciseType,
    actions,
  });
  const [hintDismissed, setHintDismissed] = useLiftoEditorHintDismissed();
  const [liveError, setLiveError] = useState<IExerciseLiftoEditorSheetLiveError | undefined>(undefined);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] = useState<IExerciseLiftoEditorSheetPreview | undefined>(undefined);
  const analyzeTextRef = useRef(props.analyzeText);
  analyzeTextRef.current = props.analyzeText;
  const onTextChangeRef = useRef(props.onTextChange);
  onTextChangeRef.current = props.onTextChange;
  const liveErrorText = controller.text;
  useEffect(() => {
    onTextChangeRef.current?.(liveErrorText);
  }, [liveErrorText]);
  // The banner's error and the open panel's contents come out of one pass over the draft, so a
  // keystroke splices and evaluates the program once rather than once per question asked of it.
  // What that pass last covered is remembered, so opening the panel — which resolves straight
  // away, rather than leaving an empty box up for a third of a second — doesn't then repeat
  // itself when the debounce fires.
  //
  // The program is half of what a pass reads, so the host's revision is part of what identifies
  // one: an exercise this one resolves through can be edited and saved by a sheet stacked on top,
  // and neither this text nor the panel's own state moves when that happens.
  const analysisKey = (text: string, withPreview: boolean): string =>
    `${props.analysisRevision ?? 0}:${withPreview}:${text}`;
  const analyzedRef = useRef<string | undefined>(undefined);
  const analyze = (text: string, withPreview: boolean): void => {
    analyzedRef.current = analysisKey(text, withPreview);
    const analysis = analyzeTextRef.current?.(text, { withPreview }) ?? {};
    setLiveError(analysis.error);
    if (withPreview) {
      setPreview(analysis.preview);
    }
  };
  // Debounced: it evaluates the whole program, too heavy per keystroke.
  const pendingAnalysisKey = analysisKey(liveErrorText, isPreviewing);
  useEffect(() => {
    if (analyzedRef.current === pendingAnalysisKey) {
      return;
    }
    const timer = setTimeout(() => analyze(liveErrorText, isPreviewing), 300);
    return () => clearTimeout(timer);
  }, [pendingAnalysisKey]);
  const togglePreview = (): void => {
    const next = !isPreviewing;
    setIsPreviewing(next);
    if (next) {
      analyze(controller.text, true);
    } else {
      // Closing asks nothing new — the banner already reflects this text.
      analyzedRef.current = analysisKey(controller.text, false);
      setPreview(undefined);
    }
  };
  // Faded rather than tinted: both editor background slots are already affordances (gray is
  // the focused level, purple the active token), so a wash here reads as selection.
  //
  // Recomputed from the live text rather than tracked as an edit-shifted range: the sections
  // move as the user types either side of them, and re-finding them by property name is what
  // the save path does too.
  const sharedProperties = props.sharedProperties ?? [];
  // Owned by the host: toggling remounts this body with the recomposed text, because splicing
  // a multi-section suffix into the live document trips a Runestone line-fragment assertion.
  const showShared = props.isSharedVisible ?? false;
  const sharedRanges =
    showShared && controller.mode !== "freeform" && sharedProperties.length > 0
      ? ProgramExerciseText_sharedRanges(
          controller.text,
          sharedProperties.map((s) => s.property)
        )
      : [];
  const parseCache = controller.editorProps.parseCache;
  const sharedStyledRanges: ILiftoEditorStyledRange[] =
    sharedRanges.length > 0 && parseCache != null
      ? LiftoEditorBrain_fadedRanges(
          parseCache,
          controller.text,
          sharedRanges,
          Tailwind_semantic().text.primary,
          SHARED_SECTION_ALPHA
        )
      : [];
  // Only offered where there is something to fill in. Read from the live text rather than the
  // exercise the sheet opened on, so removing the last reuse takes the affordance with it, and
  // adding one brings it back.
  const hasReuse =
    props.analyzeText != null && parseCache != null && LiftoEditorBrain_hasReuse(parseCache, controller.text);
  // The panel's subject is gone, and with the icon gone there'd be nothing left to close it.
  useEffect(() => {
    if (!hasReuse) {
      setIsPreviewing(false);
      setPreview(undefined);
    }
  }, [hasReuse]);
  const activeLevel = controller.context?.levels[controller.activeLevelIndex];
  const isFocusInsideShared =
    activeLevel != null && sharedRanges.some((r) => activeLevel.start >= r.start && activeLevel.end <= r.end);
  // Clamp against the current text: between debounce ticks the error range can be stale.
  const errorStyledRanges: ILiftoEditorStyledRange[] = [];
  if (liveError?.from != null && liveError.to != null && liveError.from < controller.text.length) {
    errorStyledRanges.push({
      start: liveError.from,
      end: Math.min(Math.max(liveError.to, liveError.from + 1), controller.text.length),
      backgroundColor: `${Tailwind_semantic().text.error}26`,
    });
  }
  const hint = LiftoEditorHints_forContext(controller.context, controller.activeLevelIndex, controller.text);
  const accent = Tailwind_semantic().text.purple;
  const iconScale = useRem() / 16;
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const systemKeyboardHeight = useSystemKeyboardHeight();
  const keypadHeight = useCustomKeyboardHeight();
  const closeKeyboard = useCloseCustomKeyboard();
  const isFreeform = controller.mode === "freeform";
  const onModeChangeRef = useRef(props.onModeChange);
  onModeChangeRef.current = props.onModeChange;
  useEffect(() => {
    onModeChangeRef.current?.(isFreeform ? "freeform" : "structured");
  }, [isFreeform]);
  // Freeform retypes the line as raw text, so the sections belonging to another day come out
  // first. Deleted in place rather than through the toggle: that remounts, which would land the
  // user back in structured mode. Deletions are safe where the toggle's insertion is not — the
  // Runestone assertion is about fragments a large insertion hasn't laid out yet.
  const hideSharedRef = useRef<() => void>(() => undefined);
  hideSharedRef.current = () => {
    const ranges = ProgramExerciseText_sharedRanges(
      controller.text,
      sharedProperties.map((s) => s.property)
    ).sort((a, b) => b.start - a.start);
    if (ranges.length === 0) {
      return;
    }
    let localText = controller.text;
    for (const range of ranges) {
      controller.editorProps.handleRef?.current?.replaceRange(range.start, range.end, "");
      localText = localText.slice(0, range.start) + localText.slice(range.end);
    }
    props.onSharedHidden?.(localText.trimEnd());
  };
  useEffect(() => {
    if (isFreeform) {
      hideSharedRef.current();
    }
  }, [isFreeform]);
  const railRef = useRef<ScrollView>(null);
  // Only on the initial layout: the body remounts on instance switch, and reacting to later
  // re-layouts would yank the rail away from wherever the user scrolled it.
  const hasAutoScrolledRail = useRef(false);
  const scrollSelectedIntoView = (event: LayoutChangeEvent): void => {
    if (hasAutoScrolledRail.current) {
      return;
    }
    hasAutoScrolledRail.current = true;
    const x = event.nativeEvent.layout.x;
    requestAnimationFrame(() => railRef.current?.scrollTo({ x: Math.max(0, x - 24), animated: false }));
  };

  // Freeform can rename the exercise into a different one by typing, which is the same
  // program-level change the pill makes — so Apply is where that gets noticed.
  const applyFreeform = async (): Promise<void> => {
    if (props.onBeforeApply != null && !(await props.onBeforeApply(controller.text))) {
      return;
    }
    controller.switchToStructured();
  };

  // Whether switching would discard anything is the sheet's call — this body only knows the
  // text it happens to have mounted, and the shared-sections toggle recomposes that from a
  // possibly-dirty draft.
  const selectInstance = (instance: IExerciseLiftoEditorSheetInstanceOption): void => {
    if (instance.isSelected) {
      return;
    }
    // The keypad host lives outside this component; switching remounts the body and would
    // otherwise leave an orphaned keypad open. Closed before asking, so a declined switch
    // leaves it closed rather than orphaned.
    closeKeyboard();
    props.onSelectInstance(instance);
  };

  // The declaring day is always one of the instances, so the caption's link is the same switch
  // the chips make — discard guard included.
  const selectInstanceAt = (dayData: Required<IDayData>): void => {
    const instance = props.instances.find(
      (i) => i.dayData.week === dayData.week && i.dayData.dayInWeek === dayData.dayInWeek
    );
    if (instance != null) {
      selectInstance(instance);
    }
  };

  // When the whole text fits, lock the editor's vertical scroll so token-hopping swipes
  // don't also drag the content around.
  const [editorScroll, setEditorScroll] = useState({ container: 0, content: 0 });
  const isEditorScrollable = editorScroll.content > editorScroll.container + 1;

  // Horizontal swipes anywhere over the editor hop between tokens (swipe right = next).
  // Flings don't fire on taps or vertical scrolls, so those pass through untouched; in
  // freeform mode the swipes are off to not fight native text selection.
  const walkFling = Gesture.Race(
    Gesture.Fling()
      .direction(Directions.RIGHT)
      .enabled(!isFreeform)
      .runOnJS(true)
      .onStart(() => controller.walkFocus(1)),
    Gesture.Fling()
      .direction(Directions.LEFT)
      .enabled(!isFreeform)
      .runOnJS(true)
      .onStart(() => controller.walkFocus(-1))
  );

  return (
    // Auto-height: the sheet hugs the content; the nested fit-content keyboard host adds
    // inline space below when the keypad opens, growing the sheet. The cap keeps the whole
    // sheet (including the docked keypad, which renders below this view) within the screen —
    // past it, the editor is the part that shrinks and scrolls. The system-keyboard spacer
    // lives inside this view, so it needs no subtraction here.
    <View style={{ maxHeight: Math.max(windowHeight * 0.25, windowHeight * 0.9 - keypadHeight - insets.bottom) }}>
      <View style={{ flexShrink: 1 }}>
        <View className="flex-row items-center gap-2 px-4 pb-2 border-b border-border-neutral">
          <View className="flex-1">
            {props.instances.length > 1 ? (
              <FadeScrollView className="mb-1" contentClassName="gap-1" scrollRef={railRef}>
                {props.instances.map((instance) => (
                  <Pressable
                    key={`${instance.dayData.week}-${instance.dayData.dayInWeek}`}
                    testID={`exercise-liftoeditor-instance-${instance.dayData.week}-${instance.dayData.dayInWeek}`}
                    onLayout={instance.isSelected ? scrollSelectedIntoView : undefined}
                    className={`px-2 py-0.5 rounded border ${
                      instance.isSelected
                        ? "bg-background-default border-button-primarybackground"
                        : "bg-background-subtle border-background-subtle"
                    }`}
                    onPress={() => selectInstance(instance)}
                  >
                    <Text
                      className="text-xs font-bold text-text-secondary"
                      style={instance.isSelected ? { color: accent } : undefined}
                    >
                      {instance.label}
                    </Text>
                  </Pressable>
                ))}
              </FadeScrollView>
            ) : (
              <Text className="text-xs font-bold text-text-secondary">{props.headerLabel}</Text>
            )}
            {isFreeform ? (
              <Text className="text-sm text-text-secondary">Editing as text</Text>
            ) : (
              <LiftoEditorCrumbs controller={controller} />
            )}
          </View>
          {!isFreeform && hint != null && hintDismissed ? (
            <Pressable testID="exercise-liftoeditor-show-hint" className="p-1" onPress={() => setHintDismissed(false)}>
              <IconHelp size={20 * iconScale} color={Tailwind_semantic().icon.neutral} />
            </Pressable>
          ) : null}
          {/* Freeform "Apply" folds the text edits back into structured mode (the sheet stays
              open); structured "Save" commits to the program and closes. */}
          <Button
            name="exercise-liftoeditor-save"
            kind="purple"
            buttonSize="sm"
            className="text-xs"
            onPress={isFreeform ? applyFreeform : () => props.onDone(controller.text)}
          >
            {isFreeform ? "Apply" : "Save"}
          </Button>
        </View>
        {/* On a line that reuses something, rendered before anything is focused too, unlike the
            other hosts: filling the reuse in lives in this rail, and "what does ...t3 even mean"
            is a question the sheet gets asked on the way in, before the first token is tapped. */}
        {!isFreeform && (hasReuse || (controller.context?.levels ?? []).length > 0) ? (
          <LiftoEditorPillRail
            controller={controller}
            className="border-b border-border-neutral"
            // Removing one here would remove it from every week; the declaring day is where that
            // belongs, and the caption links straight to it.
            canRemove={!isFocusInsideShared}
            onPreview={hasReuse ? togglePreview : undefined}
            isPreviewing={isPreviewing}
          />
        ) : null}
        {liveError != null ? (
          <View className="px-3 py-2 border-b bg-background-lighterror border-border-neutral">
            <Text className="text-xs font-semibold text-text-error">{liveError.message}</Text>
          </View>
        ) : null}
        {!isFreeform && hint != null && !hintDismissed ? (
          <LiftoEditorHintBar hint={hint} onDismiss={() => setHintDismissed(true)} />
        ) : null}
        <GestureDetector gesture={walkFling}>
          <ScrollView
            style={{ flexShrink: 1 }}
            scrollEnabled={isEditorScrollable}
            onLayout={(e) => {
              const height = e.nativeEvent.layout.height;
              setEditorScroll((prev) => (prev.container === height ? prev : { ...prev, container: height }));
            }}
            onContentSizeChange={(_w, height) =>
              setEditorScroll((prev) => (prev.content === height ? prev : { ...prev, content: height }))
            }
          >
            <View className="px-gutter py-3">
              <LiftoEditor
                {...controller.editorProps}
                // Room for Android's cursor drop handle under the last line (~24dp, not
                // rem-scaled — the handle is a fixed-size system graphic).
                bottomPadding={isFreeform ? 24 : 0}
                // Shared fade goes first so the focus and error highlights, which are later
                // inputs, win the flatten where they overlap it.
                extraStyledRanges={[
                  ...sharedStyledRanges,
                  ...(controller.editorProps.extraStyledRanges ?? []),
                  ...errorStyledRanges,
                ]}
              />
              {/* Below the text rather than in place of it: the point is the comparison — the
                  line as written above, what it resolves to here. */}
              {isPreviewing ? (
                <View testID="exercise-liftoeditor-preview" className="p-2 mt-3 rounded-lg bg-background-subtle">
                  <Text className="pb-1 text-xs font-bold text-text-secondary">With reuses filled in:</Text>
                  {preview != null && "text" in preview ? (
                    // Wrapped, not side-scrolled: this panel sits inside the editor's own
                    // scroller, and the horizontal swipe over it hops tokens.
                    <PlannerCodeBlock script={preview.text} className="text-xs" wrap={true} />
                  ) : (
                    <Text className="text-xs text-text-secondary">
                      {preview?.error || "Can't resolve this exercise right now."}
                    </Text>
                  )}
                </View>
              ) : null}
              {/* Same register as the sheet's gesture hint below it: a centered aside about the
                  text rather than chrome pointing into it. */}
              {sharedProperties.length > 0 ? (
                <View testID="exercise-liftoeditor-shared-caption" className="pt-2">
                  {ExerciseLiftoEditorSheetTypes_sharedLabels(sharedProperties).map((label) => (
                    <Text key={label.ownerLabel} className="text-xs text-center text-text-secondary">
                      {`${label.properties.join(", ")} defined at `}
                      <Text
                        className="text-xs underline text-text-link"
                        testID={`exercise-liftoeditor-shared-owner-${label.ownerDayData.week}-${label.ownerDayData.dayInWeek}`}
                        onPress={() => selectInstanceAt(label.ownerDayData)}
                      >
                        {label.ownerLabel}
                      </Text>
                    </Text>
                  ))}
                  {/* Freeform is raw text editing — restructuring the document under the user
                      mid-edit isn't something to offer there, and the fade is off too. */}
                  {!isFreeform ? (
                    <Text
                      className="text-xs underline text-center text-text-link"
                      testID="exercise-liftoeditor-shared-toggle"
                      onPress={() => props.onToggleShared?.()}
                    >
                      {showShared ? "Hide here" : "Show here"}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          </ScrollView>
        </GestureDetector>
        {/* iOS reports the raw IME height, which overlaps the home-indicator area the sheet
            already pads for — subtract it. Android's ReactRootView already subtracts the
            system bars from the reported height (imeInsets - systemBars), so subtracting
            insets.bottom again would leave a keyboard-topper-sized strip covered. The extra
            1rem keeps the last text line from sitting flush against the IME. */}
        {systemKeyboardHeight > 0 ? (
          <View
            style={{
              height: Math.max(0, systemKeyboardHeight - (Platform.OS === "ios" ? insets.bottom : 0)) + 16 * iconScale,
            }}
          />
        ) : null}
      </View>
    </View>
  );
}
