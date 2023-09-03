import { lb, lbu } from "lens-shmens";
import { useEffect } from "preact/hooks";
import { ILensDispatch } from "../../../utils/useLensReducer";

export interface IUndoRedoState<T> {
  history: {
    past: T[];
    future: T[];
    lastHistoryTs?: number;
  };
  current: T;
}

export function undoRedoMiddleware<T, S extends IUndoRedoState<T>>(dispatch: ILensDispatch<S>, oldState: S): void {
  const lastHistoryTsGetter = { lastHistoryTs: lb<S>().p("history").p("lastHistoryTs").get() };
  dispatch([
    lbu<S, typeof lastHistoryTsGetter>(lastHistoryTsGetter)
      .p("history")
      .recordModify((history, getters) => {
        const lastHistoryTs = getters.lastHistoryTs?.valueOf();
        if (lastHistoryTs != null && Date.now() - lastHistoryTs < 500) {
          return history;
        } else {
          return { ...history, past: [...history.past, oldState.current], future: [], lastHistoryTs: Date.now() };
        }
      }),
  ]);
}

export function canUndo<T, S extends IUndoRedoState<T>>(state: S): T | undefined {
  return state.history.past[state.history.past.length - 1];
}

export function canRedo<T, S extends IUndoRedoState<T>>(state: S): T | undefined {
  return state.history.future[0];
}

export function undo<T, S extends IUndoRedoState<T>>(dispatch: ILensDispatch<S>, state: S): void {
  const previousState = canUndo<T, S>(state);
  if (previousState) {
    dispatch(
      [
        lb<S>()
          .p("history")
          .recordModify((history) => {
            window.isUndoing = true;
            return {
              past: state.history.past.slice(0, state.history.past.length - 1),
              future: [state.current, ...history.future],
            };
          }),
        lb<S>().p("current").record(previousState),
      ],
      "undo"
    );
  }
}

export function redo<T, S extends IUndoRedoState<T>>(dispatch: ILensDispatch<S>, state: S): void {
  const nextState = canRedo<T, S>(state);
  if (nextState) {
    dispatch(
      [
        lb<S>()
          .p("history")
          .recordModify((history) => {
            window.isUndoing = true;
            return {
              past: [...history.past, state.current],
              future: state.history.future.slice(1, state.history.future.length),
            };
          }),
        lb<S>().p("current").record(nextState),
      ],
      "undo"
    );
  }
}

export function useUndoRedo<T, S extends IUndoRedoState<T>>(state: S, dispatch: ILensDispatch<S>): void {
  useEffect(() => {
    function onKeyPress(event: KeyboardEvent): void {
      if (
        !(event.target instanceof HTMLTextAreaElement) &&
        !(event.target instanceof HTMLInputElement) &&
        (event.key === "z" || event.key === "Z") &&
        (event.ctrlKey || event.metaKey)
      ) {
        if (!event.shiftKey) {
          event.preventDefault();
          undo(dispatch, state);
        } else {
          event.preventDefault();
          redo(dispatch, state);
        }
      }
    }
    window.addEventListener("keydown", onKeyPress);
    window.isUndoing = false;
    return () => window.removeEventListener("keydown", onKeyPress);
  }, [state]);
}
