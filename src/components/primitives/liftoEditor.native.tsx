import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { NativeSyntheticEvent, StyleProp, ViewStyle } from "react-native";
import LiftoEditorNative, { Commands } from "../../specs/LiftoEditorNativeComponent";
import { Tailwind_semantic } from "../../utils/tailwindConfig";
import { useRem } from "../../utils/useRem";
import {
  ILiftoEditorHandle,
  ILiftoEditorStyledRange,
  LiftoEditorBrain_computeStyledRanges,
  LiftoEditorBrain_diffStyledRanges,
  LiftoEditorBrain_flattenRanges,
  LiftoEditorBrain_shiftStyledRanges,
  LiftoEditorParseCache,
} from "./liftoEditorBrain";

interface ITextDeltaEvent {
  start: number;
  end: number;
  insertedText: string;
  textLength: number;
}

interface ISelectionChangeEvent {
  start: number;
  end: number;
}

interface ICaretRectEvent {
  top: number;
  bottom: number;
}

interface IRangeRectsEvent {
  rects: string;
}

// The controller-driven surface: everything useLiftoEditorController produces as editorProps.
// Host surfaces layer presentation concerns (style, selection callbacks) on top via
// ILiftoEditorProps.
export interface ILiftoEditorBaseProps {
  initialText: string;
  autoHeight?: boolean;
  editable?: boolean;
  // Extra empty space below the last line, INSIDE the editor view (autoHeight only).
  // Android's sora draws the cursor drop handle on the editor canvas, so it clips at the
  // view's bottom edge unless the view extends past the text.
  bottomPadding?: number;
  extraStyledRanges?: ILiftoEditorStyledRange[];
  // The controller's session cache. Highlighting runs on predicted text (one edit ahead of
  // the session), so sharing it means that parse warms the tree the session then reads.
  // Standalone hosts without a controller get their own.
  parseCache?: LiftoEditorParseCache;
  handleRef?: React.MutableRefObject<ILiftoEditorHandle | undefined>;
  onTextChange?: (text: string) => void;
  onTap?: (index: number) => void;
  // Answer to handle.requestCaretRect: the range's vertical extent (dp) inside the editor.
  onCaretRect?: (rect: { top: number; bottom: number }) => void;
  // Answer to handle.requestRangeRects, in the order the ranges were asked for. `left` is the
  // start of the text column, past the gutter.
  onRangeRects?: (rects: { top: number; bottom: number; left: number }[]) => void;
}

export interface ILiftoEditorProps extends ILiftoEditorBaseProps {
  style?: StyleProp<ViewStyle>;
  // Defaults to the rem, which is what makes the editor follow the Appearance size slider;
  // pass a value only to hold a different ratio to it (see liftoEditorMetrics).
  fontSize?: number;
  // Numbering restarts per editor, so this only reads as the document's own numbering where
  // the document is a whole day.
  showLineNumbers?: boolean;
  onSelectionChange?: (start: number, end: number) => void;
}

// Same picks as the web editor's dark chrome in editorWebview.css, expressed semantically so
// light mode comes out of the same call. The editor view itself stays transparent and the
// gutter keeps its theme-independent tint, so neither has a color here.
// `selection` is the one translucent token: iOS draws the selection with UIKit's own
// UITextSelectionView, which Runestone re-adds ABOVE the text, so an opaque color hides the
// selected glyphs (Android's sora paints it behind them and wouldn't care).
// `background` is what the editor sits on, not what it paints: Android's selection magnifier
// snapshots the editor on its own (white) canvas, so it needs to be told the ground color.
// Every host puts the editor on background.default. iOS ignores it.
function editorColors(): string {
  return JSON.stringify({
    text: Tailwind_semantic().text.primary,
    selection: Tailwind_semantic().background.editorselection,
    caret: Tailwind_semantic().text.primary,
    handle: Tailwind_semantic().icon.purple,
    lineNumber: Tailwind_semantic().text.secondary,
    background: Tailwind_semantic().background.default,
  });
}

