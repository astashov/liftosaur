import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, historyKeymap, history, indentWithTab } from "@codemirror/commands";
import { search, searchKeymap } from "@codemirror/search";
import { HighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { linter, forceLinting } from "@codemirror/lint";
import { Compartment, EditorState, Extension, RangeSet } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  gutterLineClass,
  GutterMarker,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { highlightSelectionMatches } from "@codemirror/search";
import { tags } from "@lezer/highlight";
import { IProgramState } from "../../../types";
import { ObjectUtils } from "../../../utils/object";
import { buildLiftoscriptLanguageSupport } from "../../../liftoscriptCodemirror";
import { LiftoscriptSyntaxError } from "../../../liftoscriptEvaluator";

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#708" },
  { tag: [tags.literal, tags.inserted], color: "#164" },
  { tag: tags.variableName, color: "#28839f" },
  { tag: tags.comment, color: "#8B9BAB" },
  { tag: tags.blockComment, color: "#5a8e7b" },
  { tag: tags.atom, color: "#940" },
  { tag: tags.propertyName, color: "#8B9BAB" },
  { tag: tags.attributeName, color: "#940" },
  { tag: tags.attributeValue, color: "#28839F" },
  { tag: tags.annotation, color: "#6f6e24" },
  { tag: tags.docComment, color: "#12957e" },
]);

interface IEditorCompartments {
  errorGutterCompartment: Compartment;
}

class ErrorGutterMarker extends GutterMarker {
  constructor() {
    super();
    this.elementClass = "cm-errorLineGutter";
  }
}

function getEditorSetup(plannerEditor: ScriptEditor): [Extension[], IEditorCompartments] {
  const errorGutterCompartment = new Compartment();

  return [
    [
      drawSelection(),
      autocompletion({
        closeOnBlur: false,
        addToOptions: [],
      }),
      ...(plannerEditor.args.lineNumbers
        ? [lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), errorGutterCompartment.of([]), history()]
        : []),
      syntaxHighlighting(highlightStyle),
      highlightSelectionMatches(),
      linter(
        (view) => {
          const { state } = view;
          const tree = syntaxTree(state);
          if (tree.length === state.doc.length) {
            let from: number | undefined = undefined;
            let to: number | undefined = undefined;
            tree.iterate({
              enter: (n) => {
                if (from == null && n.type.isError) {
                  from = n.from;
                  to = n.to;
                  return false;
                }
                return;
              },
            });

            if (from != null && to != null && state.doc.length >= to) {
              return [{ from: from, to: to, severity: "error", message: "Syntax Error" }];
            }
          }

          const error = plannerEditor.args.error;
          if (error != null && state.doc.length >= error.to) {
            return [{ from: error.from, to: error.to, severity: "error", message: error.message }];
          }

          return [];
        },
        {
          needsRefresh: (update) => {
            if (plannerEditor.requireLint) {
              plannerEditor.requireLint = false;
              return true;
            }
            return false;
          },
        }
      ),
      search({
        top: true,
      }),
      EditorState.allowMultipleSelections.of(true),
      keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap, ...searchKeymap, indentWithTab]),
    ],
    { errorGutterCompartment },
  ];
}

interface IArgs {
  onChange?: (newValue: string) => void;
  onLineChange?: (newValue: number) => void;
  onBlur?: (event: FocusEvent, newValue: string) => void;
  value?: string;
  height?: number;
  error?: LiftoscriptSyntaxError;
  state: IProgramState;
  lineNumbers?: boolean;
}

export class ScriptEditor {
  public readonly args: IArgs;
  private codeMirror?: EditorView;
  private compartments?: IEditorCompartments;
  public requireLint: boolean = false;

  constructor(args: IArgs) {
    this.args = args;
  }

  public setValue(value: string): void {
    if (this.codeMirror) {
      this.codeMirror.update([
        this.codeMirror.state.update({ changes: { from: 0, to: this.codeMirror.state.doc.length, insert: value } }),
      ]);
    }
  }

  public setState(state: IProgramState): void {
    const changed = !ObjectUtils.isEqual({ args: state }, { arr: this.args.state });
    if (changed) {
      this.args.state = state;
      this.relint();
    }
  }

  public setError(error?: LiftoscriptSyntaxError): void {
    this.args.error = error;
    this.relint();
  }

  private relint(): void {
    if (this.codeMirror && this.compartments) {
      const errorGutterCompartment = this.compartments.errorGutterCompartment;
      this.requireLint = true;
      forceLinting(this.codeMirror);
      const from = this.args.error?.from;
      try {
        const line = from != null ? this.codeMirror.state.doc.lineAt(from).from : undefined;
        const rangeSet = RangeSet.of(line != null ? [new ErrorGutterMarker().range(line)] : []);
        this.codeMirror.dispatch({
          effects: errorGutterCompartment.reconfigure(gutterLineClass.of(rangeSet)),
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  public attach(container: HTMLElement): void {
    const updateFacet = EditorView.updateListener.of((update) => {
      const state = update.state;
      const line = state.doc.lineAt(state.selection.main.head);
      if (update.view.hasFocus && this.args.onLineChange) {
        this.args.onLineChange(line.number);
      }
      if (update.docChanged && this.args.onChange) {
        this.args.onChange(update.state.doc.toString());
      }
    });

    const language = buildLiftoscriptLanguageSupport({ state: this.args.state });

    const eventHandlers = EditorView.domEventHandlers({
      blur: (e, view) => {
        if (this.args.onBlur) {
          this.args.onBlur(e, view.state.doc.toString());
        }
      },
    });

    const [extensions, compartments] = getEditorSetup(this);
    this.compartments = compartments;
    const editorState = EditorState.create({
      doc: this.args.value || "",
      extensions: [keymap.of(defaultKeymap), extensions, updateFacet, language, eventHandlers],
    });

    const codemirror = new EditorView({
      state: editorState,
      parent: container,
    });
    this.codeMirror = codemirror;
  }
}
