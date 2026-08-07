import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { NativeSyntheticEvent, StyleProp, ViewStyle } from "react-native";
import LiftoEditorNative, { Commands } from "../../specs/LiftoEditorNativeComponent";
import { useRem } from "../../utils/useRem";
import {
  ILiftoEditorHandle,
  ILiftoEditorStyledRange,
  LiftoEditorBrain_computeStyledRanges,
  LiftoEditorBrain_flattenRanges,
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
  handleRef?: React.MutableRefObject<ILiftoEditorHandle | undefined>;
  onTextChange?: (text: string) => void;
  onTap?: (index: number) => void;
}

export interface ILiftoEditorProps extends ILiftoEditorBaseProps {
  style?: StyleProp<ViewStyle>;
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
  const { onTextChange, onSelectionChange, onTap, autoHeight, handleRef, extraStyledRanges } = props;
  const extraStyledRangesRef = useRef(extraStyledRanges);
  extraStyledRangesRef.current = extraStyledRanges;

  const pushStyledRanges = useCallback(() => {
    if (nativeRef.current != null) {
      const ranges = LiftoEditorBrain_flattenRanges([
        ...LiftoEditorBrain_computeStyledRanges(predictedTextRef.current ?? textRef.current),
        ...(extraStyledRangesRef.current ?? []),
      ]);
      Commands.setStyledRanges(nativeRef.current, JSON.stringify(ranges));
    }
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
          pushStyledRanges();
        }
      },
      getText: () => textRef.current,
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
      }
      if (predictedTextRef.current != null) {
        if (predictedTextRef.current === textRef.current) {
          // Prediction confirmed; its ranges were already pushed alongside the replace.
          predictedTextRef.current = undefined;
        }
        // Otherwise this is an intermediate delta of a multi-event replace (Android emits
        // delete+insert); hold pushes until the mirror catches up.
      } else {
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
      onTextDelta={handleTextDelta}
      onEditorSelectionChange={handleSelectionChange}
      onEditorContentSizeChange={autoHeight ? (event) => setContentHeight(event.nativeEvent.height) : undefined}
      onEditorTap={onTap != null ? (event) => onTap(event.nativeEvent.index) : undefined}
    />
  );
}