export function LiftoEditor(props: ILiftoEditorProps): JSX.Element {
  const nativeRef = useRef<React.ElementRef<typeof LiftoEditorNative>>(null);
  // The editor's base font is 16pt at the default rem, so the current rem value IS the
  // scaled font size — this is what makes the editor follow the Appearance size slider.
  const rem = useRem();
  const fontSize = props.fontSize ?? rem;
  const textRef = useRef(props.initialText);
  // Set on programmatic replaceRange: the post-edit text, known before the native TextDelta
  // round trip. Pushing ranges computed from it in the same command batch as the replace
  // (and never from the then-stale mirror) is what prevents a one-frame highlight flash.
  const predictedTextRef = useRef<string | undefined>(undefined);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
  const {
    onTextChange,
    onSelectionChange,
    onTap,
    onCaretRect,
    onRangeRects,
    autoHeight,
    handleRef,
    extraStyledRanges,
    parseCache,
  } = props;
  const extraStyledRangesRef = useRef(extraStyledRanges);
  extraStyledRangesRef.current = extraStyledRanges;
  const ownCacheRef = useRef<LiftoEditorParseCache | undefined>(undefined);
  if (parseCache == null && ownCacheRef.current == null) {
    ownCacheRef.current = new LiftoEditorParseCache();
  }
  const cacheRef = useRef<LiftoEditorParseCache | undefined>(undefined);
  cacheRef.current = parseCache ?? ownCacheRef.current;
  // Mirror of the ranges the native store currently holds: last push, shifted through
  // subsequent edits with the same algorithm the native side uses. undefined = never
  // pushed (or desynced) — the next push sends the full set.
  const rangesMirrorRef = useRef<ILiftoEditorStyledRange[] | undefined>(undefined);
  const pendingEditedSpanRef = useRef<{ start: number; end: number } | undefined>(undefined);

  const pushStyledRanges = useCallback(() => {
    const cache = cacheRef.current;
    if (nativeRef.current == null || cache == null) {
      return;
    }
    const next = LiftoEditorBrain_flattenRanges([
      ...LiftoEditorBrain_computeStyledRanges(cache, predictedTextRef.current ?? textRef.current),
      ...(extraStyledRangesRef.current ?? []),
    ]);
    const previous = rangesMirrorRef.current;
    const editedSpan = pendingEditedSpanRef.current;
    pendingEditedSpanRef.current = undefined;
    const diff = previous != null ? LiftoEditorBrain_diffStyledRanges(previous, next, editedSpan) : "full";
    if (diff === "full") {
      Commands.setStyledRanges(nativeRef.current, JSON.stringify(next));
    } else if (diff !== "unchanged") {
      Commands.patchStyledRanges(nativeRef.current, diff.start, diff.end, JSON.stringify(diff.ranges));
    }
    rangesMirrorRef.current = next;
  }, []);

  useEffect(() => {
    pushStyledRanges();
  }, [pushStyledRanges]);

  const extraStyledRangesKey = JSON.stringify(extraStyledRanges ?? []);
  useEffect(() => {
    pushStyledRanges();
  }, [extraStyledRangesKey, pushStyledRanges]);

  useEffect(() => {
    if (handleRef == null) {
      return;
    }
    handleRef.current = {
      setSelection: (start, end) => {
        if (nativeRef.current != null) {
          Commands.setSelection(nativeRef.current, start, end);
        }
      },
      replaceRange: (start, end, text) => {
        if (nativeRef.current != null) {
          Commands.replaceRange(nativeRef.current, start, end, text);
          const base = predictedTextRef.current ?? textRef.current;
          predictedTextRef.current = base.slice(0, start) + text + base.slice(end);
          // The native store shifts itself when the replace lands (before this queued push
          // is processed), so the mirror must shift too for the diff to line up. The edited
          // span is forced into the patch window because Android applies the replace as
          // delete+insert, whose composed shift can drop ranges this one-shot shift keeps.
          if (rangesMirrorRef.current != null) {
            rangesMirrorRef.current = LiftoEditorBrain_shiftStyledRanges(
              rangesMirrorRef.current,
              start,
              end,
              text.length
            );
          }
          pendingEditedSpanRef.current = { start, end: start + text.length };
          pushStyledRanges();
        }
      },
      getText: () => textRef.current,
      requestCaretRect: (start, end) => {
        if (nativeRef.current != null) {
          Commands.requestCaretRect(nativeRef.current, start, end);
        }
      },
      requestRangeRects: (ranges) => {
        if (nativeRef.current != null) {
          Commands.requestRangeRects(nativeRef.current, JSON.stringify(ranges));
        }
      },
    };
    return () => {
      handleRef.current = undefined;
    };
  }, [handleRef]);

  const handleTextDelta = useCallback(
    (event: NativeSyntheticEvent<ITextDeltaEvent>) => {
      const { start, end, insertedText, textLength } = event.nativeEvent;
      const text = textRef.current;
      textRef.current = text.slice(0, start) + insertedText + text.slice(end);
      if (textRef.current.length !== textLength) {
        console.warn("LiftoEditor mirror desync", { mirror: textRef.current.length, native: textLength });
        // The ranges mirror is derived from the same event stream, so it can't be trusted
        // either — drop it and let the next push resend the full set.
        rangesMirrorRef.current = undefined;
      }
      if (predictedTextRef.current != null) {
        if (predictedTextRef.current === textRef.current) {
          // Prediction confirmed; its ranges (and the mirror shift) were already applied
          // alongside the replace.
          predictedTextRef.current = undefined;
        }
        // Otherwise this is an intermediate delta of a multi-event replace (Android emits
        // delete+insert); hold pushes until the mirror catches up.
      } else {
        if (rangesMirrorRef.current != null) {
          rangesMirrorRef.current = LiftoEditorBrain_shiftStyledRanges(
            rangesMirrorRef.current,
            start,
            end,
            insertedText.length
          );
        }
        pushStyledRanges();
      }
      onTextChange?.(textRef.current);
    },
    [pushStyledRanges, onTextChange]
  );

  const handleSelectionChange = useCallback(
    (event: NativeSyntheticEvent<ISelectionChangeEvent>) => {
      onSelectionChange?.(event.nativeEvent.start, event.nativeEvent.end);
    },
    [onSelectionChange]
  );

  return (
    <LiftoEditorNative
      ref={nativeRef}
      style={[
        props.style,
        autoHeight && contentHeight != null ? { height: contentHeight + (props.bottomPadding ?? 0) } : null,
      ]}
      initialText={props.initialText}
      fontSize={fontSize}
      editable={props.editable ?? true}
      showLineNumbers={props.showLineNumbers ?? false}
      colors={editorColors()}
      onTextDelta={handleTextDelta}
      onEditorSelectionChange={handleSelectionChange}
      onEditorContentSizeChange={autoHeight ? (event) => setContentHeight(event.nativeEvent.height) : undefined}
      onEditorTap={onTap != null ? (event) => onTap(event.nativeEvent.index) : undefined}
      onEditorCaretRect={
        onCaretRect != null
          ? (event: NativeSyntheticEvent<ICaretRectEvent>) =>
              onCaretRect({ top: event.nativeEvent.top, bottom: event.nativeEvent.bottom })
          : undefined
      }
      onEditorRangeRects={
        onRangeRects != null
          ? (event: NativeSyntheticEvent<IRangeRectsEvent>) => {
              const rects = JSON.parse(event.nativeEvent.rects);
              if (Array.isArray(rects)) {
                onRangeRects(rects);
              }
            }
          : undefined
      }
    />
  );
}
