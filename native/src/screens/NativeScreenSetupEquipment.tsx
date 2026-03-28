import React from "react";
import { useStoreStateWhenFocused } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { ScreenSetupEquipment } from "@crossplatform/components/screens/ScreenSetupEquipment";

export function NativeScreenSetupEquipment(): React.ReactElement {
  const state = useStoreStateWhenFocused();
  const dispatch = useDispatch();
  return <ScreenSetupEquipment dispatch={dispatch} settings={state.storage.settings} />;
}
