import { JSX, useCallback, useEffect, useRef, useState } from "react";
import { NativeSyntheticEvent, StyleProp, ViewStyle } from "react-native";
import LiftoEditorNative, { Commands } from "../../specs/LiftoEditorNativeComponent";
import { ILiftoEditorHandle, LiftoEditorBrain_computeStyledRanges } from "./liftoEditorBrain";

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

export interface ILiftoEditorProps {
  initialText: string;
  style?: StyleProp<ViewStyle>;
  autoHeight?: boolean;
  handleRef?: React.MutableRefObject<ILiftoEditorHandle | undefined>;
  onTextChange?: (text: string) => void;
  onSelectionChange?: (start: number, end: number) => void;
}

export function LiftoEditor(props: ILiftoEditorProps): JSX.Element {
  const nativeRef = useRef<React.ElementRef<typeof LiftoEditorNative>>(null);
  const textRef = useRef(props.initialText);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
  const { onTextChange, onSelectionChange, autoHeight, handleRef } = props;

  const pushStyledRanges = useCallback(() => {
    if (nativeRef.current != null) {
      Commands.setStyledRanges(
        nativeRef.current,
        JSON.stringify(LiftoEditorBrain_computeStyledRanges(textRef.current))
      );
    }
  }, []);

  useEffect(() => {
    pushStyledRanges();
  }, [pushStyledRanges]);

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
      pushStyledRanges();
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
      style={[props.style, autoHeight && contentHeight != null ? { height: contentHeight } : null]}
      initialText={props.initialText}
      onTextDelta={handleTextDelta}
      onEditorSelectionChange={handleSelectionChange}
      onEditorContentSizeChange={autoHeight ? (event) => setContentHeight(event.nativeEvent.height) : undefined}
    />
  );
}
