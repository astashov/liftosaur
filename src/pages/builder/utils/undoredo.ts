import { lb } from "lens-shmens";
import { useEffect } from "preact/hooks";
import { IBuilderDispatch, IBuilderState } from "../models/builderReducer";

export function useUndoRedo(state: IBuilderState, dispatch: IBuilderDispatch): void {
  useEffect(() => {
    function onKeyPress(event: KeyboardEvent): void {
      if ((event.key === "z" || event.key === "Z") && (event.ctrlKey || event.metaKey)) {
        if (!event.shiftKey) {
          event.preventDefault();
          const previousState = state.history.past[state.history.past.length - 1];
          if (previousState) {
            dispatch(
              [
                lb<IBuilderState>()
                  .p("history")
                  .recordModify((history) => {
                    return {
                      past: state.history.past.slice(0, state.history.past.length - 1),
                      future: [state.program, ...history.future],
                    };
                  }),
                lb<IBuilderState>().p("program").record(previousState),
              ],
              "undo"
            );
          }
        } else {
          event.preventDefault();
          const nextState = state.history.future[0];
          if (nextState) {
            dispatch(
              [
                lb<IBuilderState>()
                  .p("history")
                  .recordModify((history) => {
                    return {
                      past: [...history.past, state.program],
                      future: state.history.future.slice(1, state.history.future.length),
                    };
                  }),
                lb<IBuilderState>().p("program").record(nextState),
              ],
              "undo"
            );
          }
        }
      }
    }
    window.addEventListener("keydown", onKeyPress);
    return () => window.removeEventListener("keydown", onKeyPress);
  }, [state]);
}
