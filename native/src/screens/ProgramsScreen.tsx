import React from "react";
import { useStoreStateWhenFocused } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { ChooseProgram } from "@crossplatform/components/ChooseProgram";

export function ProgramsScreen(): React.ReactElement {
  const state = useStoreStateWhenFocused();
  const dispatch = useDispatch();
  return (
    <ChooseProgram
      dispatch={dispatch}
      programs={state.programs || []}
      programsIndex={state.programsIndex || []}
      settings={state.storage.settings}
    />
  );
}
