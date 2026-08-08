import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { NativeSyntheticEvent, StyleProp, ViewStyle } from "react-native";
import LiftoEditorNative, { Commands } from "../../specs/LiftoEditorNativeComponent";
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
}

export interface ILiftoEditorProps extends ILiftoEditorBaseProps {
  style?: StyleProp<ViewStyle>;
  // Numbering restarts per editor, so this only reads as the document's own numbering where
  // the document is a whole day.
  showLineNumbers?: boolean;
  onSelectionChange?: (start: number, end: number) => void;
}

export function LiftoEditor(props: ILiftoEditorProps): JSX.Element {
  const nativeRef = useRef<React.ElementRef<typeof LiftoEditorNative>>(null);
  // The editor's base font is 16pt at the default rem, so the current rem value IS the
  // scaled font size — this is what makes the editor follow the Appearance size slider.
  const fontSize = useRem();
  const textRef = useRef(props.initialText);
  // Set on programmatic replaceRange: the post-edit text, known before the native TextDelta
  // round trip. Pushing ranges computed from it in the same command batch as the replace
  // (and never from the then-stale mirror) is what prevents a one-frame highlight flash.
  const predictedTextRef = useRef<string | undefined>(undefined);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
  const { onTextChange, onSelectionChange, onTap, onCaretRect, autoHeight, handleRef, extraStyledRanges, parseCache } =
    props;
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
    />
  );
}
