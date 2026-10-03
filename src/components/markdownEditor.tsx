import { JSX, useEffect, useRef } from "react";
import { markdown } from "@codemirror/lang-markdown";
import { drawSelection, EditorView, highlightSpecialChars, keymap, placeholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { defaultKeymap, historyKeymap, history } from "@codemirror/commands";
import { TextDiff_minimalEdit } from "../utils/textDiff";

interface IProps {
  value: string;
  borderless?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  hasHistory?: boolean;
  onChange?: (newValue: string) => void;
  onBlur?: (value: string) => void;
}

export function MarkdownEditor(props: IProps): JSX.Element {
  const divRef = useRef<HTMLDivElement>(null);
  const codeEditor = useRef<EditorView | undefined>(undefined);
  const onBlurRef = useRef(props.onBlur);
  onBlurRef.current = props.onBlur;
  useEffect(() => {
    const updateFacet = EditorView.updateListener.of((update) => {
      if (update.docChanged && props.onChange && !window.isUndoing) {
        props.onChange(update.state.doc.toString());
      }
    });

    const eventHandlers = EditorView.domEventHandlers({
      blur: (e, view) => {
        onBlurRef.current?.(view.state.doc.toString());
      },
    });

    const hasHistory = props.hasHistory ?? true;
    const minimalSetup = [
      highlightSpecialChars(),
      hasHistory ? history() : [],
      drawSelection(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([...defaultKeymap, ...(hasHistory ? historyKeymap : [])]),
    ];

    const editorState = EditorState.create({
      doc: props.value,
      extensions: [
        minimalSetup,
        markdown(),
        updateFacet,
        eventHandlers,
        props.placeholder != null ? placeholder(props.placeholder) : [],
      ],
    });

    const view = new EditorView({
      state: editorState,
      parent: divRef.current ?? undefined,
    });
    codeEditor.current = view;
    if (props.autoFocus) {
      view.focus();
    }
    return () => view.destroy();
  }, []);

  useEffect(() => {
    if (window.isUndoing) {
      const ce = codeEditor.current;
      const edit = ce != null && props.value != null ? TextDiff_minimalEdit(ce.state.doc.toString(), props.value) : undefined;
      if (ce != null && edit != null) {
        ce.dispatch({
          changes: { from: edit.start, to: edit.end, insert: edit.text },
          selection: { anchor: edit.start + edit.text.length },
          scrollIntoView: ce.hasFocus,
        });
      }
    }
  }, [props.value]);

  const className = props.borderless
    ? "block w-full leading-normal text-text-secondary appearance-none focus:outline-none"
    : "block w-full px-2 py-2 leading-normal bg-background-default border rounded-lg appearance-none focus:outline-none focus:shadow-outline border-gray-300";

  return (
    <div className="markdown-editor-view" style={{ fontFamily: "Iosevka Web" }}>
      <div data-testid="markdown-editor" className={className} ref={divRef}></div>
    </div>
  );
}
