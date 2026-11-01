import { JSX, useEffect, useRef } from "react";
import {
  Decoration,
  DecorationSet,
  drawSelection,
  EditorView,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { EditorState, Range } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { Diagnostic, setDiagnostics } from "@codemirror/lint";
import { ILiftographDiagnostic } from "../liftograph/liftographDocument";
import { LiftographEditorAnalysis } from "../liftograph/liftographEditorAnalysis";
import { LiftographHighlight_clampSpan, LiftographHighlight_cssStyle } from "../liftograph/liftographHighlight";

interface IProps {
  initialText: string;
  analysis: LiftographEditorAnalysis;
  diagnostics: ILiftographDiagnostic[];
  onChange: (text: string) => void;
  isFullHeight?: boolean;
}

function decorations(analysis: LiftographEditorAnalysis, text: string): DecorationSet {
  const marks: Range<Decoration>[] = analysis
    .styledRanges(text)
    .filter((range) => range.end > range.start && range.end <= text.length)
    .map((range) =>
      Decoration.mark({ attributes: { style: LiftographHighlight_cssStyle(range) } }).range(range.start, range.end)
    );
  return Decoration.set(marks, true);
}

function lintDiagnostics(diagnostics: ILiftographDiagnostic[], textLength: number): Diagnostic[] {
  return diagnostics.flatMap((d): Diagnostic[] => {
    const span = LiftographHighlight_clampSpan(d.span, textLength);
    return span != null ? [{ from: span.from, to: span.to, severity: "error", message: d.message }] : [];
  });
}

export function LiftographCodeEditor(props: IProps): JSX.Element {
  const divRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | undefined>(undefined);
  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;
  const analysisRef = useRef(props.analysis);
  analysisRef.current = props.analysis;

  useEffect(() => {
    const highlight = ViewPlugin.fromClass(
      class {
        public decorations: DecorationSet;
        constructor(view: EditorView) {
          this.decorations = decorations(analysisRef.current, view.state.doc.toString());
        }
        public update(update: ViewUpdate): void {
          if (update.docChanged) {
            this.decorations = decorations(analysisRef.current, update.state.doc.toString());
          }
        }
      },
      { decorations: (plugin) => plugin.decorations }
    );
    const view = new EditorView({
      state: EditorState.create({
        doc: props.initialText,
        extensions: [
          lineNumbers(),
          highlightSpecialChars(),
          history(),
          drawSelection(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          highlight,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          EditorView.theme({
            "&": { fontSize: "1rem" },
          }),
        ],
      }),
      parent: divRef.current ?? undefined,
    });
    viewRef.current = view;
    return () => view.destroy();
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (view != null) {
      view.dispatch(setDiagnostics(view.state, lintDiagnostics(props.diagnostics, view.state.doc.length)));
    }
  }, [props.diagnostics]);

  return (
    <div
      ref={divRef}
      data-testid="dashboard-editor-code"
      className="w-full overflow-auto border rounded-lg liftograph-editor-view border-border-neutral"
      style={props.isFullHeight ? undefined : { maxHeight: "60vh" }}
    />
  );
}
