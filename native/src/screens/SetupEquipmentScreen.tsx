import React from "react";
import { useStoreStateWhenFocused } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { ScreenSetupEquipment } from "@crossplatform/components/ScreenSetupEquipment";

export function SetupEquipmentScreen(): React.ReactElement {
  const state = useStoreStateWhenFocused();
  const dispatch = useDispatch();
  return <ScreenSetupEquipment dispatch={dispatch} settings={state.storage.settings} />;
}
