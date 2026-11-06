import { useCallback } from "react";
import { lb } from "lens-shmens";
import { ILensDispatch, useLensReducer } from "../../utils/useLensReducer";
import { canRedo, canUndo, redo, undo, undoRedoMiddleware } from "../../pages/builder/utils/undoredo";
import { DashboardEditorSave_draft, IDashboardEditorDraft } from "../../models/dashboardEditorSave";

export interface IDashboardDraft {
  state: IDashboardEditorDraft;
  dispatch: ILensDispatch<IDashboardEditorDraft>;
  text: string;
  setText: (text: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useDashboardDraft(initialText: string): IDashboardDraft {
  const [state, dispatch] = useLensReducer(DashboardEditorSave_draft(initialText), {}, [
    (action, oldState, newState) => {
      const isUndo = "type" in action && action.type === "Update" && action.desc === "undo";
      if (!isUndo && oldState.current !== newState.current) {
        undoRedoMiddleware(dispatch, oldState);
      }
    },
  ]);
  const setText = useCallback(
    (text: string) =>
      dispatch(
        lb<IDashboardEditorDraft>()
          .p("current")
          .recordModify((current) => (current.text === text ? current : { text })),
        "Edit dashboard"
      ),
    [dispatch]
  );
  return {
    state,
    dispatch,
    text: state.current.text,
    setText,
    undo: () => undo(dispatch, state),
    redo: () => redo(dispatch, state),
    canUndo: canUndo(state) != null,
    canRedo: canRedo(state) != null,
  };
}
