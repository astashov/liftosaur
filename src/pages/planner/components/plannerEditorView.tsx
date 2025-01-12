import { JSX, useRef } from "react";
import { View } from "react-native";
import WebView from "react-native-webview";
import { PlannerSyntaxError } from "../plannerExerciseEvaluator";
import { IAllCustomExercises } from "../../../types";

interface IProps {
  name: string;
  onChange?: (newValue: string) => void;
  onLineChange?: (newValue: number) => void;
  onBlur?: (event: FocusEvent, newValue: string) => void;
  error?: PlannerSyntaxError;
  lineNumbers?: boolean;
  onCustomErrorCta?: (error: string) => JSX.Element | undefined;
  customExercises: IAllCustomExercises;
  exerciseFullNames: string[];
  value?: string;
}

// Screens
export function PlannerEditorView(props: IProps): JSX.Element {
  const webviewRef = useRef<WebView>(null);
  const { onChange, onLineChange, onBlur, onCustomErrorCta, ...otherProps } = props;

  return (
    <View>
      <WebView
        style={{ height: 200 }}
        className="w-full"
        ref={webviewRef}
        javaScriptEnabled={true}
        allowsInlineMediaPlayback={true}
        webviewDebuggingEnabled={true}
        injectedJavaScriptBeforeContentLoaded={`window.appState = ${JSON.stringify(otherProps)};`}
        source={{ uri: "https://local.liftosaur.com:8080/plannereditor/index.html" }}
        onMessage={(event) => {
          console.log(event);
        }}
      />
    </View>
  );
}
