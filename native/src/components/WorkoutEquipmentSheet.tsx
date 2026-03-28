import React, { useEffect } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { IRootNavigation } from "../navigation/types";
import { useStoreStateWhenFocused } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { WorkoutActions_closeEquipmentModal } from "@shared/actions/workoutActions";
import { WorkoutEquipmentContent } from "@crossplatform/components/WorkoutModalEquipment";

export function WorkoutEquipmentSheet(): React.ReactElement {
  const navigation = useNavigation<IRootNavigation>();
  const state = useStoreStateWhenFocused();
  const dispatch = useDispatch();

  useEffect(() => {
    return navigation.addListener("beforeRemove", () => {
      WorkoutActions_closeEquipmentModal(dispatch);
    });
  }, [navigation, dispatch]);

  const progress = state.storage.progress?.[0];
  const exerciseType = progress?.ui?.equipmentModal?.exerciseType;
  if (!exerciseType || !progress) {
    return <View />;
  }

  return (
    <View className="flex-1 bg-background-default">
      <WorkoutEquipmentContent
        settings={state.storage.settings}
        stats={state.storage.stats}
        exercise={exerciseType}
        entries={progress.entries}
        dispatch={dispatch}
      />
    </View>
  );
}
