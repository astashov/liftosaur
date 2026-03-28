import React from "react";
import { useNavigation } from "@react-navigation/native";
import type { IRootNavigation } from "../navigation/types";
import { useStoreStateWhenFocused } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { ScreenGraphs } from "@crossplatform/components/screens/ScreenGraphs";

export function NativeScreenGraphs(): React.ReactElement {
  const navigation = useNavigation<IRootNavigation>();
  const state = useStoreStateWhenFocused();
  const dispatch = useDispatch();

  return (
    <ScreenGraphs
      state={state}
      dispatch={dispatch}
      onOpenSettings={() => navigation.navigate("ModalGraphsSheet")}
    />
  );
}
