import { JSX, useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IDispatch } from "../ducks/types";
import { Thunk_pushScreen } from "../ducks/thunks";
import { HearAboutUsSurvey } from "./hearAboutUs/hearAboutUsSurvey";
import {
  HearAboutUs_selectSource,
  HearAboutUs_updatePartial,
  HearAboutUs_finalize,
  HearAboutUs_logShown,
  HearAboutUs_skip,
  HearAboutUs_markDone,
} from "../models/hearAboutUs";

interface IProps {
  dispatch: IDispatch;
}

export function ScreenHearAboutUs(props: IProps): JSX.Element {
  const { dispatch } = props;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    HearAboutUs_logShown(dispatch);
  }, [dispatch]);

  return (
    <View className="flex-1 bg-background-default" style={{ paddingBottom: insets.bottom }}>
      <HearAboutUsSurvey
        context="onboarding"
        variant="screen"
        onSelectSource={(s) => HearAboutUs_selectSource(dispatch, s)}
        onChange={(p) => HearAboutUs_updatePartial(dispatch, p)}
        onComplete={(payload) => {
          HearAboutUs_finalize(dispatch, payload);
          dispatch(Thunk_pushScreen("programselect"));
        }}
        onSkip={() => {
          HearAboutUs_skip(dispatch);
          // Explicit skip = done: don't re-ask via the backfill modal later either.
          HearAboutUs_markDone(dispatch);
          dispatch(Thunk_pushScreen("programselect"));
        }}
      />
    </View>
  );
}
