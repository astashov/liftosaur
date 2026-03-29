import React, { useCallback } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { IRootNavigation } from "../navigation/types";
import { useStoreStateWhenFocused } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { ScreenWorkout } from "@crossplatform/components/screens/ScreenWorkout";

export function NativeScreenWorkout(): React.ReactElement {
  const navigation = useNavigation<IRootNavigation>();
  const route = useRoute();
  const state = useStoreStateWhenFocused();
  const dispatch = useDispatch();
  const progressId = (route.params as { id?: number } | undefined)?.id;
  const onBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <ScreenWorkout
      state={state}
      dispatch={dispatch}
      progressId={progressId}
      onBack={progressId != null ? onBack : undefined}
      onOpenAmrapSheet={() => navigation.navigate("WorkoutAmrapSheet")}
    />
  );
}
