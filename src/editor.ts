import CodeMirror, { StringStream } from "codemirror";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/diff/diff";
import "codemirror/addon/hint/show-hint";

interface IState {
  foo: string;
}

interface IArgs {
  onChange?: (newValue: string) => void;
  onBlur?: (newValue: string) => void;
  value?: string;
  multiLine?: boolean;
  state?: Record<string, number>;
}

export class CodeEditor {
  private readonly args: IArgs;
  private state: Record<string, number>;

  constructor(args: IArgs = {}) {
    this.args = args;
    this.state = args.state || {};
  }

  public updateState(newState: Record<string, number>): void {
    this.state = newState;
  }

  public attach(container: HTMLElement): void {
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

    const codemirror = CodeMirror(container, { mode: "liftosaur", value: this.args.value || "" });

    codemirror.on("keyup", (e, s) => {
      if (s.type === "keyup" && (e.state.completionActive == null || e.state.completionActive.data.list.length === 0)) {
        codemirror.showHint({
          hint: (cm: CodeMirror.Editor): CodeMirror.Hints => {
            const cursor = cm.getCursor();
            const currentToken = cm.getTokenTypeAt(cursor);
            const previousToken = cm.getTokenTypeAt({ ch: cursor.ch - 1, line: cursor.line });
            const list = currentToken === "dot" && previousToken === "state" ? Object.keys(this.state || {}) : [];
            console.log(list);
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

    codemirror.on("change", () => {
      if (this.args.onChange != null) {
        this.args.onChange(codemirror.getValue());
      }
    });

    codemirror.on("blur", () => {
      if (this.args.onBlur != null) {
        this.args.onBlur(codemirror.getValue());
      }
    });

    codemirror.setSize("100%", (this.args.multiLine ? 16 : 1) * codemirror.defaultTextHeight() + 2 * 4);

    if (!this.args.multiLine) {
      // now disallow adding newlines in the following simple way
      codemirror.on("beforeChange", (instance, change) => {
        const newtext = change.text.join("").replace(/\n/g, ""); // remove ALL \n !
        change.update!(change.from, change.to, [newtext]);
        return true;
      });
    }
  }
}

export function attachCodemirror(container: HTMLElement): void {}
