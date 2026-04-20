import "./editorWebview.css";
import type {
  IEditorInitArgs,
  IHostToWebview,
  IWebviewToHost,
} from "./editorWebviewBridge";
import { PlannerEditor } from "../plannerEditor";
import { ScriptEditor } from "../../../components/editProgramExercise/progressions/scriptEditor";

type IAnyEditor = PlannerEditor | ScriptEditor;

declare global {
  interface Window {
    __lft?: { recv: (msg: IHostToWebview) => void };
    ReactNativeWebView?: { postMessage: (data: string) => void };
  }
}

function postToHost(msg: IWebviewToHost): void {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  } else {
    window.parent?.postMessage(JSON.stringify(msg), "*");
  }
}

function buildPlannerEditor(args: IEditorInitArgs): PlannerEditor {
  return new PlannerEditor({
    value: args.value,
    error: args.error,
    lineNumbers: args.lineNumbers,
    customExercises: args.customExercises,
    exerciseFullNames: args.exerciseFullNames,
    onChange: (value) => postToHost({ kind: "change", payload: { value } }),
    onLineChange: (line) => postToHost({ kind: "lineChange", payload: { line } }),
    onBlur: (_e, value) => postToHost({ kind: "blur", payload: { value } }),
  });
}

function buildScriptEditor(args: IEditorInitArgs): ScriptEditor {
  return new ScriptEditor({
    value: args.value,
    error: args.error,
    lineNumbers: args.lineNumbers,
    state: args.state ?? {},
    onChange: (value) => postToHost({ kind: "change", payload: { value } }),
    onLineChange: (line) => postToHost({ kind: "lineChange", payload: { line } }),
    onBlur: (_e, value) => postToHost({ kind: "blur", payload: { value } }),
  });
}

function applyTheme(theme?: string): void {
  if (theme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}

function observeHeight(container: HTMLElement): void {
  let last = 0;
  const send = (): void => {
    const h = container.scrollHeight;
    if (h !== last) {
      last = h;
      postToHost({ kind: "heightChange", payload: { height: h } });
    }
  };
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(send).observe(container);
  }
  send();
}

let editor: IAnyEditor | undefined;
let mode: IEditorInitArgs["mode"] | undefined;

function init(args: IEditorInitArgs): void {
  const container = document.getElementById("editor");
  if (!container) {
    postToHost({ kind: "error", payload: { message: "missing #editor container" } });
    return;
  }
  container.className = "planner-editor-view";
  applyTheme(args.theme);
  mode = args.mode;
  editor = args.mode === "planner" ? buildPlannerEditor(args) : buildScriptEditor(args);
  editor.attach(container);
  observeHeight(container);
}

function recv(msg: IHostToWebview): void {
  try {
    switch (msg.kind) {
      case "init":
        if (!editor) init(msg.payload);
        return;
      case "setValue":
        editor?.setValue(msg.payload.value);
        return;
      case "setError":
        editor?.setError(msg.payload.error as never);
        return;
      case "setCustomExercises":
        if (mode === "planner") {
          (editor as PlannerEditor | undefined)?.setCustomExercises(msg.payload.customExercises);
        }
        return;
      case "setExerciseFullNames":
        if (mode === "planner") {
          (editor as PlannerEditor | undefined)?.setExerciseFullNames(msg.payload.names);
        }
        return;
      case "setState":
        if (mode === "script") {
          (editor as ScriptEditor | undefined)?.setState(msg.payload.state);
        }
        return;
      case "setTheme":
        applyTheme(msg.payload.theme);
        return;
      case "focus":
      case "blur":
        return;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    postToHost({ kind: "error", payload: { message } });
  }
}

window.__lft = { recv };
postToHost({ kind: "ready" });
