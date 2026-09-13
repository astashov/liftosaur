import { JSX, useEffect, useRef } from "react";
import { View } from "react-native";
import { LiftoEditor } from "../../components/primitives/liftoEditor";
import { useLiftoEditorController } from "../../components/liftoEditorController";
import { useLiftoEditorFocusClaim } from "../../components/liftoEditorFocus";
import { IExerciseType } from "../../types";

export function ExerciseLiftoEditorPreview(props: {
  text: string;
  exerciseType: IExerciseType | undefined;
  fontSize: number;
  initialHeight: number | undefined;
  onHeight: (height: number) => void;
  onTextChange: (text: string, isKeypadActive: boolean) => void;
}): JSX.Element {
  const controller = useLiftoEditorController(props.text, { scope: "preview", exerciseType: props.exerciseType });
  useLiftoEditorFocusClaim("preview", controller);
  const onTextChangeRef = useRef(props.onTextChange);
  onTextChangeRef.current = props.onTextChange;
  const reportedTextRef = useRef(props.text);
  const text = controller.text;
  const isKeypadActive = controller.isKeypadActive;
  useEffect(() => {
    if (text !== reportedTextRef.current) {
      reportedTextRef.current = text;
      onTextChangeRef.current(text, isKeypadActive);
    }
  }, [text, isKeypadActive]);
  return (
    <View onLayout={(event) => props.onHeight(event.nativeEvent.layout.height)}>
      <LiftoEditor {...controller.editorProps} fontSize={props.fontSize} initialContentHeight={props.initialHeight} />
    </View>
  );
}
