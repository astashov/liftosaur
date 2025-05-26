import { h, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { markdown } from "@codemirror/lang-markdown";
import { drawSelection, EditorView, highlightSpecialChars, keymap, placeholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { defaultKeymap, historyKeymap, history } from "@codemirror/commands";

interface IProps {
  value?: string;
  placeholder: string;
  isTransparent?: boolean;
  onChange?: (newValue: string) => void;
}

export function MarkdownEditorBorderless(props: IProps): JSX.Element {
  const divRef = useRef<HTMLDivElement>();
  const codeEditor = useRef<EditorView | undefined>(undefined);
  useEffect(() => {
    const updateFacet = EditorView.updateListener.of((update) => {
      if (update.docChanged && props.onChange && !window.isUndoing) {
        props.onChange(update.state.doc.toString());
      }
    });

    const eventHandlers = EditorView.domEventHandlers({
      blur: (e, view) => {},
    });

    const minimalSetup = [
      highlightSpecialChars(),
      history(),
      drawSelection(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      placeholder(props.placeholder),
      keymap.of([...defaultKeymap, ...historyKeymap]),
    ];

    const editorState = EditorState.create({
      doc: props.value,
      extensions: [minimalSetup, markdown(), updateFacet, eventHandlers],
    });

    codeEditor.current = new EditorView({
      state: editorState,
      parent: divRef.current,
    });
  }, []);

  useEffect(() => {
    if (window.isUndoing) {
      const ce = codeEditor.current;
      if (ce && props.value != null) {
        ce.update([ce.state.update({ changes: { from: 0, to: ce.state.doc.length, insert: props.value } })]);
      }
    }
  }, [props.value]);

  return (
    <div className="markdown-editor-view">
      <div
        data-cy="markdown-editor"
        className={`text-sm ${!props.isTransparent ? "bg-white" : ""} appearance-none focus:outline-none focus:shadow-outline`}
        ref={divRef}
      ></div>
    </div>
  );
}
