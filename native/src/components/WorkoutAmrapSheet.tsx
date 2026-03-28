import React, { useEffect } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { IRootNavigation } from "../navigation/types";
import { useStoreStateWhenFocused } from "../context/StoreContext";
import { useDispatch } from "../context/DispatchContext";
import { Progress_forceUpdateEntryIndex } from "@shared/models/progress";
import { WorkoutActions_dismissAmrapModal } from "@shared/actions/workoutActions";
import { AmrapContent } from "@crossplatform/components/WorkoutModalAmrap";

export function WorkoutAmrapSheet(): React.ReactElement {
  const navigation = useNavigation<IRootNavigation>();
  const state = useStoreStateWhenFocused();
  const dispatch = useDispatch();

  useEffect(() => {
    return navigation.addListener("beforeRemove", () => {
      WorkoutActions_dismissAmrapModal(dispatch);
    });
  }, [navigation, dispatch]);

  return (
    <View className="flex-1 bg-background-default">
      <AmrapContent
        state={state}
        dispatch={dispatch}
        isPlayground={false}
        onDone={() => {
          Progress_forceUpdateEntryIndex(dispatch);
          navigation.goBack();
        }}
      />
    </View>
  );
}
