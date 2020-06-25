import CodeMirror, { StringStream } from "codemirror";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/diff/diff";
import "codemirror/addon/hint/show-hint";

interface IState {
  foo: string;
}

CodeMirror.defineMode<IState>("liftosaur", (config, modeOptions) => {
  const keywords = ["cr", "r", "w"];
  const stateKeywords = ["state"];

  return {
    token: (stream: StringStream, state: IState) => {
      const peek = stream.peek();
      if (stream.match(/\d+/)) {
        return "number";
      } else if (keywords.some((k) => stream.match(k))) {
        return "keyword";
      } else if (stateKeywords.some((k) => stream.match(k))) {
        return "state";
      } else if (peek != null && ["[", "]", "(", ")", "{", "}"].indexOf(peek) !== -1) {
        stream.next();
        return "bracket";
      } else if (peek != null && ["+", "-", "*", "=", ">", "<", "/", "^"].indexOf(peek) !== -1) {
        stream.next();
        return "atom";
      } else if (peek != null && ["."].indexOf(peek) !== -1) {
        stream.next();
        return "dot";
      } else {
        stream.next();
        return null;
      }
    },
  };
});

const codemirror = CodeMirror(document.querySelector("#app") as HTMLElement, {
  mode: "liftosaur",
});

codemirror.on("keyup", (e, s) => {
  if (s.type === "keyup" && (e.state.completionActive == null || e.state.completionActive.data.list.length === 0)) {
    codemirror.showHint({
      hint: (cm: CodeMirror.Editor): CodeMirror.Hints => {
        const cursor = cm.getCursor();
        const currentToken = cm.getTokenTypeAt(cursor);
        const previousToken = cm.getTokenTypeAt({ ch: cursor.ch - 1, line: cursor.line });
        const list = currentToken === "dot" && previousToken === "state" ? ["foo", "bar"] : [];
        return {
          from: cursor,
          to: cursor,
          list: list,
        };
      },
      completeSingle: false,
    });
  }
});

console.log(codemirror);
console.log(CodeMirror.modes);
console.log(CodeMirror.mimeModes);
