import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Keyboard, Platform, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { NavScreenScrollContext } from "../../navigation/NavScreenScrollContext";
import { Text } from "./text";
import { EDITOR_HTML } from "../../pages/planner/webviewEditor/editorHtml.generated";
import {
  IEditorInitArgs,
  IEditorError,
  IEditorMode,
  IEditorTheme,
  IHostToWebview,
  IWebviewToHost,
} from "../../pages/planner/webviewEditor/editorWebviewBridge";
import { IAllCustomExercises, IProgramState } from "../../types";

export interface IWebviewEditorProps {
  mode: IEditorMode;
  value: string;
  onChange?: (newValue: string) => void;
  onLineChange?: (newValue: number) => void;
  onBlur?: (newValue: string) => void;
  error?: IEditorError;
  lineNumbers?: boolean;
  customExercises?: IAllCustomExercises;
  exerciseFullNames?: string[];
  state?: IProgramState;
  onCustomErrorCta?: (error: string) => React.ReactNode;
  height?: number;
  theme?: IEditorTheme;
  autoHeight?: boolean;
  minHeight?: number;
  maxHeight?: number;
}

const DEFAULT_HEIGHT = 300;
const DEFAULT_MIN_HEIGHT = 120;
const CARET_KEYBOARD_MARGIN = Platform.OS === "android" ? 88 : 32;

