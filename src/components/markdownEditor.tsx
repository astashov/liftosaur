import { h, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView, minimalSetup } from "codemirror";
import { EditorState } from "@codemirror/state";

interface IProps {
  value: string;
  onChange?: (newValue: string) => void;
}

export function MarkdownEditor(props: IProps): JSX.Element {
  const divRef = useRef<HTMLDivElement>();
  useEffect(() => {
    const updateFacet = EditorView.updateListener.of((update) => {
      if (update.docChanged && props.onChange && !window.isUndoing) {
        props.onChange(update.state.doc.toString());
      }
    });

    const eventHandlers = EditorView.domEventHandlers({
      blur: (e, view) => {},
    });

    const editorState = EditorState.create({
      doc: props.value,
      extensions: [minimalSetup, markdown(), updateFacet, eventHandlers],
    });

    new EditorView({
      state: editorState,
      parent: divRef.current,
      // dispatch: (tr) => {
      //   onChange(tr.state.doc.toString());
      // },
    });
  }, []);

  let className =
    "block w-full px-2 py-2 leading-normal bg-white border rounded-lg appearance-none focus:outline-none focus:shadow-outline";
  className += " border-gray-300";

  return (
    <div className="markdown-editor-view" style={{ fontFamily: "Iosevka Web" }}>
      <div data-cy="markdown-editor" className={className} ref={divRef}></div>
    </div>
  );
}
