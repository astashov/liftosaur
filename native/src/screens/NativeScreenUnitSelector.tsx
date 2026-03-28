import React from "react";
import { useStoreStateWhenFocused } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { ScreenUnitSelector } from "@crossplatform/components/screens/ScreenUnitSelector";

export function NativeScreenUnitSelector(): React.ReactElement {
  const state = useStoreStateWhenFocused();
  const dispatch = useDispatch();
  return <ScreenUnitSelector dispatch={dispatch} settings={state.storage.settings} />;
}
