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
import { autocompletion, CompletionContext, CompletionResult, completionKeymap } from "@codemirror/autocomplete";
import { Diagnostic, setDiagnostics } from "@codemirror/lint";
import { bracketMatching, foldKeymap, syntaxTree } from "@codemirror/language";
import { ILiftographDiagnostic } from "../liftograph/liftographDocument";
import { TextDiff_minimalEdit, TextDiff_toLf } from "../utils/textDiff";
import { LiftographEditorAnalysis } from "../liftograph/liftographEditorAnalysis";
import { LiftographLanguage_support, LiftographLanguage_tree } from "../liftograph/liftographLanguage";
import { LiftographCompletions_editTyped } from "../liftograph/liftographCompletions";
import {
  LiftographHighlight_cssStyle,
  LiftographHighlight_lintSpans,
  LiftographHighlight_markRanges,
} from "../liftograph/liftographHighlight";

export interface ILiftographCodeEditorReveal {
  at: number;
  key: number;
}

interface IProps {
  initialText: string;
  initialCaret?: number;
  value?: string;
  reveal?: ILiftographCodeEditorReveal;
  analysis: LiftographEditorAnalysis;
  diagnostics: ILiftographDiagnostic[];
  onChange: (text: string) => void;
  isFullHeight?: boolean;
}

function decorations(analysis: LiftographEditorAnalysis, state: EditorState): DecorationSet {
  const text = state.doc.toString();
  const ranges = analysis.styledRanges(text, LiftographLanguage_tree(state));
  const marks: Range<Decoration>[] = LiftographHighlight_markRanges(ranges, text.length).map((range) =>
    Decoration.mark({ attributes: { style: LiftographHighlight_cssStyle(range) } }).range(range.start, range.end)
  );
  return Decoration.set(marks, true);
}

function completionSource(
  analysis: () => LiftographEditorAnalysis
): (context: CompletionContext) => CompletionResult | null {
  return (context: CompletionContext): CompletionResult | null => {
    const { state } = context;
    const completion = analysis().completions(
      state.doc.toString(),
      context.pos,
      "popup",
      context.explicit,
      LiftographLanguage_tree(state)
    );
    if (completion == null) {
      return null;
    }
    return {
      from: completion.match.from,
      to: completion.match.to,
      options: completion.options.map((option) => ({
        label: option.label,
        detail: option.detail,
        type: option.type,
        boost: option.boost,
        apply: (view: EditorView, _c: unknown, _from: number, to: number) => {
          const edit = LiftographCompletions_editTyped(completion, option, to);
          view.dispatch({
            changes: { from: edit.from, to: edit.to, insert: edit.insert },
            selection: { anchor: edit.caret },
            userEvent: "input.complete",
          });
        },
      })),
    };
  };
}

function lintDiagnostics(diagnostics: ILiftographDiagnostic[], textLength: number): Diagnostic[] {
  return LiftographHighlight_lintSpans(diagnostics, textLength).map((span) => ({ ...span, severity: "error" }));
}

export function LiftographCodeEditor(props: IProps): JSX.Element {
  const divRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | undefined>(undefined);
  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;
  const analysisRef = useRef(props.analysis);
  analysisRef.current = props.analysis;
  const isApplyingValueRef = useRef(false);
  const isControlled = props.value != null;

  useEffect(() => {
    const highlight = ViewPlugin.fromClass(
      class {
        public decorations: DecorationSet;
        constructor(view: EditorView) {
          this.decorations = decorations(analysisRef.current, view.state);
        }
        public update(update: ViewUpdate): void {
          if (update.docChanged || syntaxTree(update.state) !== syntaxTree(update.startState)) {
            this.decorations = decorations(analysisRef.current, update.state);
          }
        }
      },
      { decorations: (plugin) => plugin.decorations }
    );
    const view = new EditorView({
      state: EditorState.create({
        doc: props.initialText,
        selection:
          props.initialCaret != null ? { anchor: Math.min(props.initialCaret, props.initialText.length) } : undefined,
        extensions: [
          lineNumbers(),
          highlightSpecialChars(),
          isControlled ? [] : history(),
          drawSelection(),
          LiftographLanguage_support((state) =>
            analysisRef.current.document(state.doc.toString(), LiftographLanguage_tree(state))
          ),
          bracketMatching(),
          autocompletion({ icons: false, override: [completionSource(() => analysisRef.current)] }),
          keymap.of([...completionKeymap, ...foldKeymap, ...defaultKeymap, ...(isControlled ? [] : historyKeymap)]),
          highlight,
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isApplyingValueRef.current) {
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
    if (props.initialCaret != null) {
      view.dispatch({ effects: EditorView.scrollIntoView(view.state.selection.main.head, { y: "center" }) });
      view.focus();
    }
    return () => view.destroy();
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    const value = props.value != null ? TextDiff_toLf(props.value) : undefined;
    const edit = view != null && value != null ? TextDiff_minimalEdit(view.state.doc.toString(), value) : undefined;
    if (view == null || edit == null) {
      return;
    }
    isApplyingValueRef.current = true;
    try {
      view.dispatch({
        changes: { from: edit.start, to: edit.end, insert: edit.text },
        selection: view.hasFocus ? { anchor: edit.start + edit.text.length } : undefined,
      });
    } finally {
      isApplyingValueRef.current = false;
    }
  }, [props.value]);

  useEffect(() => {
    const view = viewRef.current;
    const reveal = props.reveal;
    if (view == null || reveal == null) {
      return;
    }
    const anchor = Math.min(reveal.at, view.state.doc.length);
    view.dispatch({ selection: { anchor }, effects: EditorView.scrollIntoView(anchor, { y: "center" }) });
    view.focus();
  }, [props.reveal?.key]);

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
