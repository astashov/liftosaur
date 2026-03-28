import React from "react";
import { useStoreStateWhenFocused } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { ScreenPrograms } from "@crossplatform/components/screens/ScreenPrograms";

export function NativeScreenPrograms(): React.ReactElement {
  const state = useStoreStateWhenFocused();
  const dispatch = useDispatch();
  return (
    <ScreenPrograms
      dispatch={dispatch}
      programs={state.programs || []}
      programsIndex={state.programsIndex || []}
      settings={state.storage.settings}
    />
  );
}