export function WebviewEditor(props: IWebviewEditorProps): React.JSX.Element {
  const webviewRef = useRef<WebView>(null);
  const containerRef = useRef<View>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<IHostToWebview[]>([]);
  const lastSentValueRef = useRef<string | undefined>(undefined);
  const lastReceivedValueRef = useRef<string | undefined>(undefined);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  const scrollCtx = useContext(NavScreenScrollContext);
  const keyboardTopRef = useRef<number | null>(null);
  const lastCaretRef = useRef<{ top: number; bottom: number } | null>(null);
  const focusedRef = useRef(false);

  const scrollCaretIntoView = useCallback(
    (caret: { top: number; bottom: number }): void => {
      const scrollNode = scrollCtx?.scrollRef.current;
      const scrollYRef = scrollCtx?.scrollYRef;
      const containerNode = containerRef.current;
      const keyboardTop = keyboardTopRef.current;
      if (!scrollNode || !scrollYRef || !containerNode || keyboardTop == null) {
        return;
      }
      containerNode.measureInWindow((_x, y) => {
        const caretBottom = y + caret.bottom;
        const visibleBottom = keyboardTop - CARET_KEYBOARD_MARGIN;
        if (caretBottom <= visibleBottom) {
          return;
        }
        const delta = caretBottom - visibleBottom;
        scrollNode.scrollTo({ y: Math.max(0, scrollYRef.current + delta), animated: true });
      });
    },
    [scrollCtx]
  );

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      keyboardTopRef.current = e.endCoordinates.screenY;
      if (focusedRef.current && lastCaretRef.current) {
        scrollCaretIntoView(lastCaretRef.current);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardTopRef.current = null;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollCaretIntoView]);

  const send = useCallback((msg: IHostToWebview): void => {
    if (!readyRef.current) {
      pendingRef.current.push(msg);
      return;
    }
    const js = "window.__lft && window.__lft.recv(" + JSON.stringify(msg) + "); true;";
    webviewRef.current?.injectJavaScript(js);
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent): void => {
      let msg: IWebviewToHost;
      try {
        msg = JSON.parse(event.nativeEvent.data) as IWebviewToHost;
      } catch {
        return;
      }
      switch (msg.kind) {
        case "ready": {
          readyRef.current = true;
          const init: IEditorInitArgs = {
            mode: props.mode,
            value: props.value ?? "",
            lineNumbers: props.lineNumbers,
            theme: props.theme,
            error: props.error,
            customExercises: props.customExercises,
            exerciseFullNames: props.exerciseFullNames,
            state: props.state,
            autoHeight: props.autoHeight,
          };
          lastSentValueRef.current = init.value;
          send({ kind: "init", payload: init });
          const pending = pendingRef.current;
          pendingRef.current = [];
          for (const p of pending) {
            send(p);
          }
          return;
        }
        case "change":
          lastReceivedValueRef.current = msg.payload.value;
          if (props.onChange) {
            props.onChange(msg.payload.value);
          }
          return;
        case "lineChange":
          if (props.onLineChange) {
            props.onLineChange(msg.payload.line);
          }
          return;
        case "caretChange":
          focusedRef.current = true;
          lastCaretRef.current = msg.payload;
          scrollCaretIntoView(msg.payload);
          return;
        case "blur":
          focusedRef.current = false;
          lastReceivedValueRef.current = msg.payload.value;
          if (props.onBlur) {
            props.onBlur(msg.payload.value);
          }
          return;
        case "heightChange":
          if (props.autoHeight) {
            setContentHeight(msg.payload.height);
          }
          return;
        case "error":
          return;
      }
    },
    [props, send, scrollCaretIntoView]
  );

  useEffect(() => {
    if (!readyRef.current) {
      return;
    }
    if (props.value == null) {
      return;
    }
    if (props.value === lastReceivedValueRef.current) {
      return;
    }
    if (props.value === lastSentValueRef.current) {
      return;
    }
    lastSentValueRef.current = props.value;
    send({ kind: "setValue", payload: { value: props.value } });
  }, [props.value, send]);

  useEffect(() => {
    send({ kind: "setError", payload: { error: props.error } });
  }, [props.error, send]);

  useEffect(() => {
    if (props.customExercises != null && props.mode === "planner") {
      send({ kind: "setCustomExercises", payload: { customExercises: props.customExercises } });
    }
  }, [props.customExercises, props.mode, send]);

  useEffect(() => {
    if (props.exerciseFullNames != null && props.mode === "planner") {
      send({ kind: "setExerciseFullNames", payload: { names: props.exerciseFullNames } });
    }
  }, [props.exerciseFullNames, props.mode, send]);

  useEffect(() => {
    if (props.state != null && props.mode === "script") {
      send({ kind: "setState", payload: { state: props.state } });
    }
  }, [props.state, props.mode, send]);

  useEffect(() => {
    if (props.theme != null) {
      send({ kind: "setTheme", payload: { theme: props.theme } });
    }
  }, [props.theme, send]);

  const customCta = props.error != null && props.onCustomErrorCta ? props.onCustomErrorCta(props.error.message) : null;
  let height: number;
  if (props.autoHeight) {
    const measured = contentHeight ?? props.minHeight ?? DEFAULT_MIN_HEIGHT;
    const min = props.minHeight ?? DEFAULT_MIN_HEIGHT;
    const max = props.maxHeight;
    height = Math.max(min, max != null ? Math.min(measured, max) : measured);
  } else {
    height = props.height ?? DEFAULT_HEIGHT;
  }
  const borderClass =
    props.error != null ? "border border-red-500 rounded-lg" : "border border-border-neutral rounded-lg";
  const bannerClass = props.lineNumbers ? "bg-background-darkred px-2 py-1" : "px-2 py-1";
  const labelClass = props.lineNumbers ? "text-sm text-text-alwayswhite" : "text-sm text-text-error";
  const messageClass = props.lineNumbers
    ? "text-sm font-bold text-text-alwayswhite"
    : "text-sm font-bold text-text-error";

  return (
    <View className="w-full">
      {props.error != null && (
        <View className={bannerClass} testID="planner-editor-error">
          <Text className={labelClass}>
            <Text className={labelClass}>Error: </Text>
            <Text className={messageClass}>{props.error.message}</Text>
          </Text>
          {customCta != null && <View className="mt-1">{customCta}</View>}
        </View>
      )}
      <View ref={containerRef} className={borderClass} style={{ height }} testID="planner-editor">
        <WebView
          ref={webviewRef}
          originWhitelist={["*"]}
          source={{
            html: EDITOR_HTML,
            baseUrl: Platform.OS === "android" ? "file:///android_asset/" : undefined,
          }}
          onMessage={onMessage}
          scrollEnabled={false}
          javaScriptEnabled={true}
          keyboardDisplayRequiresUserAction={false}
          hideKeyboardAccessoryView={false}
          automaticallyAdjustContentInsets={false}
          androidLayerType="hardware"
          webviewDebuggingEnabled={__DEV__}
          style={{ backgroundColor: "transparent", flex: 1 }}
        />
      </View>
    </View>
  );
}
