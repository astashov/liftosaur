export interface IDebouncedTextCommitState {
  inputText: string;
  pending: string | undefined;
  focused: boolean;
}

export type IDebouncedTextCommitEvent =
  | { type: "typed"; text: string }
  | { type: "timer" }
  | { type: "focus" }
  | { type: "blur" }
  | { type: "unmount" }
  | { type: "value"; text: string };

export type IDebouncedTextCommitEffect =
  | { type: "schedule" }
  | { type: "cancel" }
  | { type: "commit"; text: string }
  | { type: "setText"; text: string };

export function DebouncedTextCommit_initial(inputText: string): IDebouncedTextCommitState {
  return { inputText, pending: undefined, focused: false };
}

export function DebouncedTextCommit_next(
  state: IDebouncedTextCommitState,
  event: IDebouncedTextCommitEvent
): { state: IDebouncedTextCommitState; effects: IDebouncedTextCommitEffect[] } {
  switch (event.type) {
    case "typed":
      return { state: { ...state, inputText: event.text, pending: event.text }, effects: [{ type: "schedule" }] };
    case "timer":
      return commitPending(state, []);
    case "focus":
      return { state: { ...state, focused: true }, effects: [] };
    case "blur":
      return commitPending({ ...state, focused: false }, [{ type: "cancel" }]);
    case "unmount":
      return commitPending(state, [{ type: "cancel" }]);
    case "value":
      if (state.focused || state.pending != null || state.inputText === event.text) {
        return { state, effects: [] };
      }
      return { state: { ...state, inputText: event.text }, effects: [{ type: "setText", text: event.text }] };
  }
}

function commitPending(
  state: IDebouncedTextCommitState,
  before: IDebouncedTextCommitEffect[]
): { state: IDebouncedTextCommitState; effects: IDebouncedTextCommitEffect[] } {
  if (state.pending == null) {
    return { state, effects: [] };
  }
  return { state: { ...state, pending: undefined }, effects: [...before, { type: "commit", text: state.pending }] };
}
