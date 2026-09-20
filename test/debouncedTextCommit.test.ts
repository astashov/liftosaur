import "mocha";
import { expect } from "chai";
import {
  DebouncedTextCommit_initial,
  DebouncedTextCommit_next,
  IDebouncedTextCommitEvent,
  IDebouncedTextCommitState,
} from "../src/utils/debouncedTextCommit";

function run(
  events: IDebouncedTextCommitEvent[],
  from?: IDebouncedTextCommitState
): { state: IDebouncedTextCommitState; effects: string[] } {
  let state = from ?? DebouncedTextCommit_initial("");
  const effects: string[] = [];
  for (const event of events) {
    const result = DebouncedTextCommit_next(state, event);
    state = result.state;
    for (const effect of result.effects) {
      effects.push("text" in effect ? `${effect.type}:${effect.text}` : effect.type);
    }
  }
  return { state, effects };
}

describe("DebouncedTextCommit_next", () => {
  it("restarts the timer on every keystroke and commits the last text once", () => {
    const { effects } = run([
      { type: "typed", text: "h" },
      { type: "typed", text: "he" },
      { type: "typed", text: "hel" },
      { type: "timer" },
      { type: "timer" },
    ]);
    expect(effects).to.eql(["schedule", "schedule", "schedule", "commit:hel"]);
  });

  it("commits the pending text on blur and cancels the timer", () => {
    const { effects } = run([{ type: "focus" }, { type: "typed", text: "abc" }, { type: "blur" }, { type: "timer" }]);
    expect(effects).to.eql(["schedule", "cancel", "commit:abc"]);
  });

  it("commits the pending text on unmount", () => {
    const { effects } = run([{ type: "typed", text: "abc" }, { type: "unmount" }]);
    expect(effects).to.eql(["schedule", "cancel", "commit:abc"]);
  });

  it("does nothing on blur or unmount when nothing is pending", () => {
    expect(run([{ type: "blur" }, { type: "unmount" }]).effects).to.eql([]);
  });

  it("ignores an incoming value while a commit is pending", () => {
    const { effects, state } = run([
      { type: "typed", text: "hello wor" },
      { type: "value", text: "hello" },
      { type: "timer" },
      { type: "value", text: "hello wor" },
    ]);
    expect(effects).to.eql(["schedule", "commit:hello wor"]);
    expect(state.inputText).to.equal("hello wor");
  });

  it("ignores an incoming value while focused", () => {
    const { effects } = run([{ type: "focus" }, { type: "value", text: "from another device" }]);
    expect(effects).to.eql([]);
  });

  it("writes an incoming value into the input when idle and different", () => {
    const { effects, state } = run([
      { type: "value", text: "server" },
      { type: "value", text: "server" },
    ]);
    expect(effects).to.eql(["setText:server"]);
    expect(state.inputText).to.equal("server");
  });

  it("writes an incoming value after blur once the pending text was committed", () => {
    const { effects } = run([
      { type: "focus" },
      { type: "typed", text: "abc" },
      { type: "blur" },
      { type: "value", text: "abc" },
      { type: "value", text: "merged" },
    ]);
    expect(effects).to.eql(["schedule", "cancel", "commit:abc", "setText:merged"]);
  });
});
