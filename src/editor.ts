import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { insertTab, defaultKeymap, history, historyKeymap, indentLess } from "@codemirror/commands";
import { HighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { EditorState, Extension } from "@codemirror/state";
import { drawSelection, EditorView, keymap } from "@codemirror/view";
import { highlightSelectionMatches } from "@codemirror/search";
import { IProgramState } from "./types";
import { tags } from "@lezer/highlight";
import { buildLiftoscriptLanguageSupport } from "./liftoscriptCodemirror";

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#708" },
  { tag: [tags.literal, tags.inserted], color: "#164" },
  { tag: tags.variableName, color: "#00f" },
  { tag: tags.comment, color: "#940" },
]);

const editorSetup: Extension[] = [
  history(),
  drawSelection(),
  indentOnInput(),
  autocompletion(),
  syntaxHighlighting(highlightStyle),
  highlightSelectionMatches(),
  keymap.of([
    ...defaultKeymap,
    ...historyKeymap,
    ...completionKeymap,
    { key: "Tab", run: insertTab, shift: indentLess },
  ]),
];

interface IArgs {
  onChange?: (newValue: string) => void;
  onBlur?: (newValue: string) => void;
  value?: string;
  multiLine?: boolean;
  state?: IProgramState;
  height?: number;
}

export class CodeEditor {
  private readonly args: IArgs;
  private codeMirror?: EditorView;
  private _state?: IProgramState;

  public get state(): IProgramState {
    return this._state || {};
  }

  constructor(args: IArgs = {}) {
    this.args = args;
    this._state = args.state;
  }

  public setValue(value: string): void {
    if (this.codeMirror) {
      this.codeMirror.update([
        this.codeMirror.state.update({ changes: { from: 0, to: this.codeMirror.state.doc.length, insert: value } }),
      ]);
    }
  }

  public updateState(newState: IProgramState): void {
    this._state = newState;
  }

  public attach(container: HTMLElement): void {
    const updateFacet = EditorView.updateListener.of((update) => {
      if (this.args.onChange) {
        this.args.onChange(update.state.doc.toString());
      }
    });

    const liftoscriptLanguage = buildLiftoscriptLanguageSupport(this);

    const editorState = EditorState.create({
      doc: this.args.value || "",
      extensions: [keymap.of(defaultKeymap), editorSetup, updateFacet, liftoscriptLanguage],
    });

    const codemirror = new EditorView({
      state: editorState,
      parent: container,
    });
    this.codeMirror = codemirror;

    if (this.args.multiLine) {
      codemirror.scrollDOM.style.height = `${(this.args.height ?? 16) * codemirror.defaultLineHeight + 2 * 4}px`;
    }
  }
}
