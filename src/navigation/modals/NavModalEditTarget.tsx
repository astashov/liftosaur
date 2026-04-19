import { JSX, useEffect } from "react";
import { View, Animated } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useAppState } from "../StateContext";
import { BottomSheetEditTargetContent } from "../../components/bottomSheetEditTarget";
import { lb } from "lens-shmens";
import { IHistoryRecord } from "../../types";
import { IState, updateState } from "../../models/state";
import { buildPlaygroundDispatch, getPlaygroundProgress } from "./navModalPlaygroundUtils";
import type { IRootStackParamList } from "../types";
import { CustomKeyboardProvider, useCustomKeyboardAnimatedHeight } from "../CustomKeyboardContext";

export function NavModalEditTarget(): JSX.Element {
  const { state, dispatch } = useAppState();
  const navigation = useNavigation();
  const route = useRoute<{
    key: string;
    name: "editSetTargetModal";
    params: IRootStackParamList["editSetTargetModal"];
  }>();
  const params = route.params;

  let progress: IHistoryRecord | undefined;
  let modalDispatch = dispatch;

  if (params.context === "workout") {
    progress = params.progressId === 0 ? state.storage.progress?.[0] : state.progress[params.progressId];
  } else {
    progress = getPlaygroundProgress(state, params.weekIndex, params.dayIndex);
    modalDispatch = buildPlaygroundDispatch(
      dispatch,
      params.weekIndex,
      params.dayIndex,
      () => getPlaygroundProgress(state, params.weekIndex, params.dayIndex),
      state.storage.settings,
      { weight: {}, length: {}, percentage: {} }
    );
  }

  const editSetModal = progress?.ui?.editSetModal;

  useEffect(() => {
    const clearEditSetModal = (): void => {
      if (params.context === "workout") {
        dispatch({
          type: "UpdateProgress",
          lensRecordings: [lb<IHistoryRecord>().pi("ui", {}).p("editSetModal").record(undefined)],
          desc: "Close edit set modal",
        });
      } else {
        updateState(
          dispatch,
          [
            lb<IState>()
              .pi("playgroundState")
              .pi("progresses")
              .pi(params.weekIndex)
              .p("days")
              .pi(params.dayIndex)
              .p("progress")
              .pi("ui", {})
              .p("editSetModal")
              .record(undefined),
          ],
          "Close edit set modal"
        );
      }
    };
    const unsubscribe = navigation.addListener("beforeRemove", clearEditSetModal);
    return unsubscribe;
  }, [navigation, dispatch, params]);

  const onClose = (): void => {
    navigation.goBack();
  };

  const shouldGoBack = !progress || !editSetModal;
  useEffect(() => {
    if (shouldGoBack) {
      navigation.goBack();
    }
  }, [shouldGoBack]);

  if (shouldGoBack || !progress || !editSetModal) {
    return <></>;
  }

  return (
    <CustomKeyboardProvider applySafeAreaBottom={false}>
      <View className="bg-background-default">
        <BottomSheetEditTargetContent
          editSetModal={editSetModal}
          subscription={state.storage.subscription}
          settings={state.storage.settings}
          progress={progress}
          dispatch={modalDispatch}
          onClose={onClose}
        />
        <KeyboardSpacer />
      </View>
    </CustomKeyboardProvider>
  );
}

function KeyboardSpacer(): JSX.Element {
  const animatedHeight = useCustomKeyboardAnimatedHeight();
  return <Animated.View style={{ height: animatedHeight }} />;
}
