import React from "react";
import { useNavigation } from "@react-navigation/native";
import type { IRootNavigation } from "../navigation/types";
import { useStoreStateWhenFocused } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { ScreenWorkout } from "@crossplatform/components/screens/ScreenWorkout";

export function NativeScreenWorkout(): React.ReactElement {
  const navigation = useNavigation<IRootNavigation>();
  const state = useStoreStateWhenFocused();
  const dispatch = useDispatch();

  return (
    <ScreenWorkout
      state={state}
      dispatch={dispatch}
      onOpenAmrapSheet={() => navigation.navigate("WorkoutAmrapSheet")}
    />
  );
}
