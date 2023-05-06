import CodeMirror, { StringStream } from "codemirror";
import "codemirror/mode/diff/diff";
import "codemirror/addon/hint/show-hint";
import { IProgramState } from "./types";

type IState = Record<string, string | null>;

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
  private state: IProgramState;
  private codeMirror?: CodeMirror.Editor;

  constructor(args: IArgs = {}) {
    this.args = args;
    this.state = args.state || {};
  }

  public updateState(newState: IProgramState): void {
    this.state = newState;
  }

  public setValue(value: string): void {
    if (this.codeMirror) {
      this.codeMirror.setValue(value);
    }
  }

  public attach(container: HTMLElement): void {
    CodeMirror.defineMode<IState>("liftosaur", (config, modeOptions) => {
      const keywords = [...Object.keys(this.state), "day", "completedReps", "reps", "weights", "cr", "r", "w"];
      const stateKeywords = ["state"];

      return {
        startState: () => ({}),
        token: (stream: StringStream, state: IState) => {
          let peek = stream.peek();
          let token: string | null = null;
          if ((stream.sol() || /\W/.test(state.current || "")) && stream.match(/\d+(lb|kg)?/)) {
            token = "number";
          } else if ((stream.sol() || /\W/.test(state.current || "")) && keywords.some((k) => stream.match(k))) {
            if (/\W/.test(stream.peek() || "")) {
              token = "keyword";
            }
          } else if (stateKeywords.some((k) => stream.match(k))) {
            token = "state";
          } else if (peek != null && ["[", "]", "(", ")", "{", "}"].indexOf(peek) !== -1) {
            stream.next();
            token = "bracket";
          } else if (peek != null && ["/"].indexOf(peek) !== -1) {
            stream.next();
            peek = stream.peek();
            if (peek != null && ["/"].indexOf(peek) !== -1) {
              token = "comment";
              stream.skipToEnd();
            } else {
              stream.next();
              token = "atom";
            }
          } else if (peek != null && ["+", "-", "*", "=", ">", "<", "/", "^"].indexOf(peek) !== -1) {
            stream.next();
            token = "atom";
          } else if (peek != null && ["."].indexOf(peek) !== -1) {
            stream.next();
            token = "dot";
          } else {
            stream.next();
            token = null;
          }
          state.current = peek;
          return token;
        },
      };
    });

    const codemirror = CodeMirror(container, {
      mode: "liftosaur",
      value: this.args.value || "",
      viewportMargin: Infinity,
    });
    this.codeMirror = codemirror;

    codemirror.on("keyup", (e, s) => {
      if (s.type === "keyup" && (e.state.completionActive == null || e.state.completionActive.data.list.length === 0)) {
        codemirror.showHint({
          hint: (cm: CodeMirror.Editor): CodeMirror.Hints => {
            const cursor = cm.getCursor();
            const end = cursor.ch;
            let start = end;
            let list: string[] = [];
            if (start > 1) {
              const lineContent = cm.getLine(cursor.line);
              let previousChar = lineContent.slice(start - 1, start)[0];
              let isFoundStateVar = false;
              let isFoundKeyword = false;
              if (
                /[a-zA-Z]/.test(previousChar) &&
                (lineContent.slice(start)[0] == null || /\s/.test(lineContent.slice(start)[0]))
              ) {
                while (start > 0) {
                  if (previousChar === ".") {
                    isFoundStateVar = true;
                    break;
                  } else if (/[^a-zA-Z]/.test(previousChar)) {
                    isFoundKeyword = true;
                    break;
                  }
                  start -= 1;
                  previousChar = lineContent.slice(start - 1)[0];
                }
                if (isFoundStateVar) {
                  if (cm.getTokenTypeAt({ ch: start - 1, line: cursor.line }) === "state") {
                    list = Object.keys(this.state || {}).filter((k) => {
                      const keyword = lineContent.slice(start, end);
                      return k !== keyword && k.startsWith(keyword);
                    });
                  }
                }
                if (isFoundKeyword) {
                  const keywords = [
                    "state",
                    "w",
                    "weights",
                    "r",
                    "reps",
                    "cr",
                    "completedReps",
                    "day",
                    "ns",
                    "numberOfSets",
                    "roundWeight",
                    "calculateTrainingMax",
                  ];
                  list = keywords.filter((k) => {
                    const keyword = lineContent.slice(start, end);
                    return k !== keyword && k.startsWith(keyword);
                  });
                }
              } else if (
                previousChar === "." &&
                (lineContent.slice(start)[0] == null || /\s/.test(lineContent.slice(start)[0])) &&
                cm.getTokenTypeAt({ ch: start - 2, line: cursor.line }) === "state"
              ) {
                list = Object.keys(this.state || {});
              }
            }
            return {
              from: { ch: start, line: cursor.line },
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

    if (this.args.multiLine) {
      codemirror.setSize(null, (this.args.height ?? 16) * codemirror.defaultTextHeight() + 2 * 4);
    }
  }
}

export function attachCodemirror(container: HTMLElement): void {}
