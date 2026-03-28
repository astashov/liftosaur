import React from "react";
import { useStoreStateWhenFocused } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { ScreenSettings } from "@crossplatform/components/screens/ScreenSettings";

export function NativeScreenSettings(): React.ReactElement {
  const state = useStoreStateWhenFocused();
  const dispatch = useDispatch();
  return <ScreenSettings state={state} dispatch={dispatch} />;
}
