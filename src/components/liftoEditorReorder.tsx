import { JSX, MutableRefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { PlannerCodeBlock } from "../pages/planner/components/plannerCodeBlock";
import { NavScreenScrollContext } from "../navigation/NavScreenScrollContext";
import { Tailwind_semantic } from "../utils/tailwindConfig";
import {
  ILiftoEditorBlock,
  ILiftoEditorHandle,
  ILiftoEditorStyledRange,
  LiftoEditorBrain_dropIndex,
  LiftoEditorBrain_exerciseBlocks,
  LiftoEditorBrain_fadedRanges,
  LiftoEditorBrain_reorderEdit,
  LiftoEditorParseCache,
} from "./primitives/liftoEditorBrain";

const HAPTIC_OPTIONS = { enableVibrateFallback: false, ignoreAndroidSystemSettings: false };
// Long enough that a scroll flick or a token tap never lifts an exercise by accident, short
// enough that a deliberate press-and-hold doesn't feel unresponsive.
const dragActivationMs = 280;
// How close to the edge of the visible scroll area the finger has to get before the page
// starts following it, and how fast it may run.
const autoScrollZone = 56;
const autoScrollMaxStep = 14;
const autoScrollIntervalMs = 16;
// The text under the ghost keeps its syntax colors at this alpha, so the hole the exercise
// left still reads as the line it came from.
const sourceAlpha = "40";
const maxMeasuredBlocks = 200;

interface IRect {
  top: number;
  bottom: number;
}

// Where the text column starts is the editor's business (gutter width, insets), so the ghost
// asks for it rather than guessing.
interface IRangeRect extends IRect {
  left: number;
}

interface IDragState {
  fromIndex: number;
  targetIndex: number;
  height: number;
  left: number;
  text: string;
  block: ILiftoEditorBlock;
}

export interface ILiftoEditorReorderOptions {
  text: string;
  // The editor's own cache and handle when it has them (it always does under a controller);
  // without them there is nothing to measure and no way to edit, and dragging stays inert.
  parseCache?: LiftoEditorParseCache;
  handleRef?: MutableRefObject<ILiftoEditorHandle | undefined>;
  isEnabled: boolean;
  // Every offset in the document is about to move, so whatever the focus was anchored to is
  // gone with it.
  onBeforeReorder: () => void;
}

export interface ILiftoEditorReorder {
  gesture: ReturnType<typeof Gesture.Pan>;
  // Marks the exercise being dragged as lifted out of the text.
  styledRanges: ILiftoEditorStyledRange[];
  // Absolutely positioned; belongs inside the same box the gesture is attached to, since both
  // work in that box's coordinates.
  overlay: JSX.Element | undefined;
  onRangeRects: (rects: IRangeRect[]) => void;
  remeasure: () => void;
}

// Drag-to-reorder for the exercises of one editor document. The editor is a single native
// text view with no per-exercise views to drag, so this works off the geometry the native
// side can answer for a character range: exercise extents come from the tree, their vertical
// rects from requestRangeRects, and the drop is one splice through the normal edit path.
export function useLiftoEditorReorder(options: ILiftoEditorReorderOptions): ILiftoEditorReorder {
  const scrollCtx = useContext(NavScreenScrollContext);
  const { handleRef, isEnabled } = options;
  const textRef = useRef(options.text);
  textRef.current = options.text;
  const ownCacheRef = useRef(new LiftoEditorParseCache());
  const cacheRef = useRef(options.parseCache ?? ownCacheRef.current);
  cacheRef.current = options.parseCache ?? ownCacheRef.current;
  const onBeforeReorderRef = useRef(options.onBeforeReorder);
  onBeforeReorderRef.current = options.onBeforeReorder;

  // What the rects belong to: the blocks are re-derived when the rects are requested, and only
  // adopted when the answer comes back, so the two can never describe different documents.
  const blocksRef = useRef<ILiftoEditorBlock[]>([]);
  const requestedBlocksRef = useRef<ILiftoEditorBlock[]>([]);
  const rectsRef = useRef<IRangeRect[]>([]);

  const [drag, setDrag] = useState<IDragState | undefined>(undefined);
  const dragRef = useRef<IDragState | undefined>(undefined);
  const ghostTop = useSharedValue(0);
  const grabOffsetRef = useRef(0);
  // The last position the gesture reported, and the scroll offset it was reported at. While
  // the page auto-scrolls under a still finger no new gesture events arrive, so the finger's
  // position in the document is the reported one plus however far the page has travelled since.
  const lastEventYRef = useRef(0);
  const scrollAtEventRef = useRef(0);
  const absoluteYRef = useRef(0);
  const viewportBoundsRef = useRef<IRect | undefined>(undefined);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  // Where auto-scroll has asked the page to be. The gesture owns the touch for the whole drag,
  // so this is the only thing moving the page — and it's exact, where scrollYRef trails the
  // scroll it reports by a frame or two, which the eye reads as the ghost sliding off the finger.
  const autoScrollTargetRef = useRef<number | undefined>(undefined);
  const maxScrollRef = useRef(0);

  useEffect(() => {
    return scrollCtx?.addScrollListener((e) => {
      maxScrollRef.current = Math.max(0, e.nativeEvent.contentSize.height - e.nativeEvent.layoutMeasurement.height);
    });
  }, [scrollCtx]);

  const scrollY = useCallback(() => autoScrollTargetRef.current ?? scrollCtx?.scrollYRef.current ?? 0, [scrollCtx]);

  const remeasure = useCallback(() => {
    const handle = handleRef?.current;
    if (handle == null) {
      return;
    }
    const blocks = LiftoEditorBrain_exerciseBlocks(cacheRef.current, textRef.current);
    // Measuring means a layout query per exercise on the native side, on every edit. A day
    // never comes close to this; a whole-program document can, and there dragging one exercise
    // across dozens of screens isn't the way to move it anyway.
    if (blocks.length > maxMeasuredBlocks) {
      requestedBlocksRef.current = [];
      blocksRef.current = [];
      rectsRef.current = [];
      return;
    }
    requestedBlocksRef.current = blocks;
    handle.requestRangeRects(blocks.map((block) => ({ start: block.start, end: block.end })));
  }, [handleRef]);

  const onRangeRects = useCallback((rects: IRangeRect[]) => {
    blocksRef.current = requestedBlocksRef.current;
    rectsRef.current = rects;
  }, []);

  // Wrapping decides where every line ends, so the rects only survive as long as the text and
  // the width do. Debounced because the answer is only needed by the time a press-and-hold
  // completes, and typing would otherwise ask on every keystroke.
  const text = options.text;
  useEffect(() => {
    const timer = setTimeout(remeasure, 200);
    return () => clearTimeout(timer);
  }, [text, remeasure]);

  const applyPosition = useCallback(() => {
    const state = dragRef.current;
    const rects = rectsRef.current;
    if (state == null || rects.length === 0) {
      return;
    }
    const y = lastEventYRef.current + (scrollY() - scrollAtEventRef.current);
    const first = rects[0];
    const last = rects[rects.length - 1];
    const top = Math.min(
      Math.max(y - grabOffsetRef.current, first.top),
      Math.max(first.top, last.bottom - state.height)
    );
    ghostTop.value = top;
    const target = LiftoEditorBrain_dropIndex(rects, state.fromIndex, top, state.height);
    if (target !== state.targetIndex) {
      dragRef.current = { ...state, targetIndex: target };
      setDrag(dragRef.current);
      ReactNativeHapticFeedback.trigger("impactLight", HAPTIC_OPTIONS);
    }
  }, [ghostTop, scrollY]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current != null) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = undefined;
    }
  }, []);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();
    autoScrollRef.current = setInterval(() => {
      const bounds = viewportBoundsRef.current;
      const scrollNode = scrollCtx?.scrollRef.current;
      if (dragRef.current == null || bounds == null || scrollNode == null) {
        return;
      }
      const y = absoluteYRef.current;
      const overTop = bounds.top + autoScrollZone - y;
      const overBottom = y - (bounds.bottom - autoScrollZone);
      const depth = overTop > 0 ? -overTop : overBottom > 0 ? overBottom : 0;
      if (depth === 0) {
        return;
      }
      const step =
        Math.sign(depth) * Math.min(autoScrollMaxStep, (Math.abs(depth) / autoScrollZone) * autoScrollMaxStep);
      const next = Math.min(Math.max(0, scrollY() + step), maxScrollRef.current);
      if (next === scrollY()) {
        return;
      }
      autoScrollTargetRef.current = next;
      scrollNode.scrollTo({ y: next, animated: false });
      applyPosition();
    }, autoScrollIntervalMs);
  }, [applyPosition, scrollCtx, scrollY, stopAutoScroll]);

  const beginDrag = useCallback(
    (y: number) => {
      const blocks = blocksRef.current;
      const rects = rectsRef.current;
      if (blocks.length < 2 || rects.length !== blocks.length) {
        return;
      }
      const index = rects.findIndex((rect) => y >= rect.top && y <= rect.bottom);
      if (index === -1) {
        return;
      }
      const block = blocks[index];
      const rect = rects[index];
      grabOffsetRef.current = y - rect.top;
      lastEventYRef.current = y;
      autoScrollTargetRef.current = undefined;
      scrollAtEventRef.current = scrollY();
      ghostTop.value = rect.top;
      const next: IDragState = {
        fromIndex: index,
        targetIndex: index,
        height: rect.bottom - rect.top,
        left: rect.left,
        text: textRef.current.slice(block.start, block.end),
        block,
      };
      dragRef.current = next;
      setDrag(next);
      scrollCtx?.viewportRef.current?.measureInWindow((_x, top, _width, height) => {
        viewportBoundsRef.current = {
          top: top + (scrollCtx?.stickyHeaderHeight ?? 0),
          bottom: top + height - (scrollCtx?.footerHeight ?? 0),
        };
      });
      startAutoScroll();
      ReactNativeHapticFeedback.trigger("impactMedium", HAPTIC_OPTIONS);
    },
    [ghostTop, scrollCtx, scrollY, startAutoScroll]
  );

  const finishDrag = useCallback(
    (isApplied: boolean) => {
      const state = dragRef.current;
      if (state == null) {
        return;
      }
      stopAutoScroll();
      autoScrollTargetRef.current = undefined;
      dragRef.current = undefined;
      setDrag(undefined);
      if (!isApplied || state.targetIndex === state.fromIndex) {
        return;
      }
      const edit = LiftoEditorBrain_reorderEdit(cacheRef.current, textRef.current, state.fromIndex, state.targetIndex);
      if (edit == null) {
        return;
      }
      onBeforeReorderRef.current();
      handleRef?.current?.replaceRange(edit.start, edit.end, edit.text);
      ReactNativeHapticFeedback.trigger("impactMedium", HAPTIC_OPTIONS);
    },
    [handleRef, stopAutoScroll]
  );

  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isEnabled)
        .activateAfterLongPress(dragActivationMs)
        // Everything a drag does — parse, splice, haptics — is JS work anyway, and the ghost
        // rides a shared value, so there is nothing left for the UI thread to run.
        .runOnJS(true)
        // The rects have to be in hand by the time the press completes, and a press is the one
        // moment we know the geometry is about to matter.
        .onBegin(() => remeasure())
        .onStart((e) => {
          absoluteYRef.current = e.absoluteY;
          beginDrag(e.y);
        })
        .onUpdate((e) => {
          absoluteYRef.current = e.absoluteY;
          // The reported y already accounts for however far auto-scroll has moved the page,
          // so the running scroll delta restarts from here.
          lastEventYRef.current = e.y;
          scrollAtEventRef.current = scrollY();
          applyPosition();
        })
        .onEnd(() => finishDrag(true))
        .onFinalize(() => finishDrag(false)),
    [isEnabled, remeasure, beginDrag, applyPosition, finishDrag, scrollY]
  );

  const styledRanges = useMemo(() => {
    if (drag == null) {
      return [];
    }
    const span = { start: drag.block.start, end: drag.block.end };
    return [
      { ...span, backgroundColor: Tailwind_semantic().background.editorfocus },
      ...LiftoEditorBrain_fadedRanges(
        cacheRef.current,
        textRef.current,
        [span],
        Tailwind_semantic().text.primary,
        sourceAlpha
      ),
    ];
  }, [drag]);

  const ghostStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ghostTop.value }] }));
  const rects = rectsRef.current;
  const targetRect = drag != null && drag.targetIndex !== drag.fromIndex ? rects[drag.targetIndex] : undefined;
  const indicatorY =
    targetRect == null || drag == null
      ? undefined
      : drag.targetIndex > drag.fromIndex
        ? targetRect.bottom
        : targetRect.top;

  const overlay =
    drag == null ? undefined : (
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Left-aligned with the text column rather than the view: the ghost is the same
            glyphs the editor draws, so covering the gutter would misplace them by its width
            and wrap them differently than the line it came from. */}
        {/* Translucent so the lines it passes over stay readable — where it lands is decided by
            what's underneath it. */}
        <Animated.View style={[{ position: "absolute", top: 0, left: drag.left, right: 0, opacity: 0.8 }, ghostStyle]}>
          <View
            className="rounded-lg border shadow-lg"
            style={{
              backgroundColor: Tailwind_semantic().background.default,
              borderColor: Tailwind_semantic().border.purple,
            }}
          >
            <PlannerCodeBlock script={drag.text} wrap={true} />
          </View>
        </Animated.View>
        {/* Over the ghost: dragging upwards puts the two in the same place, and the line is the
            half that answers where this lands. */}
        {indicatorY != null && (
          <View
            style={{
              position: "absolute",
              left: drag?.left ?? 0,
              right: 0,
              top: indicatorY - 1,
              height: 2,
              borderRadius: 1,
              backgroundColor: Tailwind_semantic().icon.purple,
            }}
          />
        )}
      </View>
    );

  return { gesture, styledRanges, overlay, onRangeRects, remeasure };
}
